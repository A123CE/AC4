#!/usr/bin/env node
/**
 * 百科词条内容哈希基线
 * 用法：node scripts/bg-content-hash.mjs [--base-url=http://localhost:3001] [--out=path.json]
 * 口径：按 id 升序，拼接 id/term/synopsis/content/category，逐条 SHA-256 并汇总。
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const found = args.find((item) => item.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
};

const BASE_URL = (getArg('--base-url', 'http://localhost:3001') || '').replace(/\/+$/, '');
const OUT = getArg('--out', '');

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const payload = await fetchJson(
    `${BASE_URL}/api/encyclopedia?page_size=500&include=content`
  );
  const list = Array.isArray(payload.data) ? payload.data : [];
  const total = Number(payload.meta?.total ?? list.length);

  const withContent = [];
  for (const item of list) {
    if (typeof item.content === 'string' && item.content.length > 0) {
      withContent.push(item);
      continue;
    }
    const detail = await fetchJson(`${BASE_URL}/api/encyclopedia/${encodeURIComponent(item.id)}`);
    if (detail?.data?.content) {
      withContent.push({ ...item, content: detail.data.content });
    } else {
      throw new Error(`词条 ${item.id} 缺少 content`);
    }
  }

  withContent.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const perId = {};
  const lines = [];
  for (const item of withContent) {
    const canonical = [
      item.id,
      item.term || '',
      item.synopsis || '',
      item.content,
      item.category || '',
    ].join('\u0000');
    perId[item.id] = sha256(canonical);
    lines.push(canonical);
  }

  const result = {
    total,
    fetched: withContent.length,
    aggregate: sha256(lines.join('\n')),
    perId,
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
  };

  const json = JSON.stringify(result, null, 2);
  if (OUT) {
    fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
    fs.writeFileSync(OUT, `${json}\n`, 'utf8');
    console.log(`written ${OUT}`);
  }
  console.log(JSON.stringify({
    total: result.total,
    fetched: result.fetched,
    aggregate: result.aggregate,
    perIdKeys: Object.keys(perId).length,
  }, null, 2));

  if (result.fetched !== result.total) {
    process.exitCode = 1;
  }
  if (!/^[a-f0-9]{64}$/.test(result.aggregate)) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('内容哈希失败:', err.message);
  process.exit(1);
});