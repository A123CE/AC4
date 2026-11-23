const express = require('express');
const router = express.Router();
const contentI18n = require('../services/contentI18n');

/**
 * GET /api/content/coverage
 */
router.get('/coverage', async (req, res) => {
  try {
    const data = await contentI18n.getCoverage();
    res.json({ success: true, data });
  } catch (err) {
    console.error('获取内容覆盖度失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/content/palace/:id?lang=en
 */
router.get('/palace/:id', async (req, res) => {
  try {
    const locale = req.query.lang === 'en' ? 'en' : 'zh-CN';
    const data = await contentI18n.getPalaceContent(req.params.id, locale);
    if (!data) {
      return res.status(404).json({ success: false, error: '建筑不存在' });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('获取建筑翻译失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;