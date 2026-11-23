#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');
const requireFromServer = createRequire(path.join(serverDir, 'package.json'));
const mysql = requireFromServer('mysql2/promise');

const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const fullDb = `ac4_schema_full_${suffix}`;
const migDb = `ac4_schema_mig_${suffix}`;

function assertDbName(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`非法库名: ${name}`);
}

async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
}

function readSql(file) {
  return fs.readFileSync(file, 'utf8');
}

async function readStructure(connection, database) {
  const [columns] = await connection.query(
    `SELECT table_name, column_name, column_type, is_nullable, column_default, extra, collation_name
     FROM information_schema.columns WHERE table_schema = ?
     ORDER BY table_name, ordinal_position`,
    [database]
  );
  const [indexes] = await connection.query(
    `SELECT table_name, index_name, non_unique, seq_in_index, column_name
     FROM information_schema.statistics WHERE table_schema = ?
     ORDER BY table_name, index_name, seq_in_index`,
    [database]
  );
  const [foreignKeys] = await connection.query(
    `SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name
     FROM information_schema.key_column_usage
     WHERE table_schema = ? AND referenced_table_name IS NOT NULL
     ORDER BY table_name, constraint_name, ordinal_position`,
    [database]
  );
  return { columns, indexes, foreignKeys };
}

function diffRows(left, right, label) {
  const a = JSON.stringify(left);
  const b = JSON.stringify(right);
  if (a === b) return [];
  return [`${label} 存在差异`];
}

async function main() {
  assertDbName(fullDb);
  assertDbName(migDb);

  const connection = await createConnection();

  try {
    for (const database of [fullDb, migDb]) {
      await connection.query(
        `CREATE DATABASE \`${database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`
      );
    }

    const initSql = readSql(path.join(serverDir, 'db', 'init_full.sql'));
    await connection.query(initSql.replace(/\bac4_db\b/g, fullDb));
    await connection.query(initSql.replace(/\bac4_db\b/g, migDb));

    const migrationFiles = fs
      .readdirSync(path.join(serverDir, 'db'))
      .filter((file) => /^migration_public_.*\.sql$/i.test(file))
      .sort();

    for (const file of migrationFiles) {
      const sql = readSql(path.join(serverDir, 'db', file)).replace(
        /\bac4_db\b/g,
        migDb
      );
      await connection.query(sql);
    }

    const full = await readStructure(connection, fullDb);
    const mig = await readStructure(connection, migDb);

    const diffs = [
      ...diffRows(full.columns, mig.columns, '列'),
      ...diffRows(full.indexes, mig.indexes, '索引'),
      ...diffRows(full.foreignKeys, mig.foreignKeys, '外键'),
    ];

    if (diffs.length > 0) {
      console.error('结构差异：');
      diffs.forEach((line) => console.error(`  - ${line}`));
      process.exitCode = 1;
    } else {
      console.log('schema:diff 通过：init_full 与全部 migration_public 结构一致');
    }
  } finally {
    for (const database of [fullDb, migDb]) {
      await connection
        .query(`DROP DATABASE IF EXISTS \`${database}\``)
        .catch(() => {});
    }
    await connection.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('结构对比失败:', err.message);
  process.exitCode = 1;
});