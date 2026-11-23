const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let admin = null;
let token = null;
const palaceId = `content_status_${Date.now()}`;
const palaceName = `状态测试建筑${Date.now()}`;
const category = `测试分类${Date.now()}`;

describe('内容发布门槛与草稿隔离', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`content_admin_${Date.now()}`, 'test-hash', 'admin']
    );
    admin = { id: result.insertId, username: 'content_admin', role: 'admin' };
    token = generateToken(admin);
  });

  after(async () => {
    try {
      await pool.query('DELETE FROM palace_timeline WHERE palace_id = ?', [palaceId]);
      await pool.query('DELETE FROM palace_fun_facts WHERE palace_id = ?', [palaceId]);
      await pool.query('DELETE FROM palace_images WHERE palace_id = ?', [palaceId]);
      await pool.query('DELETE FROM palaces WHERE id = ?', [palaceId]);
      if (admin?.id) {
        await pool.query('DELETE FROM users WHERE id = ?', [admin.id]);
      }
    } catch {
      /* cleanup best effort */
    }
    await pool.end().catch(() => {});
  });

  it('缺少必填项保存草稿且不出现在公开列表/搜索/详情', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const create = await request(app)
      .post('/api/palaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: palaceId, name: palaceName, category });

    assert.equal(create.status, 201);
    assert.equal(create.body.data.status, 'draft');

    const publicList = await request(app).get('/api/palaces').query({ category });
    assert.equal(
      publicList.body.data.some((item) => item.id === palaceId),
      false
    );

    const adminList = await request(app)
      .get('/api/palaces')
      .query({ category, include_drafts: '1' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(
      adminList.body.data.some((item) => item.id === palaceId),
      true
    );

    const publicDetail = await request(app).get(`/api/palaces/${palaceId}`);
    assert.equal(publicDetail.status, 404);

    const adminDetail = await request(app)
      .get(`/api/palaces/${palaceId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adminDetail.status, 200);

    const search = await request(app).get('/api/search').query({ q: palaceName });
    const palaceGroup = search.body.data.groups.find((group) => group.type === 'palace');
    assert.equal(palaceGroup.total, 0);
  });

  it('补齐简介/海报/沿革后自动发布并进入公开搜索', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const update = await request(app)
      .put(`/api/palaces/${palaceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: '用于发布门槛测试的简介',
        poster_path: 'posters/test/content-status.png',
        timeline: [{ year: '1900', event: '测试沿革' }],
      });

    assert.equal(update.status, 200);
    assert.equal(update.body.data.status, 'published');

    const publicList = await request(app).get('/api/palaces').query({ category });
    assert.equal(
      publicList.body.data.some((item) => item.id === palaceId),
      true
    );

    const search = await request(app).get('/api/search').query({ q: palaceName });
    const palaceGroup = search.body.data.groups.find((group) => group.type === 'palace');
    assert.ok(palaceGroup.total >= 1);
  });
});