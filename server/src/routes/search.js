const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const searchService = require('../services/searchService');

const limiter = rateLimit({ windowMs: 60000, max: 60, keyBy: 'ip' });
const VALID_TYPES = new Set(['all', 'palace', 'term', 'question', 'timeline']);

function isDisabled(res) {
  if (String(process.env.FEATURE_SEARCH_ENABLED).toLowerCase() === 'false') {
    res.status(503).json({
      success: false,
      code: 'FEATURE_DISABLED',
      error: '搜索功能暂不可用',
    });
    return true;
  }
  return false;
}

/**
 * GET /api/search?q=&type=&limit=&lang=
 */
router.get('/', optionalAuth, limiter, async (req, res) => {
  if (isDisabled(res)) return;

  try {
    const raw = String(req.query.q ?? '').trim();
    if (!raw || raw.length > 50 || /^[%_]+$/.test(raw)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '搜索词需为 1~50 个字符',
      });
    }

    const type = String(req.query.type ?? 'all');
    if (!VALID_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '不支持的搜索类型',
      });
    }

    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 8, 1),
      20
    );
    const lang = String(req.query.lang ?? 'zh-CN');
    const category = String(req.query.category ?? '').trim().slice(0, 50);
    const dynasty = String(req.query.dynasty ?? '').trim().slice(0, 50);

    const started = Date.now();
    const result = await searchService.search(raw, {
      type,
      limit,
      lang,
      category,
      dynasty,
    });
    const tookMs = Date.now() - started;

    res.json({
      success: true,
      data: {
        q: raw,
        total: result.total,
        took_ms: tookMs,
        groups: result.groups,
      },
    });
  } catch (err) {
    console.error('搜索失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/search/suggest?q=
 */
router.get('/suggest', optionalAuth, limiter, async (req, res) => {
  if (isDisabled(res)) return;

  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length > 50) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '搜索词过长',
      });
    }

    const data = await searchService.suggest(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error('获取搜索建议失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;