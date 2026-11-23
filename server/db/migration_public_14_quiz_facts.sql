-- ============================================================
-- 迁移 14 · 答题事实表、可疑标记与排行用户列
-- 回填口径：同一用户+题目取 MIN(id) 首次结果
-- rollback: DROP TABLE quiz_abuse_flags; DROP TABLE quiz_answer_facts;
--           ALTER TABLE users DROP COLUMN minor_mode;
--           ALTER TABLE users DROP COLUMN leaderboard_opt_out;
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_answer_facts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  first_answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_correct_at TIMESTAMP NULL,
  counted TINYINT(1) NOT NULL DEFAULT 1,
  last_answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_question (user_id, question_id),
  INDEX idx_rank (is_correct, counted, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_abuse_flags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  window_start TIMESTAMP NULL,
  reason VARCHAR(32) NOT NULL,
  evidence_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_minor := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'minor_mode'
);
SET @sql := IF(
  @has_minor = 0,
  "ALTER TABLE users ADD COLUMN minor_mode VARCHAR(8) DEFAULT 'unset'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_opt_out := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'leaderboard_opt_out'
);
SET @sql := IF(
  @has_opt_out = 0,
  'ALTER TABLE users ADD COLUMN leaderboard_opt_out TINYINT(1) DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO quiz_answer_facts
  (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
SELECT first_row.user_id,
       first_row.question_id,
       first_row.is_correct,
       first_row.answered_at,
       correct_row.first_correct_at,
       1,
       last_row.last_answered_at
FROM (
  SELECT qr.user_id, qr.question_id, qr.is_correct, qr.answered_at
  FROM quiz_records qr
  JOIN (
    SELECT user_id, question_id, MIN(id) AS first_id
    FROM quiz_records
    GROUP BY user_id, question_id
  ) first_ids ON first_ids.first_id = qr.id
) first_row
LEFT JOIN (
  SELECT user_id, question_id, MIN(answered_at) AS first_correct_at
  FROM quiz_records
  WHERE is_correct = 1
  GROUP BY user_id, question_id
) correct_row
  ON correct_row.user_id = first_row.user_id
 AND correct_row.question_id = first_row.question_id
JOIN (
  SELECT user_id, question_id, MAX(answered_at) AS last_answered_at
  FROM quiz_records
  GROUP BY user_id, question_id
) last_row
  ON last_row.user_id = first_row.user_id
 AND last_row.question_id = first_row.question_id;

-- 对账参考：
-- SELECT COUNT(*) AS facts_rows FROM quiz_answer_facts;
-- SELECT COUNT(*) AS expected_rows FROM (
--   SELECT user_id, question_id FROM quiz_records GROUP BY user_id, question_id
-- ) t;