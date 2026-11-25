const mysql = require('mysql2/promise');

function getConfig(overrides = {}) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.DB_TEST_NAME || 'ac4_test',
    multipleStatements: true,
    charset: 'utf8mb4',
    connectTimeout: 3000,
    ...overrides,
  };
}

async function canConnect() {
  try {
    const connection = await mysql.createConnection(getConfig());
    await connection.ping();
    await connection.end();
    return true;
  } catch {
    return false;
  }
}

// 先子表后主表，避免外键约束
const TABLES = [
  'user_recommendations',
  'user_signins',
  'user_skins',
  'user_tags',
  'user_badges',
  'quiz_records',
  'user_collections',
  'user_history',
  'palace_fun_facts',
  'palace_timeline',
  'palace_images',
  'quiz_questions',
  'encyclopedia_terms',
  'badges',
  'users',
  'palaces',
];

async function truncateAll() {
  const connection = await mysql.createConnection(getConfig());
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await connection.end().catch(() => {});
  }
}

async function withTransaction(fn) {
  const connection = await mysql.createConnection(getConfig());
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    await connection.end().catch(() => {});
  }
}

module.exports = { getConfig, canConnect, truncateAll, withTransaction, TABLES };