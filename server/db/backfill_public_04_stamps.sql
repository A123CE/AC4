-- ============================================================
-- 回填 04 · 为老用户补发历史集章
-- 可重复执行：INSERT IGNORE 依赖 uk_user_palace
-- ============================================================

INSERT IGNORE INTO user_stamps (user_id, palace_id, palace_name_snapshot, earned_at)
SELECT h.user_id, h.palace_id, p.name, MIN(h.viewed_at)
FROM user_history h
JOIN palaces p ON p.id = h.palace_id
GROUP BY h.user_id, h.palace_id, p.name;