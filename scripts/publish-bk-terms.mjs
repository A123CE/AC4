#!/usr/bin/env node
/**
 * 发布本轮建筑知识词条（草稿 → 已发布）
 * 用法：
 *   node scripts/publish-bk-terms.mjs [--db=ac4_test] [--dry-run]
 * 规则：先 validateTerm，逐条通过后才发布；失败条目保持草稿并退出码 1。
 */
import { createRequire } from 'module';

const args = process.argv.slice(2);
const dbArg = args.find((item) => item.startsWith('--db='));
const DB_NAME = dbArg ? dbArg.slice('--db='.length) : process.env.DB_NAME || 'ac4_db';
const DRY_RUN = args.includes('--dry-run');

process.env.DB_NAME = DB_NAME;
const require = createRequire(new URL('../server/package.json', import.meta.url));
const mysql = require('mysql2/promise');
const service = require('../server/src/services/encyclopediaService.js');

const TERM_IDS = [
  'changcheng-wall', 'gugong-axis', 'huanghelou-eaves', 'mogao-cliff', 'potala-fortress',
  'tiantan-eaves', 'tulou-earthen', 'yingxian-bracket', 'foguangsi-eave', 'yueyanglou-helmet',
  'hangtu', 'fengsui', 'shiqiang', 'yabi-kaizao', 'bihua-caisu', 'feiyan', 'yuanxing-weiyuan',
];

process.env.DB_NAME = DB_NAME;
const pool = require('../server/src/db');

async function main() {
  const [rows] = await pool.query(
    `SELECT * FROM encyclopedia_terms WHERE id IN (${TERM_IDS.map(() => '?').join(',')})`,
    TERM_IDS
  );
  if (rows.length !== TERM_IDS.length) {
    const found = new Set(rows.map((row) => row.id));
    const missing = TERM_IDS.filter((id) => !found.has(id));
    console.error(`缺少词条：${missing.join(',')}`);
    process.exitCode = 1;
    return;
  }

  const approved = [];
  const rejected = [];
  for (const row of rows) {
    const result = await service.validateTerm(row);
    if (result.ok) approved.push(row.id);
    else rejected.push({ id: row.id, violations: result.violations });
  }

  console.log(`校验通过 ${approved.length} 条，未通过 ${rejected.length} 条`);
  if (rejected.length > 0) {
    for (const item of rejected) {
      console.log(`  ✗ ${item.id}: ${item.violations.map((v) => `${v.rule} ${v.detail}`).join('; ')}`);
    }
    process.exitCode = 1;
  }

  if (DRY_RUN) {
    console.log('dry-run：未写入数据库');
    return;
  }

  if (approved.length > 0) {
    await pool.query(
      `UPDATE encyclopedia_terms
       SET status = 'published',
           fact_checked_at = NOW(),
           fact_checked_by = '编码侧自检',
           rights_checked_at = NOW(),
           rights_checked_by = '无图（版权待补）'
       WHERE id IN (${approved.map(() => '?').join(',')})`,
      approved
    );
    service.clearTaxonomyCache();
  }

  const [[stats]] = await pool.query(
    "SELECT COUNT(*) AS n FROM encyclopedia_terms WHERE status = 'published'"
  );
  console.log(`已发布 ${approved.length} 条；当前 published = ${stats.n}`);
  process.exitCode = rejected.length > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error('发布失败：', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });