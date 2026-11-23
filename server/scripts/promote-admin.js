/**
 * 管理员授权脚本
 * 用法:
 *   node server/scripts/promote-admin.js <用户名>
 *   node server/scripts/promote-admin.js --list
 *
 * 说明:
 *   档案编修接口要求 role === 'admin'。用户登录时 role 会写入 JWT，
 *   授权后需重新登录，新令牌才会带上 admin 权限。
 */
const mysql = require('../node_modules/mysql2/promise');

(async () => {
  const arg = process.argv[2];
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    database: process.env.DB_NAME || 'ac4_db',
    charset: 'utf8mb4',
  });

  try {
    if (!arg || arg === '--list') {
      const [rows] = await conn.query(
        'SELECT id, username, email, role FROM users ORDER BY id ASC'
      );
      console.log('当前用户:');
      rows.forEach((u) =>
        console.log(`  #${u.id} ${u.username} <${u.email || '-'}> role=${u.role}`)
      );
      if (!arg) {
        console.log('\n用法: node server/scripts/promote-admin.js <用户名>');
      }
      return;
    }

    const [rows] = await conn.execute('SELECT id, username, role FROM users WHERE username = ?', [
      arg,
    ]);
    if (rows.length === 0) {
      console.error(`未找到用户「${arg}」`);
      process.exitCode = 1;
      return;
    }

    await conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", [rows[0].id]);
    console.log(`已授权「${rows[0].username}」为管理员，请重新登录以刷新令牌。`);
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('执行失败:', err.message);
  process.exit(1);
});
