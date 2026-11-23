const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const recommendService = require('../services/recommendService');

/**
 * GET /api/recommend?scene=home|detail&palace_id=&limit=
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const scene = req.query.scene === 'detail' ? 'detail' : 'home';
    const palaceId =
      typeof req.query.palace_id === 'string' ? req.query.palace_id : null;

    if (scene === 'detail' && !palaceId) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '详情推荐需要 palace_id',
      });
    }

    const data = await recommendService.recommend({
      userId: req.user?.id || null,
      scene,
      palaceId,
      limit: req.query.limit,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('获取推荐失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;