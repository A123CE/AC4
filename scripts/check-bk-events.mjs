#!/usr/bin/env node
/**
 * 建筑知识埋点静态校验
 * 断言 4 个事件名/3 个属性已登记，页面存在调用点，且未使用 dangerouslySetInnerHTML 渲染高亮。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = {
  analytics: 'client/src/lib/analytics.js',
  page: 'client/src/pages/EncyclopediaPage.jsx',
  detail: 'client/src/components/DetailPanel.jsx',
};

const EVENTS = [
  'encyclopedia_term_view',
  'encyclopedia_term_open',
  'encyclopedia_filter_building',
  'encyclopedia_reverse_click',
];

const PROPS = ['entry_type', 'palace_id', 'result_count'];

const results = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function lineOf(text, needle) {
  const index = text.indexOf(needle);
  if (index < 0) return 0;
  return text.slice(0, index).split(/\r?\n/).length;
}

function blockOf(text, anchor) {
  const start = text.indexOf(anchor);
  if (start < 0) return '';
  const end = text.indexOf(']);', start);
  return text.slice(start, end + 3);
}

function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}

const analytics = read(FILES.analytics);
const page = read(FILES.page);
const detail = read(FILES.detail);

const eventBlock = blockOf(analytics, 'const EVENT_NAMES');
const propBlock = blockOf(analytics, 'const ALLOWED_PROP_KEYS');

for (const eventName of EVENTS) {
  check(
    `事件名已登记：${eventName}`,
    eventBlock.includes(`'${eventName}'`),
    `${FILES.analytics}:${lineOf(analytics, 'const EVENT_NAMES')}`
  );
}

for (const prop of PROPS) {
  check(
    `属性键已登记：${prop}`,
    propBlock.includes(`'${prop}'`),
    `${FILES.analytics}:${lineOf(analytics, 'const ALLOWED_PROP_KEYS')}`
  );
}

const pageCalls = [
  ['encyclopedia_term_view', page],
  ['encyclopedia_term_open', page],
  ['encyclopedia_filter_building', page],
];
for (const [eventName, text] of pageCalls) {
  check(
    `页面存在调用：${FILES.page} → ${eventName}`,
    text.includes(`track('${eventName}'`),
    `${FILES.page}:${lineOf(text, `track('${eventName}'`) || '未找到'}`
  );
}

check(
  `详情面板存在调用：${FILES.detail} → encyclopedia_reverse_click`,
  detail.includes("track('encyclopedia_reverse_click'"),
  `${FILES.detail}:${lineOf(detail, "track('encyclopedia_reverse_click'") || '未找到'}`
);
check(
  `详情面板存在调用：${FILES.detail} → encyclopedia_term_view`,
  detail.includes("track('encyclopedia_term_view'"),
  `${FILES.detail}:${lineOf(detail, "track('encyclopedia_term_view'") || '未找到'}`
);

for (const [key, file] of [
  ['page', FILES.page],
  ['detail', FILES.detail],
]) {
  const text = key === 'page' ? page : detail;
  check(
    `未使用 dangerouslySetInnerHTML：${file}`,
    !text.includes('dangerouslySetInnerHTML'),
    `${file}:${lineOf(text, 'dangerouslySetInnerHTML')}`
  );
}

const failed = results.filter((item) => !item.ok);
console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);