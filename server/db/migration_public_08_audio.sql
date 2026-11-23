-- ============================================================
-- 迁移 08 · 真人导览音频元数据
-- rollback: DROP TABLE audio_guides;
-- ============================================================

CREATE TABLE IF NOT EXISTS audio_guides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(16) NOT NULL DEFAULT 'palace',
  entity_id VARCHAR(64) NOT NULL,
  audio_url VARCHAR(255) NOT NULL,
  duration_seconds INT DEFAULT NULL,
  transcript TEXT,
  transcript_hash CHAR(40) DEFAULT NULL,
  narrator VARCHAR(64) DEFAULT NULL,
  locale VARCHAR(10) DEFAULT 'zh-CN',
  status VARCHAR(16) DEFAULT 'published',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_entity_locale (entity_type, entity_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;