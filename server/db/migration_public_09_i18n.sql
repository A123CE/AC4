-- ============================================================
-- 迁移 09 · 内容翻译与用户语言偏好
-- rollback: DROP TABLE content_translations;
--           ALTER TABLE users DROP COLUMN locale;
-- ============================================================

CREATE TABLE IF NOT EXISTS content_translations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(16) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  field VARCHAR(32) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  value TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'full',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_entity_field_locale (entity_type, entity_id, field, locale),
  INDEX idx_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_locale := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'locale'
);
SET @sql := IF(
  @has_locale = 0,
  "ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'zh-CN'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO content_translations
  (entity_type, entity_id, field, locale, value, status)
VALUES
  ('palace', 'taihedian', 'name', 'en', 'Hall of Supreme Harmony', 'full'),
  ('palace', 'taihedian', 'description', 'en', 'The principal hall of the Outer Court of the Forbidden City, used for great imperial ceremonies.', 'full'),
  ('palace', 'tiantan', 'name', 'en', 'Temple of Heaven', 'full'),
  ('palace', 'tiantan', 'description', 'en', 'The imperial sacrificial complex in Beijing, famous for the Circular Mound Altar and Hall of Prayer for Good Harvests.', 'full'),
  ('palace', 'wumen', 'name', 'en', 'Meridian Gate', 'full');