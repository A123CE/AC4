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
let question = null;

async function countRecords() {
  const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM quiz_records');
  return Number(row.total);
}

async function sumPoints() {
  const [[row]] = await pool.query('SELECT COALESCE(SUM(points), 0) AS total FROM users');
  return Number(row.total);
}

describe('quiz 游客与登录分支', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [questions] = await pool.query(
      'SELECT id, correct_answer FROM quiz_questions ORDER BY id ASC LIMIT 1'
    );
    question = questions[0] || null;

    const username = `quiz_guest_test_${Date.now()}`;
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, 'test-hash', 'user']
    );
    testUser = { id: result.insertId, username, role: 'user' };
    token = generateToken(testUser);
  });

  after(async () => {
    if (testUser?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [testUser.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('无 token 访问题目分类：scope=guest 且无个人进度', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/quiz/categories');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.scope, 'guest');
    assert.ok(Array.isArray(res.body.data));
    if (res.body.data.length > 0) {
      assert.equal(res.body.data[0].answered, null);
      assert.equal(res.body.data[0].accuracy, null);
    }
  });

  it('无 token 获取题目：scope=guest 且 count 上限为 20', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/quiz/questions').query({ count: 999 });
    assert.equal(res.status, 200);
    assert.equal(res.body.scope, 'guest');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length <= 20);
  });

  it('无 token 获取单题：不返回正确答案', async (t) => {
    if (!dbReady || !question) return t.skip('缺少题目数据');

    const res = await request(app).get(`/api/quiz/questions/${question.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.scope, 'guest');
    assert.equal(
      Object.prototype.hasOwnProperty.call(res.body.data, 'correct_answer'),
      false
    );
  });

  it('游客提交答案：只判定，不写记录、不加积分', async (t) => {
    if (!dbReady || !question) return t.skip('缺少题目数据');

    const recordsBefore = await countRecords();
    const pointsBefore = await sumPoints();

    const res = await request(app)
      .post('/api/quiz/answer')
      .send({ question_id: question.id, answer: question.correct_answer });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.scope, 'guest');
    assert.equal(res.body.data.is_correct, true);
    assert.equal(res.body.data.points_earned, 0);
    assert.equal(res.body.data.leaderboard_hint, true);
    assert.deepEqual(res.body.data.achievements, {
      stamps: [],
      badges: [],
      progress: [],
    });

    assert.equal(await countRecords(), recordsBefore);
    assert.equal(await sumPoints(), pointsBefore);
  });

  it('已登录用户提交答案：写入记录并返回 user scope', async (t) => {
    if (!dbReady || !question) return t.skip('缺少题目数据');

    const recordsBefore = await countRecords();

    const res = await request(app)
      .post('/api/quiz/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ question_id: question.id, answer: question.correct_answer });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.scope, 'user');
    assert.equal(res.body.data.leaderboard_hint, false);
    assert.equal(await countRecords(), recordsBefore + 1);
  });

  it('已登录用户可访问记录/统计/成就/排行榜', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    for (const path of [
      '/api/quiz/records',
      '/api/quiz/stats',
      '/api/quiz/achievements',
      '/api/quiz/leaderboard',
    ]) {
      const res = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200, `${path} 应返回 200`);
      assert.equal(res.body.success, true, `${path} success 应为 true`);
    }
  });

  it('无 token 访问记录/统计/成就/排行榜仍返回 401', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    for (const path of [
      '/api/quiz/records',
      '/api/quiz/stats',
      '/api/quiz/achievements',
      '/api/quiz/leaderboard',
    ]) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, `${path} 应返回 401`);
    }
  });
});