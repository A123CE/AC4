const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let adminUser = null;
let normalUser = null;
let adminToken = null;
let normalToken = null;

async function getCount() {
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(count), 0) AS total
     FROM share_visits
     WHERE entity_type = 'palace' AND entity_id = 'taihedian'
       AND channel = 'weibo' AND visit_date = CURDATE()`
  );
  return Number(row.total || 0);
}

describe('分享回流统计', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [adminResult] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`share_admin_${Date.now()}`, 'test-hash', 'admin']
    );
    const [normalResult] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`share_user_${Date.now()}`, 'test-hash', 'user']
    );

    adminUser = { id: adminResult.insertId, username: 'share_admin', role: 'admin' };
    normalUser = { id: normalResult.insertId, username: 'share_user', role: 'user' };
    adminToken = generateToken(adminUser);
    normalToken = generateToken(normalUser);
  });

  after(async () => {
    if (adminUser?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [adminUser.id]).catch(() => {});
    }
    if (normalUser?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [normalUser.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('同日同渠道重复打开只累加 count 不新增行', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const before = await getCount();

    await request(app).post('/api/share/visit').send({
      entity_type: 'palace',
      entity_id: 'taihedian',
      channel: 'weibo',
    });
    await request(app).post('/api/share/visit').send({
      entity_type: 'palace',
      entity_id: 'taihedian',
      channel: 'weibo',
    });

    const after = await getCount();
    assert.equal(after, before + 2);

    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS rows_count FROM share_visits
       WHERE entity_type = 'palace' AND entity_id = 'taihedian'
         AND channel = 'weibo' AND visit_date = CURDATE()`
    );
    assert.equal(Number(row.rows_count), 1);
  });

  it('非法 entity_id 静默成功且不写库', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const before = await getCount();
    const res = await request(app).post('/api/share/visit').send({
      entity_type: 'palace',
      entity_id: 'not-exist-entity',
      channel: 'weibo',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(await getCount(), before);
  });

  it('管理员可查询回流统计，普通用户 403', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const adminRes = await request(app)
      .get('/api/share/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminRes.status, 200);
    assert.ok(Array.isArray(adminRes.body.data.rows));

    const normalRes = await request(app)
      .get('/api/share/stats')
      .set('Authorization', `Bearer ${normalToken}`);
    assert.equal(normalRes.status, 403);
  });
});