-- ============================================================
-- 迁移 13 · 热点已读
-- rollback: DROP TABLE hotspot_reads;
-- ============================================================

CREATE TABLE IF NOT EXISTS hotspot_reads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  palace_id VARCHAR(50) NOT NULL,
  hotspot_id VARCHAR(64) NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_hotspot (user_id, palace_id, hotspot_id),
  INDEX idx_user_time (user_id, read_at),
  CONSTRAINT fk_hotspot_reads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;