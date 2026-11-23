-- ============================================================
-- 迁移 05 · 匿名分享回流聚合表
-- rollback: DROP TABLE share_visits;
-- ============================================================

CREATE TABLE IF NOT EXISTS share_visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(16) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  channel VARCHAR(16) NOT NULL DEFAULT 'unknown',
  visit_date DATE NOT NULL,
  referer_class VARCHAR(32) NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_entity_channel_date (entity_type, entity_id, channel, visit_date),
  INDEX idx_date (visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;