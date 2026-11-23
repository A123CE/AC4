const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('资源清单接口', () => {
  it('返回 20 座建筑的三档资源与海报字段', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/assets/manifest');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.equal(typeof data.generated_at, 'string');
    assert.equal(data.ttl_seconds, 300);
    assert.ok(Object.keys(data.palaces).length >= 20);

    const entry = Object.values(data.palaces)[0];
    for (const key of ['high', 'standard', 'smooth', 'poster', 'bytes']) {
      assert.ok(key in entry, `缺少字段 ${key}`);
    }
  });

  it('5 分钟内二次请求命中缓存', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const first = await request(app).get('/api/assets/manifest');
    const second = await request(app).get('/api/assets/manifest');
    assert.equal(first.body.data.generated_at, second.body.data.generated_at);
  });
});