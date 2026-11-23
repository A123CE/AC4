const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let user = null;
let token = null;
const username = `hooks_test_${Date.now()}`;
const password = 'secret123';

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('成就触发点收口', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const hash = bcrypt.hashSync(password, 4);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hash, 'user']
    );
    user = { id: result.insertId, username, role: 'user' };
    token = generateToken(user);
  });

  after(async () => {
    if (user?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('首登录返回紫禁城初访', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    assert.equal(res.status, 200);
    const badges = res.body.data.achievements?.badges || [];
    assert.ok(badges.some((badge) => badge.name === '紫禁城初访'));
  });

  it('停留 6 秒上报首次盖章并加 10 积分', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const first = await auth(request(app).post('/api/auth/history')).send({
      palace_id: 'taihedian',
      dwell_seconds: 6,
    });

    assert.equal(first.status, 200);
    assert.ok(first.body.new_stamp);
    assert.equal(first.body.points_earned, 10);
    assert.equal(first.body.visited_total >= 1, true);

    const second = await auth(request(app).post('/api/auth/history')).send({
      palace_id: 'taihedian',
      dwell_seconds: 6,
    });

    assert.equal(second.body.new_stamp, null);
    assert.equal(second.body.points_earned, 0);
  });

  it('旧调用仅传 duration_seconds=0 不盖章', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).post('/api/auth/history')).send({
      palace_id: 'wumen',
      duration_seconds: 0,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.new_stamp, null);
    assert.equal(res.body.points_earned, 0);
    assert.ok(res.body.achievements);
  });

  it('答对第 10 题后授予童生', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const [questions] = await pool.query(
      'SELECT id, correct_answer FROM quiz_questions ORDER BY id ASC LIMIT 10'
    );

    for (const question of questions.slice(0, 9)) {
      await pool.query(
        `INSERT INTO quiz_records (user_id, question_id, user_answer, is_correct, points_earned)
         VALUES (?, ?, 'A', 1, 20)`,
        [user.id, question.id]
      );
      await pool.query(
        `INSERT INTO quiz_answer_facts
           (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
         VALUES (?, ?, 1, NOW(), NOW(), 1, NOW())`,
        [user.id, question.id]
      );
    }

    const target = questions[9];
    const res = await auth(request(app).post('/api/quiz/answer')).send({
      question_id: target.id,
      answer: target.correct_answer,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.scope, 'user');
    assert.ok(
      res.body.data.achievements.badges.some((badge) => badge.name === '童生')
    );
  });

  it('连续签到 7 天后授予签到勤勉', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO user_signins (user_id, signin_date, points_earned, consecutive_days)
       VALUES (?, ?, 10, 6)`,
      [user.id, date]
    );

    const res = await auth(request(app).post('/api/signin'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.consecutive_days, 7);
    assert.ok(
      res.body.data.achievements.badges.some((badge) => badge.name === '签到勤勉')
    );
  });
});