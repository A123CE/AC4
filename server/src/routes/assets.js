const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');

const router = express.Router();
const projectRoot = path.resolve(__dirname, '../../..');
const TTL_MS = 5 * 60 * 1000;

let cache = null;

function walk(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full, files);
      } else {
        files.push(full);
      }
    }
  } catch {
    /* 目录不存在或无权限 */
  }
  return files;
}

function toUrl(file) {
  return `/${path.relative(projectRoot, file).replace(/\\/g, '/')}`;
}

async function buildManifest() {
  const [rows] = await pool.query(
    "SELECT id FROM palaces WHERE status = 'published'"
  );
  const palaces = {};

  for (const row of rows) {
    palaces[row.id] = {
      high: null,
      standard: null,
      smooth: null,
      poster: null,
      bytes: null,
    };
  }

  const modelFiles = walk(path.join(projectRoot, 'models'));
  for (const file of modelFiles) {
    if (!/\.(glb|gltf)$/i.test(file)) continue;

    const id = path.basename(file).replace(/\.(glb|gltf)$/i, '');
    const entry = palaces[id];
    if (!entry) continue;

    const isLite = file.split(path.sep).includes('lite');
    const url = toUrl(file);

    if (isLite) {
      entry.smooth = url;
      entry.standard = url;
    } else if (!entry.high) {
      entry.high = url;
      if (!entry.standard) entry.standard = url;
    }

    if (!entry.bytes) {
      try {
        entry.bytes = fs.statSync(file).size;
      } catch {
        /* 忽略体积读取失败 */
      }
    }
  }

  const imageFiles = walk(path.join(projectRoot, 'images', 'posters'));
  for (const file of imageFiles) {
    if (!/\.(png|jpe?g|webp|avif)$/i.test(file)) continue;
    const id = path.basename(file).replace(/\.[^.]+$/, '');
    if (palaces[id] && !palaces[id].poster) {
      palaces[id].poster = toUrl(file);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    ttl_seconds: 300,
    palaces,
  };
}

/**
 * GET /api/assets/manifest
 * 扫描 models/ 与 images/posters/，5 分钟缓存；异常不 500
 */
router.get('/manifest', async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return res.json({ success: true, data: cache.data });
    }

    const data = await buildManifest();
    cache = { at: now, data };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('生成资源清单失败:', err);
    return res.json({
      success: true,
      data:
        cache?.data || {
          generated_at: new Date().toISOString(),
          ttl_seconds: 300,
          palaces: {},
        },
    });
  }
});

module.exports = router;