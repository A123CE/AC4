-- ============================================================
-- 迁移 15 · 课堂模式用户偏好两列
-- 口径：classroom_font_scale ∈ {standard, large, xlarge}，默认 large
-- rollback: ALTER TABLE users DROP COLUMN classroom_mode;
--           ALTER TABLE users DROP COLUMN classroom_font_scale;
-- ============================================================

SET @has_classroom_mode := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'classroom_mode'
);
SET @sql := IF(
  @has_classroom_mode = 0,
  'ALTER TABLE users ADD COLUMN classroom_mode TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_classroom_font_scale := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'classroom_font_scale'
);
SET @sql := IF(
  @has_classroom_font_scale = 0,
  "ALTER TABLE users ADD COLUMN classroom_font_scale VARCHAR(8) NOT NULL DEFAULT 'large'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
SET classroom_font_scale = 'large'
WHERE classroom_font_scale IS NULL
   OR classroom_font_scale NOT IN ('standard', 'large', 'xlarge');