-- ============================================================
-- 迁移 03 · 收藏时间戳与幂等积分流水
-- 幂等：可重复执行
-- rollback: ALTER TABLE user_collections DROP COLUMN updated_at;
--           DROP TABLE user_points_log;
-- ============================================================

-- 1. 收藏更新时间（按 information_schema 判存）
SET @has_updated_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_collections'
    AND column_name = 'updated_at'
);
SET @sql := IF(
  @has_updated_at = 0,
  'ALTER TABLE user_collections ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 收藏分类收敛为白名单长度（先补齐空值，避免 NOT NULL 失败）
UPDATE user_collections SET category = '默认' WHERE category IS NULL OR category = '';

ALTER TABLE user_collections
  MODIFY COLUMN category VARCHAR(20) NOT NULL DEFAULT '默认';

-- 3. 幂等积分流水：同一 (user, source_type, source_key) 只发放一次
CREATE TABLE IF NOT EXISTS user_points_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  source_key VARCHAR(64) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_source (user_id, source_type, source_key),
  INDEX idx_user_time (user_id, created_at),
  CONSTRAINT fk_points_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;