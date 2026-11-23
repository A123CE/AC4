-- ============================================================
-- 迁移脚本: 华夏名筑扩展 — 整合 7 座全国古建筑
-- 执行方式: mysql -u root -p ac4_db < server/db/migration_national_monuments.sql
-- 说明: 幂等设计, 可重复执行; 不影响现有故宫 10 座建筑数据
-- ============================================================

USE ac4_db;

-- ---------- 1. palaces 表新增字段(兼容现有数据) ----------
ALTER TABLE palaces
  ADD COLUMN region VARCHAR(50) COMMENT '所在地区' AFTER category,
  ADD COLUMN city VARCHAR(50) COMMENT '所在城市/地点' AFTER region,
  ADD COLUMN tagline VARCHAR(200) COMMENT '一句话副标题' AFTER city,
  ADD COLUMN quote TEXT COMMENT '经典诗句/文献引用' AFTER tagline,
  ADD COLUMN quote_by VARCHAR(100) COMMENT '诗句出处' AFTER quote,
  ADD COLUMN tags VARCHAR(255) COMMENT '标签(逗号分隔)' AFTER quote_by,
  ADD COLUMN stats VARCHAR(500) COMMENT '关键数据 JSON: [["72 万㎡","占地"],...]' AFTER tags,
  ADD COLUMN poster_path VARCHAR(255) COMMENT '海报图路径' AFTER stats,
  ADD COLUMN views_data TEXT COMMENT '四视图 JSON: [{src,zh,en},...]' AFTER poster_path,
  ADD COLUMN camera_preset VARCHAR(255) COMMENT '相机预设 JSON: {theta,phi,radius,target}' AFTER views_data;

-- ---------- 2. 插入 7 座华夏名筑 ----------
INSERT INTO palaces
  (id, name, name_en, order_num, axis_position, description, dynasty, built_year,
   height, area, style, significance, model_path, category,
   region, city, tagline, quote, quote_by, tags, stats, poster_path, views_data, camera_preset)
VALUES
  -- 长城
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

  -- 故宫全景
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

  -- 黄鹤楼
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

  -- 莫高窟
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

  -- 布达拉宫
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

  -- 天坛
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

  -- 福建土楼
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
   '{"theta":0,"phi":1.40,"radius":3.6,"target":[0,0.15,0]}')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), name_en = VALUES(name_en), description = VALUES(description),
  dynasty = VALUES(dynasty), built_year = VALUES(built_year), height = VALUES(height),
  area = VALUES(area), style = VALUES(style), significance = VALUES(significance),
  model_path = VALUES(model_path), category = VALUES(category),
  region = VALUES(region), city = VALUES(city), tagline = VALUES(tagline),
  quote = VALUES(quote), quote_by = VALUES(quote_by), tags = VALUES(tags),
  stats = VALUES(stats), poster_path = VALUES(poster_path),
  views_data = VALUES(views_data), camera_preset = VALUES(camera_preset);
