const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('搜索接口', () => {
  it('公开搜索返回分组与 took_ms', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/search').query({ q: '斗拱' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.groups.length, 4);
    assert.equal(typeof res.body.data.took_ms, 'number');
    assert.ok(res.body.data.took_ms <= 500);
  });

  it('纯通配搜索返回 400', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/search').query({ q: '%' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_FAILED');
  });

  it('limit 超限归一化到 1~20', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const zero = await request(app).get('/api/search').query({ q: '建筑', limit: 0 });
    assert.equal(zero.status, 200);
    assert.ok(zero.body.data.groups[0].items.length <= 1);

    const many = await request(app).get('/api/search').query({ q: '建筑', limit: 99 });
    assert.equal(many.status, 200);
    assert.ok(many.body.data.groups[0].items.length <= 20);
  });

  it('搜索建议返回 hot/corrections/categories/recommended', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/search/suggest').query({ q: '斗' });
    assert.equal(res.status, 200);
    for (const key of ['hot', 'corrections', 'categories', 'recommended']) {
      assert.ok(key in res.body.data, `缺少 ${key}`);
    }
  });

  it('功能开关关闭时返回 503', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const previous = process.env.FEATURE_SEARCH_ENABLED;
    process.env.FEATURE_SEARCH_ENABLED = 'false';

    try {
      const res = await request(app).get('/api/search').query({ q: '斗拱' });
      assert.equal(res.status, 503);
      assert.equal(res.body.code, 'FEATURE_DISABLED');
    } finally {
      if (previous === undefined) delete process.env.FEATURE_SEARCH_ENABLED;
      else process.env.FEATURE_SEARCH_ENABLED = previous;
    }
  });

  it('频率超限返回 429', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    let lastStatus = 200;
    for (let i = 0; i < 62; i += 1) {
      const res = await request(app).get('/api/search').query({ q: '斗拱' });
      lastStatus = res.status;
    }
    assert.equal(lastStatus, 429);
  });
});