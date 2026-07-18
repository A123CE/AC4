-- ============================================================
-- AC4 故宫可视化系统 — 营造法式图片增强迁移
-- 新增: encyclopedia_terms.image_paths JSON 字段
-- 使用方法: mysql -u root -p ac4_db < server/db/migration_image_paths.sql
-- ============================================================

ALTER TABLE `encyclopedia_terms`
  ADD COLUMN `image_paths` JSON DEFAULT NULL COMMENT '配套讲解图片路径数组 ["images/xxx.png"]'
  AFTER `sort_order`;
