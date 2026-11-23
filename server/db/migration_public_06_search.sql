-- ============================================================
-- 迁移 06 · 热门搜索词
-- rollback: DROP TABLE search_hot_terms;
-- ============================================================

CREATE TABLE IF NOT EXISTS search_hot_terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(64) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  weight INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  UNIQUE KEY uk_term_locale (term, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO search_hot_terms (term, locale, weight, is_active) VALUES
  ('斗拱', 'zh-CN', 100, 1),
  ('太和殿', 'zh-CN', 90, 1),
  ('庑殿顶', 'zh-CN', 80, 1),
  ('彩画', 'zh-CN', 70, 1),
  ('中轴线', 'zh-CN', 60, 1);