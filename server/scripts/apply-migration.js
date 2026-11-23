/**
 * 应用迁移文件到本地 MySQL
 * 用法: node server/scripts/apply-migration.js server/db/migration_national_details.sql
 */
const fs = require('fs');
const path = require('path');
const mysql = require('../node_modules/mysql2/promise');

const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/apply-migration.js <sql 文件>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    database: process.env.DB_NAME || 'ac4_db',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  await conn.query(sql);
  const [[{ c: t }]] = await conn.query('SELECT COUNT(*) c FROM palace_timeline');
  const [[{ c: f }]] = await conn.query('SELECT COUNT(*) c FROM palace_fun_facts');
  console.log(`迁移完成: ${file}\n  palace_timeline 总行数=${t}\n  palace_fun_facts 总行数=${f}`);
  await conn.end();
})().catch((err) => {
  console.error('迁移失败:', err.message);
  process.exit(1);
});
