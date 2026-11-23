const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let testUser = null;
let token = null;
let palaceId = null;

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('收藏接口契约', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [palaces] = await pool.query('SELECT id FROM palaces ORDER BY order_num ASC LIMIT 1');
    palaceId = palaces[0]?.id || null;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`collections_test_${Date.now()}`, 'test-hash', 'user']
    );
    testUser = { id: result.insertId, username: 'collections_test', role: 'user' };
    token = generateToken(testUser);
  });

  after(async () => {
    if (testUser?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [testUser.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('首次收藏 +5，重复 POST 不加分', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const first = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
      category: '默认',
      note: '首次收藏',
    });

    assert.equal(first.status, 201);
    assert.equal(first.body.data.created, true);
    assert.equal(first.body.data.points_earned, 5);
    assert.equal(first.body.data.collection.palace_id, palaceId);

    const second = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
      category: '想去',
    });

    assert.equal(second.status, 200);
    assert.equal(second.body.data.created, false);
    assert.equal(second.body.data.points_earned, 0);
    assert.equal(second.body.data.collection.collection_category, '想去');
  });

  it('非法分类归一化为默认并返回 normalized', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const res = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
      category: '不存在的分类',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.normalized, true);
    assert.equal(res.body.data.collection.collection_category, '默认');
  });

  it('501 字笔记返回 400', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const res = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
      note: 'x'.repeat(501),
    });

    assert.equal(res.status, 400);
  });

  it('script 标签被转义', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const res = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
      category: '教学素材',
      note: '<script>alert(1)</script> 讲解',
    });

    assert.equal(res.status, 200);
    const stored = res.body.data.collection.note;
    assert.equal(stored.includes('<script>'), false);
    assert.equal(stored.includes('&lt;script&gt;'), true);
  });

  it('GET 支持分类筛选并返回 updated_at / poster_path', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const res = await auth(request(app).get('/api/auth/collections')).query({
      category: '教学素材',
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].collection_category, '教学素材');
    assert.ok('updated_at' in res.body.data[0]);
    assert.ok('poster_path' in res.body.data[0]);
    assert.equal('user_id' in res.body.data[0], false);
  });

  it('PUT note 更新笔记与 updated_at', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const before = await auth(request(app).get('/api/auth/collections'));
    const beforeRow = before.body.data.find((item) => item.palace_id === palaceId);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const res = await auth(
      request(app).put(`/api/auth/collections/${palaceId}/note`)
    ).send({ note: '更新后的笔记' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.note, '更新后的笔记');

    const after = await auth(request(app).get('/api/auth/collections'));
    const afterRow = after.body.data.find((item) => item.palace_id === palaceId);
    assert.equal(afterRow.note, '更新后的笔记');
    assert.ok(afterRow.updated_at >= beforeRow.updated_at);
  });

  it('DELETE 返回 points_revoked=0，再收藏不再加分', async (t) => {
    if (!dbReady || !palaceId) return t.skip('缺少测试数据');

    const del = await auth(
      request(app).delete(`/api/auth/collections/${palaceId}`)
    );

    assert.equal(del.status, 200);
    assert.equal(del.body.points_revoked, 0);

    const reAdd = await auth(request(app).post('/api/auth/collections')).send({
      palace_id: palaceId,
    });

    assert.equal(reAdd.status, 201);
    assert.equal(reAdd.body.data.points_earned, 0);
  });
});