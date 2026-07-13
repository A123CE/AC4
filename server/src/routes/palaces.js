const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/palaces
 * 获取所有宫殿列表（支持筛选）
 * Query: category (宫殿/关隘), dynasty (明/清)
 */
router.get('/', async (req, res) => {
  try {
    const { category, dynasty } = req.query;

    let sql = 'SELECT * FROM palaces ORDER BY order_num ASC';
    const params = [];

    if (category || dynasty) {
      sql = 'SELECT * FROM palaces WHERE 1=1';
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (dynasty) {
        sql += ' AND dynasty LIKE ?';
        params.push(`%${dynasty}%`);
      }
      sql += ' ORDER BY order_num ASC';
    }

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
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
          WHEN p.name LIKE ? THEN 3
          WHEN p.name_en LIKE ? THEN 2
          WHEN p.description LIKE ? THEN 1
          ELSE 0
        END) AS relevance
      FROM palaces p
      WHERE p.name LIKE ? OR p.name_en LIKE ? OR p.description LIKE ? OR p.category LIKE ?
      ORDER BY relevance DESC, p.order_num ASC
    `;

    const [rows] = await pool.execute(sql, [
      keyword, keyword, keyword,
      keyword, keyword, keyword, keyword
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('搜索宫殿失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/palaces/:id
 * 获取单个宫殿详情（含图片、时间线、典故）
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取宫殿基本信息
    const [palaces] = await pool.execute(
      'SELECT * FROM palaces WHERE id = ?',
      [id]
    );

    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    const palace = palaces[0];

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

    res.json({
      success: true,
      data: {
        ...palace,
        images: images.map(img => img.image_path),
        timeline: timeline.map(t => ({ year: t.year, event: t.event })),
        funFacts: funFacts.map(f => f.fact)
      }
    });
  } catch (err) {
    console.error('获取宫殿详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/palaces/filter
 * 按条件筛选
 * Query: category, dynasty
 */
router.get('/filter', async (req, res) => {
  try {
    const { category, dynasty } = req.query;

    let sql = 'SELECT * FROM palaces WHERE 1=1';
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
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('筛选宫殿失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
