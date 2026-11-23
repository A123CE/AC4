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

describe('答题路由接线', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`quiz_api_${Date.now()}`, 'test-hash', 'user']
    );
    user = { id: result.insertId, username: 'quiz_api', role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM quiz_records WHERE user_id = ?', [user.id]).catch(() => {});
      await pool.query('DELETE FROM quiz_answer_facts WHERE user_id = ?', [user.id]).catch(() => {});
      await pool.query('DELETE FROM quiz_abuse_flags WHERE user_id = ?', [user.id]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('重复提交返回 duplicated 且榜单按去重计数', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const [questions] = await pool.query(
      'SELECT id, correct_answer FROM quiz_questions ORDER BY id ASC LIMIT 1'
    );
    const question = questions[0];
    assert.ok(question);

    const first = await auth(request(app).post('/api/quiz/answer')).send({
      question_id: question.id,
      answer: question.correct_answer,
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.data.duplicated, false);
    assert.equal(first.body.data.points_earned, 20);
    assert.equal(first.body.data.distinct_correct, 1);

    const second = await auth(request(app).post('/api/quiz/answer')).send({
      question_id: question.id,
      answer: question.correct_answer,
    });
    assert.equal(second.status, 200);
    assert.equal(second.body.data.duplicated, true);
    assert.equal(second.body.data.points_earned, 0);
    assert.equal(second.body.data.distinct_correct, 1);

    const board = await auth(request(app).get('/api/quiz/leaderboard'));
    assert.equal(board.status, 200);
    assert.equal(board.body.data.me.correct_answers, 1);
    const listRow = board.body.data.list[0];
    assert.ok(listRow.display_name);
    assert.equal('username' in listRow, false);
    assert.equal('user_id' in listRow, false);
  });
});