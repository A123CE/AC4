-- ============================================================
-- 迁移 00 · 基线校验（只读，不修改任何业务表）
-- 目的：确认 16 张基础表存在，作为后续 migration_public_*.sql 的前置
--
-- 约定：本文件返回单行结果，列 missing_tables 为缺失表名称清单。
--       迁移执行器 scripts/migrate.mjs 检测到该列非空时即判定基线失败。
-- ============================================================

SELECT COALESCE(GROUP_CONCAT(required.name ORDER BY required.name), '') AS missing_tables
FROM (
  SELECT 'users' AS name
  UNION ALL SELECT 'palaces'
  UNION ALL SELECT 'palace_images'
  UNION ALL SELECT 'palace_timeline'
  UNION ALL SELECT 'palace_fun_facts'
  UNION ALL SELECT 'encyclopedia_terms'
  UNION ALL SELECT 'quiz_questions'
  UNION ALL SELECT 'quiz_records'
  UNION ALL SELECT 'user_history'
  UNION ALL SELECT 'user_collections'
  UNION ALL SELECT 'user_badges'
  UNION ALL SELECT 'badges'
  UNION ALL SELECT 'user_skins'
  UNION ALL SELECT 'user_tags'
  UNION ALL SELECT 'user_recommendations'
  UNION ALL SELECT 'user_signins'
) AS required
LEFT JOIN information_schema.tables AS t
  ON t.table_schema = DATABASE()
 AND t.table_name = required.name
WHERE t.table_name IS NULL;