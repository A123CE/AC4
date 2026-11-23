const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

const createdUserIds = [];

async function createUser(prefix = 'pref') {
  const username = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'pref-pass-123' });

  assert.equal(res.status, 201);
  const data = res.body.data;
  createdUserIds.push(data.user.id);
  return { token: data.token, userId: data.user.id };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('preferences 课堂与隐私字段', () => {
  after(async () => {
    if (!(await db.canConnect())) return;
    if (createdUserIds.length === 0) return;
    const connection = await require('mysql2/promise').createConnection(db.getConfig());
    try {
      await connection.query(
        `DELETE FROM users WHERE id IN (${createdUserIds.map(() => '?').join(',')})`,
        createdUserIds
      );
    } finally {
      await connection.end().catch(() => {});
    }
  });

  it('默认值包含 4 个新字段且无 undefined', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const res = await request(app).get('/api/auth/preferences').set(auth(user.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.classroom_mode, false);
    assert.equal(res.body.data.classroom_font_scale, 'large');
    assert.equal(res.body.data.minor_mode, 'unset');
    assert.equal(res.body.data.leaderboard_opt_out, false);

    for (const value of Object.values(res.body.data)) {
      assert.notEqual(value, undefined);
    }
  });

  it('4 个字段可独立读写并持久化', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const put = await request(app)
      .put('/api/auth/preferences')
      .set(auth(user.token))
      .send({
        classroom_mode: true,
        classroom_font_scale: 'xlarge',
        minor_mode: 'unset',
        leaderboard_opt_out: true,
      });

    assert.equal(put.status, 200);
    assert.equal(put.body.data.classroom_mode, true);
    assert.equal(put.body.data.classroom_font_scale, 'xlarge');
    assert.equal(put.body.data.leaderboard_opt_out, true);

    const get = await request(app).get('/api/auth/preferences').set(auth(user.token));
    assert.equal(get.body.data.classroom_mode, true);
    assert.equal(get.body.data.classroom_font_scale, 'xlarge');
    assert.equal(get.body.data.minor_mode, 'unset');
    assert.equal(get.body.data.leaderboard_opt_out, true);
  });

  it('非法枚举返回 400 VALIDATION_FAILED', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const cases = [
      { classroom_mode: 'yes' },
      { classroom_font_scale: 'huge' },
      { minor_mode: 'adult' },
      { leaderboard_opt_out: 'no' },
    ];

    for (const payload of cases) {
      const res = await request(app)
        .put('/api/auth/preferences')
        .set(auth(user.token))
        .send(payload);
      assert.equal(res.status, 400, JSON.stringify(payload));
      assert.equal(res.body.code, 'VALIDATION_FAILED');
    }
  });

  it('minor_mode=minor 自动写入 leaderboard_opt_out 并回显', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const res = await request(app)
      .put('/api/auth/preferences')
      .set(auth(user.token))
      .send({ minor_mode: 'minor', leaderboard_opt_out: false });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.minor_mode, 'minor');
    assert.equal(res.body.data.leaderboard_opt_out, true);

    const get = await request(app).get('/api/auth/preferences').set(auth(user.token));
    assert.equal(get.body.data.minor_mode, 'minor');
    assert.equal(get.body.data.leaderboard_opt_out, true);
  });

  it('仅更新既有字段时响应结构不变', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const res = await request(app)
      .put('/api/auth/preferences')
      .set(auth(user.token))
      .send({ personalization_enabled: false });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      data: { personalization_enabled: false },
    });
  });

  it('没有可更新字段返回 400', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const user = await createUser();
    const res = await request(app)
      .put('/api/auth/preferences')
      .set(auth(user.token))
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_FAILED');
  });
});