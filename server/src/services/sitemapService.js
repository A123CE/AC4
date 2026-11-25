const pool = require('../db');

const MAX_URLS_PER_SITEMAP = 45000;
const TTL_MS = 5 * 60 * 1000;

const cache = new Map();

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeOrigin(origin) {
  const value = String(origin || '').trim().replace(/\/+$/, '');
  if (!value) throw new Error('sitemap origin 不能为空');
  return value;
}

function formatLastmod(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function urlEntry(origin, path, lastmod) {
  const lines = [`    <loc>${escapeXml(`${origin}${path}`)}</loc>`];
  const formatted = formatLastmod(lastmod);
  if (formatted) lines.push(`    <lastmod>${formatted}</lastmod>`);
  return `  <url>\n${lines.join('\n')}\n  </url>`;
}

async function loadEntries() {
  const [palaces] = await pool.query(
    "SELECT id, updated_at FROM palaces WHERE status = 'published' ORDER BY id ASC"
  );
  const [terms] = await pool.query(
    "SELECT id, COALESCE(updated_at, created_at) AS lastmod FROM encyclopedia_terms WHERE status = 'published' ORDER BY sort_order ASC, id ASC"
  );
  const [routes] = await pool.query(
    'SELECT id, created_at FROM curated_routes WHERE is_published = 1 ORDER BY id ASC'
  );

  return [
    ...palaces.map((row) => ({
      path: `/exhibition/${encodeURIComponent(row.id)}`,
      lastmod: row.updated_at,
    })),
    ...terms.map((row) => ({
      path: `/encyclopedia?term=${encodeURIComponent(row.id)}`,
      lastmod: row.lastmod,
    })),
    ...routes.map((row) => ({
      path: `/routes/${encodeURIComponent(row.id)}`,
      lastmod: row.lastmod,
    })),
  ];
}

function pageCount(total) {
  return Math.max(1, Math.ceil(total / MAX_URLS_PER_SITEMAP));
}

async function buildSitemap({ origin, page = 1 }) {
  const base = normalizeOrigin(origin);
  const pageNo = Number(page) || 1;
  const cacheKey = `sitemap:${base}:${pageNo}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const entries = await loadEntries();
  const pages = pageCount(entries.length);
  if (pageNo < 1 || pageNo > pages) {
    throw new RangeError(`sitemap 页码越界: ${pageNo}/${pages}`);
  }

  const slice = entries.slice(
    (pageNo - 1) * MAX_URLS_PER_SITEMAP,
    pageNo * MAX_URLS_PER_SITEMAP
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...slice.map((entry) => urlEntry(base, entry.path, entry.lastmod)),
    '</urlset>',
    '',
  ].join('\n');

  cache.set(cacheKey, { value: xml, expiresAt: Date.now() + TTL_MS });
  return xml;
}

async function buildSitemapIndex({ origin }) {
  const base = normalizeOrigin(origin);
  const cacheKey = `index:${base}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const entries = await loadEntries();
  const pages = pageCount(entries.length);
  const locs =
    pages === 1
      ? [`${base}/sitemap.xml`]
      : Array.from({ length: pages }, (_, index) => `${base}/sitemap-${index + 1}.xml`);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locs.map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');

  cache.set(cacheKey, { value: xml, expiresAt: Date.now() + TTL_MS });
  return xml;
}

async function getSitemapPageCount() {
  const entries = await loadEntries();
  return pageCount(entries.length);
}

function clearSitemapCache() {
  cache.clear();
}

module.exports = {
  MAX_URLS_PER_SITEMAP,
  buildSitemap,
  buildSitemapIndex,
  getSitemapPageCount,
  clearSitemapCache,
  escapeXml,
};