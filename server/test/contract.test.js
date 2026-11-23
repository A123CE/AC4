const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');
const endpoints = require('./contract/endpoints.js');
const {
  shapeOf,
  collectKeys,
  SENSITIVE_KEYS,
} = require('./contract/shape.js');

const snapshotDir = path.join(__dirname, 'contract');

describe('接口契约与隐私快照', () => {
  it('所有公开接口形状与快照一致且不含隐私字段', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    for (const endpoint of endpoints) {
      let req = request(app)[endpoint.method](endpoint.path);
      if (endpoint.body) req = req.send(endpoint.body);
      const res = await req;

      const snapshotPath = path.join(
        snapshotDir,
        `${endpoint.name}.snapshot.json`
      );
      assert.ok(
        fs.existsSync(snapshotPath),
        `缺少快照 ${endpoint.name}.snapshot.json，请运行 npm run snapshot:api`
      );
      const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      const actual =
        endpoint.kind === 'share'
          ? {
              status: res.status,
              contentTypeIncludesHtml: /html/.test(res.headers['content-type'] || ''),
              hasOgTitle: res.text.includes('property="og:title"'),
              hasOgImage: res.text.includes('property="og:image"'),
              hasTwitterCard: res.text.includes('name="twitter:card"'),
              hasRedirect: res.text.includes('location.replace'),
            }
          : shapeOf(res.body);

      assert.deepEqual(actual, expected, `${endpoint.name} 契约形状发生变化`);

      if (endpoint.kind !== 'share') {
        const keys = [...collectKeys(res.body)].map((key) => key.toLowerCase());
        for (const sensitive of SENSITIVE_KEYS) {
          assert.equal(
            keys.includes(sensitive),
            false,
            `${endpoint.name} 泄露敏感字段 ${sensitive}`
          );
        }
      }
    }
  });
});