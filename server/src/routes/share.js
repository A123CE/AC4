const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  isValidShareType,
  shareEntityExists,
  recordShareVisit,
} = require('../services/shareCard');

const visitLimiter = rateLimit({ windowMs: 60000, max: 120, keyBy: 'ip' });

/**
 * POST /api/share/visit
 * 公开分享回流上报；非法实体静默成功（防枚举）
 */
router.post('/visit', visitLimiter, async (req, res) => {
  try {
    const { entity_type, entity_id, channel } = req.body || {};

    if (!isValidShareType(entity_type) || !entity_id) {
      return res.json({ success: true });
    }

    const exists = await shareEntityExists(entity_type, entity_id);
    if (!exists) {
      return res.json({ success: true });
    }

    await recordShareVisit({
      entityType: entity_type,
      entityId: entity_id,
      channel,
      // 忽略客户端 referer_class，由服务端根据 Referer 归类
      referer: req.get('referer'),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('分享回流上报失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/share/stats
 * 管理员查看分享回流
 */
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { from, to, entity_type } = req.query;
    const where = ['1 = 1'];
    const params = [];

    if (from) {
      where.push('visit_date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('visit_date <= ?');
      params.push(to);
    }
    if (entity_type) {
      where.push('entity_type = ?');
      params.push(entity_type);
    }

    const [rows] = await pool.execute(
      `SELECT entity_type, entity_id, channel, visit_date, count
       FROM share_visits
       WHERE ${where.join(' AND ')}
       ORDER BY visit_date DESC, count DESC
       LIMIT 500`,
      params
    );

    res.json({ success: true, data: { rows } });
  } catch (err) {
    console.error('获取分享统计失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;