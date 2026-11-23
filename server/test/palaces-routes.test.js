const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('palaces 路由顺序回归', () => {
  it('GET /api/palaces/filter 命中 filter 分支而非 :id', async (t) => {
    if (!(await db.canConnect())) {
      t.skip('ac4_test 数据库不可用');
      return;
    }

    const res = await request(app).get('/api/palaces/filter');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.meta?.source, 'filter');
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET /api/palaces/search 不被 :id 捕获', async (t) => {
    if (!(await db.canConnect())) {
      t.skip('ac4_test 数据库不可用');
      return;
    }

    const res = await request(app).get('/api/palaces/search').query({ q: '太和' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});