const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const { awardPoints, getPointsHistory } = require('../src/services/pointsService');

let dbReady = false;
let userId = null;

describe('pointsService 幂等积分', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`points_test_${Date.now()}`, 'test-hash', 'user']
    );
    userId = result.insertId;
  });

  after(async () => {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('同一来源并发 10 次只发一次积分', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        awardPoints(userId, 'collection', 'taihedian', 5)
      )
    );

    const awardedCount = results.filter((item) => item.awarded).length;
    assert.equal(awardedCount, 1);

    const [[logRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM user_points_log WHERE user_id = ?',
      [userId]
    );
    assert.equal(Number(logRow.total), 1);

    const [[userRow]] = await pool.query('SELECT points FROM users WHERE id = ?', [userId]);
    assert.equal(Number(userRow.points), 5);
  });

  it('不同 sourceKey 各自发放', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const result = await awardPoints(userId, 'collection', 'wumen', 5);
    assert.equal(result.awarded, true);

    const [[userRow]] = await pool.query('SELECT points FROM users WHERE id = ?', [userId]);
    assert.equal(Number(userRow.points), 10);
  });

  it('points=0 不写流水', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const before = await getPointsHistory(userId, 100);
    const result = await awardPoints(userId, 'collection', 'zero-key', 0);
    assert.equal(result.awarded, false);

    const after = await getPointsHistory(userId, 100);
    assert.equal(after.length, before.length);
  });

  it('积分流水可按时间倒序查询', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const history = await getPointsHistory(userId, 20);
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 2);
    assert.ok('source_type' in history[0]);
    assert.ok('points' in history[0]);
  });

  it('非法来源类型不发放', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const result = await awardPoints(userId, 'unknown', 'key', 5);
    assert.equal(result.awarded, false);
  });
});