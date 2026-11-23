const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, optionalAuth, requireAdmin } = require('../middleware/auth');
const { toPublicPalace, toVideoInfo } = require('../services/publicSerializer');

// 保留字双保险：即使路由顺序被调整，也不把 filter/search 当作 :id
const FILTER_RESERVED = new Set(['filter', 'search']);

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || ''), 'utf8').digest('hex');
}

/**

 * GET /api/palaces
 * 获取所有宫殿列表（支持筛选）
 * Query: category (宫殿/关隘), dynasty (明/清)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, dynasty, include_drafts: includeDraftsRaw } = req.query;
    const includeDrafts =
      includeDraftsRaw === '1' && req.user?.role === 'admin';

    let sql = includeDrafts
      ? 'SELECT * FROM palaces WHERE 1=1'
      : "SELECT * FROM palaces WHERE status = 'published'";
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (dynasty) {
      sql += ' AND dynasty LIKE ?';
      params.push(`%${dynasty}%`);
    }

    sql += ' ORDER BY order_num ASC';

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows.map((row) => toPublicPalace(row)) });
  } catch (err) {
    console.error('获取宫殿列表失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/palaces/search
 * 搜索宫殿
 * Query: q (关键词)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const keyword = `%${q.trim()}%`;
    const sql = `
      SELECT p.*,
        (CASE
          WHEN p.name LIKE ? THEN 4
          WHEN p.name_en LIKE ? THEN 3
          WHEN p.tagline LIKE ? OR p.quote LIKE ? THEN 2
          WHEN p.description LIKE ? OR p.category LIKE ? OR p.tags LIKE ? OR p.region LIKE ? OR p.city LIKE ? THEN 1
          ELSE 0
        END) AS relevance
      FROM palaces p
      WHERE (p.name LIKE ? OR p.name_en LIKE ? OR p.description LIKE ? OR p.category LIKE ?
         OR p.tags LIKE ? OR p.region LIKE ? OR p.city LIKE ? OR p.tagline LIKE ? OR p.quote LIKE ?)
        AND p.status = 'published'
      ORDER BY relevance DESC, p.order_num ASC
    `;

    const [rows] = await pool.execute(sql, [
      keyword, keyword, keyword, keyword,
      keyword, keyword, keyword, keyword, keyword,
      keyword, keyword, keyword, keyword, keyword,
      keyword, keyword, keyword, keyword
    ]);

    res.json({ success: true, data: rows.map((row) => toPublicPalace(row)) });
  } catch (err) {
    console.error('搜索宫殿失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/palaces/filter
 * 按条件筛选
 * Query: category, dynasty
 * 注意：必须定义在 /:id 之前，否则会被 /:id 捕获
 */
router.get('/filter', async (req, res) => {
  try {
    const { category, dynasty } = req.query;

    let sql = "SELECT * FROM palaces WHERE status = 'published'";
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (dynasty) {
      sql += ' AND dynasty LIKE ?';
      params.push(`%${dynasty}%`);
    }

    sql += ' ORDER BY order_num ASC';

    const [rows] = await pool.execute(sql, params);
    res.json({
      success: true,
      data: rows.map((row) => toPublicPalace(row)),
      meta: { source: 'filter' },
    });
  } catch (err) {
    console.error('筛选宫殿失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/palaces/:id
 * 获取单个宫殿详情（含图片、时间线、典故）
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (FILTER_RESERVED.has(id)) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    // 获取宫殿基本信息
    const [palaces] = await pool.execute(
      'SELECT * FROM palaces WHERE id = ?',
      [id]
    );

    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    const palace = palaces[0];

    // 草稿仅管理员可预览
    if (palace.status !== 'published' && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    // 获取图片列表
    const [images] = await pool.execute(
      'SELECT image_path FROM palace_images WHERE palace_id = ? ORDER BY sort_order ASC',
      [id]
    );

    // 获取时间线
    const [timeline] = await pool.execute(
      'SELECT year, event FROM palace_timeline WHERE palace_id = ? ORDER BY year ASC',
      [id]
    );

    // 获取趣味典故
    const [funFacts] = await pool.execute(
      'SELECT fact FROM palace_fun_facts WHERE palace_id = ? ORDER BY id ASC',
      [id]
    );

    // 真人音频元数据：优先 published；与当前文字稿比对判断版本
    let audio = null;
    const [audioRows] = await pool.execute(
      `SELECT audio_url, duration_seconds, transcript, transcript_hash, narrator
       FROM audio_guides
       WHERE entity_type = 'palace' AND entity_id = ? AND locale = 'zh-CN'
         AND status = 'published'
       LIMIT 1`,
      [id]
    );
    if (audioRows.length > 0) {
      const row = audioRows[0];
      const transcriptHash = row.transcript_hash || (row.transcript ? sha1(row.transcript) : null);
      const expectedHash = palace.audio_guide ? sha1(palace.audio_guide) : null;
      audio = {
        url: row.audio_url,
        duration: row.duration_seconds == null ? null : Number(row.duration_seconds),
        is_current: !!(transcriptHash && expectedHash && transcriptHash === expectedHash),
        narrator: row.narrator || null,
      };
    }

    const serialized = toPublicPalace(palace, {
      detail: true,
      extras: {
        images: images.map((img) => img.image_path),
        timeline: timeline.map((t) => ({ year: t.year, event: t.event })),
        funFacts: funFacts.map((f) => f.fact),
      },
    });
    serialized.audio = audio;
    serialized.video = toVideoInfo(palace);

    res.json({ success: true, data: serialized });
  } catch (err) {
    console.error('获取宫殿详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});


/* ═══════════════════════════════════════════════════════════════
 *  档案编修 — 新增 / 更新 / 删除 / 资源上传
 *  全部接口需登录且 role === 'admin'
 * ═══════════════════════════════════════════════════════════════ */

const PROJECT_ROOT = path.resolve(__dirname, '../../../');

// 资源上传配置 — 模型落到 models/uploads, 封面落到 images/posters
const UPLOAD_KINDS = {
  model: {
    dir: path.join(PROJECT_ROOT, 'models', 'uploads'),
    prefix: 'uploads/',
    exts: ['.glb', '.gltf'],
    maxMb: 300,
    label: '模型',
  },
  poster: {
    dir: path.join(PROJECT_ROOT, 'images', 'posters'),
    prefix: 'posters/',
    exts: ['.png', '.jpg', '.jpeg', '.webp'],
    maxMb: 20,
    label: '封面图',
  },
};

/**
 * 由英文名 / 名称生成建筑标识 — 小写字母数字下划线
 */
function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base.slice(0, 48) || `palace_${Date.now()}`;
}

/**
 * tags 入库 — 数组统一存为逗号分隔字符串
 */
function serializeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean).join(',');
  }
  if (typeof tags === 'string') return tags.trim();
  return null;
}

/**
 * stats 入库 — [["38 米","殿高"], ...] 形式的 JSON
 */
function serializeStats(stats) {
  if (!Array.isArray(stats)) return null;
  const rows = stats
    .map((s) => (Array.isArray(s) ? [String(s[0] ?? '').trim(), String(s[1] ?? '').trim()] : null))
    .filter((s) => s && s[0]);
  return rows.length ? JSON.stringify(rows) : null;
}

/**
 * views_data 入库 — [{src,zh,en}] 形式的 JSON
 */
function serializeViews(views) {
  if (!Array.isArray(views)) return null;
  const rows = views
    .filter((v) => v && (typeof v === 'string' ? v.trim() : v.src))
    .map((v) =>
      typeof v === 'string'
        ? { src: v.trim(), zh: '视图', en: 'View' }
        : { src: String(v.src).trim(), zh: v.zh || '视图', en: v.en || 'View' }
    );
  return rows.length ? JSON.stringify(rows) : null;
}

/**
 * 重写从属表 — 沿革 / 典故 / 图影
 * 仅当请求体显式传入对应数组时才覆盖，避免误清空
 */
async function replaceRelations(conn, palaceId, body) {
  if (Array.isArray(body.timeline)) {
    await conn.execute('DELETE FROM palace_timeline WHERE palace_id = ?', [palaceId]);
    for (const item of body.timeline) {
      const year = String(item?.year ?? '').trim().slice(0, 20);
      const event = String(item?.event ?? '').trim();
      if (!year && !event) continue;
      await conn.execute(
        'INSERT INTO palace_timeline (palace_id, year, event) VALUES (?, ?, ?)',
        [palaceId, year, event]
      );
    }
  }

  if (Array.isArray(body.funFacts)) {
    await conn.execute('DELETE FROM palace_fun_facts WHERE palace_id = ?', [palaceId]);
    for (const fact of body.funFacts) {
      const text = String(fact ?? '').trim();
      if (!text) continue;
      await conn.execute('INSERT INTO palace_fun_facts (palace_id, fact) VALUES (?, ?)', [
        palaceId,
        text,
      ]);
    }
  }

  if (Array.isArray(body.images)) {
    await conn.execute('DELETE FROM palace_images WHERE palace_id = ?', [palaceId]);
    let order = 0;
    for (const img of body.images) {
      const imagePath = String(
        typeof img === 'string' ? img : img?.image_path ?? img?.src ?? ''
      ).trim();
      if (!imagePath) continue;
      order += 1;
      await conn.execute(
        'INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES (?, ?, ?)',
        [palaceId, imagePath, order]
      );
    }
  }
}

/**
 * POST /api/palaces/upload?kind=model|poster
 * 二进制直传 — 请求体为文件内容, 文件名放在 X-File-Name 头
 */
router.post(
  '/upload',
  authMiddleware,
  requireAdmin,
  express.raw({ type: '*/*', limit: '320mb' }),
  async (req, res) => {
    try {
      const kind = String(req.query.kind || '').toLowerCase();
      const conf = UPLOAD_KINDS[kind];
      if (!conf) {
        return res.status(400).json({ success: false, error: '未知的上传类型' });
      }

      let rawName = '';
      try {
        rawName = decodeURIComponent(String(req.headers['x-file-name'] || ''));
      } catch {
        rawName = String(req.headers['x-file-name'] || '');
      }
      if (!rawName) {
        return res.status(400).json({ success: false, error: '缺少文件名' });
      }

      const ext = path.extname(rawName).toLowerCase();
      if (!conf.exts.includes(ext)) {
        return res
          .status(400)
          .json({ success: false, error: `${conf.label}仅支持 ${conf.exts.join(' / ')} 格式` });
      }

      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({ success: false, error: '文件内容为空' });
      }
      if (buffer.length > conf.maxMb * 1024 * 1024) {
        return res
          .status(413)
          .json({ success: false, error: `${conf.label}不能超过 ${conf.maxMb}MB` });
      }

      fs.mkdirSync(conf.dir, { recursive: true });
      const base =
        path
          .basename(rawName, ext)
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'asset';
      const fileName = `${base}-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(conf.dir, fileName), buffer);

      res.json({
        success: true,
        message: `${conf.label}上传成功`,
        data: {
          path: conf.prefix + fileName,
          // 前端预览用的完整地址
          url: kind === 'model' ? `/models/${conf.prefix}${fileName}` : `/images/${conf.prefix}${fileName}`,
          size: buffer.length,
        },
      });
    } catch (err) {
      console.error('上传资源失败:', err);
      res.status(500).json({ success: false, error: '上传失败，请稍后重试' });
    }
  }
);

/**
 * POST /api/palaces
 * 新增建筑档案（含沿革 / 典故 / 图影）
 */
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, error: '建筑名称不能为空' });
  }

  const id = String(body.id || '').trim() || slugify(body.name_en || name);
  if (!/^[a-z0-9_]{2,50}$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: '建筑标识只能使用 2-50 位小写字母、数字或下划线',
    });
  }

  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.execute('SELECT id FROM palaces WHERE id = ?', [id]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, error: `建筑标识「${id}」已存在` });
    }

    const [maxRows] = await conn.execute('SELECT COALESCE(MAX(order_num), 0) AS m FROM palaces');
    const orderNum = Number(body.order_num) || Number(maxRows[0].m) + 1;

    const missing = [];
    if (!String(body.description || '').trim()) missing.push('description');
    if (!String(body.poster_path || '').trim()) missing.push('poster_path');

    const hasTimeline =
      Array.isArray(body.timeline) &&
      body.timeline.some(
        (item) =>
          String(item?.year ?? '').trim() || String(item?.event ?? '').trim()
      );
    const hasHotspot =
      body.has_hotspots === true ||
      (Array.isArray(body.hotspots) && body.hotspots.length > 0);
    if (!hasTimeline && !hasHotspot) missing.push('timeline_or_hotspot');

    const status = missing.length > 0 ? 'draft' : 'published';

    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO palaces
        (id, name, name_en, order_num, axis_position, description, dynasty, built_year,
         height, area, style, significance, model_path, audio_guide, category,
         region, city, tagline, quote, quote_by, tags, stats, poster_path, views_data, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.slice(0, 50),
        body.name_en ? String(body.name_en).trim().slice(0, 100) : null,
        orderNum,
        Number(body.axis_position) || 0,
        body.description || null,
        body.dynasty || null,
        body.built_year || null,
        body.height || null,
        body.area || null,
        body.style || null,
        body.significance || null,
        body.model_path || null,
        body.audio_guide || null,
        body.category || null,
        body.region || null,
        body.city || null,
        body.tagline || null,
        body.quote || null,
        body.quote_by || null,
        serializeTags(body.tags),
        serializeStats(body.stats),
        body.poster_path || null,
        serializeViews(body.views),
        status,
      ]
    );
    await replaceRelations(conn, id, body);
    await conn.commit();

    const labels = {
      description: '简介',
      poster_path: '海报',
      timeline_or_hotspot: '沿革或热点',
    };
    const message =
      status === 'draft'
        ? `已保存为草稿（缺少：${missing.map((key) => labels[key] || key).join('、')}）`
        : '建筑档案已发布';

    res.status(201).json({
      success: true,
      message,
      data: { id, status, missing },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('新增建筑失败:', err);
    res.status(500).json({ success: false, error: '新增失败，请检查数据后重试' });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/palaces/:id
 * 更新建筑档案（含沿革 / 典故 / 图影，整体覆盖）
 */
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (body.name !== undefined && !String(body.name).trim()) {
    return res.status(400).json({ success: false, error: '建筑名称不能为空' });
  }

  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.execute('SELECT id FROM palaces WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, error: '建筑档案不存在' });
    }

    const columns = [];
    const values = [];
    const textFields = [
      'name',
      'name_en',
      'description',
      'dynasty',
      'built_year',
      'height',
      'area',
      'style',
      'significance',
      'model_path',
      'audio_guide',
      'category',
      'region',
      'city',
      'tagline',
      'quote',
      'quote_by',
      'poster_path',
    ];

    for (const field of textFields) {
      if (body[field] === undefined) continue;
      const value = body[field];
      columns.push(`${field} = ?`);
      values.push(value === '' || value === null ? null : String(value));
    }

    if (body.order_num !== undefined && body.order_num !== '') {
      columns.push('order_num = ?');
      values.push(Number(body.order_num) || 0);
    }
    if (body.axis_position !== undefined && body.axis_position !== '') {
      columns.push('axis_position = ?');
      values.push(Number(body.axis_position) || 0);
    }
    if (body.tags !== undefined) {
      columns.push('tags = ?');
      values.push(serializeTags(body.tags));
    }
    if (body.stats !== undefined) {
      columns.push('stats = ?');
      values.push(serializeStats(body.stats));
    }
    if (body.views !== undefined) {
      columns.push('views_data = ?');
      values.push(serializeViews(body.views));
    }

    await conn.beginTransaction();
    if (columns.length > 0) {
      columns.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await conn.execute(`UPDATE palaces SET ${columns.join(', ')} WHERE id = ?`, values);
    }
    await replaceRelations(conn, id, body);

    const [[current]] = await conn.execute(
      'SELECT name, description, poster_path, status FROM palaces WHERE id = ?',
      [id]
    );
    const [[{ timeline_count }]] = await conn.execute(
      'SELECT COUNT(*) AS timeline_count FROM palace_timeline WHERE palace_id = ?',
      [id]
    );
    const hasHotspot =
      body.has_hotspots === true ||
      (Array.isArray(body.hotspots) && body.hotspots.length > 0);
    const previousPublished = current.status === 'published';
    const requiredPresent = !!(
      current.name &&
      current.description &&
      current.poster_path
    );
    const contentReady =
      Number(timeline_count) > 0 || hasHotspot || previousPublished;
    const status =
      requiredPresent && contentReady ? 'published' : 'draft';

    await conn.execute('UPDATE palaces SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
    await conn.commit();

    res.json({
      success: true,
      message: status === 'draft' ? '档案已保存为草稿' : '档案已更新并发布',
      data: { id, status },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('更新建筑失败:', err);
    res.status(500).json({ success: false, error: '更新失败，请检查数据后重试' });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/palaces/:id
 * 删除建筑档案及其沿革 / 典故 / 图影
 */
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.execute(
      'SELECT id, name, model_path, poster_path FROM palaces WHERE id = ?',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, error: '建筑档案不存在' });
    }

    await conn.beginTransaction();
    await conn.execute('DELETE FROM palace_timeline WHERE palace_id = ?', [id]);
    await conn.execute('DELETE FROM palace_fun_facts WHERE palace_id = ?', [id]);
    await conn.execute('DELETE FROM palace_images WHERE palace_id = ?', [id]);
    await conn.execute('DELETE FROM palaces WHERE id = ?', [id]);
    await conn.commit();

    // 清理仅由编修台上传的独占资源（内置模型与共享封面保留）
    const { model_path: modelPath, poster_path: posterPath } = exists[0];
    if (modelPath && modelPath.startsWith('uploads/') && !modelPath.includes('..')) {
      fs.promises.unlink(path.join(PROJECT_ROOT, 'models', modelPath)).catch(() => {});
    }
    if (posterPath && posterPath.startsWith('posters/') && !posterPath.includes('..')) {
      const [refs] = await conn.execute('SELECT id FROM palaces WHERE poster_path = ?', [
        posterPath,
      ]);
      if (refs.length === 0) {
        fs.promises.unlink(path.join(PROJECT_ROOT, 'images', posterPath)).catch(() => {});
      }
    }

    res.json({ success: true, message: `「${exists[0].name}」已从图录移除`, data: { id } });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('删除建筑失败:', err);
    res.status(500).json({ success: false, error: '删除失败，请稍后重试' });
  } finally {
    conn.release();
  }
});

module.exports = router;
