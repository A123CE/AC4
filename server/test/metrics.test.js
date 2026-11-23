const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');
const { generateToken } = require('../src/middleware/auth');

let dbReady = false;
let admin = null;
let token = null;
const anonHash = 'a'.repeat(64);
const sessionHash = 'b'.repeat(64);

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('匿名埋点与漏斗', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`metrics_admin_${Date.now()}`, 'test-hash', 'admin']
    );
    admin = { id: result.insertId, username: 'metrics_admin', role: 'admin' };
    token = generateToken(admin);
  });

  after(async () => {
    if (dbReady) {
      await pool.query('DELETE FROM metrics_events WHERE anon_hash = ?', [anonHash]);
    }
    if (admin?.id) {
      await pool.query('DELETE FROM users WHERE id = ?', [admin.id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('批量写入白名单事件并剔除 PII 属性', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).post('/api/metrics/events').send({
      anon_hash: anonHash,
      session_hash: sessionHash,
      locale: 'zh-CN',
      tier: 'standard',
      path: '/',
      events: [
        { event_name: 'page_view' },
        { event_name: 'guest_3d_enter', entity_type: 'palace', entity_id: 'taihedian' },
        { event_name: 'register_prompt_click' },
        {
          event_name: 'search',
          props: {
            q_hash: 'c'.repeat(64),
            q_length: 2,
            q: '斗拱',
            email: 'secret@example.com',
            token: 'leak',
            username: 'leak',
          },
        },
        { event_name: 'search_zero' },
        { event_name: 'share_click', props: { channel: 'copy' } },
        {
          event_name: 'favorite_click',
          props: { entity_type: 'palace', entity_id: 'taihedian' },
        },
        { event_name: 'tts_play' },
        { event_name: 'not_in_whitelist' },
      ],
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.accepted, 8);

    const [rows] = await pool.query(
      'SELECT event_name, props FROM metrics_events WHERE anon_hash = ?',
      [anonHash]
    );
    assert.equal(rows.length, 8);

    const serialized = JSON.stringify(rows);
    assert.equal(serialized.includes('secret@example.com'), false);
    assert.equal(serialized.includes('leak'), false);
    assert.equal(serialized.includes('斗拱'), false);

    const search = rows.find((row) => row.event_name === 'search');
    const searchProps =
      typeof search.props === 'string' ? JSON.parse(search.props) : search.props;
    assert.equal(String(searchProps.q_hash).length, 64);
    assert.equal(searchProps.q_length, 2);
  });

  it('管理员漏斗返回 8 项指标', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const res = await auth(request(app).get('/api/metrics/funnel'));
    assert.equal(res.status, 200);

    const metrics = res.body.data.metrics;
    const keys = Object.keys(metrics);
    assert.equal(keys.length, 8);
    assert.ok(keys.includes('visitors'));
    assert.ok(keys.includes('trial_to_register'));
    assert.ok(keys.includes('search'));
    assert.ok(keys.includes('share'));
    assert.ok(metrics.visitors >= 1);
    assert.equal(metrics.search.count >= 1, true);
  });

  it('普通用户无权访问漏斗', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [`metrics_user_${Date.now()}`, 'test-hash', 'user']
    );
    const userToken = generateToken({
      id: result.insertId,
      username: 'metrics_user',
      role: 'user',
    });

    try {
      const res = await request(app)
        .get('/api/metrics/funnel')
        .set('Authorization', `Bearer ${userToken}`);
      assert.equal(res.status, 403);
    } finally {
      await pool.query('DELETE FROM users WHERE id = ?', [result.insertId]);
    }
  });
});