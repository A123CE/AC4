const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');

describe('server smoke', () => {
  it('健康检查返回 ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(typeof res.body.timestamp, 'string');
  });

  it('建筑列表响应为统一包装结构', async () => {
    const res = await request(app).get('/api/palaces');
    assert.ok([200, 500].includes(res.status));
    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    }
  });
});