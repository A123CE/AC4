-- ============================================================
--  档案编修权限 — 初始化管理员账号
--  用法: node server/scripts/apply-migration.js server/db/migration_curator.sql
--  幂等: 可重复执行
--
--  内置账号: curator / curator2026
--  如需把自己已有账号提升为管理员, 运行:
--    node server/scripts/promote-admin.js <你的用户名>
--  授权后需重新登录, JWT 中才会带上 admin 角色。
-- ============================================================

USE ac4_db;

INSERT INTO users (username, email, password_hash, role, points)
VALUES ('curator', 'curator@acvisual.local',
        '$2b$10$7e0pWtKfv0ksgX.NEY74XO6HxSrkNmBAJriAfTVEU3iHWPjkd8Vum',
        'admin', 0)
ON DUPLICATE KEY UPDATE
  role = 'admin',
  password_hash = VALUES(password_hash);

SELECT id, username, email, role FROM users WHERE role = 'admin';
