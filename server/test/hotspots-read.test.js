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

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('热点已读与学习记录', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`hotspot_test_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'hotspot_test', role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('标记热点已读幂等并可查询', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const first = await auth(request(app).post('/api/hotspots/read')).send({
      palace_id: 'taihedian',
      hotspot_id: 'dougong',
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.data.hotspot_id, 'dougong');

    const second = await auth(request(app).post('/api/hotspots/read')).send({
      palace_id: 'taihedian',
      hotspot_id: 'dougong',
    });
    assert.equal(second.status, 200);

    const reads = await auth(request(app).get('/api/hotspots/reads')).query({
      palace_id: 'taihedian',
    });
    assert.equal(reads.status, 200);
    assert.equal(reads.body.data.items.length, 1);
  });

  it('个人中心学习记录返回最近已读热点', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).get('/api/achievements/learning'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length >= 1);

    const item = res.body.data.items[0];
    assert.equal(item.palace_id, 'taihedian');
    assert.equal(item.palace_name, '太和殿');
    assert.equal(item.hotspot_id, 'dougong');
    assert.ok(item.read_at);
  });
});