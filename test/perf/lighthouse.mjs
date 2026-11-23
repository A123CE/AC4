#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const baseUrl = process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:4173';

const urls = ['/', '/exhibition/taihedian', '/search?q=斗拱'];

fs.mkdirSync(path.join(projectRoot, 'reports'), { recursive: true });

for (const url of urls) {
  const output = path.join(
    projectRoot,
    'reports',
    `lighthouse-${url.replace(/[^a-z0-9]+/gi, '_') || 'root'}.json`
  );

  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      'lighthouse',
      `${baseUrl}${url}`,
      '--only-categories=performance,accessibility',
      '--emulated-form-factor=mobile',
      '--output=json',
      `--output-path=${output}`,
      '--chrome-flags=--headless=new',
      '--quiet',
    ],
    { stdio: 'inherit', cwd: projectRoot }
  );

  if (result.error || result.status !== 0) {
    console.error(`Lighthouse 运行失败：${url}`);
    console.error('请先安装 lighthouse，并确保预览服务已启动。');
    process.exitCode = 1;
  } else {
    console.log(`[lighthouse] ${url} -> ${output}`);
  }
}