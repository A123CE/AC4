-- ============================================================
-- 迁移 07 · 主题导览路线
-- rollback: DROP TABLE user_route_progress; DROP TABLE route_stops;
--           DROP TABLE curated_routes;
-- ============================================================

CREATE TABLE IF NOT EXISTS curated_routes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  cover_path VARCHAR(255),
  duration_minutes INT DEFAULT 60,
  difficulty VARCHAR(16) DEFAULT 'easy',
  sort_order INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id VARCHAR(50) NOT NULL,
  palace_id VARCHAR(50) NOT NULL,
  stop_order INT NOT NULL,
  highlight VARCHAR(255),
  stay_minutes INT DEFAULT 10,
  UNIQUE KEY uk_route_order (route_id, stop_order),
  UNIQUE KEY uk_route_palace (route_id, palace_id),
  CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES curated_routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_stops_palace FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_route_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  route_id VARCHAR(50) NOT NULL,
  stop_order INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_route (user_id, route_id),
  CONSTRAINT fk_route_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO curated_routes
  (id, name, name_en, description, cover_path, duration_minutes, difficulty, sort_order, is_published)
VALUES
  (
    'axis-day',
    '中轴线一日',
    'One Day on the Central Axis',
    '沿紫禁城中轴线由南向北，依次走过午门、三大殿与后三宫，用一天读懂皇家建筑的秩序与礼制。',
    'posters/forbidden-city/wumen.png',
    240,
    'easy',
    1,
    1
  );

INSERT IGNORE INTO route_stops
  (route_id, palace_id, stop_order, highlight, stay_minutes)
VALUES
  ('axis-day', 'wumen', 1, '午门五凤楼与雁翅楼', 15),
  ('axis-day', 'taihemen', 2, '太和门铜狮与金水河', 10),
  ('axis-day', 'taihedian', 3, '三大殿之首与屋脊兽', 30),
  ('axis-day', 'zhonghedian', 4, '方形中和大殿', 10),
  ('axis-day', 'baohedian', 5, '殿试与云龙石雕', 15),
  ('axis-day', 'qianqingmen', 6, '内廷正门', 10),
  ('axis-day', 'qianqinggong', 7, '皇帝正寝', 20),
  ('axis-day', 'kunninggong', 8, '中宫与萨满祭祀', 15);