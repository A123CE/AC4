const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');

let dbReady = false;
let userId = null;

const BACKFILL_SQL = `
INSERT IGNORE INTO quiz_answer_facts
  (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
SELECT first_row.user_id,
       first_row.question_id,
       first_row.is_correct,
       first_row.answered_at,
       correct_row.first_correct_at,
       1,
       last_row.last_answered_at
FROM (
  SELECT qr.user_id, qr.question_id, qr.is_correct, qr.answered_at
  FROM quiz_records qr
  JOIN (
    SELECT user_id, question_id, MIN(id) AS first_id
    FROM quiz_records
    WHERE user_id = ?
    GROUP BY user_id, question_id
  ) first_ids ON first_ids.first_id = qr.id
) first_row
LEFT JOIN (
  SELECT user_id, question_id, MIN(answered_at) AS first_correct_at
  FROM quiz_records
  WHERE is_correct = 1 AND user_id = ?
  GROUP BY user_id, question_id
) correct_row
  ON correct_row.user_id = first_row.user_id
 AND correct_row.question_id = first_row.question_id
JOIN (
  SELECT user_id, question_id, MAX(answered_at) AS last_answered_at
  FROM quiz_records
  WHERE user_id = ?
  GROUP BY user_id, question_id
) last_row
  ON last_row.user_id = first_row.user_id
 AND last_row.question_id = first_row.question_id
`;

describe('quiz facts 首次结果回填', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`facts_backfill_${Date.now()}`, 'test-hash', 'user']
    );
    userId = result.insertId;

    await pool.query(
      `INSERT INTO quiz_records (user_id, question_id, user_answer, is_correct, points_earned, answered_at)
       VALUES
         (?, 1, 'A', 0, 0, '2026-01-01 10:00:00'),
         (?, 1, 'B', 1, 20, '2026-01-01 10:00:10'),
         (?, 2, 'A', 1, 20, '2026-01-01 10:00:20'),
         (?, 2, 'B', 0, 0, '2026-01-01 10:00:30'),
         (?, 2, 'A', 1, 20, '2026-01-01 10:00:40'),
         (?, 3, 'C', 0, 0, '2026-01-01 10:00:50')`,
      [userId, userId, userId, userId, userId, userId]
    );
  });

  after(async () => {
    if (dbReady && userId) {
      await pool.query('DELETE FROM quiz_answer_facts WHERE user_id = ?', [userId]).catch(() => {});
      await pool.query('DELETE FROM quiz_records WHERE user_id = ?', [userId]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('按 MIN(id) 首次结果回填且重跑幂等', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    await pool.query(BACKFILL_SQL, [userId, userId, userId]);
    await pool.query(BACKFILL_SQL, [userId, userId, userId]);

    const [rows] = await pool.query(
      'SELECT question_id, is_correct, first_correct_at FROM quiz_answer_facts WHERE user_id = ? ORDER BY question_id',
      [userId]
    );

    assert.equal(rows.length, 3);
    assert.equal(Number(rows[0].is_correct), 0);
    assert.ok(rows[0].first_correct_at);
    assert.equal(Number(rows[1].is_correct), 1);
    assert.equal(Number(rows[2].is_correct), 0);
  });
});