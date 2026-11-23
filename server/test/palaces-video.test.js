const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');
const { toVideoInfo } = require('../src/services/publicSerializer');

describe('建筑详情 video 字段', () => {
  it('组合字段规则覆盖 4 种情况', () => {
    assert.deepEqual(toVideoInfo({ has_video: 0, video_url: '', poster_path: 'a.png' }), {
      declared: false,
      url: null,
      poster: '/images/a.png',
    });

    assert.deepEqual(toVideoInfo({ has_video: 1, video_url: '', poster_path: '' }), {
      declared: true,
      url: null,
      poster: null,
    });

    assert.deepEqual(
      toVideoInfo({ has_video: '1', video_url: 'forbidden-city/a.mp4', poster_path: '' }),
      { declared: true, url: '/videos/forbidden-city/a.mp4', poster: null }
    );

    assert.deepEqual(
      toVideoInfo({ has_video: true, video_url: 'https://cdn.example.com/a.mp4', poster_path: '/images/a.png' }),
      { declared: true, url: 'https://cdn.example.com/a.mp4', poster: '/images/a.png' }
    );
  });

  it('详情接口包含 video，列表接口不包含', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const detail = await request(app).get('/api/palaces/taihedian');
    assert.equal(detail.status, 200);
    assert.ok(detail.body.data.video);
    assert.equal(typeof detail.body.data.video.declared, 'boolean');
    assert.ok('url' in detail.body.data.video);
    assert.ok('poster' in detail.body.data.video);

    const list = await request(app).get('/api/palaces');
    assert.equal(list.status, 200);
    assert.equal(
      list.body.data.some((item) => Object.prototype.hasOwnProperty.call(item, 'video')),
      false
    );
  });
});