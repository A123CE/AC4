-- ============================================================
-- 迁移 10 · 匿名埋点与统计开关
-- rollback: DROP TABLE metrics_events;
--           ALTER TABLE users DROP COLUMN analytics_enabled;
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(32) NOT NULL,
  entity_type VARCHAR(16) DEFAULT NULL,
  entity_id VARCHAR(64) DEFAULT NULL,
  anon_hash CHAR(64) DEFAULT NULL,
  session_hash CHAR(64) DEFAULT NULL,
  locale VARCHAR(10) DEFAULT NULL,
  tier VARCHAR(16) DEFAULT NULL,
  path VARCHAR(255) DEFAULT NULL,
  props JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name_time (event_name, created_at),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_analytics := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'analytics_enabled'
);
SET @sql := IF(
  @has_analytics = 0,
  'ALTER TABLE users ADD COLUMN analytics_enabled TINYINT(1) DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;