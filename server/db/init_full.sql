-- ============================================================
-- AC4 故宫可视化系统 — 完整数据库初始化脚本
-- Charset: utf8mb4
-- 说明: 整合所有迁移脚本，可直接在空数据库上一次性初始化
-- 使用方法: mysql -u root -p < server/db/init_full.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ac4_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ac4_db;

-- ==================== 删除旧表（幂等） ====================
DROP TABLE IF EXISTS user_recommendations;
DROP TABLE IF EXISTS metrics_events;
DROP TABLE IF EXISTS audio_guides;
DROP TABLE IF EXISTS hotspot_reads;
DROP TABLE IF EXISTS content_translations;

DROP TABLE IF EXISTS search_hot_terms;
DROP TABLE IF EXISTS share_visits;
DROP TABLE IF EXISTS user_stamps;
DROP TABLE IF EXISTS user_points_log;
DROP TABLE IF EXISTS user_signins;
DROP TABLE IF EXISTS user_skins;
DROP TABLE IF EXISTS user_tags;
DROP TABLE IF EXISTS quiz_abuse_flags;
DROP TABLE IF EXISTS quiz_answer_facts;
DROP TABLE IF EXISTS quiz_records;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS encyclopedia_terms;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS user_collections;
DROP TABLE IF EXISTS user_history;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS palace_fun_facts;
DROP TABLE IF EXISTS palace_timeline;
DROP TABLE IF EXISTS palace_images;
DROP TABLE IF EXISTS palaces;

-- ==================== 1. 宫殿主表 ====================
CREATE TABLE palaces (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_en VARCHAR(100),
  order_num INT NOT NULL,
  axis_position INT NOT NULL,
  description TEXT,
  dynasty VARCHAR(50),
  built_year VARCHAR(20),
  height VARCHAR(50),
  area VARCHAR(50),
  style VARCHAR(100),
  significance TEXT,
  model_path VARCHAR(255),
  audio_guide TEXT,
  has_video TINYINT(1) DEFAULT 0,
  video_url VARCHAR(255),
  category VARCHAR(20),
  region VARCHAR(50) COMMENT '所在地区',
  city VARCHAR(50) COMMENT '所在城市/地点',
  tagline VARCHAR(200) COMMENT '一句话副标题',
  quote TEXT COMMENT '经典诗句/文献引用',
  quote_by VARCHAR(100) COMMENT '诗句出处',
  tags VARCHAR(255) COMMENT '标签(逗号分隔)',
  stats VARCHAR(500) COMMENT '关键数据 JSON: [["72 万㎡","占地"],...]',
  poster_path VARCHAR(255) COMMENT '海报图路径',
  views_data TEXT COMMENT '四视图 JSON: [{src,zh,en},...]',
  camera_preset VARCHAR(255) COMMENT '相机预设 JSON: {theta,phi,radius,target}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category),
  INDEX idx_dynasty (dynasty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 2. 用户表 ====================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) UNIQUE COMMENT '邮箱',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希(bcrypt)',
  avatar_url VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  role ENUM('user', 'admin') DEFAULT 'user' COMMENT '角色',
  interest_tag ENUM('tourist', 'student', 'designer') DEFAULT NULL COMMENT '兴趣标签：游客/学生/设计师',
  points INT DEFAULT 0 COMMENT '积分（赏银）',
  total_quiz_score INT DEFAULT 0 COMMENT '答题总积分',
  active_skin VARCHAR(50) DEFAULT NULL COMMENT '当前激活的3D皮肤',
  login_count INT DEFAULT 0 COMMENT '登录次数',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ==================== 3. 图片表 ====================
CREATE TABLE palace_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 4. 游览历史表 ====================
CREATE TABLE user_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  palace_id VARCHAR(50) NOT NULL COMMENT '宫殿ID',
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  duration_seconds INT DEFAULT 0 COMMENT '浏览时长（秒）',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_user_history (user_id, palace_id),
  UNIQUE KEY uk_user_palace_view (user_id, palace_id, viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户游览历史 — 御览足迹';

-- ==================== 5. 收藏表 ====================
CREATE TABLE user_collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  palace_id VARCHAR(50) NOT NULL COMMENT '宫殿ID',
  category VARCHAR(50) DEFAULT '默认' COMMENT '收藏分类：最美屋顶/精妙斗拱/自定义',
  note TEXT COMMENT '批注/笔记内容',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_user_collections (user_id, palace_id),
  UNIQUE KEY uk_user_palace_collection (user_id, palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏/笔记 — 珍宝阁';

-- ==================== 6. 徽章定义表 ====================
CREATE TABLE badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '徽章名称',
  description VARCHAR(255) COMMENT '徽章描述',
  icon VARCHAR(50) COMMENT '图标类名',
  condition_type VARCHAR(50) COMMENT '获得条件类型',
  condition_value INT DEFAULT 0 COMMENT '获得条件数值',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='徽章定义表';

-- ==================== 7. 用户徽章关联表 ====================
CREATE TABLE user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_badge (user_id, badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户徽章关联表';

-- ==================== 8. 时间线表 ====================
CREATE TABLE palace_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  year VARCHAR(20) NOT NULL,
  event TEXT NOT NULL,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 9. 趣味典故表 ====================
CREATE TABLE palace_fun_facts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  fact TEXT NOT NULL,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 10. 百科术语表 ====================
CREATE TABLE encyclopedia_terms (
  id VARCHAR(50) PRIMARY KEY COMMENT '术语唯一标识',
  category VARCHAR(50) NOT NULL COMMENT '分类: 屋顶/斗拱/彩画/柱础/台基/门窗/琉璃/脊兽/纹饰',
  category_icon VARCHAR(50) DEFAULT NULL COMMENT 'FontAwesome图标类名',
  term VARCHAR(100) NOT NULL COMMENT '术语名称',
  synopsis VARCHAR(300) COMMENT '一句话摘要',
  level_value INT DEFAULT NULL COMMENT '等级序号 (用于排序显示)',
  content TEXT NOT NULL COMMENT '正文内容',
  image_desc VARCHAR(300) COMMENT '配套图解说明',
  related_palaces JSON DEFAULT NULL COMMENT '关联宫殿ID列表 ["taihedian","taihemen"]',
  related_terms JSON DEFAULT NULL COMMENT '相关术语ID ["wudian-roof","dougong"]',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  image_paths JSON DEFAULT NULL COMMENT '配套讲解图片路径数组 ["images/xxx.png"]',
  entry_type VARCHAR(16) NOT NULL DEFAULT 'craft' COMMENT 'craft=构件术语 / building=建筑知识',
  status VARCHAR(16) NOT NULL DEFAULT 'published' COMMENT 'draft/published',
  primary_palace_id VARCHAR(64) DEFAULT NULL COMMENT '建筑专属词条主关联建筑',
  knowledge_dimensions JSON DEFAULT NULL COMMENT '知识维度代码数组',
  source_refs JSON DEFAULT NULL COMMENT '资料来源数组',
  image_credits JSON DEFAULT NULL COMMENT '配图许可数组',
  fact_checked_at TIMESTAMP NULL DEFAULT NULL COMMENT '事实核校时间',
  fact_checked_by VARCHAR(64) DEFAULT NULL COMMENT '事实核校人',
  rights_checked_at TIMESTAMP NULL DEFAULT NULL COMMENT '版权核校时间',
  rights_checked_by VARCHAR(64) DEFAULT NULL COMMENT '版权核校人',
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_terms_status (status),
  INDEX idx_terms_entry_type (entry_type),
  INDEX idx_terms_primary_palace (primary_palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='百科术语库 — 营造法式';

-- ==================== 11. 题库表 ====================
CREATE TABLE quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL COMMENT '题目文本',
  options JSON NOT NULL COMMENT '选项列表 ["A: 选项一", "B: 选项二", "C: 选项三", "D: 选项四"]',
  correct_answer CHAR(1) NOT NULL COMMENT '正确答案选项字母 A/B/C/D',
  explanation TEXT COMMENT '答案解析',
  related_term_id VARCHAR(50) DEFAULT NULL COMMENT '关联的百科术语ID',
  palace_id VARCHAR(50) DEFAULT NULL COMMENT '关联的宫殿ID',
  component_id VARCHAR(50) DEFAULT NULL COMMENT '关联的建筑构件ID',
  difficulty TINYINT DEFAULT 1 COMMENT '难度: 1=简单 2=中等 3=困难',
  tags JSON DEFAULT NULL COMMENT '标签 ["屋顶","斗拱","彩画"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE SET NULL,
  INDEX idx_difficulty (difficulty),
  INDEX idx_palace (palace_id),
  INDEX idx_related_term (related_term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='翰林院题库';

-- ==================== 12. 答题记录表 ====================
CREATE TABLE quiz_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer CHAR(1) DEFAULT NULL COMMENT '用户选择的答案',
  is_correct TINYINT(1) DEFAULT 0 COMMENT '是否答对',
  points_earned INT DEFAULT 0 COMMENT '本次获得积分',
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_user_time (user_id, answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题记录';

-- ==================== 13. 每日签到表 ====================
CREATE TABLE user_signins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  signin_date DATE NOT NULL COMMENT '签到日期',
  points_earned INT DEFAULT 10 COMMENT '获得积分',
  consecutive_days INT DEFAULT 1 COMMENT '连续签到天数',
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_date (user_id, signin_date),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到';

-- ==================== 14. 3D皮肤表 ====================
CREATE TABLE user_skins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skin_type VARCHAR(50) NOT NULL COMMENT '皮肤类型: wireframe/snow/sepia/night_palace',
  skin_name VARCHAR(100) DEFAULT NULL COMMENT '皮肤显示名称',
  is_unlocked TINYINT(1) DEFAULT 0 COMMENT '是否已解锁',
  unlock_cost INT DEFAULT 500 COMMENT '解锁所需积分',
  unlocked_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  UNIQUE KEY uk_user_skin (user_id, skin_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户3D皮肤';

-- ==================== 15. 用户兴趣标签权重表 ====================
CREATE TABLE user_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tag_name VARCHAR(50) NOT NULL COMMENT '标签名: 后宫/清代/建筑结构/外朝/明代/屋顶/斗拱',
  weight DECIMAL(8,4) DEFAULT 0.0000 COMMENT '权重值 (行为累加)',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  UNIQUE KEY uk_user_tag (user_id, tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户兴趣标签权重 — 个性化推荐基础';

-- ==================== 16. 推荐记录表 ====================
CREATE TABLE user_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  route_id VARCHAR(50) NOT NULL,
  recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_accepted TINYINT(1) DEFAULT 0 COMMENT '用户是否接受推荐',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_recent (user_id, recommended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个性化推荐记录';

-- ==================== 种子数据 ====================

-- ---------- 1. 宫殿数据 (10座) ----------

-- 1. 午门
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('wumen', '午门', 'Meridian Gate', 1, 0,
 '故宫的正南门,是故宫的正门,始建于明永乐十八年(1420年),是中国现存最大的宫门',
 '明永乐年间', '1420', '37.95米', '约2500平方米', '凹字形城楼',
 '故宫正门,颁诏之地',
 'forbidden-city/wumen.glb',
 '午门是故宫的正门,始建于1420年,高37.95米,是中国现存最大的宫门。每逢皇帝出郊祭祀或大典,都要从午门出入。',
 0, NULL, '关隘');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('wumen', 'images/forbidden-city/general-1.png.jpeg', 1),
('wumen', 'images/forbidden-city/general-2.png.jpeg', 2),
('wumen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('wumen', '1420', '午门建成,作为紫禁城的正门'),
('wumen', '1644', '李自成攻入北京,从午门进入紫禁城'),
('wumen', '1925', '故宫博物院成立,午门成为入口'),
('wumen', '2019', '午门城楼举办"千秋佳节"展览');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('wumen', '午门并非只有五个门洞,实际有三个门洞和两个掖门,共五个入口'),
('wumen', '古代"推出午门斩首"的说法并不准确,午门是颁诏之地,并非刑场'),
('wumen', '午门城楼上的钟楼和鼓楼在重大典礼时会鸣响');

-- 2. 太和门
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('taihemen', '太和门', 'Gate of Supreme Harmony', 2, 1,
 '故宫外朝的正门,是紫禁城内最大的宫门,始建于明永乐十八年(1420年)',
 '明永乐年间', '1420', '23.8米', '约1300平方米', '重檐歇山顶',
 '外朝正门,御门听政之地',
 'forbidden-city/taihemen.glb',
 '太和门是故宫外朝的正门,高23.8米,是紫禁城内最大的宫门。清代皇帝曾在此御门听政,接见群臣。',
 0, NULL, '关隘');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('taihemen', 'images/forbidden-city/general-1.png.jpeg', 1),
('taihemen', 'images/forbidden-city/general-2.png.jpeg', 2),
('taihemen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('taihemen', '1420', '太和门初建,原名奉天门'),
('taihemen', '1557', '改名皇极门'),
('taihemen', '1645', '清顺治帝改名太和门'),
('taihemen', '1888', '光绪年间火灾后重建');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('taihemen', '太和门前的铜狮是紫禁城内最大的铜狮'),
('taihemen', '清代皇帝曾在太和门"御门听政",即在此接见群臣处理朝政'),
('taihemen', '光绪大婚时,太和门曾遭火灾,扎彩匠用芦席扎成假太和门以假乱真');

-- 3. 太和殿
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('taihedian', '太和殿', 'Hall of Supreme Harmony', 3, 2,
 '又称"金銮宝殿",是故宫中等级最高的建筑,皇帝举行重大典礼的场所',
 '明永乐年间', '1420', '35.05米', '2377平方米', '重檐庑殿顶,十一开间',
 '举行登基、大婚、命将出征等重大典礼',
 'forbidden-city/taihedian.glb',
 '太和殿又称金銮宝殿,高35.05米,面积2377平方米,是故宫中等级最高的建筑。皇帝登基、大婚、命将出征等重大典礼都在此举行。',
 0, NULL, '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('taihedian', 'images/forbidden-city/general-1.png.jpeg', 1),
('taihedian', 'images/forbidden-city/general-2.png.jpeg', 2),
('taihedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('taihedian', '1420', '太和殿初建,原名奉天殿'),
('taihedian', '1695', '康熙年间重建,改名太和殿'),
('taihedian', '1915', '袁世凯称帝,在太和殿举行登基大典'),
('taihedian', '2008', '太和殿完成大规模修缮,重新对外开放');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('taihedian', '太和殿屋脊上有10个脊兽,是中国古建筑中脊兽数量最多的'),
('taihedian', '太和殿内的龙椅上方悬挂着"建极绥猷"匾额,为乾隆帝御笔'),
('taihedian', '太和殿前有三层汉白玉须弥座台基,高8.13米'),
('taihedian', '太和殿并非"金銮殿",民间俗称金銮殿,但正式名称一直是太和殿');

-- 4. 中和殿
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('zhonghedian', '中和殿', 'Hall of Central Harmony', 4, 3,
 '位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方',
 '明永乐年间', '1420', '约23米', '约580平方米', '单檐四角攒尖顶',
 '大典前休息、演习礼仪',
 'forbidden-city/zhonghedian.glb',
 '中和殿位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方,平面呈正方形,在故宫中较为独特。',
 0, NULL, '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('zhonghedian', 'images/forbidden-city/general-1.png.jpeg', 1),
('zhonghedian', 'images/forbidden-city/general-2.png.jpeg', 2),
('zhonghedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('zhonghedian', '1420', '中和殿初建,原名华盖殿'),
('zhonghedian', '1562', '改名中极殿'),
('zhonghedian', '1645', '清顺治帝改名中和殿'),
('zhonghedian', '1765', '乾隆年间重修');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('zhonghedian', '中和殿平面呈正方形,在故宫中较为独特'),
('zhonghedian', '皇帝在此接受执事官员的朝拜,并审阅奏章'),
('zhonghedian', '殿内保存有乾隆帝御笔"允执厥中"匾额');

-- 5. 保和殿
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('baohedian', '保和殿', 'Hall of Preserving Harmony', 5, 4,
 '故宫外朝三大殿之一,明代用于皇帝更衣,清代用于举行宴会和殿试',
 '明永乐年间', '1420', '约29.5米', '约1240平方米', '重檐歇山顶,九开间',
 '举行宴会、殿试科举',
 'forbidden-city/baohedian.glb',
 '保和殿是故宫外朝三大殿之一,清代用于举行宴会和殿试。殿后的云龙石雕重达200多吨,是紫禁城内最大的石雕。',
 0, NULL, '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('baohedian', 'images/forbidden-city/general-1.png.jpeg', 1),
('baohedian', 'images/forbidden-city/general-2.png.jpeg', 2),
('baohedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('baohedian', '1420', '保和殿初建,原名谨身殿'),
('baohedian', '1562', '改名建极殿'),
('baohedian', '1645', '清顺治帝改名保和殿'),
('baohedian', '1789', '乾隆帝将殿试移至保和殿');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('baohedian', '保和殿后的云龙石雕是紫禁城内最大的一块石雕,重达200多吨'),
('baohedian', '清代殿试(科举考试最高级别)在此举行,状元、榜眼、探花由此诞生'),
('baohedian', '每年除夕、元宵,皇帝在此宴请少数民族首领和王公大臣');

-- 6. 乾清门
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('qianqingmen', '乾清门', 'Gate of Heavenly Purity', 6, 5,
 '故宫内廷的正门,是外朝与内廷的分界线',
 '明永乐年间', '1420', '约16米', '约600平方米', '单檐歇山顶',
 '内廷正门,外朝与内廷分界',
 'forbidden-city/qianqingmen.glb',
 '乾清门是故宫内廷的正门,高约16米,是外朝与内廷的分界线。清代皇帝曾在此御门听政,处理朝政。',
 0, NULL, '关隘');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('qianqingmen', 'images/forbidden-city/general-1.png.jpeg', 1),
('qianqingmen', 'images/forbidden-city/general-2.png.jpeg', 2),
('qianqingmen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('qianqingmen', '1420', '乾清门初建'),
('qianqingmen', '1655', '清顺治年间重修'),
('qianqingmen', '1813', '天理教起义,曾攻入乾清门'),
('qianqingmen', '2010', '完成修缮,恢复历史风貌');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('qianqingmen', '乾清门是皇帝"御门听政"的场所之一'),
('qianqingmen', '门前的琉璃影壁是故宫内最具特色的建筑之一'),
('qianqingmen', '乾清门是外朝和内廷的分界线,文武官员非召不得入内');

-- 7. 乾清宫
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('qianqinggong', '乾清宫', 'Palace of Heavenly Purity', 7, 6,
 '内廷后三宫之首,明代皇帝的寝宫,清代改为处理日常政务和接见臣工的地方',
 '明永乐年间', '1420', '约20米', '约1400平方米', '重檐庑殿顶,九开间',
 '明代皇帝寝宫,清代理政之所',
 'forbidden-city/qianqinggong.glb',
 '乾清宫是内廷后三宫之首,明代皇帝寝宫,清代改为处理日常政务之所。殿内高悬"正大光明"匾,背后曾是存放秘密立储诏书的地方。',
 1, 'videos/forbidden-city/qiangqinggong_growth.mp4', '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('qianqinggong', 'images/forbidden-city/general-1.png.jpeg', 1),
('qianqinggong', 'images/forbidden-city/general-2.png.jpeg', 2),
('qianqinggong', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('qianqinggong', '1420', '乾清宫初建'),
('qianqinggong', '1514', '明正德年间大火,后重建'),
('qianqinggong', '1669', '康熙帝重建乾清宫'),
('qianqinggong', '1798', '嘉庆年间重修,沿用至今'),
('qianqinggong', '2020', '举办"往昔世相"故宫珍本古籍展');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('qianqinggong', '乾清宫正殿高悬"正大光明"匾,康熙帝御笔,背后曾是存放秘密立储诏书的地方'),
('qianqinggong', '明代有14位皇帝在此居住和处理朝政'),
('qianqinggong', '清代自雍正起,皇帝移居养心殿,乾清宫改为举行内廷典礼之所'),
('qianqinggong', '乾清宫前的月台上陈列有日晷和嘉量,象征皇帝掌握时间和度量衡');

-- 8. 交泰殿
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('jiaotaidian', '交泰殿', 'Hall of Union', 8, 7,
 '位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方',
 '明永乐年间', '1420', '约17米', '约400平方米', '单檐四角攒尖顶',
 '存放宝玺、举行婚礼',
 'forbidden-city/jiaotaidian.glb',
 '交泰殿位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方。殿内存放着清代二十五方宝玺,象征皇权。',
 0, NULL, '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('jiaotaidian', 'images/forbidden-city/general-1.png.jpeg', 1),
('jiaotaidian', 'images/forbidden-city/general-2.png.jpeg', 2),
('jiaotaidian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('jiaotaidian', '1420', '交泰殿初建'),
('jiaotaidian', '1798', '嘉庆年间重修'),
('jiaotaidian', '1908', '宣统帝大婚在此举行'),
('jiaotaidian', '2019', '修复完成,对外开放');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('jiaotaidian', '交泰殿内存放着清代二十五方宝玺,象征皇权'),
('jiaotaidian', '殿内还有一座铜壶滴漏,是古代计时器'),
('jiaotaidian', '皇帝大婚时,皇后要在此接受册宝');

-- 9. 坤宁宫
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('kunninggong', '坤宁宫', 'Palace of Earthly Tranquility', 9, 8,
 '内廷后三宫之一,明代是皇后的寝宫,清代改为萨满教祭祀和皇帝大婚的场所',
 '明永乐年间', '1420', '约20米', '约1300平方米', '重檐庑殿顶,九开间',
 '明代皇后寝宫,清代祭祀和大婚之所',
 'forbidden-city/kunninggong.glb',
 '坤宁宫是内廷后三宫之一,明代皇后寝宫,清代改为萨满教祭祀和皇帝大婚的场所。殿内设有祭神的大锅,是满族特色的体现。',
 0, NULL, '宫殿');

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('kunninggong', 'images/forbidden-city/general-1.png.jpeg', 1),
('kunninggong', 'images/forbidden-city/general-2.png.jpeg', 2),
('kunninggong', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('kunninggong', '1420', '坤宁宫初建'),
('kunninggong', '1655', '清顺治年间改建为萨满祭祀场所'),
('kunninggong', '1674', '康熙帝大婚在此举行'),
('kunninggong', '1922', '溥仪大婚,是最后一次在坤宁宫举行的皇家婚礼');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('kunninggong', '坤宁宫在清代被改建为萨满教祭祀场所,殿内设有祭神的大锅'),
('kunninggong', '清代皇帝大婚时,洞房设在坤宁宫东暖阁'),
('kunninggong', '光绪帝和溥仪大婚时都在坤宁宫举行了隆重仪式'),
('kunninggong', '坤宁宫与乾清宫对应,乾为阳,坤为阴,象征天地');

-- 10. 神武门
INSERT INTO palaces (id, name, name_en, order_num, axis_position, description, dynasty, built_year, height, area, style, significance, model_path, audio_guide, has_video, video_url, category) VALUES
('shenwumen', '神武门', 'Gate of Divine Might', 10, 9,
 '故宫的北门,始建于明永乐十八年(1420年),是故宫的出口',
 '明永乐年间', '1420', '31.6米', '约1500平方米', '重檐庑殿顶城楼',
 '故宫北门,皇帝出巡、选秀女出入之门',
 'forbidden-city/shenwumen.glb',
 '神武门是故宫的北门,高31.6米,原名玄武门,因避康熙帝名讳改名。清代选秀女时,秀女们从此门进入紫禁城。',
 0, NULL, '关隘');

-- ==================== 11-17. 华夏名筑（全国古建筑扩展） ====================
-- 与迁移脚本 server/db/migration_national_monuments.sql 保持一致
INSERT INTO palaces
  (id, name, name_en, order_num, axis_position, description, dynasty, built_year,
   height, area, style, significance, model_path, category,
   region, city, tagline, quote, quote_by, tags, stats, poster_path, views_data, camera_preset)
VALUES
  ('changcheng', '长城', 'THE GREAT WALL', 11, 0,
   '上下两千年, 纵横两万里。城墙随山势起伏, 烽燧关隘相望, 把一个文明的边疆意志砌进群山, 是人类历史上体量最大的军事工程。',
   '秦—明', '延筑两千余年', '—', '21196 km', '依山就势 · 夯土包砖', '世界遗产, 人类历史上体量最大的军事防御工程',
   'national/changcheng.glb', '军事工程',
   '横贯北疆', '北方边境', '横亘万里的大地脊梁',
   '秦时明月汉时关, 万里长征人未还。', '王昌龄《出塞》',
   '军事防御,烽燧关隘,依山就势,世界遗产',
   '[["21196 km","总长"],["2000+ 年","修筑"],["15 省","跨越"]]',
   'posters/changcheng.webp',
   '[{"src":"views/changcheng-front.webp","zh":"正面","en":"Front"},{"src":"views/changcheng-back.webp","zh":"背面","en":"Back"},{"src":"views/changcheng-left.webp","zh":"左侧","en":"Left"},{"src":"views/changcheng-right.webp","zh":"右侧","en":"Right"}]',
   '{"theta":0,"phi":1.12,"radius":3.3,"target":[0,0.15,0]}'),
  ('gugong', '故宫全景', 'THE FORBIDDEN CITY', 12, 0,
   '明清两代皇家宫城, 世界现存规模最大、保存最完整的木构古建筑群。殿宇沿子午中轴铺展, 九千余间房屋以黄瓦朱墙, 写就「普天之下」的秩序。',
   '明清', '1406—1420 年建成', '—', '72 万㎡', '黄瓦朱墙 · 中轴对称', '世界遗产, 世界现存规模最大的木构古建筑群',
   'national/gugong.glb', '宫殿',
   '北京', '北京 · 中轴线核心', '七十二万平方米的天下中枢',
   '匠人营国, 方九里, 旁三门。', '《周礼 · 考工记》',
   '皇家宫城,中轴对称,黄瓦朱墙,世界遗产',
   '[["72 万㎡","占地"],["8707 间","殿宇"],["1987 年","世界遗产"]]',
   'posters/gugong.webp',
   '[{"src":"views/gugong-front.webp","zh":"正面","en":"Front"},{"src":"views/gugong-back.webp","zh":"背面","en":"Back"},{"src":"views/gugong-left.webp","zh":"左侧","en":"Left"},{"src":"views/gugong-right.webp","zh":"右侧","en":"Right"}]',
   '{"theta":0,"phi":1.46,"radius":3.9,"target":[0,0.2,0]}'),
  ('huanghelou', '黄鹤楼', 'YELLOW CRANE TOWER', 13, 0,
   '始建于三国, 屡毁屡建, 今楼五层飞檐, 如黄鹤振翅欲举。因崔颢一首七律名动天下, 千载文人於此登临送目, 望尽大江东去。',
   '三国吴', '223 年始建', '51.4 米', '—', '江南名楼 · 五层飞檐', '江南三大名楼之一, 千年诗文名胜',
   'national/huanghelou.glb', '楼阁',
   '湖北', '武汉 · 蛇山', '江城之巅的千古名楼',
   '昔人已乘黄鹤去, 此地空余黄鹤楼。', '崔颢《黄鹤楼》',
   '江南名楼,飞檐五层,屡毁屡建,诗文名胜',
   '[["51.4 米","楼高"],["5 层","飞檐"],["1800 年","兴废"]]',
   'posters/huanghelou.webp',
   '[{"src":"views/huanghelou-front.webp","zh":"正面","en":"Front"},{"src":"views/huanghelou-back.webp","zh":"背面","en":"Back"}]',
   '{"theta":0,"phi":1.38,"radius":4.3,"target":[0,0.84,0]}'),
  ('mogao', '莫高窟', 'MOGAO GROTTOES', 14, 0,
   '自建元二年第一凿起, 历十朝营造千年。七百余窟凿于鸣沙山崖壁, 四万五千平方米壁画绘尽佛国与人间, 是丝路上最盛大的艺术宝藏。',
   '前秦', '366 年开凿', '—', '4.5 万㎡ 壁画', '崖壁石窟 · 壁画彩塑', '世界遗产, 丝路上最盛大的艺术宝藏',
   'national/mogao.glb', '石窟',
   '甘肃', '敦煌 · 鸣沙山', '大漠深处的千佛画廊',
   '大漠孤烟直, 长河落日圆。', '王维《使至塞上》',
   '丝路瑰宝,千佛洞窟,壁画彩塑,世界遗产',
   '[["735 个","洞窟"],["4.5 万㎡","壁画"],["1650 年","营造"]]',
   'posters/mogao.webp',
   '[{"src":"views/mogao-front.webp","zh":"正面","en":"Front"},{"src":"views/mogao-back.webp","zh":"背面","en":"Back"},{"src":"views/mogao-left.webp","zh":"左侧","en":"Left"},{"src":"views/mogao-right.webp","zh":"右侧","en":"Right"}]',
   '{"theta":0,"phi":1.22,"radius":3.7,"target":[0,0.5,0]}'),
  ('potala', '布达拉宫', 'POTALA PALACE', 15, 0,
   '依红山而建, 宫堡相衔十三层, 白宫红宫叠上云端。这是世界上海拔最高的宫殿建筑群, 以土石之身, 在雪域高原立成信仰的形状。',
   '唐', '631 年始建', '海拔 3700 米', '—', '高原宫堡 · 白宫红宫', '世界遗产, 世界上海拔最高的宫殿建筑群',
   'national/potala.glb', '宫殿',
   '西藏', '拉萨 · 红山', '世界屋脊上的天上宫阙',
   '在那东山顶上, 升起白白的月亮。', '仓央嘉措《情歌》',
   '高原宫堡,白宫红宫,依山而建,世界遗产',
   '[["3700 米","海拔"],["13 层","宫宇"],["1300 年","沧桑"]]',
   'posters/potala.webp',
   '[{"src":"views/potala-front.webp","zh":"正面","en":"Front"},{"src":"views/potala-back.webp","zh":"背面","en":"Back"},{"src":"views/potala-left.webp","zh":"左侧","en":"Left"},{"src":"views/potala-right.webp","zh":"右侧","en":"Right"}]',
   '{"theta":0,"phi":1.42,"radius":3.4,"target":[0,0.28,0]}'),
  ('tiantan', '天坛', 'TEMPLE OF HEAVEN', 16, 0,
   '明清两代帝王祭天祈谷之所。祈年殿三重攒尖直指苍穹, 二十八根楠木金柱撑起纯木榫卯的穹顶, 不施一钉, 是「与天对话」的建筑绝唱。',
   '明', '1420 年建成', '38 米', '273 万㎡', '攒尖穹顶 · 榫卯无钉', '世界遗产, 皇家祭天礼制建筑群',
   'national/tiantan.glb', '坛庙',
   '北京', '北京 · 南城', '无梁无钉的祈天穹顶',
   '以苍璧礼天, 以黄琮礼地。', '《周礼 · 春官》',
   '祭天礼制,攒尖穹顶,榫卯无钉,世界遗产',
   '[["38 米","殿高"],["28 根","楠木金柱"],["273 万㎡","坛域"]]',
   'posters/tiantan.webp',
   '[{"src":"views/tiantan-front.webp","zh":"正面","en":"Front"},{"src":"views/tiantan-back.webp","zh":"背面","en":"Back"}]',
   '{"theta":0,"phi":1.44,"radius":5.4,"target":[0,0.58,0]}'),
  ('tulou', '福建土楼', 'FUJIAN TULOU', 17, 0,
   '客家人以生土夯筑的巨型民居, 环形围合, 一楼即一村。厚墙御外而中庭向天, 把宗族的秩序与烟火的温情, 浇筑成大地上的圆。',
   '宋元以降', '跨越八百年', '—', '—', '生土夯筑 · 环形围合', '世界遗产, 客家聚族而居的圆形堡垒',
   'national/tulou.glb', '民居',
   '福建', '闽西南', '聚族而居的圆形堡垒',
   '一本所生, 共楼居住, 出入相见。', '永定承启楼楹联 · 节录',
   '生土夯筑,环形围合,聚族而居,世界遗产',
   '[["46 处","世界遗产"],["3000 余座","现存"],["800 年","传承"]]',
   'posters/tulou.webp',
   '[{"src":"views/tulou-front.webp","zh":"正面","en":"Front"},{"src":"views/tulou-back.webp","zh":"背面","en":"Back"}]',
   '{"theta":0,"phi":1.40,"radius":3.6,"target":[0,0.15,0]}');

-- ==================== 18-20. 程序化复原建筑（无 GLB, 前端实时生成） ====================
-- 与迁移脚本 server/db/migration_procedural_buildings.sql 保持一致
INSERT INTO palaces
  (id, name, name_en, order_num, axis_position, description, dynasty, built_year,
   height, area, style, significance, model_path, category,
   region, city, tagline, quote, quote_by, tags, stats)
VALUES
  ('yingxian_muta', '应县木塔', 'YINGXIAN WOODEN PAGODA', 18, 0,
   '辽清宁二年建成, 八角五层六檐, 通高 67.31 米。全塔以榫卯咬合, 不用一钉一铁, 历经近千年风雨与数次地震仍巍然矗立, 是世界现存最高、最古老的纯木构楼阁式塔。',
   '辽', '1056 年建成', '67.31 米', '—', '八角五层 · 楼阁式木塔', '世界现存最高最古老的纯木构楼阁式塔',
   'procedural:yingxian_muta', '佛塔',
   '山西', '朔州 · 应县', '千年木塔, 无一钉一铁',
   '如鸟斯革, 如翚斯飞。', '《诗经 · 小雅 · 斯干》',
   '纯木榫卯,明五暗四,楼阁式塔,世界遗产预备',
   '[["67.31 米","塔高"],["5 层","明层"],["1056 年","建成"]]'),
  ('foguangsi', '佛光寺东大殿', 'EAST HALL OF FOGUANG TEMPLE', 19, 0,
   '唐大中十一年重建, 面阔七间、进深四间, 单檐庑殿顶。斗拱雄大、出檐深远, 殿内唐代彩塑、壁画与题记并存, 被梁思成誉为「中国第一国宝」, 是中国现存最早的唐代木构殿堂之一。',
   '唐', '857 年重建', '—', '七间四进', '单檐庑殿顶 · 七铺作斗拱', '中国现存最早的唐代木构殿堂之一',
   'procedural:foguangsi', '寺庙',
   '山西', '忻州 · 五台山', '斗拱雄大, 出檐深远的唐代殿堂',
   '斗拱雄大, 出檐深远。', '梁思成《中国建筑史》',
   '唐代木构,庑殿顶,七铺作斗拱,梁思成发现',
   '[["857 年","重建"],["7 间","面阔"],["4 间","进深"]]'),
  ('yueyanglou', '岳阳楼', 'YUEYANG TOWER', 20, 0,
   '始建于三国吴黄武二年, 现存楼体为三层三檐四角盔顶。楼临洞庭, 衔远山、吞长江, 范仲淹一篇《岳阳楼记》使其名动千古, 与黄鹤楼、滕王阁并称江南三大名楼。',
   '三国吴', '223 年始建', '19.42 米', '—', '三层三檐 · 四角盔顶', '江南三大名楼之一, 《岳阳楼记》诞生地',
   'procedural:yueyanglou', '楼阁',
   '湖南', '岳阳 · 洞庭湖畔', '洞庭天下水, 岳阳天下楼',
   '先天下之忧而忧, 后天下之乐而乐。', '范仲淹《岳阳楼记》',
   '江南名楼,盔顶飞檐,范仲淹,洞庭湖',
   '[["19.42 米","楼高"],["3 层","三檐"],["223 年","始建"]]');

INSERT INTO palace_timeline (palace_id, year, event) VALUES
  ('yingxian_muta', '1056', '辽清宁二年建成, 为佛宫寺释迦塔'),
  ('yingxian_muta', '金明昌六年', '完成塔身全部木构与塑像'),
  ('yingxian_muta', '1961', '列为第一批全国重点文物保护单位'),
  ('yingxian_muta', '2016', '被列入中国世界文化遗产预备名单'),
  ('foguangsi', '857', '唐大中十一年重建东大殿'),
  ('foguangsi', '1937', '梁思成、林徽因发现并考证东大殿为唐代木构'),
  ('foguangsi', '1961', '列为第一批全国重点文物保护单位'),
  ('foguangsi', '2009', '作为五台山组成部分列入世界遗产'),
  ('yueyanglou', '223', '东吴鲁肃始建阅军楼, 为岳阳楼前身'),
  ('yueyanglou', '1045', '滕子京重修岳阳楼, 范仲淹作《岳阳楼记》'),
  ('yueyanglou', '1984', '按清代形制落架大修, 即现存楼体'),
  ('yueyanglou', '2001', '列为全国重点文物保护单位');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
  ('yingxian_muta', '全塔使用斗拱 54 种、数量以万计, 被称为「斗拱博物馆」'),
  ('yingxian_muta', '塔身外观五层, 内部实有九层, 形成「明五暗四」的结构'),
  ('yingxian_muta', '近千年间经历数十次地震, 木塔依靠榫卯节点的柔性耗能而屹立不倒'),
  ('foguangsi', '1937 年梁思成、林徽因依据敦煌壁画线索找到佛光寺, 打破「中国无唐代木构」的论断'),
  ('foguangsi', '东大殿出檐约 3.96 米, 约为柱高的两倍, 是唐代雄浑风格的代表'),
  ('foguangsi', '殿内佛坛上保存有唐代彩塑 35 尊, 与建筑同期'),
  ('yueyanglou', '岳阳楼现存楼体虽为 1984 年重修, 仍严格遵循清代同治年间的形制'),
  ('yueyanglou', '楼顶为独特的盔顶形制, 曲线流畅, 如古代将军头盔'),
  ('yueyanglou', '《岳阳楼记》中「先忧后乐」一句, 使岳阳楼成为士大夫精神的象征');

-- 程序化建筑海报与四视图 (截图资源位于 images/posters/ 与 images/views/)
UPDATE palaces SET
  poster_path = 'posters/yingxian_muta.png',
  views_data = '[{"src":"views/yingxian_muta-front.png","zh":"正面","en":"Front"},{"src":"views/yingxian_muta-right.png","zh":"右侧","en":"Right"},{"src":"views/yingxian_muta-back.png","zh":"背面","en":"Back"},{"src":"views/yingxian_muta-left.png","zh":"左侧","en":"Left"}]'
WHERE id = 'yingxian_muta';
UPDATE palaces SET
  poster_path = 'posters/foguangsi.png',
  views_data = '[{"src":"views/foguangsi-front.png","zh":"正面","en":"Front"},{"src":"views/foguangsi-right.png","zh":"右侧","en":"Right"},{"src":"views/foguangsi-back.png","zh":"背面","en":"Back"},{"src":"views/foguangsi-left.png","zh":"左侧","en":"Left"}]'
WHERE id = 'foguangsi';
UPDATE palaces SET
  poster_path = 'posters/yueyanglou.png',
  views_data = '[{"src":"views/yueyanglou-front.png","zh":"正面","en":"Front"},{"src":"views/yueyanglou-right.png","zh":"右侧","en":"Right"},{"src":"views/yueyanglou-back.png","zh":"背面","en":"Back"},{"src":"views/yueyanglou-left.png","zh":"左侧","en":"Left"}]'
WHERE id = 'yueyanglou';

-- 故宫 10 座建筑封面图 (图片位于 images/posters/forbidden-city/ 下, 以 palace id 命名)
UPDATE palaces SET poster_path = 'posters/forbidden-city/wumen.png' WHERE id = 'wumen';
UPDATE palaces SET poster_path = 'posters/forbidden-city/taihemen.png' WHERE id = 'taihemen';
UPDATE palaces SET poster_path = 'posters/forbidden-city/taihedian.png' WHERE id = 'taihedian';
UPDATE palaces SET poster_path = 'posters/forbidden-city/zhonghedian.png' WHERE id = 'zhonghedian';
UPDATE palaces SET poster_path = 'posters/forbidden-city/baohedian.png' WHERE id = 'baohedian';
UPDATE palaces SET poster_path = 'posters/forbidden-city/qianqingmen.png' WHERE id = 'qianqingmen';
UPDATE palaces SET poster_path = 'posters/forbidden-city/qianqinggong.png' WHERE id = 'qianqinggong';
UPDATE palaces SET poster_path = 'posters/forbidden-city/jiaotaidian.png' WHERE id = 'jiaotaidian';
UPDATE palaces SET poster_path = 'posters/forbidden-city/kunninggong.png' WHERE id = 'kunninggong';
UPDATE palaces SET poster_path = 'posters/forbidden-city/shenwumen.png' WHERE id = 'shenwumen';

INSERT INTO palace_images (palace_id, image_path, sort_order) VALUES
('shenwumen', 'images/forbidden-city/general-1.png.jpeg', 1),
('shenwumen', 'images/forbidden-city/general-2.png.jpeg', 2),
('shenwumen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline (palace_id, year, event) VALUES
('shenwumen', '1420', '神武门初建,原名玄武门'),
('shenwumen', '1683', '清康熙年间改名神武门'),
('shenwumen', '1925', '故宫博物院成立,神武门成为主要出口'),
('shenwumen', '2015', '神武门完成修缮');

INSERT INTO palace_fun_facts (palace_id, fact) VALUES
('shenwumen', '神武门原名玄武门,因避康熙帝玄烨名讳而改名神武门'),
('shenwumen', '清代选秀女时,秀女们从神武门进入紫禁城'),
('shenwumen', '皇帝出巡时也从神武门出入'),
('shenwumen', '神武门城楼上设有钟表,是故宫的报时中心');

-- ---------- 2. 徽章种子数据 ----------
INSERT INTO badges (name, description, icon, condition_type, condition_value) VALUES
  ('紫禁城初访', '首次登录，踏入数字故宫', 'fa-door-open', 'login_count', 1),
  ('紫禁城通', '探访所有宫殿，游览度达100%', 'fa-crown', 'palaces_viewed', 10),
  ('古建专家', '集齐所有徽章', 'fa-award', 'badges_count', 5),
  ('营造学徒', '收藏5座宫殿', 'fa-bookmark', 'collections_count', 5),
  ('翰林学士', '累计积分达1000', 'fa-graduation-cap', 'points', 1000),
  ('童生', '翰林院答对10题，入门之路', 'fa-user-graduate', 'quiz_correct', 10),
  ('秀才', '翰林院答对30题，初显才华', 'fa-scroll', 'quiz_correct', 30),
  ('举人', '翰林院答对60题，学识渊博', 'fa-medal', 'quiz_correct', 60),
  ('进士', '翰林院答对100题，才高八斗', 'fa-crown', 'quiz_correct', 100),
  ('营造大师', '通晓营造法式，答对所有分类题目', 'fa-landmark', 'quiz_all_categories', 1),
  ('签到勤勉', '连续签到7天', 'fa-calendar-check', 'consecutive_signin', 7),
  ('签到达人', '连续签到30天', 'fa-calendar-star', 'consecutive_signin', 30);

-- ---------- 3. 百科术语种子数据 (25条) ----------
INSERT INTO encyclopedia_terms (id, category, category_icon, term, synopsis, level_value, content, image_desc, related_palaces, related_terms, sort_order, image_paths) VALUES
-- 屋顶等级
('roof-ranking', '屋顶', 'fa-house', '屋顶等级制度', '中国古代建筑屋顶有严格的等级划分，是礼制的重要体现。从最高等级的重檐庑殿顶到普通民居的硬山顶，屋顶形式直接反映了建筑主人的身份地位。', 1,
 '▲ 等级排序（从高到低）\n\n■ 第一等：重檐庑殿顶 — 皇家最高等级，仅用于皇宫正殿、太庙等最高等级建筑。故宫太和殿即使用此顶，象征皇权至高无上。\n\n■ 第二等：重檐歇山顶 — 次高等级，用于重要宫殿和城门楼。如天安门、保和殿等。\n\n■ 第三等：单檐庑殿顶 — 用于次要宫殿及重要寺庙主殿。故宫中一些配殿使用此形式。\n\n■ 第四等：单檐歇山顶 — 较为常见的高等级建筑屋顶形式，广泛用于宫殿、寺庙和府邸。\n\n■ 第五等：悬山顶 — 山墙超出屋面，用于一般官署和民居。\n\n■ 第六等：硬山顶 — 山墙封住屋面，北方民居常用。\n\n▲ 等级细分的决定性因素\n\n◆ 重檐与否：重檐（双层屋檐）比单檐等级高，是身份等级的重要标志。\n◆ 屋面曲线：庑殿顶为四面坡，歇山顶为四面坡加两侧山花，悬山顶为两面坡。四面坡越多，等级越高。\n◆ 装饰构件：走兽数量、瓦当颜色（黄琉璃瓦最高等级）也是等级标识。\n\n▲ 故宫中的屋顶等级体现\n\n故宫建筑群完美展示了屋顶等级制度。太和殿使用重檐庑殿顶，乾清宫使用单檐庑殿顶，而东西六宫则使用等级较低的屋顶形式，体现了"前朝后寝"和"内外有别"的礼制思想。',
 '故宫屋顶等级分布示意图：从午门到神武门，沿中轴线建筑屋顶等级递减，太和殿最高。',
 '["taihedian","taihemen","baohedian","qianqinggong"]', '["wudian-roof","xieshan-roof","xuanshan-roof"]', 1,
 '["images/宫门等级对比图.png", "images/宫门等级对比图2.png"]'),

('wudian-roof', '屋顶', 'fa-house', '庑殿顶', '中国古代建筑中等级最高的屋顶形式，四面坡屋面，五条屋脊。因其屋面宽阔、气势恢宏，被称为"四阿顶"或"五脊殿"。', 2,
 '▲ 功能\n\n庑殿顶是等级最高的屋顶形式，用于皇宫正殿、太庙、帝王陵寝等最高等级建筑。\n\n◆ 四条垂脊 + 一条正脊 = 五脊，故称"五脊殿"\n◆ 四面坡屋面，无山墙露出\n◆ 屋面曲线宏大，出檐深远\n\n▲ 特点\n\n◆ 四面坡排水：四个方向的坡面能快速排水，适合多雨气候\n◆ 屋脊装饰：正脊两端有鸱吻，垂脊上有走兽\n◆ 重檐庑殿顶：双层屋檐，等级更高，仅用于太和殿\n\n▲ 故宫中的应用\n\n太和殿采用重檐庑殿顶，是故宫中唯一使用此最高等级屋顶的建筑。乾清宫使用单檐庑殿顶，等级次之。这体现了"外朝最高、内廷次之"的礼制格局。',
 '庑殿顶结构图：展示五条脊的分布和四面坡屋面结构',
 '["taihedian","qianqinggong"]', '["roof-ranking","xieshan-roof"]', 2,
 '["images/庑殿顶结构图1.png", "images/庑殿顶结构图2.png", "images/庑殿顶结构图3.png"]'),

('xieshan-roof', '屋顶', 'fa-house', '歇山顶', '中国古代建筑中等级仅次于庑殿顶的屋顶形式，四面坡屋面加两侧山花，共九条屋脊，又称"九脊顶"。', 3,
 '▲ 功能\n\n歇山顶兼具庑殿顶的宏伟和悬山顶的灵巧，是应用最广泛的高等级屋顶形式。\n\n◆ 九条脊：一条正脊 + 四条垂脊 + 四条戗脊\n◆ 山花：两侧三角形山花板，是重要的装饰区域\n◆ 等级灵活性：可通过重檐、山花装饰等方式提升等级\n\n▲ 故宫中的应用\n\n保和殿、太和门、坤宁宫等均采用重檐或单檐歇山顶。歇山顶在故宫中应用广泛，既保持了较高的等级，又比庑殿顶更经济实用。山花上的悬鱼、惹草等装饰，也是建筑美学的重要组成部分。',
 '歇山顶结构图：展示九条脊和两侧山花的结构',
 '["baohedian","taihemen","kunninggong"]', '["roof-ranking","wudian-roof"]', 3, '[]'),

('xuanshan-roof', '屋顶', 'fa-house', '悬山顶', '两面坡屋面，山墙超出屋面的屋顶形式。出挑的屋檐可以保护山墙免受雨水侵蚀，在南方多雨地区使用广泛。', 4,
 '▲ 特点\n\n◆ 两面坡屋面，山墙超出屋面\n◆ 屋檐出挑大，保护山墙\n◆ 一般用于官署和民居\n◆ 在故宫中用于较低等级建筑\n\n▲ 与硬山顶的区别\n\n硬山顶的山墙封住屋面，而悬山顶的山墙超出屋面。悬山顶因出挑的屋檐可以保护墙体，更适合多雨地区；硬山顶防火性能更好，在北方民居中更常见。',
 '悬山顶和硬山顶对比图',
 '[]', '["roof-ranking"]', 4,
 '["images/悬山顶和硬山顶对比图1.png", "images/悬山顶和硬山顶对比图2.png"]'),

-- 斗拱
('dougong', '斗拱', 'fa-cubes', '斗拱', '中国古代建筑特有的木结构构件，位于柱顶与屋架之间，由斗形木块和弓形肘木层层交错叠垒而成。斗拱既是承重结构，也是等级标识和建筑装饰。', NULL,
 '▲ 结构组成\n\n◆ 斗：方形木块，承托上层构件\n◆ 拱：弓形弯曲木构件，横向伸出\n◆ 昂：斜向下伸出的构件，起杠杆作用\n◆ 翘：纵向伸出的构件\n\n▲ 功能\n\n◆ 承重功能：将屋顶重量逐层传递至柱身，形成合理的受力体系\n◆ 抗震功能：榫卯连接具有一定的可变性，能吸收地震能量\n◆ 装饰功能：层层出挑的斗拱形成富有韵律感的视觉效果\n◆ 等级功能：斗拱的层数（踩数）直接反映建筑等级\n\n▲ 故宫中的应用\n\n太和殿的斗拱为最高等级规制，出挑多、体量大、雕饰精美。斗拱上施以和玺彩画，更是身份等级的象征。',
 '斗拱分解图：斗、拱、昂、翘各部件的组合关系',
 '["taihedian","taihemen","baohedian"]', '["dougong-levels","caihua-hexi"]', 10,
 '["images/斗拱拆解图1.png", "images/斗拱拆解图2.png", "images/斗拱拆解图3.png"]'),

('dougong-levels', '斗拱', 'fa-cubes', '斗拱等级（踩数）', '斗拱的出挑层数称为"踩"，是衡量建筑等级的重要指标。踩数越多，等级越高，建筑越宏伟。', NULL,
 '▲ 等级排序（从低到高）\n\n◆ 三踩斗拱：出挑一层，用于最低等级官式建筑\n◆ 五踩斗拱：出挑两层，用于一般官署和寺庙\n◆ 七踩斗拱：出挑三层，用于重要宫殿和城门\n◆ 九踩斗拱：出挑四层，用于最高等级建筑\n\n▲ 故宫中的等级体现\n\n太和殿使用九踩斗拱，是最高等级的斗拱规制。一层层出挑的斗拱不仅承担着巨大的屋顶重量，也形成了太和殿威严壮观的视觉效果。太和门使用七踩斗拱，等级次之。',
 '斗拱踩数对比图：从三踩到九踩的出挑层数对比',
 '["taihedian","taihemen","zhonghedian"]', '["dougong"]', 11,
 '["images/斗拱踩数对比图1.png", "images/斗拱踩数对比图2.png", "images/斗拱踩数对比图3.png", "images/斗拱踩数对比图4.png"]'),

-- 彩画
('caihua-hexi', '彩画', 'fa-palette', '和玺彩画', '清代官式建筑中等级最高的彩画类型，以龙凤纹样为主题，施于金龙和玺、龙凤和玺等最高等级建筑。色彩以青绿为主，配以沥粉贴金。', 1,
 '▲ 特点\n\n◆ 主题纹样：以龙纹、凤纹为主，象征皇权\n◆ 色彩体系：青、绿为主色调，金色点缀\n◆ 工艺技法：沥粉贴金工艺，线条凸起有立体感\n◆ 分布范围：仅用于皇宫主要殿宇、太庙等最高等级建筑\n\n▲ 故宫中常见的和玺彩画\n\n太和殿的和玺彩画是最高等级的"金龙和玺"，全部以龙纹为主题。中和殿、保和殿使用"龙凤和玺"，龙纹和凤纹交替出现。乾清宫则使用等级较低的"龙草和玺"，龙纹与花卉纹样相结合。\n\n▲ 沥粉贴金工艺\n\n先用沥粉（桐油调石灰）在彩画表面挤出凸起的线条，再贴上金箔。这种工艺使彩画在光线下金光灿烂，极尽华美。',
 '和玺彩画纹样图：龙凤纹样和沥粉贴金细部',
 '["taihedian","zhonghedian","baohedian","qianqinggong"]', '["caihua-xuanzi","dougong"]', 20,
 '["images/和玺彩画纹样图1.png", "images/和玺彩画纹样图2.png", "images/和玺彩画纹样图3.png", "images/和玺彩画纹样图4.png", "images/和玺彩画纹样图5.png"]'),

('caihua-xuanzi', '彩画', 'fa-palette', '旋子彩画', '清代官式建筑中等级次于和玺彩画的彩画类型，以旋花纹样为主题。广泛应用于宫殿、寺庙、陵寝等建筑。', 2,
 '▲ 特点\n\n◆ 主题纹样：以旋花（团花状几何花纹）为主题\n◆ 色彩体系：青绿色为主，贴金量少于和玺彩画\n◆ 等级分类：金琢墨石碾玉 > 烟琢墨石碾玉 > 金线大点金 > 墨线大点金 > 墨线小点金 > 雅伍墨\n◆ 分布范围：用于次要宫殿、寺庙、府邸等\n\n▲ 故宫中的应用\n\n故宫中许多配殿和次要建筑使用旋子彩画。与和玺彩画相比，旋子彩画的图案更加几何化、规律化，少了几分威严，多了几分雅致。',
 '旋子彩画纹样图：旋花纹样的几何结构',
 '["jiaotaidian","kunninggong"]', '["caihua-hexi"]', 21,
 '["images/旋子彩画纹样图1.png", "images/旋子彩画纹样图2.png", "images/旋子彩画纹样图3.png", "images/旋子彩画纹样图4.png", "images/旋子彩画纹样图5.png"]'),

-- 柱础
('chuchu', '柱础', 'fa-dharmachakra', '柱础', '置于木柱之下、台基之上的石质构件，又称柱顶石。其功能是防止木柱受潮腐烂，并将柱子的荷载均匀传递至地基。', NULL,
 '▲ 结构组成\n\n◆ 础盘：方形或圆形的底座，直接置于台基之上\n◆ 覆盆：础盘之上的弧形凸起部分，形如倒扣的盆\n◆ 鼓镜：最上层的圆形平面，直接承托木柱\n\n▲ 故宫中的等级体现\n\n太和殿的柱础使用了最大规格的石料，雕饰精美。一般建筑的柱础可能仅有简单的覆盆形状，而太和殿等主要建筑的柱础上还刻有莲花、卷草等纹饰。\n\n柱础的大小和雕饰繁简是判断建筑等级的重要细节之一。',
 '柱础剖面图：础盘、覆盆、鼓镜三层结构',
 '["taihedian"]', '["sumeru"]', 30,
 '["images/柱础剖面图1.png", "images/柱础剖面图2.png", "images/柱础剖面图3.png", "images/柱础剖面图4.png"]'),

-- 台基
('sumeru', '台基', 'fa-layer-group', '须弥座', '中国古代建筑中等级最高的台基形式，源自佛教中的须弥山概念。由多层次的石构件叠合而成，中间有束腰，上下有枭混线脚。', NULL,
 '▲ 功能\n\n◆ 抬高建筑：使建筑高于地面，防潮防水\n◆ 等级标识：须弥座的高度和层数直接反映建筑等级\n◆ 视觉强化：层层叠涩的台基使建筑更加巍峨壮观\n\n▲ 故宫中的台基等级\n\n太和殿坐落于三层汉白玉须弥座台基之上，这是故宫中最高的台基等级。三层台基逐层收缩，形成"三台"格局，配以螭首排水和栏板望柱，气势磅礴。\n\n中和殿、保和殿共用同一三层台基，乾清宫则为单层须弥座台基。台基的高度和层数是划分建筑等级的重要标志。',
 '故宫三层须弥座台基剖面图:三层台基逐层收缩,螭首排水口',
 '["taihedian","zhonghedian","baohedian"]', '["chuchu"]', 31,
 '["images/故宫三层须弥座台基剖面图1.png", "images/故宫三层须弥座台基剖面图2.png", "images/故宫三层须弥座台基剖面图3.png"]'),

-- 门窗
('gongmen', '门窗', 'fa-door-open', '宫门制式', '故宫宫门有严格的等级制式，从午门的五阙门洞到宫殿的隔扇门，门的形制、大小、装饰均体现建筑等级。', NULL,
 '▲ 故宫宫门等级\n\n◆ 五阙门洞：最高等级，仅午门使用。中间三门为帝王专用，两侧门为百官通道。\n◆ 三阙门洞：太和门等级，正门居中，两侧各一。\n◆ 单门洞：一般宫门使用。\n\n▲ 隔扇门\n\n宫殿正面常用的门扇形式，上部为镂空格心（棂子），下部为裙板。格心图案有菱花、步步锦等，等级不同使用的图案也不同。\n\n▲ 门钉\n\n宫门上的门钉数量和排列也有规制。午门大门使用九行九列共八十一颗门钉，是最高规格。',
 '故宫宫门等级对比图：午门五阙→太和门三阙→配殿单门',
 '["wumen","taihemen","qianqingmen","shenwumen"]', '["roof-ranking"]', 40,
 '["images/宫门等级对比图.png", "images/宫门等级对比图2.png"]'),

('menshi', '门窗', 'fa-door-open', '门饰构件', '古代建筑门上不仅有装饰性构件，更有结构性和象征性功能。门簪、铺首、门钉等各有功用与等级规定。', NULL,
 '▲ 门簪\n\n门楣上突出的木构件，用于固定连楹（门楣横木），同时具有装饰作用。数量为偶数（二、四、六），等级越高数量越多。\n\n▲ 铺首（门环）\n\n门上的金属环扣，具有叩门功能和装饰作用。故宫主要宫殿的铺首为铜鎏金兽面纹，造型威猛，象征守卫。\n\n▲ 门钉\n\n固定在门扇上的半球形金属饰件，起加固门板和装饰作用。清代规定：皇宫九行九列（81颗），亲王府七行九列（63颗），依次递减。',
 '门饰构件示意图：门簪、铺首、门钉的位置与形制',
 '["wumen","taihemen"]', '["gongmen"]', 41,
 '["images/门饰构件示意图1.png", "images/门饰构件示意图2.png", "images/门饰构件示意图3.png", "images/门饰构件示意图4.png"]'),

-- 脊兽
('jishou-xianren', '脊兽', 'fa-dragon', '脊兽与仙人走兽', '宫殿屋顶角脊上的装饰构件。最前端为骑凤仙人，其后排列蹲兽，数量为奇数，是建筑等级的重要标识。', NULL,
 '▲ 故宫中的脊兽等级\n\n太和殿角脊上排列10只蹲兽，是绝无仅有的最高等级。其他建筑脊兽数量不等：乾清宫9只、坤宁宫7只、东西六宫5只。\n\n从骑凤仙人之后依次为：龙、凤、狮子、天马、海马、狻猊、狎鱼、獬豸、斗牛、行什（仅太和殿有）。\n\n◆ 骑凤仙人：传说齐国国君遇险时凤凰救驾，象征逢凶化吉\n◆ 龙：皇权象征\n◆ 凤：皇后象征\n◆ 狮子：威武勇猛\n◆ 天马/海马：通天入海，象征皇家威德\n◆ 狻猊：龙子之一，好坐喜烟火\n◆ 狎鱼：兴云降雨，防火避灾\n◆ 獬豸：能辨是非曲直\n◆ 斗牛：除祸镇邪\n◆ 行什：雷公形象，防雷击',
 '太和殿脊兽排列示意图：从骑凤仙人到行什共11尊',
 '["taihedian","qianqinggong","kunninggong"]', '["roof-ranking","wudian-roof"]', 50,
 '["images/太和殿脊兽排列示意图1.png", "images/太和殿脊兽排列示意图2.png", "images/太和殿脊兽排列示意图3.png", "images/太和殿脊兽排列示意图4.png"]'),

('chiwen', '脊兽', 'fa-dragon', '鸱吻/正吻', '正脊两端的龙形装饰构件，龙头向内张口吞脊，尾部向外卷起。既有装饰功能，也有镇火避灾的象征意义，同时也起到加固正脊与垂脊交接处的结构作用。', NULL,
 '▲ 名称由来\n\n"鸱吻"又称"鸱尾""正吻""龙吻"。传说鸱是龙的儿子之一，好吞火，因此置于屋顶以镇火灾。\n\n▲ 结构功能\n\n鸱吻位于正脊与垂脊的交汇处，通过内部的铁件将两部分拉结在一起，起到结构加固作用。同时，鸱吻的造型也能引导雨水沿龙身流下。\n\n▲ 故宫中的鸱吻\n\n太和殿正脊两端的鸱吻高约3.4米，重约4.3吨，由13块琉璃构件拼合而成。鸱吻背上插有剑把，用于固定构件。',
 '鸱吻结构图：正脊两端的鸱吻造型和内部铁件固定方式',
 '["taihedian","zhonghedian","baohedian"]', '["jishou-xianren","wudian-roof"]', 51,
 '["images/鸱吻结构图1.png", "images/鸱吻结构图2.png", "images/鸱吻结构图3.png", "images/鸱吻结构图4.png"]'),

-- 琉璃
('huangliuwa', '琉璃', 'fa-gem', '黄琉璃瓦', '明清皇宫屋顶使用的最高等级陶瓦，以黄色釉面覆盖。黄色在五行中属土，土居中央，象征皇权至上。"黄瓦"成为皇家建筑的代名词。', 1,
 '▲ 琉璃瓦的等级\n\n◆ 黄琉璃瓦：最高等级，仅用于皇宫、帝王陵寝、敕建寺庙（如雍和宫）\n◆ 绿琉璃瓦：次高等级，用于亲王府邸、重要寺庙\n◆ 青琉璃瓦：用于祭祀建筑（天坛用蓝瓦）\n◆ 黑琉璃瓦：用于次要建筑和特殊用途（如藏书楼，黑色属水，防水防火）\n\n▲ 故宫中的黄瓦\n\n故宫几乎所有建筑都使用黄琉璃瓦，体现了皇家建筑群的整体性。从景山俯瞰故宫，一片金黄色的琉璃瓦海洋，蔚为壮观。\n\n▲ 琉璃构件的种类\n\n除了筒瓦、板瓦外，还有专门用于屋脊的琉璃构件：正吻、垂兽、走兽、套兽等，每一件都是精美的艺术品。',
 '琉璃瓦等级色系图：黄→绿→青→黑 各等级颜色示例',
 '["taihedian","zhonghedian","baohedian"]', '["roof-ranking","jishou-xianren"]', 60,
 '["images/琉璃瓦等级色系图1.png"]'),

('liulizhaobi', '琉璃', 'fa-gem', '琉璃照壁', '置于建筑大门内外的独立墙体，用琉璃砖砌筑装饰。既遮挡视线、分隔空间，又是精美的建筑艺术品。', NULL,
 '▲ 功能\n\n◆ 遮挡视线：防止外人直接看到院内，保护隐私\n◆ 风水屏障：挡住"煞气"，引"吉气"入宅\n◆ 装饰作用：精美的琉璃浮雕是建筑的点睛之笔\n\n▲ 故宫中的照壁\n\n故宫中最著名的琉璃照壁是宁寿宫前的九龙壁。长29.4米，高3.5米，整座照壁以黄、蓝、白、紫等色琉璃砖拼砌出九条戏珠的巨龙，是中国现存三座九龙壁中最精美的一座。',
 '宁寿宫九龙壁示意图：九条龙的分布和姿态',
 '["qianqingmen"]', '["huangliuwa"]', 61,
 '["images/宁寿宫九龙壁示意图1.png", "images/宁寿宫九龙壁示意图2.png", "images/宁寿宫九龙壁示意图3.png"]'),

-- 纹饰
('longwen', '纹饰', 'fa-feather', '龙纹', '中国传统文化中最尊贵的装饰纹样，象征帝王和皇权。在故宫建筑中大量使用，从彩画、石雕到家具陈设，龙纹无处不在。', 1,
 '▲ 龙纹的等级\n\n◆ 五爪龙：帝王专用，仅用于皇帝相关的建筑和器物\n◆ 四爪龙：蟒纹，用于亲王、郡王等级\n◆ 三爪龙：更低等级的龙形纹样\n\n▲ 故宫中龙纹的分布\n\n◆ 彩画：太和殿金龙和玺彩画，全部以五爪龙纹为主题\n◆ 石雕：三大殿台基御路上的巨型龙纹石雕\n◆ 天花：宫殿天花板的团龙纹样\n◆ 藻井：太和殿藻井中盘龙含珠，最为壮观\n\n▲ 龙纹的形态\n\n◆ 升龙：龙头向上，有升腾之势\n◆ 降龙：龙头向下，有俯视之态\n◆ 行龙：龙身横陈，呈行走之姿\n◆ 团龙：龙身盘曲成圆形',
 '太和殿龙纹图样集合：彩画龙纹、石雕龙纹、藻井盘龙',
 '["taihedian","qianqinggong","jiaotaidian"]', '["caihua-hexi","fengwen"]', 70,
 '["images/太和殿龙纹图样1.png", "images/太和殿龙纹图样2.png", "images/太和殿龙纹图样集合3.png"]'),

('fengwen', '纹饰', 'fa-feather', '凤纹', '仅次于龙纹的尊贵装饰纹样，象征皇后和女性尊贵。在交泰殿、坤宁宫等与皇后相关的建筑中大量使用。', 2,
 '▲ 凤纹与龙纹的关系\n\n在皇家建筑中，龙纹和凤纹常配对出现，称为"龙凤呈祥"。一般龙纹用于外朝建筑，凤纹多用于内廷（后宫）建筑，体现了"男左女右""外龙内凤"的格局。\n\n▲ 故宫中凤纹的应用\n\n◆ 交泰殿：龙凤和玺彩画，龙纹和凤纹交替出现\n◆ 坤宁宫：大量使用凤纹装饰，强调皇后住所的尊贵\n◆ 彩画：龙凤和玺次于金龙和玺，用于内廷主要宫殿\n\n▲ 凤凰的象征\n\n凤凰是百鸟之王，其形象集中了多种鸟类的特征：鸡头、蛇颈、燕颔、龟背、鱼尾。在中国传统文化中，凤凰象征祥瑞、高贵和永恒。',
 '凤纹与龙纹对比图：龙凤和玺彩画中的纹样分布',
 '["jiaotaidian","kunninggong"]', '["caihua-hexi","longwen"]', 71,
 '["images/凤纹与龙纹对比图1.png", "images/凤纹与龙纹对比图2.png"]'),

('xiangyunwen', '纹饰', 'fa-feather', '祥云纹', '以云气为原型的装饰纹样，象征吉祥、瑞气和高远。在故宫建筑中广泛用于彩画边缘、石雕边框和天花图案。', 3,
 '▲ 祥云纹的寓意\n\n云气在天，与龙纹搭配象征"云龙"，寓意天子在天。云纹的卷曲形态富有韵律感，是中式装饰中最基本的纹样元素。\n\n▲ 故宫中的应用\n\n◆ 彩画框边：和玺彩画和旋子彩画的两端边框常用祥云纹\n◆ 石雕背景：龙纹石雕中，龙身周围环绕祥云\n◆ 天花图案：天花彩画中云纹与团龙交替排列\n\n▲ 纹样的演变\n\n从汉代云气纹到明清如意云纹，云纹经历了从写实到几何化的演变过程。故宫中的云纹多为如意形，线条流畅、造型优美。',
 '祥云纹演变图：从汉云气纹到清如意云纹的演变',
 '[]', '["longwen","caihua-hexi"]', 72,
 '["images/祥云纹演变图1.png", "images/祥云纹演变图2.png"]'),

-- 建筑规制
('sanchaodian', '建筑规制', 'fa-landmark', '三朝五门制度', '《周礼·考工记》中描述的古代王城规划制度。"三朝"指外朝、治朝、内朝；"五门"指皋门、库门、雉门、应门、路门。明清故宫的布局深受这一制度影响。', NULL,
 '▲ 故宫中的三朝体现\n\n◆ 外朝（太和殿区域）：举行国家大典、朝会、颁诏等重大仪式\n◆ 治朝（中和殿区域）：皇帝上朝前休息和接受大臣行礼\n◆ 内朝（保和殿区域）：皇帝日常处理政务和举行宴会\n\n▲ 故宫中的五门对应\n\n◆ 大明门（已拆）→ 皋门\n◆ 天安门 → 库门\n◆ 端门 → 雉门\n◆ 午门 → 应门\n◆ 太和门 → 路门\n\n▲ 意义\n\n三朝五门制度深刻地影响了故宫的空间布局。从前门到太和殿，经过五重门、三进院落，空间层层递进，仪式感不断增强，体现了"天子至尊"的礼制思想。',
 '故宫三朝五门布局图：从大明门到太和殿的五重门和三进院落',
 '["wumen","taihemen","taihedian","zhonghedian","baohedian"]', '["roof-ranking"]', 80,
 '["images/故宫三朝五门布局图.png"]'),

('qianchaohouqin', '建筑规制', 'fa-landmark', '前朝后寝', '中国古代宫殿建筑的经典布局模式。"前朝"为皇帝处理政务的场所，"后寝"为皇帝和后妃居住的区域，分区明确、内外有别。', NULL,
 '▲ 故宫中的体现\n\n◆ 前朝（外朝）：以太和殿、中和殿、保和殿为核心，是皇帝处理政务、举行大典的区域。建筑宏伟、广场开阔、气氛庄重。\n\n◆ 后寝（内廷）：以乾清宫、交泰殿、坤宁宫为核心，是皇帝和后妃的居住区域。建筑尺度更亲切，庭院更私密。\n\n▲ 空间过渡\n\n乾清门是前朝与后寝的分界线。门前是庄重的广场，门后是精致的内廷院落。这种空间转换体现了"公"与"私"、"政"与"居"的功能分化。\n\n▲ 礼制意义\n\n前朝后寝的布局不仅是一种功能分区，更是礼制的空间表达。"前"为阳、为公、为外；"后"为阴、为私、为内。',
 '故宫前朝后寝分区图：乾清门作为前朝与后寝的分界线',
 '["qianqingmen","qianqinggong","jiaotaidian","kunninggong","taihedian","baohedian"]', '["sanchaodian"]', 81,
 '["images/故宫前朝后寝分区图.png"]'),

-- 建筑装饰
('caisson', '建筑装饰', 'fa-star', '藻井', '中国传统建筑中室内顶棚向上凹入如井状的结构，有方形、多边形或圆形。多用于宫殿、寺庙的宝座或佛像上方，象征天宇的崇高。', NULL,
 '▲ 故宫中的藻井\n\n太和殿藻井是故宫中最壮观的藻井。位于皇帝宝座正上方，为八角形，层层上收，最顶部雕刻盘龙含珠。龙口所衔的轩辕镜（铜珠），传说可以分辨真假天子。\n\n▲ 结构特点\n\n◆ 斗八藻井：由八个面组成的八角形藻井\n◆ 层层内收：从方形外框逐步过渡到圆形顶心\n◆ 雕刻精美：每一层都有精致的斗拱、云纹雕刻\n\n▲ 功能\n\n藻井不仅有装饰功能，还能提升室内空间的高度感。井中有水，象征以水镇火，具有防火的寓意。',
 '太和殿藻井结构图：八角形层层内收，顶部盘龙含珠',
 '["taihedian"]', '["dougong","longwen"]', 90,
 '["images/太和殿藻井结构图.png"]'),

('screen-wall', '建筑装饰', 'fa-star', '影壁', '置于建筑大门内外的独立墙体，既遮挡视线、分隔空间，又是建筑艺术的集中展示。在故宫中，影壁也是重要的风水构件。', NULL,
 '▲ 故宫中的影壁\n\n◆ 九龙壁（宁寿宫前）：中国现存最精美的琉璃影壁\n◆ 乾清门影壁：分隔外朝与前朝的空间节点\n◆ 各宫殿内影壁：保护隐私，避免一览无余\n\n▲ 风水功能\n\n影壁在传统风水学中被称为"隐避"，可以"挡煞聚气"。宅门内外的气流需要回旋，不能直冲而入，影壁起到缓冲和转折的作用。\n\n▲ 装饰艺术\n\n故宫影壁上的琉璃浮雕、砖雕纹样极为精美。龙纹、祥云、海水江崖等主题，使影壁成为独立的艺术品。',
 '故宫影壁分布图：主要影壁的位置和形制',
 '["qianqingmen","wumen"]', '["liulizhaobi","longwen"]', 91,
 '["images/故宫影壁图片.png"]'),

-- 新增建筑构件术语
('gongdian-buju', '建筑规制', 'fa-landmark', '宫殿院落布局', '故宫建筑群采用院落式布局，以庭院为单位组织建筑。一条中轴线串联起层层院落，形成"庭院深深深几许"的空间序列。', NULL,
 '▲ 故宫的院落格局\n\n◆ 太和殿广场：故宫中最大的院落，可容纳数万人\n◆ 三大殿院落：太和殿、中和殿、保和殿共用一个三层台基\n◆ 后三宫院落：乾清宫、交泰殿、坤宁宫的私密院落\n◆ 东西六宫：妃嫔起居的小型院落群\n\n▲ 中轴线设计\n\n从午门到神武门，一条长约960米的中轴线贯穿故宫。所有重要建筑都沿中轴线排列，次要建筑两侧对称分布。这种布局体现了"居中为尊"的礼制思想。\n\n▲ 空间的节奏感\n\n故宫的空间设计有明确的节奏：开阔的广场（放松）→ 高耸的城门（紧张）→ 宏伟的大殿（高潮）→ 精致的庭院（舒缓）。行走其中，如欣赏一首建筑的交响曲。',
 '故宫中轴线院落序列图：从午门到神武门的空间节奏变化',
 '["wumen","taihemen","taihedian","qianqingmen","qianqinggong","shenwumen"]', '["sanchaodian","qianchaohouqin"]', 82, '[]'),

('goudang', '建筑装饰', 'fa-star', '勾当与榫卯', '中国古代木结构建筑的核心连接技术。不用一根钉子，仅靠木材之间的凹凸咬合，就能建造出经久不衰的宏伟建筑。', NULL,
 '▲ 榫卯的基本原理\n\n利用木材本身的弹性变形，将"榫头"插入"卯眼"中形成牢固的连接。不同的部位使用不同的榫卯形式，如燕尾榫、楔钉榫、管脚榫等。\n\n▲ 榫卯的抗震优势\n\n木材具有天然的柔韧性，榫卯节点可以在一定范围内活动。地震时，榫卯节点通过摩擦消耗能量，起到"以柔克刚"的效果。这是故宫建筑历经数百年、多次地震而屹立不倒的重要原因。\n\n▲ 故宫中的应用\n\n故宫所有建筑均采用榫卯结构。太和殿高大的木柱、复杂的斗拱、巨大的屋顶，全部通过榫卯连接在一起，堪称中国古代木结构技术的巅峰之作。',
 '榫卯类型图解：燕尾榫、楔钉榫、管脚榫等常见榫卯形式',
 '["taihedian"]', '["dougong","chuchu"]', 92,
 '["images/榫卯类型图解.png"]'),

('yubaoshi', '建筑装饰', 'fa-star', '御宝石雕', '故宫中大量使用汉白玉石雕，从台基栏板到御路丹陛，精美的石雕艺术是故宫建筑的重要组成部分。', NULL,
 '▲ 故宫中的石雕\n\n◆ 御路丹陛：三大殿台基中央的斜坡石雕，雕刻巨型龙纹\n◆ 望柱栏板：台基四周的石栏杆，每根望柱上雕刻云龙或云凤\n◆ 螭首：台基边缘的排水口，雕刻成龙首形状，雨天形成"千龙吐水"的壮观景象\n\n▲ 石雕工艺\n\n故宫石雕主要采用浮雕、透雕和圆雕技法。御路上的龙纹石雕，龙身凸出石面、周围祥云环绕，工艺精湛。\n\n▲ 汉白玉的象征\n\n白色象征纯洁和高贵，汉白玉的石材质感温润如玉。三层汉白玉台基上的朱红色大殿，红白相映，是故宫最具标志性的色彩组合。',
 '三大殿台基石雕分布图：御路丹陛、望柱栏板、螭首的位置',
 '["taihedian","zhonghedian","baohedian"]', '["sumeru","longwen"]', 93,
 '["images/三大殿台基石雕分布图1.png", "images/三大殿台基石雕分布图2.png", "images/三大殿台基石雕分布图3.png"]');

-- ---------- 3.1 建筑知识新增词条（迁移16种子，草稿） ----------
INSERT INTO encyclopedia_terms
  (id, category, category_icon, term, synopsis, level_value, content, image_desc,
   related_palaces, related_terms, sort_order, image_paths,
   entry_type, status, primary_palace_id, knowledge_dimensions, source_refs, image_credits)
VALUES
('changcheng-wall', '名筑档案', 'fa-landmark', '长城·依山就势的墙体与烽燧体系', '长城由墙体、关隘、烽燧与敌台组成，依山就势展开，就地取材，形成连续的防御体系，是线性遗产的代表。', NULL,
 '长城不是一道孤立的墙，而是由墙体、关隘、烽燧、敌台与屯兵城共同组成的防御体系。它顺着山脊与河谷展开，把地形本身当作防御工事的一部分，体现了中国古代“因地形、用险制塞”的营建思想。

## ▲ 一、依山就势的选线

◆ 墙体多沿山脊走向布置，利用陡坡增加攀爬难度
◆ 平缓地带改用夯土或石砌加厚墙体，弥补地形不足
◆ 河谷与隘口设关城，形成“墙—关—堡”的纵深

长城的选线不是画一条直线，而是逐段勘察后的结果。山脊段墙体较薄，靠坡度御敌；谷地段墙体厚重，靠体量阻隔。这种“地形优先”的原则，使它能够在漫长边界上用相对有限的材料形成连续防线。

## ▲ 二、墙体的材料与做法

◆ 西北干旱地带多用夯土版筑，就地取土、分层夯实
◆ 山地与重要关段改用条石、砖石砌筑，提高耐久性
◆ 墙顶设女墙、垛口与马道，兼顾防护与通行

不同地段的墙体做法差异明显：土质可取之处用夯土，石料丰富之处用石砌，重要关口再包砖。材料选择服从运输距离与防御等级，而不是追求统一形制。这正是地域性营建智慧的体现。

## ▲ 三、烽燧、关隘与信息传递

◆ 烽燧沿视线可达的制高点布置，白天举烟、夜间举火
◆ 关隘控制交通要道，兼具征税、验引与驻军功能
◆ 敌台与墙体咬合，形成近距离侧射与屯兵空间

烽燧体系把“墙”的静态防御扩展为“信息 + 兵力”的动态响应。一座烽燧发现敌情，邻近烽燧依次传递，守军据此判断方向与规模。关隘则是防线的“门”，既是军事节点，也是贸易与行政节点。

## ▲ 四、与该建筑的关系

长城是“防御性线性遗产”的代表，其价值不只在墙体本身，更在墙体、烽燧、关隘与地形的整体关系。理解长城，需要把单体构筑物放回它所依附的山川格局中去看。

## ▲ 五、与通用术语的关系

◆ 夯土版筑：墙体在干旱地段的主要做法
◆ 烽燧与关隘：防御体系的信息与节点
◆ 条石与砖石砌筑：重要关段的加固做法',
 '',
 '["changcheng"]', '["hangtu","fengsui","shiqiang"]', 101, '[]',
 'building', 'draft', 'changcheng',
 '["structure-material","conservation-heritage"]', '["中国长城学会公开资料","国家文物局长城保护公开文本"]', '[]'),
('gugong-axis', '名筑档案', 'fa-landmark', '故宫全景·中轴秩序与「三朝五门」', '紫禁城以南北中轴组织门、院、殿序列，以三朝五门限定礼制等级，并以前朝后寝划分公共礼仪与日常起居空间。', NULL,
 '紫禁城以一条南北中轴线组织整座宫城，把最重要的建筑依次排列在轴线上，次要建筑分列两侧。它不是单体建筑的集合，而是一套用空间秩序表达礼制等级的城市设计。

## ▲ 一、中轴作为秩序的骨架

◆ 主要门、殿、宫沿中轴依次展开，形成连续的空间序列
◆ 轴线上的建筑体量与屋顶等级最高，向两侧递减
◆ 通过门、院、殿的交替，形成收放有致的行进节奏

中轴不是简单的对称线，而是把“从哪里进、看到什么、走到哪里”编排成一套仪式流程。人沿轴线前进时，空间先收束再放开，视觉焦点始终落在下一座主殿上，礼制秩序被转化为可体验的空间经验。

## ▲ 二、三朝五门与前后序列

◆ “三朝”对应不同等级的朝会与礼仪空间
◆ “五门”以多重门制层层限定进入资格
◆ 门与殿交替出现，形成“门—院—殿”的重复单元

三朝五门把权力秩序写进了建筑序列：越往里，进入门槛越高，空间越私密。它既是礼制制度，也是空间分级方法。故宫的价值之一，正在于把这套制度完整地落成了可读的建筑群。

## ▲ 三、前朝后寝的功能分区

◆ 前朝用于朝会、庆典与政务，建筑高大开敞
◆ 后寝用于起居、祭祀与家庭生活，尺度相对收敛
◆ 分区之间以门、墙、院落过渡，界限清晰

前朝后寝不是简单的“办公区 + 居住区”，而是把公共性与私密性分开的空间制度。前朝强调仪式与威仪，后寝强调秩序与日常，两者通过门殿与院落完成转换。

## ▲ 四、与该建筑的关系

故宫全景的看点不在某一座殿，而在“轴线—门殿—院落—分区”的整体关系。看懂这套关系，才能理解为什么单座建筑的位置、朝向与屋顶等级都不能随意更改。

## ▲ 五、与通用术语的关系

◆ 三朝五门制度：中轴序列的礼制依据
◆ 宫殿院落布局：以院落为单元的群体组织
◆ 前朝后寝：公共礼仪与日常起居的功能分区',
 '',
 '["gugong"]', '["sanchaodian","gongdian-buju","qianchaohouqin"]', 102, '[]',
 'building', 'draft', 'gugong',
 '["site-layout","ritual-function"]', '["故宫博物院官网公开资料","《周礼·考工记》"]', '[]'),
('huanghelou-eaves', '名筑档案', 'fa-landmark', '黄鹤楼·五层飞檐与屡毁屡建', '黄鹤楼为临江楼阁，以层层出檐、翼角起翘形成轻盈轮廓；历代屡毁屡建，现存为当代重建，延续江南名楼意象。', NULL,
 '黄鹤楼位于长江边的蛇山之上，是江南楼阁建筑的代表。今天的黄鹤楼为当代重建，但“五层飞檐、层层出挑”的楼阁形象，延续了传统江南名楼的审美特征。

## ▲ 一、楼阁形制与层层出檐

◆ 多层楼阁以逐层收分形成向上的轮廓
◆ 每层设檐，檐角起翘，形成轻盈的飞檐效果
◆ 平座与栏杆围绕各层，提供观景与通行空间

楼阁与殿堂的最大区别，在于“向上生长”的形体。黄鹤楼通过层层出檐与逐层收分，把结构高度转化为视觉节奏；远看是竖向的楼体，近看是层层叠叠的檐口。

## ▲ 二、翼角起翘与飞檐做法

◆ 翼角在转角处向上起翘，减弱屋顶的沉重感
◆ 出檐深远，既遮阳避雨，也强化轮廓线
◆ 檐下构件与装饰共同塑造“如鸟斯革”的观感

飞檐不是单纯的装饰。起翘的翼角把屋面的重量感向上提，出檐则保护墙体与门窗。黄鹤楼的形象之所以鲜明，很大程度上来自翼角与出檐的比例关系。

## ▲ 三、屡毁屡建与文化记忆

◆ 楼阁因火灾、战乱与江水变迁多次损毁
◆ 每次重建都在形制、材料与位置上有所调整
◆ 文学名篇使建筑形象超越实体，成为文化符号

黄鹤楼的价值包含“实体建筑”与“文化意象”两层。实体多次更替，而诗文中的楼阁形象持续流传。理解这类名楼，需要同时看它的建造史与它在文学中的形象史。

## ▲ 四、与该建筑的关系

黄鹤楼的独有之处，在于把楼阁的竖向形体、飞檐翼角与江湖景观结合起来：登楼即观江，出檐即框景。它的建筑语言服务于“临水登高”的体验。

## ▲ 五、与通用术语的关系

◆ 屋顶等级制度：楼阁屋顶形制与等级的参照
◆ 飞檐与翼角：起翘、出挑的具体做法
◆ 祥云纹：楼阁装饰中常见的吉祥纹样',
 '',
 '["huanghelou"]', '["roof-ranking","feiyan","xiangyunwen"]', 103, '[]',
 'building', 'draft', 'huanghelou',
 '["roof-decoration","site-layout"]', '["黄鹤楼公园管理处公开资料","地方志相关记载"]', '[]'),
('mogao-cliff', '名筑档案', 'fa-landmark', '莫高窟·崖壁开窟与千年壁画彩塑', '莫高窟在崖壁上开凿窟室，结合木构窟檐、壁画与彩塑，把岩体空间转化为完整的礼拜场所，是石窟寺的代表。', NULL,
 '莫高窟开凿于敦煌鸣沙山东麓的崖壁上，自十六国时期延续至元代，形成规模宏大的石窟群。它把建筑、雕塑与壁画结合在同一空间里，是“石窟寺”类型的典型代表。

## ▲ 一、崖壁开窟的选址与开凿

◆ 选择质地较均一的砂砾岩崖壁，便于成组开凿
◆ 先凿窟门与甬道，再向内掏挖窟室
◆ 窟顶形式随窟型变化，有平顶、覆斗顶、中心塔柱等

石窟不是“在洞里盖房子”，而是“把建筑从岩体中凿出来”。开凿顺序决定了窟内空间的采光与视线：甬道收束光线，进入窟室后壁画与塑像成为视觉中心。

## ▲ 二、窟型与木构窟檐

◆ 早期窟型受西域影响，中心塔柱式便于绕塔礼拜
◆ 后期覆斗顶窟型更接近中原殿堂空间
◆ 窟外曾建木构窟檐，形成“石室 + 木构”的复合立面

莫高窟的窟型演变，能看到外来形制与中原建筑传统的融合。窟檐虽然多已不存，但它说明石窟并非纯石构，而是石、木、彩绘共同完成的建筑整体。

## ▲ 三、壁画与彩塑的空间作用

◆ 壁画覆盖窟顶与四壁，把结构面转化为叙事面
◆ 彩塑位于视觉中心，与壁画共同构成礼拜场景
◆ 壁画地仗、绘制与彩塑妆銮各有工艺体系

壁画与彩塑不是附加装饰，而是窟室空间的“内容层”。它们改变了石壁的质感与尺度感，使洞窟从工程空间转化为宗教场所。

## ▲ 四、与该建筑的关系

莫高窟的独有做法，是把建筑、雕塑、绘画压缩在同一岩体空间中，用有限的窟室完成完整的礼拜叙事。它的“建筑性”体现在空间序列与界面处理，而不只是外观。

## ▲ 五、与通用术语的关系

◆ 崖壁开窟：窟室与窟檐的开凿方式
◆ 壁画与彩塑：窟内空间的内容层
◆ 勾当与榫卯：窟檐木构的连接方式',
 '',
 '["mogao"]', '["yabi-kaizao","bihua-caisu","goudang"]', 104, '[]',
 'building', 'draft', 'mogao',
 '["structure-material","conservation-heritage"]', '["敦煌研究院公开资料","世界遗产中心莫高窟条目"]', '[]'),
('potala-fortress', '名筑档案', 'fa-landmark', '布达拉宫·依山而建的宫堡体系', '布达拉宫依红山而建，以收分墙体、叠院与竖向台阶组织宫殿、寺院与防御功能，是高原告垒式宫堡的代表。', NULL,
 '布达拉宫建于拉萨红山之上，是宫堡式建筑群的代表。它以山体为基座，把宫殿、佛殿、僧舍与防御设施层层叠合，形成从山脚到山顶的垂直空间序列。

## ▲ 一、以山为基的竖向布局

◆ 建筑顺应山势逐层抬高，形成台阶式群体
◆ 外墙收分明显，下部厚重、上部渐轻
◆ 白宫与红宫以色彩区分功能与等级

布达拉宫不是把平地建筑搬到山上，而是让建筑“长”在山体上。收分的外墙既稳定结构，也在视觉上把建筑与山岩连成一体。

## ▲ 二、材料与墙体做法

◆ 主体以石砌与夯土结合，就地取材
◆ 墙体厚实，适应高原温差与风压
◆ 木构用于梁架、楼层与内部空间划分

高原环境对材料的要求很直接：墙体要厚、要稳、要保温。石砌提供强度，夯土提供整体性与热工性能，木构则负责内部空间的灵活划分。

## ▲ 三、宫堡的门户与通道

◆ 入口以多重门洞与狭窄通道控制进入
◆ 内部以院落、楼梯与平台组织流线
◆ 防御性通道与礼佛路线相互交织

宫堡建筑的门户不是简单的出入口，而是防御与礼仪的双重装置。狭窄通道限制通行速度，平台与院落则在高差之间提供停留与转换的节点。

## ▲ 四、与该建筑的关系

布达拉宫的独有之处，是把宫殿、寺院与城堡三种功能压缩在同一山体上，用垂直高差组织秩序。它的建筑语言核心是“依山、收分、叠院”。

## ▲ 五、与通用术语的关系

◆ 夯土版筑：墙体与保温构造的重要做法
◆ 宫殿院落布局：以院落组织复杂功能
◆ 宫门制式：门户的防御与礼仪双重作用',
 '',
 '["potala"]', '["hangtu","gongdian-buju","gongmen"]', 105, '[]',
 'building', 'draft', 'potala',
 '["site-layout","structure-material"]', '["世界遗产中心布达拉宫条目","布达拉宫管理处公开资料"]', '[]'),
('tiantan-eaves', '名筑档案', 'fa-landmark', '天坛·三重攒尖与二十八柱的祈年殿', '天坛以祈年殿为核心，用圆形平面、蓝色琉璃瓦与三重攒尖顶表达天圆地方的宇宙观，并以同心柱网组织礼制空间。', NULL,
 '天坛是明清两代祭天的礼制建筑群，以祈年殿、圜丘与皇穹宇为核心。它用圆形平面、蓝色琉璃瓦与层层收进的屋顶，把“天圆地方”的宇宙观转译成建筑语言。

## ▲ 一、祈年殿的形制与象征

◆ 圆形平面象征天，三重檐攒尖顶层层收进
◆ 蓝色琉璃瓦对应天空，与皇家黄瓦形成区别
◆ 殿内柱网按四季、月份、时辰等概念组织

祈年殿的每一层屋顶、每一圈柱子都承担象征意义。它把抽象的宇宙秩序编码进可数的构件中，使礼制建筑同时成为一套“可读的模型”。

## ▲ 二、柱网与空间组织

◆ 内圈柱、中圈柱与外圈柱形成三层同心柱网
◆ 柱网支撑上层梁架，也划分殿内空间层次
◆ 中心空间抬高，强化祭天时的视觉焦点

同心柱网既解决大跨度屋顶的支撑问题，也把空间分成由内而外的等级。站在殿内，视线自然被引向中心与上方，这正是礼制建筑需要的空间效果。

## ▲ 三、圜丘与整体序列

◆ 圜丘以露天圆台祭天，强调“露天而祭”
◆ 皇穹宇与回音壁构成声学与礼制结合的节点
◆ 建筑群以南北轴线组织，形成从人到天的行进序列

天坛不是单座殿，而是一套“行进—祭拜—回望”的空间序列。祈年殿负责形象，圜丘负责仪式，二者共同完成祭天体验。

## ▲ 四、与该建筑的关系

天坛的独有做法，是用圆形平面、同心柱网与三重攒尖顶建立“天—地—人”的空间秩序。它的建筑性体现在象征系统与结构系统的统一。

## ▲ 五、与通用术语的关系

◆ 屋顶等级制度：三重檐攒尖在礼制建筑中的等级表达
◆ 斗拱：檐下承托与等级标识
◆ 勾当与榫卯：木构节点的连接方式',
 '',
 '["tiantan"]', '["roof-ranking","dougong","goudang"]', 106, '[]',
 'building', 'draft', 'tiantan',
 '["ritual-function","roof-decoration"]', '["世界遗产中心天坛条目","天坛公园管理处公开资料"]', '[]'),
('tulou-earthen', '名筑档案', 'fa-landmark', '福建土楼·生土夯筑的环形围合', '福建土楼以生土夯筑厚墙，环形围合中心庭院，兼顾承重、保温、防御与宗族聚居，是聚落型民居的代表。', NULL,
 '福建土楼是客家人以生土夯筑的大型集合住宅，常见圆形、方形与五凤楼等形制。它以厚实的土墙围合出内向的庭院，把防御、聚居与宗族秩序组织在同一个建筑体里。

## ▲ 一、生土夯筑的墙体做法

◆ 就地取土，掺入砂、石与少量石灰，分层夯筑
◆ 墙体下厚上薄，底部可达一米以上，向上逐层收分
◆ 夯筑时预留门窗洞口与木构埋件

土楼的墙不是“糊”出来的，而是用模板逐层夯实的整体。收分的墙体既提高稳定性，也让重心下沉；厚墙同时承担承重、保温与防御三重作用。

## ▲ 二、环形围合的空间组织

◆ 圆形平面以中心庭院为核心，房间沿周边布置
◆ 内环设廊道与楼梯，形成垂直交通与公共空间
◆ 底层多作厨房、储藏，上层作居室，功能垂直分区

环形围合把“对外防御”与“对内聚合”结合起来。外圈封闭、内圈开敞，所有住户共享庭院与廊道，宗族的公共性生活被写进了空间结构。

## ▲ 三、防御与生活的一体化

◆ 底层厚墙少窗，高层开小窗，兼顾采光与防护
◆ 主要出入口设厚重门扇，形成可控的进入节点
◆ 内部水井、粮储与公共厅堂支持长期聚居

土楼不是单纯的住宅，而是一个可以自给自足的聚落单元。防御设施与日常生活设施高度重合，说明它的形制来自真实的聚居需求，而不是形式偏好。

## ▲ 四、与该建筑的关系

福建土楼的独有做法，是用生土夯筑的环形厚墙同时解决承重、保温、防御与宗族聚居。它的建筑价值在于“材料—形制—社会结构”三者的高度统一。

## ▲ 五、与通用术语的关系

◆ 夯土版筑：土墙的夯筑工艺
◆ 环形围合：向心式平面与内向庭院
◆ 勾当与榫卯：内部木构廊道与楼层的连接',
 '',
 '["tulou"]', '["hangtu","yuanxing-weiyuan","goudang"]', 107, '[]',
 'building', 'draft', 'tulou',
 '["structure-material","site-layout"]', '["世界遗产中心福建土楼条目","地方志相关记载"]', '[]'),
('yingxian-bracket', '名筑档案', 'fa-landmark', '应县木塔·明五暗四与斗拱博物馆', '应县木塔为辽代纯木楼阁式塔，以明五暗四的层叠结构与密集斗拱实现整体稳定与抗震，是木构楼阁的重要实例。', NULL,
 '应县木塔（佛宫寺释迦塔）建于辽代，是中国现存最古老的纯木结构楼阁式塔。它外观五层六檐，内部却有九层结构，形成“明五暗四”的独特做法。

## ▲ 一、明五暗四的结构层次

◆ 外观可见五层，内部另设四个暗层作为结构加强层
◆ 暗层不设外围窗，主要承担水平刚度与整体稳定
◆ 各层柱网与梁架层层叠合，形成稳定的竖向体系

“明五暗四”不是简单的层数游戏，而是结构策略：暗层像隐藏的“加强箍”，把塔身各层连成整体。外观仍保持楼阁的轻盈比例，内部却获得了更高的抗震性能。

## ▲ 二、斗拱的集中展示

◆ 各层檐下使用大量斗拱，形制与做法随位置变化
◆ 斗拱层层出挑，承托深远的出檐
◆ 不同年代的修配痕迹，使木塔成为斗拱演变的实物样本

应县木塔被称为“斗拱博物馆”，因为它在同一座建筑中集中呈现了多种斗拱做法。斗拱在这里既是承重构件，也是檐口尺度与等级的表达工具。

## ▲ 三、纯木结构的抗震智慧

◆ 全塔以榫卯连接，节点允许一定程度的变形
◆ 暗层与多层柱网共同耗散地震能量
◆ 厚重台基与逐层收分提高整体稳定性

木塔历经多次地震仍能保存，关键在于“以柔克刚”：结构不靠刚性抵抗，而靠节点摩擦与层间变形吸收能量。这是中国传统木构的典型思路。

## ▲ 四、与该建筑的关系

应县木塔的独有做法，是用“明五暗四”的层叠结构把楼阁式塔的形体与纯木结构的稳定性统一起来。它的价值在于结构逻辑与外观比例的高度协调。

## ▲ 五、与通用术语的关系

◆ 斗拱：檐下承托与出挑的核心构件
◆ 斗拱等级（踩数）：斗拱层数与等级的关系
◆ 勾当与榫卯：纯木结构的节点连接',
 '',
 '["yingxian_muta"]', '["dougong","dougong-levels","goudang"]', 108, '[]',
 'building', 'draft', 'yingxian_muta',
 '["structure-material","conservation-heritage"]', '["全国重点文物保护单位名录","应县木塔管理处公开资料"]', '[]'),
('foguangsi-eave', '名筑档案', 'fa-landmark', '佛光寺东大殿·七铺作斗拱与深远出檐', '佛光寺东大殿为唐代木构，以七铺作斗拱和深远出檐形成雄浑的殿堂比例，是研究唐代建筑的重要实物。', NULL,
 '佛光寺东大殿位于山西五台山，是唐代木构建筑的重要实例。它以宏大的七铺作斗拱、深远的出檐与简洁的殿身，展现了唐代殿堂建筑的比例与气度。

## ▲ 一、七铺作斗拱与出檐

◆ 斗拱层数多、出挑远，形成深远的檐口
◆ 檐下阴影加深，突出殿身的水平线条
◆ 斗拱尺度大，与殿身比例形成唐构特征

东大殿的斗拱不是“装饰性小构件”，而是承担出檐的关键结构。铺作层数多，意味着出挑距离大，屋檐可以伸得更远，保护墙身与台基。

## ▲ 二、殿身比例与空间

◆ 面阔与进深接近，平面趋于方正
◆ 柱身粗壮、侧脚与生起明显，增强稳定感
◆ 殿内梁架简洁，空间开阔，少装饰性分隔

唐代殿堂的比例偏向雄浑：柱高与斗拱、屋顶之间的比例均衡，不追求细密装饰。东大殿的空间感来自结构本身的尺度，而不是附加的装饰层。

## ▲ 三、唐代木构的保存价值

◆ 保存了较早的木构做法与构件形制
◆ 斗拱、梁架与屋面做法为研究唐构提供实物依据
◆ 后世修配有限，整体仍可读出原构逻辑

佛光寺东大殿的价值，在于它让抽象的“唐代建筑”变成了可以近距离观察的结构实体。斗拱怎么出挑、梁架怎么搭接，都能在殿内直接看到。

## ▲ 四、与该建筑的关系

东大殿的独有做法，是以七铺作斗拱和深远出檐建立雄浑的唐代殿堂形象，同时保持内部空间的简洁。它的建筑语言核心是“大斗拱、深出檐、简梁架”。

## ▲ 五、与通用术语的关系

◆ 斗拱：铺作层的承托与出挑
◆ 斗拱等级（踩数）：铺作层数与建筑等级
◆ 庑殿顶：殿堂屋顶的基本形制',
 '',
 '["foguangsi"]', '["dougong","dougong-levels","wudian-roof"]', 109, '[]',
 'building', 'draft', 'foguangsi',
 '["structure-material","roof-decoration"]', '["五台山世界遗产资料","国家文物局公开资料"]', '[]'),
('yueyanglou-helmet', '名筑档案', 'fa-landmark', '岳阳楼·三层三檐与四角盔顶', '岳阳楼临洞庭湖而立，三层三檐收束为四角盔顶，形成独特的临水名楼轮廓，并把观景功能写入楼层组织。', NULL,
 '岳阳楼位于湖南岳阳西门城头，临洞庭湖而立，是江南三大名楼之一。现存建筑为清代重修，以三层三檐、四角盔顶的形制著称，是楼阁建筑中较特殊的屋顶做法。

## ▲ 一、三层三檐的楼阁形制

◆ 三层楼体逐层收分，形成稳定的竖向轮廓
◆ 每层设檐，檐口层层出挑，形成水平节奏
◆ 平座与栏杆环绕各层，提供观湖空间

三层三檐让楼体在竖向上有明确的层次，同时每一层都能获得出檐保护。楼阁的“层”不只是高度单位，也是观景与礼仪的空间单位。

## ▲ 二、四角盔顶的特殊做法

◆ 屋顶四角起翘，顶部收束如盔，故称盔顶
◆ 盔顶介于攒尖与歇山之间，轮廓独特
◆ 屋脊与翼角的处理强化了临水建筑的轻盈感

盔顶不是常见的官式屋顶形制，它更像地方做法与楼阁形制的结合。四角起翘与顶部收束，使屋顶在远观时有明确的“冠”形轮廓，与楼身形成对比。

## ▲ 三、临水选址与景观关系

◆ 楼址紧邻城墙与湖岸，形成“城—楼—湖”的视线关系
◆ 高层开敞，便于登临观景
◆ 出檐与栏杆共同框定湖面视野

岳阳楼的建筑价值与它的位置密不可分。楼不是孤立地展示形制，而是作为观景装置存在：登楼、凭栏、远眺，建筑与湖景共同完成体验。

## ▲ 四、与该建筑的关系

岳阳楼的独有做法，是以三层三檐的楼体与四角盔顶形成临水名楼的标志性轮廓，并把观景功能写入楼层与栏杆的组织中。

## ▲ 五、与通用术语的关系

◆ 屋顶等级制度：楼阁屋顶形制与等级的参照
◆ 飞檐与翼角：四角起翘的具体做法
◆ 祥云纹：楼阁装饰中常见的吉祥纹样',
 '',
 '["yueyanglou"]', '["roof-ranking","feiyan","xiangyunwen"]', 110, '[]',
 'building', 'draft', 'yueyanglou',
 '["roof-decoration","site-layout"]', '["岳阳楼景区管理处公开资料","范仲淹《岳阳楼记》"]', '[]'),
('hangtu', '建筑规制', 'fa-layer-group', '夯土版筑', '夯土版筑以模板夹持、分层夯实泥土成墙，就地取材，厚墙兼具承重与保温性能，是传统墙体技术的重要分支。', NULL,
 '夯土版筑是中国古代使用最广泛的建筑技术之一，以模板夹持、分层夯实的办法把松散泥土变成承重墙体。它在长城、土楼、宫堡与民居中都有应用，是“就地取材”营建智慧的代表。

## ▲ 一、材料与配比

◆ 以黏土为主，掺入砂、碎石改善级配
◆ 有时加入石灰、稻草或糯米浆提高强度与耐久
◆ 含水率需控制在“握之成团、落地即散”的范围

夯土不是随便把土堆起来。材料级配决定强度，含水率决定夯筑质量。掺料的选择则取决于当地资源与建筑等级。

## ▲ 二、版筑工艺

◆ 用木模板夹出墙体宽度，逐层填入土料
◆ 每层虚土夯实至设计厚度，形成水平夯层
◆ 模板逐段上移，墙体连续上升，预留门窗洞口

“版筑”二字来自模板：版是夹板，筑是夯打。夯层纹理是夯土墙最直观的特征，它记录了施工的分层与节奏。

## ▲ 三、性能与适用场景

◆ 墙体厚重，保温隔热性能好，适合温差大的地区
◆ 整体性强，抗压性能好，但抗水与抗剪较弱
◆ 常用于城墙、围屋、院墙与部分民居承重墙

夯土的优势在“厚”和“整”，劣势在“怕水”。因此夯土建筑通常需要较大的出檐、石砌勒脚与良好的排水，才能长期保存。

## ▲ 四、与其他术语的关系

◆ 条石与砖石砌筑：与夯土互补的另一种墙体做法
◆ 环形围合：夯土墙在土楼中的空间应用
◆ 烽燧与关隘：夯土在防御体系中的使用',
 '',
 '["changcheng","tulou","potala"]', '["shiqiang","yuanxing-weiyuan","fengsui"]', 201, '[]',
 'craft', 'draft', NULL,
 '["structure-material"]', '["中国古代建筑技术史公开资料"]', '[]'),
('fengsui', '建筑规制', 'fa-signal', '烽燧与关隘', '烽燧负责观察与传递敌情，关隘控制交通并驻守，二者把连续墙体变成可响应的防线，构成长城的节点体系。', NULL,
 '烽燧与关隘是长城防御体系的两个关键节点：烽燧负责“看见并传出”，关隘负责“控制与驻守”。它们把连续的墙体转化为有信息、有兵力、有行政功能的防线。

## ▲ 一、烽燧的形制与选址

◆ 多建于视线良好的山脊、台地或墙体转角
◆ 平面有方形、圆形，常带围墙与燧卒居所
◆ 顶部设举烟、举火设施，夜间与白天信号不同

烽燧的首要条件是“看得见下一座”。选址服从视线，而不是服从等距。它既是观察点，也是信号站，往往还兼有小规模驻兵与物资储存功能。

## ▲ 二、关隘的防御与行政功能

◆ 设于交通要道、河谷隘口，控制通行
◆ 由关城、城墙、瓮城与驻军营地组成
◆ 兼具验引、征税、邮驿与军事防守

关隘不只是军事工事，也是行政与贸易节点。过关需要凭证，货物需要查验，这使得关隘成为长城线上“最像城市”的部分。

## ▲ 三、信息传递与协同

◆ 烽燧以烟、火、旗等信号逐座传递敌情
◆ 关隘据此判断方向、规模并组织响应
◆ 墙体、烽燧、关隘与屯兵城构成纵深体系

单座烽燧没有意义，意义来自“链”。信号沿烽燧链传递，兵力沿关隘与屯兵城调动，静态的墙因此获得了动态响应能力。

## ▲ 四、与其他术语的关系

◆ 长城墙体：烽燧与关隘依附的线性主体
◆ 夯土版筑：烽燧与关城常见的墙体做法
◆ 条石与砖石砌筑：重要关段的加固做法',
 '',
 '["changcheng"]', '["hangtu","shiqiang","changcheng-wall"]', 202, '[]',
 'craft', 'draft', NULL,
 '["site-layout","structure-material"]', '["长城保护公开资料","国家文物局公开文本"]', '[]'),
('shiqiang', '建筑规制', 'fa-th-large', '条石与砖石砌筑', '条石与砖石砌筑以错缝叠砌形成墙体与台基，重要部位用条石加固，兼顾耐久、承重与防水性能。', NULL,
 '条石与砖石砌筑是用加工后的石材或砖材，按一定规则叠砌成墙体、台基与券洞的做法。它在长城关段、宫堡、台基与桥梁中广泛使用，与夯土共同构成中国传统墙体技术的两条主线。

## ▲ 一、条石加工与砌筑

◆ 条石经开采、粗加工与找平，形成规整的长方体
◆ 砌筑时错缝搭接，避免通缝，提高整体性
◆ 重要部位用铁件、榫槽或灰浆加强连接

条石砌筑的关键在“错缝”和“找平”。错缝让墙体受力分散，找平保证层层传力。越是重要的墙体，石料加工越规整，灰缝越均匀。

## ▲ 二、砖砌与砖石混砌

◆ 砖砌墙体以砖的错缝叠砌形成整体
◆ 砖石混砌常见“外砖内土”或“下石上砖”做法
◆ 券洞、门窗洞口用砖石发券，形成承重开口

砖石混砌是根据材料性能分配角色的结果：石料抗压耐磨，用于基础与重要面层；砖材规整易砌，用于墙体与装饰面。两者结合，兼顾强度与经济性。

## ▲ 三、适用与性能

◆ 抗压强度高、耐久性好，适合承重墙与台基
◆ 自重大，对基础要求高
◆ 灰缝与排水处理不当易产生渗水与泛碱

砖石墙体的优势是耐久，劣势是“重”和“怕水”。因此台基、勒脚、压顶与排水构造往往比墙体本身更考验施工水平。

## ▲ 四、与其他术语的关系

◆ 夯土版筑：与砖石砌筑互补的墙体技术
◆ 须弥座：砖石砌筑在台基上的典型应用
◆ 烽燧与关隘：重要关段采用砖石加固',
 '',
 '["changcheng","potala"]', '["hangtu","sumeru","fengsui"]', 203, '[]',
 'craft', 'draft', NULL,
 '["structure-material"]', '["中国古代建筑技术史公开资料"]', '[]'),
('yabi-kaizao', '建筑规制', 'fa-mountain', '崖壁开窟', '崖壁开窟是在岩体上凿出门道与窟室，再以木构窟檐保护窟口，把天然岩体转化为可礼拜的石窟寺空间。', NULL,
 '崖壁开窟是在天然岩体上凿出窟门、甬道与窟室，形成石窟寺空间的做法。它把“建造”转化为“减材开凿”，在莫高窟等石窟群中发展出成熟的窟型与施工顺序。

## ▲ 一、选址与岩体条件

◆ 选择岩层较厚、质地相对均一的崖壁
◆ 避开破碎带与渗水带，减少塌方与渗漏
◆ 崖面朝向影响采光、通风与礼拜动线

开窟首先要“读岩”。岩体是否完整、是否渗水，决定了窟室能不能开大、能开多深。选址不是找最壮观的崖面，而是找最稳定的崖面。

## ▲ 二、开凿顺序与窟型

◆ 先开窟门与甬道，再由外向内掏挖窟室
◆ 窟顶形式有平顶、覆斗顶、中心塔柱式等
◆ 中心塔柱式便于绕塔礼拜，覆斗顶更接近殿堂空间

开凿顺序影响空间体验：甬道收束光线与视线，进入窟室后突然开敞，壁画与塑像成为焦点。窟型则决定了礼拜方式与视觉中心的位置。

## ▲ 三、窟檐与石木结合

◆ 窟外常接建木构窟檐，保护窟口与壁画
◆ 窟檐形成“石室 + 木构立面”的复合形象
◆ 檐下构件与崖面锚固，需处理排水与防风

石窟并非纯石构建筑。木构窟檐承担遮雨、遮阳与立面塑造，是石窟长期保存的重要条件。崖面排水做得好不好，直接影响壁画寿命。

## ▲ 四、与其他术语的关系

◆ 壁画与彩塑：窟内空间的内容层
◆ 勾当与榫卯：窟檐木构的连接方式
◆ 须弥座：石窟佛坛与基座的做法参照',
 '',
 '["mogao"]', '["bihua-caisu","goudang","sumeru"]', 204, '[]',
 'craft', 'draft', NULL,
 '["structure-material","ritual-function"]', '["敦煌研究院公开资料","中国石窟寺相关论述"]', '[]'),
('bihua-caisu', '建筑装饰', 'fa-palette', '壁画与彩塑', '壁画依附地仗层绘制，彩塑以木骨泥塑成形，二者共同构成窟室与殿宇的叙事中心，也是空间的内容层。', NULL,
 '壁画与彩塑是石窟寺与殿宇中把结构界面转化为叙事界面的两种主要手段。壁画依附墙体，彩塑占据空间中心，二者共同构成礼拜场景的“内容层”。

## ▲ 一、壁画的地仗与绘制

◆ 先在壁面做地仗层，找平并隔离岩体湿气
◆ 地仗上施白粉底，再起稿、勾线、设色
◆ 矿物颜料耐光性强，是长期保存的关键

壁画不是直接画在石头上。地仗层决定壁画能否附着、能否防潮；颜料决定色彩能否持久。工艺的每一层都为下一层服务。

## ▲ 二、彩塑的骨架与妆銮

◆ 以木骨架、草绳与泥土塑造形体
◆ 表面施粉底后彩绘，称“妆銮”
◆ 塑像与壁画的色彩、尺度需要统一设计

彩塑是“立体的壁画”。它需要骨架支撑、泥层塑形、表面彩绘，任何一层出问题都会影响整体。塑像与壁画在同一空间中互为背景与主体。

## ▲ 三、空间与叙事作用

◆ 壁画覆盖窟顶与四壁，扩展空间感
◆ 彩塑位于视觉中心，形成礼拜焦点
◆ 图文结合，把教义叙事转译为可读的空间

壁画与彩塑改变了石壁的质感与尺度：原本冷硬的岩面被转化为连续的图像界面，洞窟从工程空间变成可进入的叙事空间。

## ▲ 四、与其他术语的关系

◆ 崖壁开窟：壁画与彩塑依附的空间载体
◆ 和玺彩画 / 旋子彩画：官式彩画与石窟彩绘的对照
◆ 须弥座：佛坛与塑像基座的做法参照',
 '',
 '["mogao"]', '["yabi-kaizao","caihua-hexi","caihua-xuanzi"]', 205, '[]',
 'craft', 'draft', NULL,
 '["roof-decoration","ritual-function"]', '["敦煌研究院公开资料"]', '[]'),
('feiyan', '屋顶', 'fa-feather-alt', '飞檐与翼角', '出檐保护墙身，翼角起翘减轻屋顶沉重感，二者共同塑造中国传统屋顶轻盈舒展的轮廓与光影层次。', NULL,
 '飞檐与翼角是中国传统屋顶在檐口转角的处理方式：檐口向外挑出，转角处向上起翘，使沉重的屋顶获得轻盈的轮廓。它在楼阁、殿堂与亭榭中广泛使用。

## ▲ 一、出檐与起翘

◆ 出檐指屋檐挑出墙体的距离，保护墙身与门窗
◆ 起翘指檐口转角向上抬升，减弱屋顶的沉重感
◆ 出檐越深，檐下阴影越明显，轮廓越舒展

出檐解决“遮护”，起翘解决“观感”。二者结合，形成中国传统建筑特有的“如鸟斯革、如翚斯飞”的屋顶意象。

## ▲ 二、翼角的构造做法

◆ 角梁、老角梁与仔角梁叠合，形成转角骨架
◆ 翼角椽逐根调整角度与长度，形成曲面
◆ 檐下斗拱与挑檐构件共同承担出挑荷载

翼角不是把檐口“掰弯”，而是通过角梁与翼角椽的排列形成空间曲面。构件长度、角度与标高都要逐根调整，施工精度要求很高。

## ▲ 三、视觉与气候作用

◆ 起翘的翼角把视线向上引导，强化屋顶轮廓
◆ 深出檐遮阳避雨，适应多雨地区
◆ 檐下阴影与屋面反光形成层次感

飞檐既是审美选择，也是气候回应。南方多雨地区出檐更深，北方官式建筑则更强调等级与规整。同一做法在不同地区有不同的分寸。

## ▲ 四、与其他术语的关系

◆ 屋顶等级制度：屋顶形制与飞檐尺度的等级背景
◆ 斗拱：檐下承托与出挑的结构基础
◆ 祥云纹：檐口与翼角装饰中常见的纹样',
 '',
 '["huanghelou","yueyanglou"]', '["roof-ranking","dougong","xiangyunwen"]', 206, '[]',
 'craft', 'draft', NULL,
 '["roof-decoration"]', '["中国古代建筑营造公开资料","《营造法式》相关论述"]', '[]'),
('yuanxing-weiyuan', '建筑规制', 'fa-circle', '环形围合', '环形围合以周边房间围出中心庭院，外实内虚，兼顾防御、采光与宗族公共生活，常见于福建土楼等聚落。', NULL,
 '环形围合是以中心庭院为核心、房间沿周边连续布置的平面组织方式。它在福建土楼等集合住宅中发展到极致，把防御、采光、通风与宗族聚居统一在一个内向的几何秩序中。

## ▲ 一、向心式平面

◆ 房间沿圆周或方环连续布置，围合出中心庭院
◆ 外圈封闭、内圈开敞，形成“外实内虚”
◆ 中心庭院承担采光、通风与公共活动

环形围合的方向是“向心”的：所有房间面向同一个内院，公共空间位于几何中心。它用最简单的平面关系，建立了强烈的共同体意识。

## ▲ 二、垂直分区与公共廊道

◆ 底层多为厨房、储藏与出入口
◆ 上层为居室，沿内环廊道组织交通
◆ 楼梯分布在内环，形成垂直方向的公共节点

环形平面的楼层分工很清晰：底层对外、上层对内。内环廊道既是交通空间，也是邻里交往的场所。垂直分区让有限占地容纳更多住户。

## ▲ 三、防御、气候与聚居

◆ 外围厚墙少窗，形成天然防御面
◆ 内向庭院减少风寒，改善微气候
◆ 共享庭院与廊道支持宗族公共生活

环形围合的优点在“一举多得”：同一圈墙同时承担承重、防御、保温与边界划分。它不是形式游戏，而是对聚居安全与气候条件的直接回应。

## ▲ 四、与其他术语的关系

◆ 夯土版筑：环形厚墙的主要建造技术
◆ 宫殿院落布局：院落式围合的另一条传统
◆ 勾当与榫卯：内部木构廊道与楼层的连接',
 '',
 '["tulou"]', '["hangtu","gongdian-buju","goudang"]', 207, '[]',
 'craft', 'draft', NULL,
 '["site-layout","structure-material"]', '["世界遗产中心福建土楼条目","地方志相关记载"]', '[]')
ON DUPLICATE KEY UPDATE id = id;

-- 既有 26 条 related_palaces 追加（只追加，不改原值）
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY()
WHERE related_palaces IS NULL OR NOT JSON_VALID(related_palaces);

UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'roof-ranking'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tiantan')
WHERE id = 'roof-ranking'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tiantan'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'foguangsi')
WHERE id = 'roof-ranking'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('foguangsi'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yueyanglou')
WHERE id = 'roof-ranking'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yueyanglou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'foguangsi')
WHERE id = 'wudian-roof'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('foguangsi'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'wudian-roof'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yingxian_muta')
WHERE id = 'dougong'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yingxian_muta'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'foguangsi')
WHERE id = 'dougong'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('foguangsi'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yingxian_muta')
WHERE id = 'dougong-levels'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yingxian_muta'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'foguangsi')
WHERE id = 'dougong-levels'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('foguangsi'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yingxian_muta')
WHERE id = 'goudang'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yingxian_muta'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tiantan')
WHERE id = 'goudang'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tiantan'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tulou')
WHERE id = 'goudang'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tulou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'sumeru'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'sumeru'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'gongmen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'potala')
WHERE id = 'gongmen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('potala'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'menshi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'potala')
WHERE id = 'menshi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('potala'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'screen-wall'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'liulizhaobi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'caihua-hexi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'caihua-hexi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'caihua-xuanzi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'caihua-xuanzi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'sanchaodian'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'potala')
WHERE id = 'sanchaodian'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('potala'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tulou')
WHERE id = 'sanchaodian'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tulou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'qianchaohouqin'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'potala')
WHERE id = 'qianchaohouqin'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('potala'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tulou')
WHERE id = 'qianchaohouqin'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tulou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'gongdian-buju'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'potala')
WHERE id = 'gongdian-buju'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('potala'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tulou')
WHERE id = 'gongdian-buju'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tulou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'huangliuwa'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tiantan')
WHERE id = 'huangliuwa'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tiantan'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'jishou-xianren'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tiantan')
WHERE id = 'jishou-xianren'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tiantan'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'chiwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tiantan')
WHERE id = 'chiwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tiantan'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'longwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'longwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yueyanglou')
WHERE id = 'longwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yueyanglou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'fengwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'fengwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yueyanglou')
WHERE id = 'fengwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yueyanglou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'xiangyunwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'xiangyunwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'yueyanglou')
WHERE id = 'xiangyunwen'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('yueyanglou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'foguangsi')
WHERE id = 'chuchu'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('foguangsi'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'tulou')
WHERE id = 'chuchu'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('tulou'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'caisson'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'mogao')
WHERE id = 'caisson'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('mogao'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'yubaoshi'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));
UPDATE encyclopedia_terms
SET related_palaces = JSON_ARRAY_APPEND(COALESCE(related_palaces, JSON_ARRAY()), '$', 'gugong')
WHERE id = 'xieshan-roof'
  AND NOT JSON_CONTAINS(COALESCE(related_palaces, JSON_ARRAY()), JSON_QUOTE('gugong'));

-- ---------- 4. 题库种子数据 (30道) ----------
INSERT INTO quiz_questions (question, options, correct_answer, explanation, related_term_id, palace_id, difficulty, tags) VALUES
-- 屋顶类 (6题)
('故宫中等级最高的屋顶形式是什么？', '["A: 重檐庑殿顶", "B: 重檐歇山顶", "C: 单檐庑殿顶", "D: 硬山顶"]', 'A', '重檐庑殿顶是中国古代建筑中等级最高的屋顶形式，仅用于皇宫正殿、太庙等最高等级建筑。故宫太和殿即使用此顶。', 'roof-ranking', 'taihedian', 1, '["屋顶","等级"]'),
('歇山顶有几条屋脊？', '["A: 五条", "B: 七条", "C: 九条", "D: 十一条"]', 'C', '歇山顶共有九条脊：一条正脊+四条垂脊+四条戗脊，因此又称"九脊顶"。', 'xieshan-roof', NULL, 2, '["屋顶","结构"]'),
('太和殿使用的是什么屋顶形式？', '["A: 重檐歇山顶", "B: 重檐庑殿顶", "C: 单檐庑殿顶", "D: 单檐歇山顶"]', 'B', '太和殿是故宫中唯一使用重檐庑殿顶的建筑，这是最高等级的屋顶形式，象征皇权至高无上。', 'wudian-roof', 'taihedian', 1, '["屋顶","太和殿"]'),
('故宫中的黄琉璃瓦象征什么？', '["A: 水的力量", "B: 皇权至上", "C: 财富繁荣", "D: 天的庇佑"]', 'B', '黄色在五行中属土，土居中央，黄色也因此成为皇家的专用色。故宫的黄琉璃瓦象征皇权至上。', 'huangliuwa', NULL, 1, '["琉璃","等级"]'),
('太和殿角脊上共有多少只蹲兽？', '["A: 7只", "B: 9只", "C: 10只", "D: 11只"]', 'C', '太和殿角脊上排列10只蹲兽（加骑凤仙人为11尊），是绝无仅有的最高等级。乾清宫9只，坤宁宫7只。', 'jishou-xianren', 'taihedian', 2, '["脊兽","太和殿"]'),
('庑殿顶也被称为什么？', '["A: 九脊顶", "B: 五脊殿", "C: 悬山顶", "D: 攒尖顶"]', 'B', '庑殿顶因有四条垂脊和一条正脊，共五条脊，故又称"五脊殿"。而歇山顶有九条脊，称"九脊顶"。', 'wudian-roof', NULL, 2, '["屋顶","术语"]'),

-- 斗拱类 (4题)
('斗拱中"斗"指的是什么？', '["A: 弓形弯曲木构件", "B: 方形木块承托构件", "C: 斜向下伸出的构件", "D: 纵向伸出的构件"]', 'B', '"斗"是方形木块，用于承托上层构件。"拱"是弓形弯曲木构件，横向伸出。"昂"是斜向下伸出的构件。', 'dougong', NULL, 1, '["斗拱","结构"]'),
('太和殿使用的是什么等级的斗拱？', '["A: 五踩斗拱", "B: 七踩斗拱", "C: 九踩斗拱", "D: 十一踩斗拱"]', 'C', '太和殿使用九踩斗拱（出挑四层），是最高等级的斗拱规制。太和门使用七踩斗拱。', 'dougong-levels', 'taihedian', 1, '["斗拱","太和殿"]'),
('斗拱的抗震原理主要靠什么？', '["A: 铁钉固定", "B: 石材重量", "C: 榫卯节点的弹性变形", "D: 水泥加固"]', 'C', '斗拱通过榫卯节点连接，木材本身具有柔韧性，地震时榫卯节点通过摩擦消耗能量，起到"以柔克刚"的效果。', 'dougong', NULL, 2, '["斗拱","抗震","结构"]'),
('三踩斗拱出挑几层？', '["A: 一层", "B: 两层", "C: 三层", "D: 四层"]', 'A', '三踩斗拱出挑一层，是最低等级的官式建筑斗拱。踩数越高，出挑层数越多，等级越高。踩数 = 出挑层数 × 2 + 1。', 'dougong-levels', NULL, 2, '["斗拱","等级"]'),

-- 彩画类 (4题)
('清代官式建筑中等级最高的彩画类型是什么？', '["A: 旋子彩画", "B: 和玺彩画", "C: 苏式彩画", "D: 云纹彩画"]', 'B', '和玺彩画是清代官式建筑中等级最高的彩画类型，以龙凤纹样为主题，施以沥粉贴金工艺。', 'caihua-hexi', NULL, 1, '["彩画","等级"]'),
('和玺彩画使用什么工艺使线条凸起并有立体感？', '["A: 描金", "B: 涂漆", "C: 沥粉贴金", "D: 雕刻"]', 'C', '沥粉贴金工艺：先用沥粉（桐油调石灰）在彩画表面挤出凸起的线条，再贴上金箔，使彩画在光线下金光灿烂。', 'caihua-hexi', NULL, 2, '["彩画","工艺"]'),
('太和殿使用的是什么类型的和玺彩画？', '["A: 龙凤和玺", "B: 金龙和玺", "C: 龙草和玺", "D: 凤和玺"]', 'B', '太和殿使用的是最高等级的"金龙和玺"，全部以龙纹为主题。中和殿、保和殿则使用"龙凤和玺"。', 'caihua-hexi', 'taihedian', 1, '["彩画","太和殿"]'),
('旋子彩画的主题纹样是什么？', '["A: 龙纹", "B: 凤纹", "C: 旋花纹", "D: 如意纹"]', 'C', '旋子彩画以旋花（团花状几何花纹）为主题纹样。等级次于和玺彩画，广泛应用于次要宫殿和寺庙。', 'caihua-xuanzi', NULL, 1, '["彩画","旋子"]'),

-- 宫殿知识类 (6题)
('故宫外朝三大殿不包括哪座？', '["A: 太和殿", "B: 中和殿", "C: 保和殿", "D: 乾清宫"]', 'D', '外朝三大殿是太和殿、中和殿、保和殿。乾清宫属于内廷（后宫），是皇帝的正寝宫殿。', 'sanchaodian', 'qianqinggong', 1, '["宫殿","外朝"]'),
('乾清门在故宫中有什么特殊意义？', '["A: 故宫正门", "B: 外朝与内廷的分界线", "C: 最高等级的宫门", "D: 皇帝专用的门"]', 'B', '乾清门是前朝（外朝）与后寝（内廷）的分界线。门前是庄重的广场，门后是皇帝和后妃的起居空间。', 'qianchaohouqin', 'qianqingmen', 2, '["宫殿","内廷"]'),
('故宫中轴线长约多少米？', '["A: 约500米", "B: 约700米", "C: 约960米", "D: 约1200米"]', 'C', '故宫中轴线从午门到神武门长约960米，串联所有重要建筑。这条中轴线也向南延伸到永定门，向北延伸到钟鼓楼。', 'gongdian-buju', NULL, 2, '["宫殿","规制"]'),
('故宫的正南门是什么？', '["A: 天安门", "B: 午门", "C: 端门", "D: 神武门"]', 'B', '午门是故宫的正南门，也是故宫的正门。天安门和端门在故宫之外，神武门是故宫的北门。', 'gongmen', 'wumen', 1, '["宫殿","城门"]'),
('交泰殿位于哪两座宫殿之间？', '["A: 太和殿与中和殿之间", "B: 中和殿与保和殿之间", "C: 乾清宫与坤宁宫之间", "D: 坤宁宫与神武门之间"]', 'C', '交泰殿位于乾清宫和坤宁宫之间，是后三宫的中间殿宇。"交泰"寓意天地交合、阴阳和谐。', 'qianchaohouqin', 'jiaotaidian', 2, '["宫殿","内廷"]'),
('故宫中唯一使用重檐庑殿顶的建筑是哪座？', '["A: 太和门", "B: 太和殿", "C: 乾清宫", "D: 午门"]', 'B', '太和殿是故宫中唯一使用重檐庑殿顶的建筑。乾清宫使用单檐庑殿顶，午门使用重檐歇山顶。', 'wudian-roof', 'taihedian', 1, '["宫殿","屋顶","太和殿"]'),

-- 历史沿革类 (5题)
('故宫始建于哪一年？', '["A: 1406年", "B: 1420年", "C: 1644年", "D: 1368年"]', 'A', '故宫始建于明永乐四年（1406年），建成于明永乐十八年（1420年），历时14年。', NULL, NULL, 1, '["历史","明代"]'),
('故宫历时多少年建成？', '["A: 10年", "B: 14年", "C: 18年", "D: 20年"]', 'B', '故宫自明永乐四年（1406年）开始建设，至明永乐十八年（1420年）建成，历时14年。', NULL, NULL, 2, '["历史","明代"]'),
('哪位皇帝下令营建北京故宫？', '["A: 明太祖朱元璋", "B: 明成祖朱棣", "C: 清太祖努尔哈赤", "D: 康熙帝"]', 'B', '明成祖朱棣（永乐帝）于1406年下令营建北京宫殿，即今故宫。1421年正式迁都北京。', NULL, NULL, 1, '["历史","明代","皇帝"]'),
('"样式雷"家族在故宫建设中的作用是什么？', '["A: 负责财务", "B: 担任建筑设计师", "C: 负责建材运输", "D: 担任监工"]', 'B', '"样式雷"家族是清代著名的建筑世家，主持设计了清代大量皇家建筑。他们使用"烫样"（建筑模型）向皇帝展示设计方案。', NULL, NULL, 3, '["历史","清代","建筑师"]'),
('故宫博物院的成立年份是哪一年？', '["A: 1911年", "B: 1925年", "C: 1949年", "D: 1900年"]', 'B', '1925年10月10日，故宫博物院正式成立。此前，末代皇帝溥仪于1924年被逐出紫禁城。', NULL, NULL, 1, '["历史","博物院"]'),

-- 建筑装饰类 (5题)
('太和殿藻井中雕刻的是什么形象？', '["A: 凤凰展翅", "B: 盘龙含珠", "C: 狮子戏球", "D: 仙鹤朝阳"]', 'B', '太和殿藻井顶部雕刻盘龙含珠，龙口衔轩辕镜（铜珠），传说可以分辨真假天子。', 'caisson', 'taihedian', 2, '["藻井","太和殿","装饰"]'),
('故宫三大殿台基边缘的排水口被雕刻成什么形状？', '["A: 龙头（螭首）", "B: 鱼形", "C: 龟形", "D: 狮头"]', 'A', '台基边缘的排水口雕刻成龙首形状，称为"螭首"。雨天时，千余只螭首同时排水，形成"千龙吐水"的壮观景象。', 'yubaoshi', 'taihedian', 2, '["石雕","排水","太和殿"]'),
('五爪龙纹在明清时期由谁专用？', '["A: 所有官员", "B: 亲王和皇帝", "C: 仅皇帝", "D: 所有皇室成员"]', 'C', '五爪龙纹为皇帝专用，亲王只能使用四爪龙纹（蟒纹）。这是明清时期严格的服飾和装饰等级制度。', 'longwen', NULL, 1, '["纹饰","龙纹","等级"]'),
('照壁的风水功能是什么？', '["A: 增强采光", "B: 挡煞聚气", "C: 增加通风", "D: 加固建筑"]', 'B', '照壁在风水学中被称为"隐避"，可以挡住直冲而来的"煞气"，使气流回旋后再进入院内，有"挡煞聚气"的功能。', 'screen-wall', NULL, 2, '["风水","照壁","装饰"]'),
('中国古代木结构建筑的核心连接技术是什么？', '["A: 铁钉连接", "B: 榫卯结构", "C: 胶水粘合", "D: 绳索捆绑"]', 'B', '榫卯结构是中国古代木结构建筑的核心连接技术。利用木材本身的弹性变形，将榫头插入卯眼中形成牢固的连接，不用一根钉子。', 'goudang', NULL, 1, '["结构","榫卯","技术"]');
-- ==================== 公开迁移 03：收藏时间戳与积分流水 ====================
-- 与 migration_public_03_collections.sql 保持同结构，便于空库一次性初始化

SET @has_updated_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_collections'
    AND column_name = 'updated_at'
);
SET @sql := IF(
  @has_updated_at = 0,
  'ALTER TABLE user_collections ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE user_collections SET category = '默认' WHERE category IS NULL OR category = '';

ALTER TABLE user_collections
  MODIFY COLUMN category VARCHAR(20) NOT NULL DEFAULT '默认';

CREATE TABLE IF NOT EXISTS user_points_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  source_key VARCHAR(64) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_source (user_id, source_type, source_key),
  INDEX idx_user_time (user_id, created_at),
  CONSTRAINT fk_points_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ==================== 公开迁移 04：集章表与徽章阈值 ====================

CREATE TABLE IF NOT EXISTS user_stamps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  palace_id VARCHAR(50) NOT NULL,
  palace_name_snapshot VARCHAR(100),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_palace (user_id, palace_id),
  INDEX idx_user_time (user_id, earned_at),
  CONSTRAINT fk_stamps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE badges
SET condition_value = 20,
    description = '探访全部建筑'
WHERE condition_type = 'palaces_viewed';

SET @has_history_idx := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_history'
    AND index_name = 'idx_user_palace'
);
SET @sql := IF(
  @has_history_idx = 0,
  'ALTER TABLE user_history ADD INDEX idx_user_palace (user_id, palace_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ==================== 公开迁移 05：分享回流聚合 ====================

CREATE TABLE IF NOT EXISTS share_visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(16) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  channel VARCHAR(16) NOT NULL DEFAULT 'unknown',
  visit_date DATE NOT NULL,
  referer_class VARCHAR(32) NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_entity_channel_date (entity_type, entity_id, channel, visit_date),
  INDEX idx_date (visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ==================== 公开迁移 06：热门搜索词 ====================

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

-- ==================== 公开迁移 11：个性化推荐 ====================

SET @has_pref := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'personalization_enabled'
);
SET @sql := IF(
  @has_pref = 0,
  'ALTER TABLE users ADD COLUMN personalization_enabled TINYINT(1) DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE user_recommendations MODIFY COLUMN route_id VARCHAR(50) NULL;

SET @has_item_type := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'item_type'
);
SET @sql := IF(
  @has_item_type = 0,
  "ALTER TABLE user_recommendations ADD COLUMN item_type VARCHAR(16) DEFAULT 'palace'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_item_id := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'item_id'
);
SET @sql := IF(
  @has_item_id = 0,
  'ALTER TABLE user_recommendations ADD COLUMN item_id VARCHAR(64) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_reason := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'reason_code'
);
SET @sql := IF(
  @has_reason = 0,
  'ALTER TABLE user_recommendations ADD COLUMN reason_code VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_clicked := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'is_clicked'
);
SET @sql := IF(
  @has_clicked = 0,
  'ALTER TABLE user_recommendations ADD COLUMN is_clicked TINYINT(1) DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_clicked_at := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_recommendations'
    AND column_name = 'clicked_at'
);
SET @sql := IF(
  @has_clicked_at = 0,
  'ALTER TABLE user_recommendations ADD COLUMN clicked_at TIMESTAMP NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ==================== 公开迁移 09：双语内容 ====================

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
-- ==================== 公开迁移 13：热点已读 ====================

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
-- ==================== 公开迁移 08：导览音频元数据 ====================

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
-- ==================== 公开迁移 12：发布状态与草稿隔离 ====================

SET @has_status := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'palaces'
    AND column_name = 'status'
);
SET @sql := IF(
  @has_status = 0,
  "ALTER TABLE palaces ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'published'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE palaces SET status = 'published' WHERE status IS NULL OR status = '';

SET @has_status_idx := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'palaces'
    AND index_name = 'idx_palaces_status'
);
SET @sql := IF(
  @has_status_idx = 0,
  'ALTER TABLE palaces ADD INDEX idx_palaces_status (status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ==================== 公开迁移 10：匿名埋点 ====================

CREATE TABLE IF NOT EXISTS metrics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(32) NOT NULL,
  entity_type VARCHAR(16) DEFAULT NULL,
  entity_id VARCHAR(64) DEFAULT NULL,
  anon_hash CHAR(64) DEFAULT NULL,
  session_hash CHAR(64) DEFAULT NULL,
  locale VARCHAR(10) DEFAULT NULL,
  tier VARCHAR(16) DEFAULT NULL,
  path VARCHAR(255) DEFAULT NULL,
  props JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name_time (event_name, created_at),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_analytics := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users'
    AND column_name = 'analytics_enabled'
);
SET @sql := IF(
  @has_analytics = 0,
  'ALTER TABLE users ADD COLUMN analytics_enabled TINYINT(1) DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ==================== 公开迁移 14：答题事实与排行 ====================

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

-- ==================== 迁移 15 等价段：课堂模式偏好 ====================
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


-- ---------- 迁移16英文译稿（content_translations） ----------
INSERT INTO content_translations (entity_type, entity_id, field, locale, value, status)
VALUES
('term', 'changcheng-wall', 'term', 'en', 'The Great Wall: Walls and Beacon System Shaped by Terrain', 'full'),
('term', 'changcheng-wall', 'synopsis', 'en', 'The Great Wall is a linear defense system of walls, passes and beacon towers laid out along ridges and valleys. Its alignment follows the terrain, while rammed earth, stone and brick are chosen according to local materials and defensive priority.', 'full'),
('term', 'gugong-axis', 'term', 'en', 'The Forbidden City: Axial Order and the Three Courts and Five Gates', 'full'),
('term', 'gugong-axis', 'synopsis', 'en', 'The Forbidden City is organized along a north–south axis that sequences gates, courtyards and halls into a ritual progression. The Three Courts and Five Gates system encodes hierarchy into spatial thresholds, while the front-court and rear-palace division separates public ceremony from daily life.', 'full'),
('term', 'huanghelou-eaves', 'term', 'en', 'Yellow Crane Tower: Tiered Eaves and a History of Rebuilding', 'full'),
('term', 'huanghelou-eaves', 'synopsis', 'en', 'Yellow Crane Tower is a multi-storey riverside pavilion known for its tiered eaves and upturned corners. The present structure is a modern reconstruction, yet its stacked roofs and deep overhangs continue the traditional image of a Jiangnan tower that has been repeatedly destroyed and rebuilt.', 'full'),
('term', 'mogao-cliff', 'term', 'en', 'Mogao Caves: Cliff Excavation, Murals and Painted Sculpture', 'full'),
('term', 'mogao-cliff', 'synopsis', 'en', 'The Mogao Caves are a cliff-cut monastery complex in Dunhuang, developed from the sixteenth century onward across successive dynasties. Cave chambers were excavated into the rock, then finished with wooden cave porches, murals and painted sculpture to form complete ritual spaces.', 'full'),
('term', 'potala-fortress', 'term', 'en', 'Potala Palace: A Fortress-Palace Built into the Mountain', 'full'),
('term', 'potala-fortress', 'synopsis', 'en', 'The Potala Palace rises on the Red Hill in Lhasa as a fortress-palace complex. Its terraced massing, tapered walls and layered courtyards combine palace, temple and defensive functions, using stone and rammed earth to suit the high-altitude climate.', 'full'),
('term', 'tiantan-eaves', 'term', 'en', 'Temple of Heaven: The Triple-Eaved Hall of Prayer for Good Harvests', 'full'),
('term', 'tiantan-eaves', 'synopsis', 'en', 'The Temple of Heaven is a Ming–Qing ritual complex centered on the Hall of Prayer for Good Harvests, the Circular Mound Altar and the Imperial Vault of Heaven. Circular plans, blue glazed tiles and concentric column rings translate the cosmology of heaven and earth into architecture.', 'full'),
('term', 'tulou-earthen', 'term', 'en', 'Fujian Tulou: Rammed-Earth Enclosure and Communal Living', 'full'),
('term', 'tulou-earthen', 'synopsis', 'en', 'Fujian Tulou are large communal dwellings built of rammed earth, often circular or square in plan. Thick tapered walls enclose a central courtyard, combining load bearing, thermal mass and defense, while inner corridors and stairs support collective clan life.', 'full'),
('term', 'yingxian-bracket', 'term', 'en', 'Yingxian Wooden Pagoda: Five Visible and Four Hidden Storeys', 'full'),
('term', 'yingxian-bracket', 'synopsis', 'en', 'The Yingxian Wooden Pagoda is the oldest surviving all-timber pagoda in China, built in the Liao dynasty. Its “five visible, four hidden” storeys add concealed structural levels for stiffness, while dense bracket sets and mortise-and-tenon joints resist earthquakes.', 'full'),
('term', 'foguangsi-eave', 'term', 'en', 'Foguang Temple Main Hall: Seven-Puzuo Brackets and Deep Eaves', 'full'),
('term', 'foguangsi-eave', 'synopsis', 'en', 'The main hall of Foguang Temple is a key Tang-dynasty timber structure. Large seven-puzuo bracket sets support deep eaves, and the robust columns and simple interior frame create a powerful, uncluttered hall that documents Tang construction.', 'full'),
('term', 'yueyanglou-helmet', 'term', 'en', 'Yueyang Tower: Three Storeys, Triple Eaves and a Helmet Roof', 'full'),
('term', 'yueyanglou-helmet', 'synopsis', 'en', 'Yueyang Tower stands by Dongting Lake as one of the famous towers of Jiangnan. Its three storeys with triple eaves rise to a distinctive four-cornered helmet roof, a local variation that gives the tower a crown-like silhouette suited to its lakeside setting.', 'full'),
('term', 'hangtu', 'term', 'en', 'Rammed-Earth Construction (Hangtu)', 'full'),
('term', 'hangtu', 'synopsis', 'en', 'Rammed-earth construction compacts soil in formwork, layer by layer, to create load-bearing walls. Widely used for city walls, tulou and fortress-palaces, it relies on local soils and careful moisture control, and performs well in thermal mass but needs protection from water.', 'full'),
('term', 'fengsui', 'term', 'en', 'Beacon Towers and Pass Fortresses', 'full'),
('term', 'fengsui', 'synopsis', 'en', 'Beacon towers and pass fortresses turn a linear wall into a responsive defense system. Beacon towers relay signals along intervisible ridges, while passes control roads and rivers with gates, garrisons and administrative functions, forming a layered network of walls, posts and garrison towns.', 'full'),
('term', 'shiqiang', 'term', 'en', 'Stone and Brick Masonry', 'full'),
('term', 'shiqiang', 'synopsis', 'en', 'Stone and brick masonry builds walls, platforms and vaults from dressed blocks or bricks laid in bonded courses. Offset joints distribute loads, while mixed stone-and-brick construction assigns durable stone to foundations and facing and regular brick to wall bodies and openings.', 'full'),
('term', 'yabi-kaizao', 'term', 'en', 'Cliff Cave Excavation', 'full'),
('term', 'yabi-kaizao', 'synopsis', 'en', 'Cliff cave excavation creates cave temples by cutting chambers directly into rock. Builders first open a doorway and corridor, then hollow out the cave, choosing vault forms such as flat, truncated-pyramid or central-pillar types, often adding wooden porches to protect the opening.', 'full'),
('term', 'bihua-caisu', 'term', 'en', 'Murals and Painted Sculpture', 'full'),
('term', 'bihua-caisu', 'synopsis', 'en', 'Murals and painted sculpture turn structural surfaces into narrative interfaces in cave temples and halls. Murals rely on prepared ground layers and mineral pigments, while painted sculpture uses wooden armatures, clay modeling and polychrome finishing to occupy the visual center of the ritual space.', 'full'),
('term', 'feiyan', 'term', 'en', 'Flying Eaves and Upturned Corners', 'full'),
('term', 'feiyan', 'synopsis', 'en', 'Flying eaves and upturned corners are the raised, projecting edges of traditional Chinese roofs. Deep overhangs protect walls from sun and rain, while upturned corner rafters lift the roof visually; the two together produce the characteristic light, soaring roof profile.', 'full'),
('term', 'yuanxing-weiyuan', 'term', 'en', 'Circular Enclosure', 'full'),
('term', 'yuanxing-weiyuan', 'synopsis', 'en', 'Circular enclosure arranges rooms continuously around a central courtyard, producing an inward-facing plan. Outer walls close the dwelling to the outside, inner corridors and stairs serve circulation and communal life, and the courtyard provides light, ventilation and shared space, as seen in Fujian tulou.', 'full')
ON DUPLICATE KEY UPDATE value = value;
