#!/usr/bin/env node
/**
 * UGC 阻断静态扫描（本期零实现验收）
 * 仅证明仓库中不存在 UGC 公开实现痕迹与可达入口。
 * 若未来解禁 UGC，本脚本必须失效并由新任务替换。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const results = [];

function report(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}

function walk(dir, extensions, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extensions, onFile);
    else if (extensions.has(path.extname(entry.name))) onFile(full);
  }
}

function scanText(name, dir, extensions, predicate) {
  const hits = [];
  walk(dir, extensions, (file) => {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (predicate(line)) {
        hits.push(`${path.relative(root, file)}:${index + 1}`);
      }
    });
  });
  report(name, hits.length === 0, hits.slice(0, 8).join(', '));
}

const dbDir = path.join(root, 'server', 'db');
const dbFiles = fs.existsSync(dbDir) ? fs.readdirSync(dbDir) : [];
report(
  'server/db 无迁移 16 UGC',
  !dbFiles.some((file) => /^migration_public_16_ugc/i.test(file)),
  dbFiles.filter((file) => /16_ugc/i.test(file)).join(', ')
);

const routesDir = path.join(root, 'server', 'src', 'routes');
const routeFiles = fs.existsSync(routesDir) ? fs.readdirSync(routesDir) : [];
report(
  'server/src/routes 无 ugc 路由文件',
  !routeFiles.some((file) => /^ugc/i.test(file)),
  routeFiles.filter((file) => /^ugc/i.test(file)).join(', ')
);

const appFile = path.join(root, 'server', 'src', 'app.js');
report(
  'app.js 无 /api/ugc 挂载',
  !fs.existsSync(appFile) || !fs.readFileSync(appFile, 'utf8').includes('/api/ugc')
);

const configDir = path.join(root, 'server', 'src', 'config');
let configOk = true;
let configDetail = '';
if (fs.existsSync(configDir)) {
  walk(configDir, new Set(['.js', '.json', '.ts']), (file) => {
    if (/\bUGC\b/i.test(fs.readFileSync(file, 'utf8'))) {
      configOk = false;
      configDetail = path.relative(root, file);
    }
  });
}
report('server/src/config 不存在或无 UGC 键', configOk, configDetail);

const clientSrc = path.join(root, 'client', 'src');
const clientExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

scanText(
  '前端无 data-testid=public*',
  clientSrc,
  clientExtensions,
  (line) =>
    /data-testid\s*=\s*(?:"[^"]*public[^"]*"|'[^']*public[^']*'|\{[^}]*public[^}]*\})/i.test(line)
);

scanText(
  '前端无 UGC 可达文案',
  clientSrc,
  clientExtensions,
  (line) => /公开笔记|发布笔记|审核队列|举报/.test(line)
);

const searchService = path.join(root, 'server', 'src', 'services', 'searchService.js');
report(
  'searchService 不查询 user_collections',
  !fs.existsSync(searchService) ||
    !fs.readFileSync(searchService, 'utf8').includes('user_collections')
);

const sitemapService = path.join(root, 'server', 'src', 'services', 'sitemapService.js');
const sitemapText = fs.existsSync(sitemapService)
  ? fs.readFileSync(sitemapService, 'utf8')
  : '';
report(
  'sitemapService 不含 user_collections/note',
  !/user_collections|\bnote\b/i.test(sitemapText)
);

const failed = results.filter((item) => !item.ok);
console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);