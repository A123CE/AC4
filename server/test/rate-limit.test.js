const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const rateLimit = require('../src/middleware/rateLimit');

function createApp(options) {
  const app = express();
  app.get('/ping', rateLimit(options), (req, res) => res.json({ ok: true }));
  return app;
}

describe('rateLimit 内存限流器', () => {
  it('60 次通过，第 61 次返回 429', async () => {
    const app = createApp({ max: 60, windowMs: 60000, now: () => 1000 });

    for (let i = 0; i < 60; i += 1) {
      const res = await request(app).get('/ping');
      assert.equal(res.status, 200);
    }

    const blocked = await request(app).get('/ping');
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, 'RATE_LIMITED');
  });

  it('窗口过期后恢复', async () => {
    let current = 1000;
    const app = createApp({
      max: 1,
      windowMs: 5000,
      now: () => current,
    });

    assert.equal((await request(app).get('/ping')).status, 200);
    assert.equal((await request(app).get('/ping')).status, 429);

    current += 5001;
    assert.equal((await request(app).get('/ping')).status, 200);
  });

  it('不同路由可配置不同额度', async () => {
    const app = express();
    app.get('/low', rateLimit({ max: 1, now: () => 1000 }), (req, res) => res.json({ ok: 1 }));
    app.get('/high', rateLimit({ max: 5, now: () => 1000 }), (req, res) => res.json({ ok: 1 }));

    assert.equal((await request(app).get('/low')).status, 200);
    assert.equal((await request(app).get('/low')).status, 429);

    for (let i = 0; i < 5; i += 1) {
      assert.equal((await request(app).get('/high')).status, 200);
    }
  });

  it('函数 keyBy 按用户分桶', async () => {
    const app = createApp({
      max: 1,
      now: () => 1000,
      keyBy: (req) => req.get('x-user'),
    });

    assert.equal(
      (await request(app).get('/ping').set('x-user', 'a')).status,
      200
    );
    assert.equal(
      (await request(app).get('/ping').set('x-user', 'a')).status,
      429
    );
    assert.equal(
      (await request(app).get('/ping').set('x-user', 'b')).status,
      200
    );
  });

  it('同一用户跨 IP 仍同桶', async () => {
    const app = createApp({
      max: 1,
      now: () => 1000,
      keyBy: (req) => req.get('x-user'),
    });

    assert.equal(
      (await request(app)
        .get('/ping')
        .set('x-user', 'same')
        .set('x-forwarded-for', '1.1.1.1')).status,
      200
    );
    assert.equal(
      (await request(app)
        .get('/ping')
        .set('x-user', 'same')
        .set('x-forwarded-for', '2.2.2.2')).status,
      429
    );
  });

  it('keyBy 函数抛错时回退 IP 且不崩溃', async () => {
    const app = createApp({
      max: 1,
      now: () => 1000,
      keyBy: () => {
        throw new Error('bad key');
      },
    });

    assert.equal((await request(app).get('/ping')).status, 200);
    assert.equal((await request(app).get('/ping')).status, 429);
  });
});