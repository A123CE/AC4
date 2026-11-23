#!/usr/bin/env node
/**
 * 测试库初始化：重建 ac4_test 并执行全部公开迁移
 *
 * - 读取 server/db/init_full.sql，把库名 ac4_db 替换为 ac4_test
 * - 执行基础结构 + 种子数据
 * - 再调用 scripts/migrate.mjs --db=ac4_test 应用迁移
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');
const requireFromServer = createRequire(path.join(serverDir, 'package.json'));
const mysql = requireFromServer('mysql2/promise');

const TEST_DB = process.env.DB_TEST_NAME || 'ac4_test';

async function main() {
  const initSqlPath = path.join(serverDir, 'db', 'init_full.sql');
  if (!fs.existsSync(initSqlPath)) {
    throw new Error(`找不到初始化脚本: ${initSqlPath}`);
  }

  const rawSql = fs.readFileSync(initSqlPath, 'utf8');
  const testSql = rawSql.replace(/\bac4_db\b/g, TEST_DB);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(testSql);
    console.log(`[db:test:init] ${TEST_DB} 基础结构与种子数据已重建`);

    // init_full.sql 尚未整合题库分类字段，单独补跑该幂等迁移
    const quizCategoriesPath = path.join(serverDir, 'db', 'migration_quiz_categories.sql');
    if (fs.existsSync(quizCategoriesPath)) {
      const quizSql = fs
        .readFileSync(quizCategoriesPath, 'utf8')
        .replace(/\bac4_db\b/g, TEST_DB);
      await connection.query(quizSql);
      console.log('[db:test:init] migration_quiz_categories.sql 已应用');
    }
  } finally {
    await connection.end().catch(() => {});
  }

  const migrate = spawnSync(
    process.execPath,
    [path.join(projectRoot, 'scripts', 'migrate.mjs'), `--db=${TEST_DB}`],
    { stdio: 'inherit', env: process.env }
  );

  if (migrate.status !== 0) {
    throw new Error('测试库迁移执行失败');
  }
}

main().catch((err) => {
  console.error('测试库初始化失败:', err.message);
  process.exitCode = 1;
});