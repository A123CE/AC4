const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/hotspots/read
 * Body: { palace_id, hotspot_id }
 */
router.post('/read', authMiddleware, async (req, res) => {
  try {
    const palaceId = String(req.body?.palace_id || '').trim();
    const hotspotId = String(req.body?.hotspot_id || '').trim();

    if (!palaceId || !hotspotId || palaceId.length > 50 || hotspotId.length > 64) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: 'palace_id / hotspot_id 不合法',
      });
    }

    const [palaces] = await pool.execute(
      'SELECT id FROM palaces WHERE id = ?',
      [palaceId]
    );
    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '建筑不存在' });
    }

    await pool.execute(
      `INSERT IGNORE INTO hotspot_reads (user_id, palace_id, hotspot_id)
       VALUES (?, ?, ?)`,
      [req.user.id, palaceId, hotspotId]
    );

    const [[row]] = await pool.execute(
      `SELECT read_at FROM hotspot_reads
       WHERE user_id = ? AND palace_id = ? AND hotspot_id = ?`,
      [req.user.id, palaceId, hotspotId]
    );

    res.json({
      success: true,
      data: {
        palace_id: palaceId,
        hotspot_id: hotspotId,
        read_at: row?.read_at || null,
      },
    });
  } catch (err) {
    console.error('标记热点已读失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/hotspots/reads?palace_id=
 */
router.get('/reads', authMiddleware, async (req, res) => {
  try {
    const palaceId = String(req.query.palace_id || '').trim();
    const params = [req.user.id];
    let where = 'WHERE user_id = ?';

    if (palaceId) {
      where += ' AND palace_id = ?';
      params.push(palaceId);
    }

    const [rows] = await pool.execute(
      `SELECT palace_id, hotspot_id, read_at
       FROM hotspot_reads
       ${where}
       ORDER BY read_at DESC
       LIMIT 200`,
      params
    );

    res.json({ success: true, data: { items: rows } });
  } catch (err) {
    console.error('获取热点已读失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;