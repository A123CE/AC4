#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');
const requireFromServer = createRequire(path.join(serverDir, 'package.json'));

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const request = requireFromServer('supertest');
const app = requireFromServer('./src/app');
const endpoints = requireFromServer('./test/contract/endpoints.js');
const { shapeOf } = requireFromServer('./test/contract/shape.js');

const outputDir = path.join(serverDir, 'test', 'contract');

async function snapshotEndpoint(endpoint) {
  let req = request(app)[endpoint.method](endpoint.path);
  if (endpoint.body) req = req.send(endpoint.body);
  const res = await req;

  if (endpoint.kind === 'share') {
    return {
      status: res.status,
      contentTypeIncludesHtml: /html/.test(res.headers['content-type'] || ''),
      hasOgTitle: res.text.includes('property="og:title"'),
      hasOgImage: res.text.includes('property="og:image"'),
      hasTwitterCard: res.text.includes('name="twitter:card"'),
      hasRedirect: res.text.includes('location.replace'),
    };
  }

  if (res.status >= 400) {
    throw new Error(`${endpoint.name} 返回 ${res.status}`);
  }
  return shapeOf(res.body);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  for (const endpoint of endpoints) {
    const snapshot = await snapshotEndpoint(endpoint);
    fs.writeFileSync(
      path.join(outputDir, `${endpoint.name}.snapshot.json`),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      'utf8'
    );
    console.log(`[snapshot] ${endpoint.name}`);
  }

  console.log(`共写入 ${endpoints.length} 个契约快照`);

  // 关闭 app 使用的连接池，避免脚本挂起
  const pool = requireFromServer('./src/db');
  await pool.end().catch(() => {});
}

main().catch((err) => {
  console.error('生成契约快照失败:', err.message);
  process.exitCode = 1;
});