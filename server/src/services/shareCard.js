const fs = require('fs');
const path = require('path');
const pool = require('../db');

const SHARE_CHANNELS = new Set(['copy', 'system', 'wechat', 'weibo', 'link']);
const SHARE_TYPES = new Set(['palace', 'term', 'route']);
const DEFAULT_OG_IMAGE = '/images/brand/og-default.webp';
const FALLBACK_OG_IMAGE = '/images/posters/gugong.webp';
const SITE_NAME = '华夏古建';

function resolveOgFallback() {
  try {
    const brandImage = path.resolve(__dirname, '../../../images/brand/og-default.webp');
    if (fs.existsSync(brandImage)) return DEFAULT_OG_IMAGE;
  } catch {
    /* 资源目录不可读时回退 */
  }
  return FALLBACK_OG_IMAGE;
}

function sanitizeChannel(value) {
  const channel = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SHARE_CHANNELS.has(channel) ? channel : 'unknown';
}

function isValidShareType(type) {
  return SHARE_TYPES.has(type);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value, length = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function firstImageFromPaths(raw) {
  if (!raw) return null;
  try {
    const paths = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(paths) && paths.length > 0) return paths[0];
  } catch {
    return null;
  }
  return null;
}

function resolveOgImage(imagePath) {
  if (!imagePath) return resolveOgFallback();
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith('/images/')) return imagePath;
  if (imagePath.startsWith('images/')) return `/${imagePath}`;
  return `/images/${imagePath}`;
}

function absoluteImageUrl(imagePath, origin) {
  const relative = resolveOgImage(imagePath);
  return new URL(relative, origin || 'http://localhost').toString();
}

function buildCanonical(origin, type, id) {
  const base = String(origin || '').replace(/\/+$/, '');
  if (type === 'palace') return `${base}/exhibition/${encodeURIComponent(id)}`;
  if (type === 'term') return `${base}/encyclopedia?term=${encodeURIComponent(id)}`;
  if (type === 'route') return `${base}/routes/${encodeURIComponent(id)}`;
  return `${base}/`;
}

function buildJsonLd({ type, content, canonical, imageUrl }) {
  if (!content) return null;

  if (type === 'palace') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: content.name || content.title,
      description: content.description,
      image: imageUrl,
      url: canonical,
    };

    const addressLocality = content.city || content.region || '';
    if (addressLocality) {
      data.address = {
        '@type': 'PostalAddress',
        addressLocality,
        addressCountry: 'CN',
      };
      if (content.region) data.address.addressRegion = content.region;
    }

    return data;
  }

  if (type === 'term') {
    const organization = { '@type': 'Organization', name: SITE_NAME };
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.name || content.title,
      description: content.description,
      image: imageUrl,
      url: canonical,
      author: organization,
      publisher: organization,
    };
  }

  return null;
}

function buildAlternates({ coverage, canonicalUrl }) {
  const xDefault = { hreflang: 'x-default', href: canonicalUrl };
  if (!coverage?.hasName || !coverage?.hasDescription) return [xDefault];

  const separator = canonicalUrl.includes('?') ? '&' : '?';
  return [
    { hreflang: 'zh-CN', href: canonicalUrl },
    { hreflang: 'en', href: `${canonicalUrl}${separator}lang=en` },
    xDefault,
  ];
}

async function loadTranslationCoverage(entityType, entityId) {
  try {
    const [rows] = await pool.execute(
      `SELECT field, status FROM content_translations
       WHERE entity_type = ? AND entity_id = ? AND locale = 'en'`,
      [entityType, String(entityId)]
    );
    const statusMap = new Map(rows.map((row) => [row.field, row.status]));
    return {
      hasName: statusMap.get('name') === 'full',
      hasDescription: statusMap.get('description') === 'full',
    };
  } catch (err) {
    console.error('读取译文覆盖失败:', err.message);
    return { hasName: false, hasDescription: false };
  }
}

async function getShareContent(type, id) {
  if (!isValidShareType(type) || !id) return null;

  if (type === 'palace') {
    const [rows] = await pool.execute(
      `SELECT id, name, name_en, tagline, description, dynasty, category,
              region, city, poster_path
       FROM palaces WHERE id = ? AND status = 'published'`,
      [id]
    );
    const palace = rows[0];
    if (!palace) return null;

    const coverage = await loadTranslationCoverage('palace', palace.id);

    return {
      type,
      id: palace.id,
      name: palace.name,
      title: `${palace.name} · 华夏古建`,
      description: truncate(palace.tagline || palace.description || '中国古建筑 3D 可视化'),
      image: resolveOgImage(palace.poster_path),
      redirect: `/exhibition/${encodeURIComponent(palace.id)}`,
      region: palace.region || null,
      city: palace.city || null,
      coverage,
    };
  }

  if (type === 'term') {
    const [rows] = await pool.execute(
      `SELECT id, term, synopsis, image_paths FROM encyclopedia_terms WHERE id = ?`,
      [id]
    );
    const term = rows[0];
    if (!term) return null;

    const coverage = await loadTranslationCoverage('term', term.id);

    return {
      type,
      id: term.id,
      name: term.term,
      title: `${term.term} · 营造法式`,
      description: truncate(term.synopsis || `古建筑术语：${term.term}`),
      image: resolveOgImage(firstImageFromPaths(term.image_paths)),
      redirect: `/encyclopedia?term=${encodeURIComponent(term.id)}`,
      coverage,
    };
  }

  // route 类型等待 T-S2-05 的路由表
  return null;
}

async function getRecommendations(limit = 3) {
  const [rows] = await pool.execute(
    `SELECT id, name, poster_path FROM palaces WHERE status = 'published' ORDER BY order_num ASC LIMIT ${Math.min(
      Math.max(Number(limit) || 3, 1),
      10
    )}`
  );
  return rows;
}

async function shareEntityExists(type, id) {
  if (!isValidShareType(type) || !id) return false;

  if (type === 'palace') {
    const [[row]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM palaces WHERE id = ? AND status = 'published'",
      [id]
    );
    return Number(row.total) > 0;
  }
  if (type === 'term') {
    const [[row]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM encyclopedia_terms WHERE id = ?',
      [id]
    );
    return Number(row.total) > 0;
  }
  return false;
}

function classifyReferer(referer) {
  if (!referer) return 'direct';
  try {
    const host = new URL(referer).hostname.toLowerCase();
    if (/baidu|google|bing|sogou|so\.com|yandex/.test(host)) return 'search';
    if (/wechat|weixin|weibo|qq\.com|douyin|toutiao|xiaohongshu|zhihu/.test(host)) {
      return 'social';
    }
    return 'internal';
  } catch {
    return 'direct';
  }
}

async function recordShareVisit({ entityType, entityId, channel, referer }) {
  if (!isValidShareType(entityType) || !entityId) return false;

  const safeChannel = sanitizeChannel(channel);
  const refererClass = classifyReferer(referer);

  await pool.execute(
    `INSERT INTO share_visits
       (entity_type, entity_id, channel, visit_date, referer_class, count)
     VALUES (?, ?, ?, CURDATE(), ?, 1)
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [entityType, String(entityId), safeChannel, refererClass]
  );

  return true;
}

function renderShareHtml({
  content,
  type,
  id,
  channel,
  recommendations = [],
  origin = '',
  canonicalUrl = '',
  jsonLd = null,
  alternates = [],
  isOffline = false,
}) {
  const safeChannel = sanitizeChannel(channel);
  const target = content?.redirect || '';
  const redirect =
    content && target
      ? `${target}${target.includes('?') ? '&' : '?'}from=share&ch=${safeChannel}`
      : '/';

  const title = content?.title || '内容已调整 · 华夏古建';
  const description =
    content?.description ||
    '该内容可能已下线或地址有误，返回首页继续探索华夏古建筑。';
  const imageUrl = absoluteImageUrl(content?.image, origin);
  const canonical = canonicalUrl || origin || '';
  const ldJson = !isOffline && jsonLd
    ? JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    : '';
  const alternateHtml = alternates
    .map(
      (item) =>
        `<link rel="alternate" hreflang="${escapeHtml(item.hreflang)}" href="${escapeHtml(item.href)}" />`
    )
    .join('\n');

  const recommendationHtml = recommendations
    .map(
      (palace) =>
        `<a class="rec" href="/exhibition/${encodeURIComponent(palace.id)}">${escapeHtml(
          palace.name
        )}</a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(imageUrl)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
${isOffline ? '<meta name="robots" content="noindex,follow" />' : ''}
${alternateHtml}
${ldJson ? `<script type="application/ld+json">${ldJson}</script>` : ''}
<style>
  :root { color-scheme: light; }
  body {
    margin: 0 auto; max-width: 680px; padding: 48px 24px;
    background: #F3EBDD; color: #3C2A1E;
    font-family: "Noto Serif SC", "Songti SC", serif;
  }
  h1 { font-size: 1.8rem; margin: 0 0 12px; color: #8A2418; }
  p { line-height: 1.8; color: #5C4636; }
  .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
  .actions a, .rec {
    display: inline-block; padding: 9px 18px; border-radius: 20px;
    border: 1px solid #C9A86A; color: #8A2418; text-decoration: none;
  }
  .rec { margin: 6px 8px 0 0; }
  .muted { color: #8A7A68; font-size: 0.85rem; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  ${
    content
      ? `<p class="muted">正在打开数字展厅…</p>
  <div class="actions"><a href="${escapeHtml(redirect)}">继续访问</a></div>`
      : `<p class="muted">为你推荐这些建筑：</p>
  <div>${recommendationHtml || '<span class="muted">暂无推荐</span>'}</div>
  <div class="actions"><a href="/">返回首页</a></div>`
  }
  <noscript>
    <div class="actions"><a href="${escapeHtml(redirect)}">继续访问</a></div>
  </noscript>
  ${
    content
      ? `<script>window.location.replace(${JSON.stringify(redirect)});</script>`
      : ''
  }
</body>
</html>`;
}

module.exports = {
  SHARE_CHANNELS,
  SHARE_TYPES,
  sanitizeChannel,
  isValidShareType,
  escapeHtml,
  resolveOgImage,
  resolveOgFallback,
  absoluteImageUrl,
  buildCanonical,
  buildJsonLd,
  buildAlternates,
  loadTranslationCoverage,
  getShareContent,
  getRecommendations,
  shareEntityExists,
  classifyReferer,
  recordShareVisit,
  renderShareHtml,
  DEFAULT_OG_IMAGE,
  FALLBACK_OG_IMAGE,
};