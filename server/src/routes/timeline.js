const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/timeline
 * 聚合全部建筑的历史沿革事件，替代前端逐座请求详情造成的 N+1
 * Query: category, dynasty
 */
router.get('/', async (req, res) => {
  try {
    const { category, dynasty } = req.query;

    let sql = `
      SELECT
        t.palace_id,
        p.name AS palace_name,
        p.dynasty,
        p.category,
        p.built_year,
        p.region,
        p.city,
        t.year,
        t.event
      FROM palace_timeline t
      JOIN palaces p ON p.id = t.palace_id AND p.status = 'published'
      WHERE 1 = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (dynasty) {
      sql += ' AND p.dynasty LIKE ?';
      params.push(`%${dynasty}%`);
    }

    sql += ' ORDER BY t.year ASC';

    const [events] = await pool.execute(sql, params);
    res.json({ success: true, data: { events } });
  } catch (err) {
    console.error('获取时间轴事件失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;