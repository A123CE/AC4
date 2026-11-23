const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const projectRoot = path.resolve(__dirname, '../..');
const dbDir = path.join(projectRoot, 'server', 'db');
const database = `ac4_migration_test_${Date.now()}`;

function connectionConfig(database) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    database,
    multipleStatements: true,
    charset: 'utf8mb4',
  };
}

describe('迁移幂等性', () => {
  it('全部 migration_public 连续执行两次无报错', async () => {
    if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('非法库名');
    const root = await mysql.createConnection({
      ...connectionConfig(undefined),
      database: undefined,
    });

    try {
      await root.query(
        `CREATE DATABASE \`${database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`
      );

      const connection = await mysql.createConnection(connectionConfig(database));
      try {
        const initSql = fs
          .readFileSync(path.join(dbDir, 'init_full.sql'), 'utf8')
          .replace(/\bac4_db\b/g, database);
        await connection.query(initSql);

        const migrations = fs
          .readdirSync(dbDir)
          .filter((file) => /^migration_public_.*\.sql$/i.test(file))
          .sort();

        for (let round = 0; round < 2; round += 1) {
          for (const file of migrations) {
            const sql = fs
              .readFileSync(path.join(dbDir, file), 'utf8')
              .replace(/\bac4_db\b/g, database);
            await assert.doesNotReject(connection.query(sql), `${file} 第 ${round + 1} 次失败`);
          }
        }

        const [[row]] = await connection.query(
          'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
          [database]
        );
        assert.ok(Number(row.total) > 0);
      } finally {
        await connection.end().catch(() => {});
      }
    } finally {
      await root
        .query(`DROP DATABASE IF EXISTS \`${database}\``)
        .catch(() => {});
      await root.end().catch(() => {});
    }
  });
});