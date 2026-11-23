const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const { getLeaderboard } = require('../src/services/leaderboardService');

let dbReady = false;
let users = null;

function mysqlDateTime(baseTime, offsetSeconds = 0) {
  const date = new Date(baseTime);
  date.setSeconds(date.getSeconds() + offsetSeconds);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function addFacts(userId, questionIds, baseTime) {
  let offset = 0;
  for (const questionId of questionIds) {
    const formatted = mysqlDateTime(baseTime, offset);
    await pool.query(
      `INSERT INTO quiz_answer_facts
         (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
       VALUES (?, ?, 1, ?, ?, 1, ?)`,
      [userId, questionId, formatted, formatted, formatted]
    );
    offset += 1000;
  }
}

describe('leaderboardService', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const usernames = [
      `board_a_${Date.now()}`,
      `board_b_${Date.now()}`,
      `board_minor_${Date.now()}`,
      `board_empty_${Date.now()}`,
    ];
    const ids = [];

    for (const username of usernames) {
      const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, 'test-hash', 'user']
      );
      ids.push(result.insertId);
    }

    await pool.query("UPDATE users SET minor_mode = 'minor' WHERE id = ?", [ids[2]]);

    users = {
      a: ids[0],
      b: ids[1],
      minor: ids[2],
      empty: ids[3],
    };

    await addFacts(users.a, [1, 2], '2026-01-01T10:00:10');
    await addFacts(users.b, [3, 4], '2026-01-01T10:00:00');
    await addFacts(users.minor, [5], '2026-01-01T10:00:20');
  });

  after(async () => {
    if (dbReady && users) {
      for (const id of Object.values(users)) {
        await pool.query('DELETE FROM quiz_answer_facts WHERE user_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM quiz_abuse_flags WHERE user_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
      }
    }
    await pool.end().catch(() => {});
  });

  it('按去重答对数降序、首次达成升序，并输出脱敏字段', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const result = await getLeaderboard({ limit: 10 });
    assert.ok(result.list.length >= 3);
    assert.equal(result.list[0].correct_answers, 2);
    assert.equal(result.list[0].display_name.includes('board_'), false);

    const serialized = JSON.stringify(result);
    for (const forbidden of [
      'username',
      'avatar_url',
      'points',
      'interest_tag',
      'user_id',
      'email',
      'total_answers',
      'last_login_at',
    ]) {
      assert.equal(serialized.includes(forbidden), false, `泄露字段 ${forbidden}`);
    }
  });

  it('未成年用户无名次且昵称固定', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const result = await getLeaderboard({ limit: 10 });
    const minor = result.list.find((row) => row.privacy_mode === 'minor');
    assert.ok(minor);
    assert.equal(minor.rank_no, null);
    assert.equal(minor.display_name, '营造学徒');
  });

  it('空榜返回 no_data，me 可为空', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const result = await getLeaderboard({ limit: 10, userId: users.empty });
    assert.equal(result.me, null);
    assert.ok(result.list.length > 0);
    assert.equal(result.empty_reason, null);
  });
});