-- ============================================================
-- 回滚 16 · 建筑知识双主轴（与 migration_public_16_building_knowledge.sql 配对）
-- 前置：确认已备份 encyclopedia_terms 与 content_translations
-- 本脚本可重复执行（第二次为空操作）
-- ============================================================

-- 1. 删除本轮新增的英文译稿
DELETE FROM content_translations
WHERE entity_type = 'term'
  AND field IN ('term', 'synopsis')
  AND entity_id IN (
  'changcheng-wall',
  'gugong-axis',
  'huanghelou-eaves',
  'mogao-cliff',
  'potala-fortress',
  'tiantan-eaves',
  'tulou-earthen',
  'yingxian-bracket',
  'foguangsi-eave',
  'yueyanglou-helmet',
  'hangtu',
  'fengsui',
  'shiqiang',
  'yabi-kaizao',
  'bihua-caisu',
  'feiyan',
  'yuanxing-weiyuan'
);

-- 2. 删除本轮新增的 17 条词条
DELETE FROM encyclopedia_terms
WHERE id IN (
  'changcheng-wall',
  'gugong-axis',
  'huanghelou-eaves',
  'mogao-cliff',
  'potala-fortress',
  'tiantan-eaves',
  'tulou-earthen',
  'yingxian-bracket',
  'foguangsi-eave',
  'yueyanglou-helmet',
  'hangtu',
  'fengsui',
  'shiqiang',
  'yabi-kaizao',
  'bihua-caisu',
  'feiyan',
  'yuanxing-weiyuan'
);

-- 3. 移除本轮追加的建筑关联（只移除基线中原本不存在的值）

UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'roof-ranking'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tiantan'))
    )
WHERE id = 'roof-ranking'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tiantan') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'foguangsi'))
    )
WHERE id = 'roof-ranking'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'foguangsi') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yueyanglou'))
    )
WHERE id = 'roof-ranking'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yueyanglou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'foguangsi'))
    )
WHERE id = 'wudian-roof'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'foguangsi') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'wudian-roof'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yingxian_muta'))
    )
WHERE id = 'dougong'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yingxian_muta') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'foguangsi'))
    )
WHERE id = 'dougong'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'foguangsi') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yingxian_muta'))
    )
WHERE id = 'dougong-levels'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yingxian_muta') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'foguangsi'))
    )
WHERE id = 'dougong-levels'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'foguangsi') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yingxian_muta'))
    )
WHERE id = 'goudang'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yingxian_muta') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tiantan'))
    )
WHERE id = 'goudang'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tiantan') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tulou'))
    )
WHERE id = 'goudang'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tulou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'sumeru'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'sumeru'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'gongmen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'potala'))
    )
WHERE id = 'gongmen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'potala') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'menshi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'potala'))
    )
WHERE id = 'menshi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'potala') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'screen-wall'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'liulizhaobi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'caihua-hexi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'caihua-hexi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'caihua-xuanzi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'caihua-xuanzi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'sanchaodian'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'potala'))
    )
WHERE id = 'sanchaodian'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'potala') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tulou'))
    )
WHERE id = 'sanchaodian'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tulou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'qianchaohouqin'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'potala'))
    )
WHERE id = 'qianchaohouqin'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'potala') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tulou'))
    )
WHERE id = 'qianchaohouqin'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tulou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'gongdian-buju'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'potala'))
    )
WHERE id = 'gongdian-buju'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'potala') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tulou'))
    )
WHERE id = 'gongdian-buju'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tulou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'huangliuwa'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tiantan'))
    )
WHERE id = 'huangliuwa'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tiantan') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'jishou-xianren'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tiantan'))
    )
WHERE id = 'jishou-xianren'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tiantan') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'chiwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tiantan'))
    )
WHERE id = 'chiwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tiantan') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'longwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'longwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yueyanglou'))
    )
WHERE id = 'longwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yueyanglou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'fengwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'fengwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yueyanglou'))
    )
WHERE id = 'fengwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yueyanglou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'xiangyunwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'xiangyunwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'yueyanglou'))
    )
WHERE id = 'xiangyunwen'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'yueyanglou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'foguangsi'))
    )
WHERE id = 'chuchu'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'foguangsi') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'tulou'))
    )
WHERE id = 'chuchu'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'tulou') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'caisson'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'mogao'))
    )
WHERE id = 'caisson'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'mogao') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'yubaoshi'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
UPDATE encyclopedia_terms
SET related_palaces = JSON_REMOVE(
      related_palaces,
      JSON_UNQUOTE(JSON_SEARCH(related_palaces, 'one', 'gugong'))
    )
WHERE id = 'xieshan-roof'
  AND JSON_VALID(related_palaces)
  AND JSON_SEARCH(related_palaces, 'one', 'gugong') IS NOT NULL;
SET @has_idx_terms_status := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND index_name = 'idx_terms_status'
);
SET @sql := IF(
  @has_idx_terms_status > 0,
  'ALTER TABLE encyclopedia_terms DROP INDEX idx_terms_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_idx_terms_entry_type := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND index_name = 'idx_terms_entry_type'
);
SET @sql := IF(
  @has_idx_terms_entry_type > 0,
  'ALTER TABLE encyclopedia_terms DROP INDEX idx_terms_entry_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_idx_terms_primary_palace := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND index_name = 'idx_terms_primary_palace'
);
SET @sql := IF(
  @has_idx_terms_primary_palace > 0,
  'ALTER TABLE encyclopedia_terms DROP INDEX idx_terms_primary_palace',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_entry_type := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'entry_type'
);
SET @sql := IF(
  @has_entry_type > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN entry_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_status := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'status'
);
SET @sql := IF(
  @has_status > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_primary_palace_id := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'primary_palace_id'
);
SET @sql := IF(
  @has_primary_palace_id > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN primary_palace_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_knowledge_dimensions := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'knowledge_dimensions'
);
SET @sql := IF(
  @has_knowledge_dimensions > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN knowledge_dimensions',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_source_refs := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'source_refs'
);
SET @sql := IF(
  @has_source_refs > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN source_refs',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_image_credits := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'image_credits'
);
SET @sql := IF(
  @has_image_credits > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN image_credits',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_fact_checked_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'fact_checked_at'
);
SET @sql := IF(
  @has_fact_checked_at > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN fact_checked_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_fact_checked_by := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'fact_checked_by'
);
SET @sql := IF(
  @has_fact_checked_by > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN fact_checked_by',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_rights_checked_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'rights_checked_at'
);
SET @sql := IF(
  @has_rights_checked_at > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN rights_checked_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_rights_checked_by := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'rights_checked_by'
);
SET @sql := IF(
  @has_rights_checked_by > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN rights_checked_by',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @has_updated_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'updated_at'
);
SET @sql := IF(
  @has_updated_at > 0,
  'ALTER TABLE encyclopedia_terms DROP COLUMN updated_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- 4. 自检（只读）
SELECT 'terms_total' AS metric, COUNT(*) AS value FROM encyclopedia_terms
UNION ALL
SELECT 'new_terms_remaining', COUNT(*) FROM encyclopedia_terms
  WHERE id IN (
  'changcheng-wall',
  'gugong-axis',
  'huanghelou-eaves',
  'mogao-cliff',
  'potala-fortress',
  'tiantan-eaves',
  'tulou-earthen',
  'yingxian-bracket',
  'foguangsi-eave',
  'yueyanglou-helmet',
  'hangtu',
  'fengsui',
  'shiqiang',
  'yabi-kaizao',
  'bihua-caisu',
  'feiyan',
  'yuanxing-weiyuan'
)
UNION ALL
SELECT 'new_translations_remaining', COUNT(*) FROM content_translations
  WHERE entity_type = 'term' AND entity_id IN (
  'changcheng-wall',
  'gugong-axis',
  'huanghelou-eaves',
  'mogao-cliff',
  'potala-fortress',
  'tiantan-eaves',
  'tulou-earthen',
  'yingxian-bracket',
  'foguangsi-eave',
  'yueyanglou-helmet',
  'hangtu',
  'fengsui',
  'shiqiang',
  'yabi-kaizao',
  'bihua-caisu',
  'feiyan',
  'yuanxing-weiyuan'
);
