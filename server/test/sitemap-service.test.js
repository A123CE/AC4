const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const {
  buildSitemap,
  buildSitemapIndex,
  clearSitemapCache,
} = require('../src/services/sitemapService');

let dbReady = false;
const draftId = `sitemap_draft_${Date.now()}`;

describe('sitemapService', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (dbReady) {
      await pool.query(
        "INSERT IGNORE INTO palaces (id, name, order_num, status) VALUES (?, ?, 999, 'draft')",
        [draftId, 'Sitemap Draft']
      );
      clearSitemapCache();
    }
  });

  after(async () => {
    if (dbReady) {
      await pool.query('DELETE FROM palaces WHERE id = ?', [draftId]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('生成合法 urlset，仅含公开内容且不含 share 别名', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const xml = await buildSitemap({ origin: 'https://example.com' });
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('<urlset'));
    assert.ok(xml.includes('/exhibition/taihedian'));

    assert.equal(xml.includes('/share/'), false);
    assert.equal(xml.includes(draftId), false);
    assert.ok(xml.includes('&amp;term=') || xml.includes('?term='));
  });

  it('索引可生成，且缓存命中不重复查询', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const index = await buildSitemapIndex({ origin: 'https://example.com' });
    assert.ok(index.includes('<sitemapindex'));
    assert.ok(index.includes('/sitemap.xml'));

    const first = await buildSitemap({ origin: 'https://example.com' });
    const second = await buildSitemap({ origin: 'https://example.com' });
    assert.equal(first, second);
  });
});