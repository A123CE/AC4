#!/usr/bin/env node
/**
 * 数据库迁移执行器
 *
 * 读取 server/db/migration_public_*.sql，按文件名序号排序后逐个执行。
 * - schema_version 记录已应用版本与校验和，保证可断点续跑
 * - --status   查看应用状态
 * - --dry-run  只打印将执行的迁移，不写入数据库
 * - --to=<序号> 只执行到指定序号（例如 --to=03）
 * - --db=<库名> 覆盖目标数据库
 *
 * 只执行文件原文，不拼接任何 SQL 参数。
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');
const migrationsDir = path.join(serverDir, 'db');
const requireFromServer = createRequire(path.join(serverDir, 'package.json'));
const mysql = requireFromServer('mysql2/promise');

const MIGRATION_PATTERN = /^migration_public_(\d+)_.*\.sql$/i;

function parseArgs(argv) {
  const options = { status: false, dryRun: false, to: null, db: null };
  for (const arg of argv) {
    if (arg === '--status') options.status = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--to=')) options.to = arg.slice(5);
    else if (arg.startsWith('--db=')) options.db = arg.slice(5);
    else {
      console.error(`未知参数: ${arg}`);
      process.exit(1);
    }
  }
  if (options.db !== null && !/^[A-Za-z0-9_]+$/.test(options.db)) {
    console.error('--db 只允许字母、数字与下划线');
    process.exit(1);
  }
  if (options.to !== null && !/^\d+$/.test(options.to)) {
    console.error('--to 必须是数字序号，例如 --to=03');
    process.exit(1);
  }
  return options;
}

function readMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`迁移目录不存在: ${migrationsDir}`);
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => MIGRATION_PATTERN.test(file))
    .sort((a, b) => {
      const na = Number(a.match(MIGRATION_PATTERN)[1]);
      const nb = Number(b.match(MIGRATION_PATTERN)[1]);
      return na - nb || a.localeCompare(b);
    })
    .map((file) => {
      const fullPath = path.join(migrationsDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      return {
        version: file,
        order: Number(file.match(MIGRATION_PATTERN)[1]),
        fullPath,
        checksum: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
        content,
      };
    });
}

function findMissingTables(resultSets) {
  if (!Array.isArray(resultSets)) return null;
  const queue = [...resultSets];
  while (queue.length > 0) {
    const item = queue.shift();
    if (Array.isArray(item)) {
      queue.unshift(...item);
      continue;
    }
    if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'missing_tables')) {
      return item.missing_tables;
    }
  }
  return null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dbName = options.db || process.env.DB_NAME || 'ac4_db';
  const migrations = readMigrations();
  const selected = options.to === null
    ? migrations
    : migrations.filter((m) => m.order <= Number(options.to));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query('CREATE TABLE IF NOT EXISTS schema_version (' +
      'version VARCHAR(64) PRIMARY KEY, ' +
      'applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
      'checksum CHAR(64) NOT NULL' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    const [appliedRows] = await connection.query(
      'SELECT version, checksum, applied_at FROM schema_version ORDER BY version ASC'
    );
    const applied = new Map(appliedRows.map((row) => [row.version, row]));

    if (options.status) {
      console.log(`目标数据库: ${dbName}`);
      console.log('迁移状态:');
      for (const migration of selected) {
        const row = applied.get(migration.version);
        const state = row
          ? `已应用 ${new Date(row.applied_at).toISOString()}`
          : '待应用';
        const drift = row && row.checksum !== migration.checksum ? '（校验和不一致）' : '';
        console.log(`  ${migration.version}  ${state}${drift}`);
      }
      return;
    }

    const pending = selected.filter((migration) => !applied.has(migration.version));

    if (pending.length === 0) {
      console.log(`目标数据库 ${dbName}：0 applied`);
      return;
    }

    for (const migration of pending) {
      const existing = applied.get(migration.version);
      if (existing && existing.checksum !== migration.checksum) {
        throw new Error(`迁移 ${migration.version} 已应用但校验和不一致，请人工确认后再处理`);
      }
    }

    let appliedCount = 0;
    for (const migration of pending) {
      if (options.dryRun) {
        console.log(`[dry-run] 将执行 ${migration.version}`);
        continue;
      }

      await connection.beginTransaction();
      try {
        const resultSets = await connection.query(migration.content);
        const missing = findMissingTables(resultSets);
        if (missing !== null && String(missing).trim() !== '') {
          throw new Error(`基线校验失败，缺失表: ${missing}`);
        }
        await connection.query(
          'INSERT INTO schema_version (version, checksum) VALUES (?, ?)',
          [migration.version, migration.checksum]
        );
        await connection.commit();
        appliedCount += 1;
        console.log(`[applied] ${migration.version}`);
      } catch (err) {
        await connection.rollback().catch(() => {});
        console.error(`[failed] ${migration.version}: ${err.message}`);
        throw err;
      }
    }

    if (!options.dryRun) {
      console.log(`目标数据库 ${dbName}：${appliedCount} applied`);
    }
  } finally {
    await connection.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('迁移执行失败:', err.message);
  process.exitCode = 1;
});