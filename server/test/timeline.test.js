const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('timeline 聚合接口', () => {
  it('返回 events 数组且字段完整', async (t) => {
    if (!(await db.canConnect())) {
      t.skip('ac4_test 数据库不可用');
      return;
    }

    const res = await request(app).get('/api/timeline');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.events));

    if (res.body.data.events.length > 0) {
      const event = res.body.data.events[0];
      assert.ok('palace_id' in event);
      assert.ok('palace_name' in event);
      assert.ok('year' in event);
      assert.ok('event' in event);
    }
  });
});