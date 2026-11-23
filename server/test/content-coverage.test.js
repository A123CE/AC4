const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');

describe('双语内容覆盖', () => {
  it('返回建筑/百科/UI 三类覆盖统计', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/api/content/coverage');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.palaces.total >= 20);
    assert.ok(data.palaces.translated >= 1);
    assert.ok('full' in data.palaces.status);
    assert.ok('title' in data.palaces.status);
    assert.ok('none' in data.palaces.status);
    assert.ok('encyclopedia' in data);
    assert.ok('ui' in data);
  });

  it('建筑翻译按翻译表回退 name_en', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app)
      .get('/api/content/palace/taihedian')
      .query({ lang: 'en' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Hall of Supreme Harmony');
    assert.equal(res.body.data.name_source, 'translation');
    assert.equal(res.body.data.description_status, 'full');
  });
});