const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const engine = require('../src/services/achievementEngine');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let user = null;
let token = null;

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('成就查询接口', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`achievements_api_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'achievements_api', role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('新用户集章 0/20，徽章 12 枚，无 user_id', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).get('/api/achievements'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stamps.total, 20);
    assert.equal(res.body.data.stamps.earned, 0);
    assert.equal(res.body.data.badges.length, 12);
    assert.ok(res.body.data.next_targets.length <= 3);
    assert.equal('user_id' in res.body.data.stamps.items[0], false);
    assert.ok(res.body.data.stamps.items[0].design_key);
  });

  it('浏览 20 座后集章 20/20', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const [palaces] = await pool.query('SELECT id FROM palaces');
    for (const palace of palaces) {
      await engine.grantStamp(user.id, palace.id);
    }

    const res = await auth(request(app).get('/api/achievements'));
    assert.equal(res.body.data.stamps.total, 20);
    assert.equal(res.body.data.stamps.earned, 20);
  });

  it('stamps 与 learning 接口可用', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const stamps = await auth(request(app).get('/api/achievements/stamps'));
    assert.equal(stamps.status, 200);
    assert.equal(stamps.body.data.total, 20);

    const learning = await auth(request(app).get('/api/achievements/learning'));
    assert.equal(learning.status, 200);
    assert.deepEqual(learning.body.data.items, []);
  });
});