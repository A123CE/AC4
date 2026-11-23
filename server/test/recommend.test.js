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
let samplePalace = null;
let sampleTag = null;

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('个性化推荐', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`recommend_test_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'recommend_test', role: 'user' };
    token = generateToken(user);

    const [palaces] = await pool.query(
      "SELECT id, name, tags FROM palaces WHERE tags IS NOT NULL AND tags <> '' LIMIT 1"
    );
    samplePalace = palaces[0] || null;
    if (samplePalace) {
      sampleTag = String(samplePalace.tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)[0];
    }
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('新用户首页推荐位非空且走通用策略', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/recommend').query({ scene: 'home' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length > 0);
    assert.ok(['popular', 'fallback'].includes(res.body.data.strategy));
  });

  it('活跃标签 + 浏览历史返回个性化推荐与理由', async (t) => {
    if (!dbReady || !samplePalace || !sampleTag) return t.skip('缺少测试数据');

    await pool.query(
      `INSERT INTO user_tags (user_id, tag_name, weight) VALUES (?, ?, 6)
       ON DUPLICATE KEY UPDATE weight = 6`,
      [user.id, sampleTag]
    );
    await pool.query(
      'INSERT INTO user_history (user_id, palace_id, duration_seconds) VALUES (?, ?, 12)',
      [user.id, samplePalace.id]
    );

    const res = await auth(request(app).get('/api/recommend')).query({
      scene: 'home',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.strategy, 'personalized');
    assert.ok(res.body.data.items.length > 0);
    assert.ok(res.body.data.items.every((item) => item.reason_text));
  });

  it('详情推荐返回非空且带关系理由', async (t) => {
    if (!dbReady || !samplePalace) return t.skip('缺少测试数据');

    const res = await auth(request(app).get('/api/recommend')).query({
      scene: 'detail',
      palace_id: samplePalace.id,
      limit: 4,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length > 0);
    const item = res.body.data.items[0];
    assert.ok(item.reason_code);
    assert.ok(item.reason_text);
    assert.notEqual(item.palace_id, samplePalace.id);
  });

  it('关闭个性化后返回 popular 策略', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const update = await auth(
      request(app).put('/api/auth/preferences')
    ).send({ personalization_enabled: false });
    assert.equal(update.status, 200);

    const res = await auth(request(app).get('/api/recommend')).query({
      scene: 'home',
    });
    assert.equal(res.body.data.strategy, 'popular');
    assert.equal(res.body.data.personalization_enabled, false);
  });
});