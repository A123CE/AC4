-- ============================================================
-- 迁移 11 · 个性化推荐开关与推荐记录扩展
-- rollback: ALTER TABLE users DROP COLUMN personalization_enabled;
--           ALTER TABLE user_recommendations DROP COLUMN item_type,
--             DROP COLUMN item_id, DROP COLUMN reason_code,
--             DROP COLUMN is_clicked, DROP COLUMN clicked_at;
-- ============================================================

SET @has_pref := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'personalization_enabled'
);
SET @sql := IF(
  @has_pref = 0,
  'ALTER TABLE users ADD COLUMN personalization_enabled TINYINT(1) DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE user_recommendations MODIFY COLUMN route_id VARCHAR(50) NULL;

SET @has_item_type := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'item_type'
);
SET @sql := IF(
  @has_item_type = 0,
  "ALTER TABLE user_recommendations ADD COLUMN item_type VARCHAR(16) DEFAULT 'palace'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_item_id := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'item_id'
);
SET @sql := IF(
  @has_item_id = 0,
  'ALTER TABLE user_recommendations ADD COLUMN item_id VARCHAR(64) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_reason := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'reason_code'
);
SET @sql := IF(
  @has_reason = 0,
  'ALTER TABLE user_recommendations ADD COLUMN reason_code VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_clicked := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'is_clicked'
);
SET @sql := IF(
  @has_clicked = 0,
  'ALTER TABLE user_recommendations ADD COLUMN is_clicked TINYINT(1) DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_clicked_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'clicked_at'
);
SET @sql := IF(
  @has_clicked_at = 0,
  'ALTER TABLE user_recommendations ADD COLUMN clicked_at TIMESTAMP NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;