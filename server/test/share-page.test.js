const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('服务端分享卡片页', () => {
  it('宫殿分享页包含 OG/Twitter 元信息与深链跳转', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app)
      .get('/share/palace/taihedian?ch=copy')
      .set('User-Agent', 'Twitterbot/1.0');

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.equal(res.headers['cache-control'], 'public, max-age=300');

    const html = res.text;
    assert.ok(html.includes('property="og:title"'));
    assert.ok(html.includes('property="og:description"'));
    assert.ok(html.includes('property="og:image"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes('location.replace'));
    assert.ok(html.includes('from=share'));
    assert.ok(html.includes('ch=copy'));
    assert.ok(html.includes('<html lang="zh-CN">'));
  });

  it('非法 type 302 到首页', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/share/bogus/x');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/');
  });

  it('内容不存在返回 200 且展示「内容已调整」', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/share/palace/not-exist-content');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('内容已调整'));
    assert.ok(res.text.includes('返回首页'));
  });
});