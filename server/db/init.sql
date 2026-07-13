-- AC4 故宫可视化系统 - 数据库初始化脚本
-- Charset: utf8mb4

CREATE DATABASE IF NOT EXISTS ac4_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ac4_db;

-- 宫殿主表
DROP TABLE IF EXISTS palace_fun_facts;
DROP TABLE IF EXISTS palace_timeline;
DROP TABLE IF EXISTS palace_images;
DROP TABLE IF EXISTS palaces;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category),
  INDEX idx_dynasty (dynasty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 图片表
CREATE TABLE palace_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 时间线表
CREATE TABLE palace_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  year VARCHAR(20) NOT NULL,
  event TEXT NOT NULL,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 趣味典故表
CREATE TABLE palace_fun_facts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  palace_id VARCHAR(50) NOT NULL,
  fact TEXT NOT NULL,
  FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE,
  INDEX idx_palace (palace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 种子数据 ====================

-- 1. 午门
INSERT INTO palaces VALUES
('wumen', '午门', 'Meridian Gate', 1, 0,
 '故宫的正南门,是故宫的正门,始建于明永乐十八年(1420年),是中国现存最大的宫门',
 '明永乐年间', '1420', '37.95米', '约2500平方米', '凹字形城楼',
 '故宫正门,颁诏之地',
 'models/forbidden-city/wumen.glb',
 '午门是故宫的正门,始建于1420年,高37.95米,是中国现存最大的宫门。每逢皇帝出郊祭祀或大典,都要从午门出入。',
 0, NULL, '关隘');

INSERT INTO palace_images VALUES
(1, 'wumen', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'wumen', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'wumen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'wumen', '1420', '午门建成,作为紫禁城的正门'),
(2, 'wumen', '1644', '李自成攻入北京,从午门进入紫禁城'),
(3, 'wumen', '1925', '故宫博物院成立,午门成为入口'),
(4, 'wumen', '2019', '午门城楼举办"千秋佳节"展览');

INSERT INTO palace_fun_facts VALUES
(1, 'wumen', '午门并非只有五个门洞,实际有三个门洞和两个掖门,共五个入口'),
(2, 'wumen', '古代"推出午门斩首"的说法并不准确,午门是颁诏之地,并非刑场'),
(3, 'wumen', '午门城楼上的钟楼和鼓楼在重大典礼时会鸣响');

-- 2. 太和门
INSERT INTO palaces VALUES
('taihemen', '太和门', 'Gate of Supreme Harmony', 2, 1,
 '故宫外朝的正门,是紫禁城内最大的宫门,始建于明永乐十八年(1420年)',
 '明永乐年间', '1420', '23.8米', '约1300平方米', '重檐歇山顶',
 '外朝正门,御门听政之地',
 'models/forbidden-city/taihemen.glb',
 '太和门是故宫外朝的正门,高23.8米,是紫禁城内最大的宫门。清代皇帝曾在此御门听政,接见群臣。',
 0, NULL, '关隘');

INSERT INTO palace_images VALUES
(1, 'taihemen', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'taihemen', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'taihemen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'taihemen', '1420', '太和门初建,原名奉天门'),
(2, 'taihemen', '1557', '改名皇极门'),
(3, 'taihemen', '1645', '清顺治帝改名太和门'),
(4, 'taihemen', '1888', '光绪年间火灾后重建');

INSERT INTO palace_fun_facts VALUES
(1, 'taihemen', '太和门前的铜狮是紫禁城内最大的铜狮'),
(2, 'taihemen', '清代皇帝曾在太和门"御门听政",即在此接见群臣处理朝政'),
(3, 'taihemen', '光绪大婚时,太和门曾遭火灾,扎彩匠用芦席扎成假太和门以假乱真');

-- 3. 太和殿
INSERT INTO palaces VALUES
('taihedian', '太和殿', 'Hall of Supreme Harmony', 3, 2,
 '又称"金銮宝殿",是故宫中等级最高的建筑,皇帝举行重大典礼的场所',
 '明永乐年间', '1420', '35.05米', '2377平方米', '重檐庑殿顶,十一开间',
 '举行登基、大婚、命将出征等重大典礼',
 'models/forbidden-city/taihedian.glb',
 '太和殿又称金銮宝殿,高35.05米,面积2377平方米,是故宫中等级最高的建筑。皇帝登基、大婚、命将出征等重大典礼都在此举行。',
 0, NULL, '宫殿');

INSERT INTO palace_images VALUES
(1, 'taihedian', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'taihedian', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'taihedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'taihedian', '1420', '太和殿初建,原名奉天殿'),
(2, 'taihedian', '1695', '康熙年间重建,改名太和殿'),
(3, 'taihedian', '1915', '袁世凯称帝,在太和殿举行登基大典'),
(4, 'taihedian', '2008', '太和殿完成大规模修缮,重新对外开放');

INSERT INTO palace_fun_facts VALUES
(1, 'taihedian', '太和殿屋脊上有10个脊兽,是中国古建筑中脊兽数量最多的'),
(2, 'taihedian', '太和殿内的龙椅上方悬挂着"建极绥猷"匾额,为乾隆帝御笔'),
(3, 'taihedian', '太和殿前有三层汉白玉须弥座台基,高8.13米'),
(4, 'taihedian', '太和殿并非"金銮殿",民间俗称金銮殿,但正式名称一直是太和殿');

-- 4. 中和殿
INSERT INTO palaces VALUES
('zhonghedian', '中和殿', 'Hall of Central Harmony', 4, 3,
 '位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方',
 '明永乐年间', '1420', '约23米', '约580平方米', '单檐四角攒尖顶',
 '大典前休息、演习礼仪',
 'models/forbidden-city/zhonghedian.glb',
 '中和殿位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方,平面呈正方形,在故宫中较为独特。',
 0, NULL, '宫殿');

INSERT INTO palace_images VALUES
(1, 'zhonghedian', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'zhonghedian', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'zhonghedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'zhonghedian', '1420', '中和殿初建,原名华盖殿'),
(2, 'zhonghedian', '1562', '改名中极殿'),
(3, 'zhonghedian', '1645', '清顺治帝改名中和殿'),
(4, 'zhonghedian', '1765', '乾隆年间重修');

INSERT INTO palace_fun_facts VALUES
(1, 'zhonghedian', '中和殿平面呈正方形,在故宫中较为独特'),
(2, 'zhonghedian', '皇帝在此接受执事官员的朝拜,并审阅奏章'),
(3, 'zhonghedian', '殿内保存有乾隆帝御笔"允执厥中"匾额');

-- 5. 保和殿
INSERT INTO palaces VALUES
('baohedian', '保和殿', 'Hall of Preserving Harmony', 5, 4,
 '故宫外朝三大殿之一,明代用于皇帝更衣,清代用于举行宴会和殿试',
 '明永乐年间', '1420', '约29.5米', '约1240平方米', '重檐歇山顶,九开间',
 '举行宴会、殿试科举',
 'models/forbidden-city/baohedian.glb',
 '保和殿是故宫外朝三大殿之一,清代用于举行宴会和殿试。殿后的云龙石雕重达200多吨,是紫禁城内最大的石雕。',
 0, NULL, '宫殿');

INSERT INTO palace_images VALUES
(1, 'baohedian', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'baohedian', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'baohedian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'baohedian', '1420', '保和殿初建,原名谨身殿'),
(2, 'baohedian', '1562', '改名建极殿'),
(3, 'baohedian', '1645', '清顺治帝改名保和殿'),
(4, 'baohedian', '1789', '乾隆帝将殿试移至保和殿');

INSERT INTO palace_fun_facts VALUES
(1, 'baohedian', '保和殿后的云龙石雕是紫禁城内最大的一块石雕,重达200多吨'),
(2, 'baohedian', '清代殿试(科举考试最高级别)在此举行,状元、榜眼、探花由此诞生'),
(3, 'baohedian', '每年除夕、元宵,皇帝在此宴请少数民族首领和王公大臣');

-- 6. 乾清门
INSERT INTO palaces VALUES
('qianqingmen', '乾清门', 'Gate of Heavenly Purity', 6, 5,
 '故宫内廷的正门,是外朝与内廷的分界线',
 '明永乐年间', '1420', '约16米', '约600平方米', '单檐歇山顶',
 '内廷正门,外朝与内廷分界',
 'models/forbidden-city/qianqingmen.glb',
 '乾清门是故宫内廷的正门,高约16米,是外朝与内廷的分界线。清代皇帝曾在此御门听政,处理朝政。',
 0, NULL, '关隘');

INSERT INTO palace_images VALUES
(1, 'qianqingmen', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'qianqingmen', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'qianqingmen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'qianqingmen', '1420', '乾清门初建'),
(2, 'qianqingmen', '1655', '清顺治年间重修'),
(3, 'qianqingmen', '1813', '天理教起义,曾攻入乾清门'),
(4, 'qianqingmen', '2010', '完成修缮,恢复历史风貌');

INSERT INTO palace_fun_facts VALUES
(1, 'qianqingmen', '乾清门是皇帝"御门听政"的场所之一'),
(2, 'qianqingmen', '门前的琉璃影壁是故宫内最具特色的建筑之一'),
(3, 'qianqingmen', '乾清门是外朝和内廷的分界线,文武官员非召不得入内');

-- 7. 乾清宫
INSERT INTO palaces VALUES
('qianqinggong', '乾清宫', 'Palace of Heavenly Purity', 7, 6,
 '内廷后三宫之首,明代皇帝的寝宫,清代改为处理日常政务和接见臣工的地方',
 '明永乐年间', '1420', '约20米', '约1400平方米', '重檐庑殿顶,九开间',
 '明代皇帝寝宫,清代理政之所',
 'models/forbidden-city/qianqinggong.glb',
 '乾清宫是内廷后三宫之首,明代皇帝寝宫,清代改为处理日常政务之所。殿内高悬"正大光明"匾,背后曾是存放秘密立储诏书的地方。',
 1, 'videos/forbidden-city/qiangqinggong_growth.mp4', '宫殿');

INSERT INTO palace_images VALUES
(1, 'qianqinggong', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'qianqinggong', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'qianqinggong', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'qianqinggong', '1420', '乾清宫初建'),
(2, 'qianqinggong', '1514', '明正德年间大火,后重建'),
(3, 'qianqinggong', '1669', '康熙帝重建乾清宫'),
(4, 'qianqinggong', '1798', '嘉庆年间重修,沿用至今'),
(5, 'qianqinggong', '2020', '举办"往昔世相"故宫珍本古籍展');

INSERT INTO palace_fun_facts VALUES
(1, 'qianqinggong', '乾清宫正殿高悬"正大光明"匾,康熙帝御笔,背后曾是存放秘密立储诏书的地方'),
(2, 'qianqinggong', '明代有14位皇帝在此居住和处理朝政'),
(3, 'qianqinggong', '清代自雍正起,皇帝移居养心殿,乾清宫改为举行内廷典礼之所'),
(4, 'qianqinggong', '乾清宫前的月台上陈列有日晷和嘉量,象征皇帝掌握时间和度量衡');

-- 8. 交泰殿
INSERT INTO palaces VALUES
('jiaotaidian', '交泰殿', 'Hall of Union', 8, 7,
 '位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方',
 '明永乐年间', '1420', '约17米', '约400平方米', '单檐四角攒尖顶',
 '存放宝玺、举行婚礼',
 'models/forbidden-city/jiaotaidian.glb',
 '交泰殿位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方。殿内存放着清代二十五方宝玺,象征皇权。',
 0, NULL, '宫殿');

INSERT INTO palace_images VALUES
(1, 'jiaotaidian', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'jiaotaidian', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'jiaotaidian', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'jiaotaidian', '1420', '交泰殿初建'),
(2, 'jiaotaidian', '1798', '嘉庆年间重修'),
(3, 'jiaotaidian', '1908', '宣统帝大婚在此举行'),
(4, 'jiaotaidian', '2019', '修复完成,对外开放');

INSERT INTO palace_fun_facts VALUES
(1, 'jiaotaidian', '交泰殿内存放着清代二十五方宝玺,象征皇权'),
(2, 'jiaotaidian', '殿内还有一座铜壶滴漏,是古代计时器'),
(3, 'jiaotaidian', '皇帝大婚时,皇后要在此接受册宝');

-- 9. 坤宁宫
INSERT INTO palaces VALUES
('kunninggong', '坤宁宫', 'Palace of Earthly Tranquility', 9, 8,
 '内廷后三宫之一,明代是皇后的寝宫,清代改为萨满教祭祀和皇帝大婚的场所',
 '明永乐年间', '1420', '约20米', '约1300平方米', '重檐庑殿顶,九开间',
 '明代皇后寝宫,清代祭祀和大婚之所',
 'models/forbidden-city/kunninggong.glb',
 '坤宁宫是内廷后三宫之一,明代皇后寝宫,清代改为萨满教祭祀和皇帝大婚的场所。殿内设有祭神的大锅,是满族特色的体现。',
 0, NULL, '宫殿');

INSERT INTO palace_images VALUES
(1, 'kunninggong', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'kunninggong', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'kunninggong', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'kunninggong', '1420', '坤宁宫初建'),
(2, 'kunninggong', '1655', '清顺治年间改建为萨满祭祀场所'),
(3, 'kunninggong', '1674', '康熙帝大婚在此举行'),
(4, 'kunninggong', '1922', '溥仪大婚,是最后一次在坤宁宫举行的皇家婚礼');

INSERT INTO palace_fun_facts VALUES
(1, 'kunninggong', '坤宁宫在清代被改建为萨满教祭祀场所,殿内设有祭神的大锅'),
(2, 'kunninggong', '清代皇帝大婚时,洞房设在坤宁宫东暖阁'),
(3, 'kunninggong', '光绪帝和溥仪大婚时都在坤宁宫举行了隆重仪式'),
(4, 'kunninggong', '坤宁宫与乾清宫对应,乾为阳,坤为阴,象征天地');

-- 10. 神武门
INSERT INTO palaces VALUES
('shenwumen', '神武门', 'Gate of Divine Might', 10, 9,
 '故宫的北门,始建于明永乐十八年(1420年),是故宫的出口',
 '明永乐年间', '1420', '31.6米', '约1500平方米', '重檐庑殿顶城楼',
 '故宫北门,皇帝出巡、选秀女出入之门',
 'models/forbidden-city/shenwumen.glb',
 '神武门是故宫的北门,高31.6米,原名玄武门,因避康熙帝名讳改名。清代选秀女时,秀女们从此门进入紫禁城。',
 0, NULL, '关隘');

INSERT INTO palace_images VALUES
(1, 'shenwumen', 'images/forbidden-city/general-1.png.jpeg', 1),
(2, 'shenwumen', 'images/forbidden-city/general-2.png.jpeg', 2),
(3, 'shenwumen', 'images/forbidden-city/general-3.png.jpeg', 3);

INSERT INTO palace_timeline VALUES
(1, 'shenwumen', '1420', '神武门初建,原名玄武门'),
(2, 'shenwumen', '1683', '清康熙年间改名神武门'),
(3, 'shenwumen', '1925', '故宫博物院成立,神武门成为主要出口'),
(4, 'shenwumen', '2015', '神武门完成修缮');

INSERT INTO palace_fun_facts VALUES
(1, 'shenwumen', '神武门原名玄武门,因避康熙帝玄烨名讳而改名神武门'),
(2, 'shenwumen', '清代选秀女时,秀女们从神武门进入紫禁城'),
(3, 'shenwumen', '皇帝出巡时也从神武门出入'),
(4, 'shenwumen', '神武门城楼上设有钟表,是故宫的报时中心');
