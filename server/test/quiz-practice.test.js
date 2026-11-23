const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mysql = require('mysql2/promise');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

let userId = null;

async function createUser() {
  const username = `practice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'practice-pass-123' });

  assert.equal(res.status, 201);
  userId = res.body.data.user.id;
  return res.body.data.token;
}

async function tableCounts() {
  const connection = await mysql.createConnection(db.getConfig());
  try {
    const result = {};
    for (const table of ['quiz_records', 'quiz_answer_facts', 'user_points_log', 'user_badges']) {
      const [[row]] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ?`,
        [userId]
      );
      result[table] = Number(row.total);
    }
    return result;
  } finally {
    await connection.end().catch(() => {});
  }
}

async function firstQuestion() {
  const connection = await mysql.createConnection(db.getConfig());
  try {
    const [rows] = await connection.query(
      'SELECT id, correct_answer FROM quiz_questions ORDER BY id LIMIT 1'
    );
    return rows[0];
  } finally {
    await connection.end().catch(() => {});
  }
}

describe('POST /api/quiz/practice/answer 零写入', () => {
  after(async () => {
    if (!userId) return;
    const connection = await mysql.createConnection(db.getConfig());
    try {
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    } finally {
      await connection.end().catch(() => {});
    }
  });

  it('连续 20 次判定后四张表行数不变', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const token = await createUser();
    const question = await firstQuestion();
    const before = await tableCounts();

    for (let i = 0; i < 20; i += 1) {
      const res = await request(app)
        .post('/api/quiz/practice/answer')
        .set({ Authorization: `Bearer ${token}` })
        .send({ question_id: question.id, answer: question.correct_answer });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.is_correct, true);
      assert.equal(res.body.data.mode, 'practice');
      assert.equal('points_earned' in res.body.data, false);
      assert.equal(res.body.data.correct_answer, null);
    }

    const afterCounts = await tableCounts();
    assert.deepEqual(afterCounts, before);
  });

  it('游客可练习且答错时返回正确答案', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const question = await firstQuestion();
    const wrong = question.correct_answer === 'A' ? 'B' : 'A';
    const res = await request(app)
      .post('/api/quiz/practice/answer')
      .send({ question_id: question.id, answer: wrong });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_correct, false);
    assert.equal(res.body.data.correct_answer, question.correct_answer);
    assert.equal(res.body.data.mode, 'practice');
  });

  it('缺少参数 400，题目不存在 404', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const missing = await request(app)
      .post('/api/quiz/practice/answer')
      .send({ question_id: 1 });
    assert.equal(missing.status, 400);

    const notFound = await request(app)
      .post('/api/quiz/practice/answer')
      .send({ question_id: 999999, answer: 'A' });
    assert.equal(notFound.status, 404);
  });
});