const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const analyticsService = require('../services/analyticsService');

const eventLimiter = rateLimit({ windowMs: 60000, max: 120, keyBy: 'ip' });

/**
 * POST /api/metrics/events
 * 匿名批量埋点；白名单外事件静默丢弃
 */
router.post('/events', eventLimiter, async (req, res) => {
  try {
    const events = req.body?.events;
    if (!Array.isArray(events) || events.length === 0 || events.length > 20) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: 'events 需为 1~20 条数组',
      });
    }

    const accepted = await analyticsService.recordEvents(events, {
      anon_hash: req.body?.anon_hash,
      session_hash: req.body?.session_hash,
      locale: req.body?.locale,
      tier: req.body?.tier,
      path: req.body?.path,
    });

    res.json({ success: true, data: { accepted } });
  } catch (err) {
    console.error('写入埋点失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/metrics/funnel?from=&to=
 */
router.get('/funnel', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await analyticsService.getFunnel({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('获取漏斗失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;