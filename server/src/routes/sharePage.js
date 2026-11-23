const express = require('express');
const router = express.Router();
const {
  isValidShareType,
  sanitizeChannel,
  getShareContent,
  getRecommendations,
  recordShareVisit,
  renderShareHtml,
  buildCanonical,
  buildJsonLd,
  buildAlternates,
  absoluteImageUrl,
} = require('../services/shareCard');

/**
 * GET /share/:type/:id
 * 服务端最小分享卡片页：输出 OG/Twitter 元信息后跳转 SPA 深链
 */
router.get('/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  if (!isValidShareType(type)) {
    return res.redirect(302, '/');
  }

  const channel = sanitizeChannel(req.query.ch);
  const origin = `${req.protocol}://${req.get('host')}`;
  const canonicalUrl = buildCanonical(origin, type, id);

  try {
    const content = await getShareContent(type, id);
    const recommendations = content ? [] : await getRecommendations(3);
    const isOffline = !content;
    const imageUrl = absoluteImageUrl(content?.image, origin);

    const html = renderShareHtml({
      content,
      type,
      id,
      channel,
      recommendations,
      origin,
      canonicalUrl,
      jsonLd: content
        ? buildJsonLd({ type, content, canonical: canonicalUrl, imageUrl })
        : null,
      alternates: content
        ? buildAlternates({ coverage: content.coverage, canonicalUrl })
        : [],
      isOffline,
    });

    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(html);

    if (content) {
      recordShareVisit({
        entityType: type,
        entityId: id,
        channel,
        referer: req.get('referer'),
      }).catch((err) => console.error('记录分享回流失败:', err.message));
    }
  } catch (err) {
    console.error('渲染分享卡片失败:', err);
    res.status(200).type('html').send(
      renderShareHtml({
        content: null,
        type,
        id,
        channel,
        recommendations: [],
        origin,
        canonicalUrl,
        isOffline: true,
      })
    );
  }
});

module.exports = router;