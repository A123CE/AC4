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

const FIRST_PAYLOAD = {
  collections: [
    { palace_id: 'taihedian', category: '教学素材', note: null },
    { palace_id: 'wumen', category: '想去' },
  ],
  notes: [{ palace_id: 'taihedian', note: '游客补写笔记' }],
  source: 'guest_local',
};

describe('游客数据合并', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`merge_guest_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'merge_guest', role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('首次合并收藏与笔记，积分只发一次', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).post('/api/auth/merge-guest')).send(
      FIRST_PAYLOAD
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.data.merged, 3);
    assert.equal(res.body.data.rejected, 0);
    assert.equal(res.body.data.points_earned, 10);
    assert.ok(res.body.data.achievements);

    const [collections] = await pool.query(
      'SELECT palace_id, category, note FROM user_collections WHERE user_id = ? ORDER BY palace_id',
      [user.id]
    );
    assert.equal(collections.length, 2);
    const taihe = collections.find((item) => item.palace_id === 'taihedian');
    assert.equal(taihe.note, '游客补写笔记');

    const [[points]] = await pool.query('SELECT points FROM users WHERE id = ?', [
      user.id,
    ]);
    assert.equal(Number(points.points), 10);
  });

  it('重复合并返回 skipped 且不再加分', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).post('/api/auth/merge-guest')).send(
      FIRST_PAYLOAD
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.data.merged, 0);
    assert.equal(res.body.data.skipped >= 2, true);
    assert.equal(res.body.data.points_earned, 0);
  });

  it('账号已有笔记优先，guest 冲突笔记被跳过', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).post('/api/auth/merge-guest')).send({
      collections: [],
      notes: [{ palace_id: 'taihedian', note: '不同笔记' }],
      source: 'guest_local',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.skipped, 1);
    const item = res.body.data.items[0];
    assert.equal(item.reason, 'account_note_kept');

    const [[row]] = await pool.query(
      'SELECT note FROM user_collections WHERE user_id = ? AND palace_id = ?',
      [user.id, 'taihedian']
    );
    assert.equal(row.note, '游客补写笔记');
  });

  it('非法建筑/分类/超长笔记被 rejected', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).post('/api/auth/merge-guest')).send({
      collections: [
        { palace_id: 'not-exist-palace' },
        { palace_id: 'wumen', category: '非法分类' },
        { palace_id: 'wumen', note: 'x'.repeat(501) },
      ],
      notes: [],
      source: 'guest_local',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.rejected, 3);
  });
});