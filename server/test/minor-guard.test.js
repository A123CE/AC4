const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const { loadPrivacyMode, minorGuard } = require('../src/middleware/minorGuard');

let dbReady = false;
const ids = [];

describe('minorGuard 隐私模式', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const cases = [
      ['minor', 0, 'minor'],
      ['unset', 1, 'opted_out'],
      ['minor', 1, 'minor'],
      ['unset', 0, 'normal'],
    ];

    for (const [minorMode, optOut] of cases) {
      const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role, minor_mode, leaderboard_opt_out) VALUES (?, ?, ?, ?, ?)',
        [`minor_test_${Date.now()}_${ids.length}`, 'test-hash', 'user', minorMode, optOut]
      );
      ids.push(result.insertId);
    }
  });

  after(async () => {
    if (dbReady) {
      for (const id of ids) {
        await pool.query('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
      }
    }
    await pool.end().catch(() => {});
  });

  it('4 种组合映射正确', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    assert.equal(await loadPrivacyMode(ids[0]), 'minor');
    assert.equal(await loadPrivacyMode(ids[1]), 'opted_out');
    assert.equal(await loadPrivacyMode(ids[2]), 'minor');
    assert.equal(await loadPrivacyMode(ids[3]), 'normal');
  });

  it('游客与中间件回退', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    assert.equal(await loadPrivacyMode(null), 'normal');

    const req = { user: { id: ids[0] }, privacyMode: null };
    await new Promise((resolve) => {
      minorGuard(req, {}, resolve);
    });
    assert.equal(req.privacyMode, 'minor');

    const guest = { user: null };
    minorGuard(guest, {}, () => {});
    assert.equal(guest.privacyMode, 'normal');
  });
});