-- ============================================================
-- 迁移 12 · 建筑发布状态与草稿隔离
-- rollback: ALTER TABLE palaces DROP COLUMN status;
-- ============================================================

SET @has_status := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'palaces'
    AND column_name = 'status'
);
SET @sql := IF(
  @has_status = 0,
  "ALTER TABLE palaces ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'published'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE palaces SET status = 'published' WHERE status IS NULL OR status = '';

SET @has_status_idx := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'palaces'
    AND index_name = 'idx_palaces_status'
);
SET @sql := IF(
  @has_status_idx = 0,
  'ALTER TABLE palaces ADD INDEX idx_palaces_status (status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;