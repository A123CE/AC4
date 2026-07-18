-- 用户认证系统迁移脚本
-- 使用方法: mysql -u root -p ac4_db < server/db/migration_auth.sql

-- 1. 用户表 (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `email` VARCHAR(100) UNIQUE COMMENT '邮箱',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希(bcrypt)',
  `avatar_url` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `role` ENUM('user', 'admin') DEFAULT 'user' COMMENT '角色',
  `interest_tag` ENUM('tourist', 'student', 'designer') DEFAULT NULL COMMENT '兴趣标签：游客/学生/设计师',
  `points` INT DEFAULT 0 COMMENT '积分（赏银）',
  `total_quiz_score` INT DEFAULT 0 COMMENT '答题总积分',
  `active_skin` VARCHAR(50) DEFAULT NULL COMMENT '当前激活的3D皮肤',
  `login_count` INT DEFAULT 0 COMMENT '登录次数',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 游览历史表 (User_History) — "御览足迹"
CREATE TABLE IF NOT EXISTS `user_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `palace_id` VARCHAR(50) NOT NULL COMMENT '宫殿ID',
  `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  `duration_seconds` INT DEFAULT 0 COMMENT '浏览时长（秒）',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`palace_id`) REFERENCES `palaces`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_history` (`user_id`, `palace_id`),
  UNIQUE KEY `uk_user_palace_view` (`user_id`, `palace_id`, `viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户游览历史 — 御览足迹';

-- 3. 收藏表 (User_Collections) — "珍宝阁"
CREATE TABLE IF NOT EXISTS `user_collections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `palace_id` VARCHAR(50) NOT NULL COMMENT '宫殿ID',
  `category` VARCHAR(50) DEFAULT '默认' COMMENT '收藏分类：最美屋顶/精妙斗拱/自定义',
  `note` TEXT COMMENT '批注/笔记内容',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`palace_id`) REFERENCES `palaces`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_collections` (`user_id`, `palace_id`),
  UNIQUE KEY `uk_user_palace_collection` (`user_id`, `palace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏/笔记 — 珍宝阁';

-- 4. 徽章表 (Badges) — 成就系统
CREATE TABLE IF NOT EXISTS `badges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '徽章名称',
  `description` VARCHAR(255) COMMENT '徽章描述',
  `icon` VARCHAR(50) COMMENT '图标类名',
  `condition_type` VARCHAR(50) COMMENT '获得条件类型',
  `condition_value` INT DEFAULT 0 COMMENT '获得条件数值',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='徽章定义表';

-- 5. 用户徽章关联表
CREATE TABLE IF NOT EXISTS `user_badges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `badge_id` INT NOT NULL,
  `earned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_user_badge` (`user_id`, `badge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户徽章关联表';

-- 6. 种子徽章数据
INSERT INTO `badges` (`name`, `description`, `icon`, `condition_type`, `condition_value`) VALUES
  ('紫禁城初访', '首次登录，踏入数字故宫', 'fa-door-open', 'login_count', 1),
  ('紫禁城通', '探访所有宫殿，游览度达100%', 'fa-crown', 'palaces_viewed', 10),
  ('古建专家', '集齐所有徽章', 'fa-award', 'badges_count', 5),
  ('营造学徒', '收藏5座宫殿', 'fa-bookmark', 'collections_count', 5),
  ('翰林学士', '累计积分达1000', 'fa-graduation-cap', 'points', 1000);
