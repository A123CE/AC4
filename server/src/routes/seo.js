const express = require('express');
const router = express.Router();
const {
  buildSitemap,
  buildSitemapIndex,
  getSitemapPageCount,
} = require('../services/sitemapService');

function resolveOrigin(req) {
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${host}`;
}

router.get('/robots.txt', (req, res) => {
  const origin = resolveOrigin(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Allow: /exhibition/',
    'Allow: /encyclopedia',
    'Allow: /routes',
    'Allow: /share/',
    'Disallow: /api/',
    'Disallow: /profile',
    'Disallow: /curator',
    'Disallow: /search',
    'Disallow: /quiz',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  res.set('Cache-Control', 'public, max-age=3600');
  res.type('text/plain; charset=utf-8').send(body);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await buildSitemap({ origin: resolveOrigin(req) });
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('生成 sitemap 失败:', err);
    res.set('Retry-After', '300');
    res.status(503).json({
      success: false,
      code: 'SITEMAP_UNAVAILABLE',
      error: '站点地图暂不可用',
    });
  }
});

router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const pages = await getSitemapPageCount();
    if (pages <= 1) {
      return res.status(404).json({ success: false, error: '未启用分片' });
    }
    const xml = await buildSitemapIndex({ origin: resolveOrigin(req) });
    res.set('Cache-Control', 'public, max-age=3600');
    return res.type('application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('生成 sitemap 索引失败:', err);
    return res.status(503).json({
      success: false,
      code: 'SITEMAP_UNAVAILABLE',
      error: '站点地图暂不可用',
    });
  }
});

router.get('/sitemap-:page.xml', async (req, res) => {
  try {
    const pages = await getSitemapPageCount();
    if (pages <= 1) {
      return res.status(404).json({ success: false, error: '未启用分片' });
    }
    const xml = await buildSitemap({
      origin: resolveOrigin(req),
      page: Number(req.params.page),
    });
    res.set('Cache-Control', 'public, max-age=3600');
    return res.type('application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('生成 sitemap 分片失败:', err);
    return res.status(503).json({
      success: false,
      code: 'SITEMAP_UNAVAILABLE',
      error: '站点地图暂不可用',
    });
  }
});

module.exports = router;