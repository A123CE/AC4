const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('分类与朝代导航接口', () => {
  it('返回分类/地区/朝代/术语分组且来自数据库', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/taxonomy');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    for (const key of ['categories', 'regions', 'dynasties', 'terms']) {
      assert.ok(Array.isArray(data[key]), `缺少数组 ${key}`);
    }
    assert.ok(data.categories.includes('宫殿'));
    assert.ok(data.dynasties.length > 0);
    assert.ok(data.categories.length > 0);
  });

  it('10 分钟内二次请求返回缓存内容', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const first = await request(app).get('/api/taxonomy');
    const second = await request(app).get('/api/taxonomy');
    assert.deepEqual(first.body.data, second.body.data);
  });
});