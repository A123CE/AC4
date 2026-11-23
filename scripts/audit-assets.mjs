#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');
const requireFromServer = createRequire(path.join(serverDir, 'package.json'));
const mysql = requireFromServer('mysql2/promise');

const POSTER_LIMIT = 300 * 1024;
const LITE_LIMIT = 1.5 * 1024 * 1024;

function walk(dir, files = []) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full, files);
      } else {
        files.push(full);
      }
    }
  } catch {
    /* 目录不存在 */
  }
  return files;
}

function extOf(file) {
  return path.extname(file).toLowerCase();
}

async function loadPalaceIds() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Zsf/20050827',
      database: process.env.DB_NAME || 'ac4_db',
      connectTimeout: 3000,
    });
    const [rows] = await connection.query('SELECT id FROM palaces');
    await connection.end();
    return rows.map((row) => row.id);
  } catch {
    return [];
  }
}

function mapById(files, extensions) {
  const map = new Map();
  for (const file of files) {
    if (!extensions.includes(extOf(file))) continue;
    const id = path.basename(file, path.extname(file));
    if (!map.has(id)) map.set(id, file);
  }
  return map;
}

function sizeOf(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

async function main() {
  const palaceIds = await loadPalaceIds();

  const modelFiles = walk(path.join(projectRoot, 'models'));
  const highModels = mapById(
    modelFiles.filter((file) => !file.split(path.sep).includes('lite')),
    ['.glb', '.gltf']
  );
  const liteModels = mapById(
    modelFiles.filter((file) => file.split(path.sep).includes('lite')),
    ['.glb', '.gltf']
  );
  const posters = mapById(walk(path.join(projectRoot, 'images', 'posters')), [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.avif',
  ]);
  const videos = walk(path.join(projectRoot, 'videos'));
  const audio = walk(path.join(projectRoot, 'audio'));

  const ids = palaceIds.length
    ? palaceIds
    : [...new Set([...highModels.keys(), ...posters.keys()])];

  const missingPosters = ids.filter((id) => !posters.has(id));
  const missingLite = ids.filter((id) => highModels.has(id) && !liteModels.has(id));

  const oversizedPosters = [...posters.entries()]
    .map(([id, file]) => ({ id, file, bytes: sizeOf(file) }))
    .filter((item) => item.bytes > POSTER_LIMIT);

  const oversizedLite = [...liteModels.entries()]
    .map(([id, file]) => ({ id, file, bytes: sizeOf(file) }))
    .filter((item) => item.bytes > LITE_LIMIT);

  const report = {
    generated_at: new Date().toISOString(),
    totals: {
      palaces: ids.length,
      high_models: highModels.size,
      lite_models: liteModels.size,
      posters: posters.size,
      videos: videos.length,
      audio: audio.length,
    },
    missing_posters: missingPosters,
    missing_lite: missingLite,
    oversized_posters: oversizedPosters,
    oversized_lite: oversizedLite,
  };

  fs.mkdirSync(path.join(projectRoot, 'reports'), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, 'reports', 'assets-audit.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );

  console.log('资源体积审计');
  console.log(`  建筑：${ids.length}`);
  console.log(`  高清模型：${highModels.size}，轻量模型：${liteModels.size}`);
  console.log(`  海报：${posters.size}`);
  console.log(`  缺失海报：${missingPosters.length}`);
  console.log(`  缺失 lite：${missingLite.length}`);
  console.log(`  海报超 300KB：${oversizedPosters.length}`);
  console.log(`  lite 超 1.5MB：${oversizedLite.length}`);

  if (missingPosters.length > 0) {
    console.log(`  缺失海报清单：${missingPosters.join(', ')}`);
  }
  if (oversizedPosters.length > 0) {
    for (const item of oversizedPosters) {
      console.log(`  海报超限：${item.id} ${(item.bytes / 1024).toFixed(1)}KB`);
    }
  }
  if (oversizedLite.length > 0) {
    for (const item of oversizedLite) {
      console.log(`  lite 超限：${item.id} ${(item.bytes / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  if (missingPosters.length > 0 || oversizedLite.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('资源审计失败:', err.message);
  process.exitCode = 1;
});