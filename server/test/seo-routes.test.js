const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('SEO 路由', () => {
  it('robots.txt 为纯文本且含抓取规则', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/robots.txt');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/plain/);
    assert.match(res.text, /^User-agent:/);
    assert.match(res.text, /Disallow: \/api\//);
    assert.match(res.text, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
    assert.match(res.headers['cache-control'], /max-age=3600/);
  });

  it('sitemap.xml 为 XML 且包含公开建筑', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /xml/);
    assert.match(res.text, /^<\?xml/);
    assert.match(res.text, /\/exhibition\/taihedian/);
    assert.equal(res.text.includes('/share/'), false);
  });

  it('未超限时 sitemap-index 返回 404', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/sitemap-index.xml');
    assert.equal(res.status, 404);
  });

  it('私有 SPA 页返回 noindex 响应头，API 仍为 JSON', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const search = await request(app).get('/search');
    assert.equal(search.headers['x-robots-tag'], 'noindex, follow');

    const api = await request(app).get('/api/palaces');
    assert.match(api.headers['content-type'], /json/);
  });
});