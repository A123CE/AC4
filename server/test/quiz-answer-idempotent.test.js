const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const { recordAnswer } = require('../src/services/quizAnswerService');

let dbReady = false;
let userId = null;

describe('quizAnswerService 幂等', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`quiz_idem_${Date.now()}`, 'test-hash', 'user']
    );
    userId = result.insertId;
  });

  after(async () => {
    if (dbReady && userId) {
      await pool.query('DELETE FROM quiz_records WHERE user_id = ?', [userId]).catch(() => {});
      await pool.query('DELETE FROM quiz_answer_facts WHERE user_id = ?', [userId]).catch(() => {});
      await pool.query('DELETE FROM quiz_abuse_flags WHERE user_id = ?', [userId]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('同题重复提交只计一次首次结果', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const first = await recordAnswer({
      userId,
      questionId: 1,
      answer: 'A',
      isCorrect: true,
    });
    assert.equal(first.duplicated, false);
    assert.equal(first.points_earned, 20);

    const second = await recordAnswer({
      userId,
      questionId: 1,
      answer: 'A',
      isCorrect: true,
    });
    assert.equal(second.duplicated, true);
    assert.equal(second.points_earned, 0);

    const [[facts]] = await pool.query(
      'SELECT COUNT(*) AS total FROM quiz_answer_facts WHERE user_id = ? AND question_id = 1',
      [userId]
    );
    const [[records]] = await pool.query(
      'SELECT COUNT(*) AS total FROM quiz_records WHERE user_id = ? AND question_id = 1',
      [userId]
    );
    const [[user]] = await pool.query('SELECT points FROM users WHERE id = ?', [userId]);

    assert.equal(Number(facts.total), 1);
    assert.equal(Number(records.total), 2);
    assert.equal(Number(user.points), 20);
  });

  it('并发提交同题只产生一条事实', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    await Promise.all(
      Array.from({ length: 5 }, () =>
        recordAnswer({ userId, questionId: 2, answer: 'B', isCorrect: true })
      )
    );

    const [[facts]] = await pool.query(
      'SELECT COUNT(*) AS total FROM quiz_answer_facts WHERE user_id = ? AND question_id = 2',
      [userId]
    );
    assert.equal(Number(facts.total), 1);
  });
});