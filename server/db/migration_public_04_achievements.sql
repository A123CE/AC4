-- ============================================================
-- 迁移 04 · 集章事实表、徽章阈值与查询索引
-- 幂等：可重复执行
-- rollback: DROP TABLE user_stamps;
--           UPDATE badges SET condition_value=10 WHERE condition_type='palaces_viewed';
--           ALTER TABLE user_history DROP INDEX idx_user_palace;
-- ============================================================

-- 1. 不可撤销的集章事实表（palace_id 不设外键，建筑下线不丢章）
CREATE TABLE IF NOT EXISTS user_stamps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  palace_id VARCHAR(50) NOT NULL,
  palace_name_snapshot VARCHAR(100),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_palace (user_id, palace_id),
  INDEX idx_user_time (user_id, earned_at),
  CONSTRAINT fk_stamps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 修正浏览类徽章阈值：10 -> 20
UPDATE badges
SET condition_value = 20,
    description = '探访全部建筑'
WHERE condition_type = 'palaces_viewed';

-- 3. 历史查询索引（按 information_schema 判存，保证幂等）
SET @has_history_idx := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_history'
    AND index_name = 'idx_user_palace'
);
SET @sql := IF(
  @has_history_idx = 0,
  'ALTER TABLE user_history ADD INDEX idx_user_palace (user_id, palace_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;