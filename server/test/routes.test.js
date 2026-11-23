const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let user = null;
let token = null;

describe('主题导览路线', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`route_test_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'route_test', role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('返回已发布路线列表与站点数', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/routes');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const route = res.body.data.find((item) => item.id === 'axis-day');
    assert.ok(route);
    assert.equal(route.stops_count, 8);
    assert.equal(route.duration_minutes, 240);
    assert.equal(route.progress.stop_order, 1);
  });

  it('详情包含按顺序的 stops 与 skipped 数组', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/routes/axis-day');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stops.length, 8);
    assert.ok(Array.isArray(res.body.data.skipped));
    assert.equal(res.body.data.stops[0].stop_order, 1);
    assert.equal(res.body.data.stops[0].palace.id, 'wumen');
    assert.ok(res.body.data.stops[0].highlight);
    assert.equal(res.body.data.progress.total, 8);
  });

  it('登录用户可保存路线进度', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const put = await request(app)
      .put('/api/routes/axis-day/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ stop_order: 3 });

    assert.equal(put.status, 200);
    assert.equal(put.body.data.stop_order, 3);

    const detail = await request(app)
      .get('/api/routes/axis-day')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(detail.body.data.progress.stop_order, 3);
  });

  it('越界进度返回 400', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app)
      .put('/api/routes/axis-day/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ stop_order: 99 });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_FAILED');
  });
});