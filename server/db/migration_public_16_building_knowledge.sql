-- ============================================================
-- 迁移 16 · 建筑知识双主轴（建筑专属词条 + 通用术语关联）
-- 口径：只增列/只增索引/只增词条/只追加关联，不改既有 26 条正文
-- rollback: 见 rollback_public_16_building_knowledge.sql
-- ============================================================

SET @has_entry_type := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND column_name = 'entry_type'
);
SET @sql := IF(
  @has_entry_type = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN entry_type VARCHAR(16) NOT NULL DEFAULT ''craft''',
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
  @has_status = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''published''',
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
  @has_primary_palace_id = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN primary_palace_id VARCHAR(64) DEFAULT NULL',
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
  @has_knowledge_dimensions = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN knowledge_dimensions JSON DEFAULT NULL',
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
  @has_source_refs = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN source_refs JSON DEFAULT NULL',
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
  @has_image_credits = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN image_credits JSON DEFAULT NULL',
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
  @has_fact_checked_at = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN fact_checked_at TIMESTAMP NULL DEFAULT NULL',
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
  @has_fact_checked_by = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN fact_checked_by VARCHAR(64) DEFAULT NULL',
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
  @has_rights_checked_at = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN rights_checked_at TIMESTAMP NULL DEFAULT NULL',
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
  @has_rights_checked_by = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN rights_checked_by VARCHAR(64) DEFAULT NULL',
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
  @has_updated_at = 0,
  'ALTER TABLE encyclopedia_terms ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_terms_status := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'encyclopedia_terms'
    AND index_name = 'idx_terms_status'
);
SET @sql := IF(
  @has_idx_terms_status = 0,
  'ALTER TABLE encyclopedia_terms ADD INDEX idx_terms_status (status)',
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
  @has_idx_terms_entry_type = 0,
  'ALTER TABLE encyclopedia_terms ADD INDEX idx_terms_entry_type (entry_type)',
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
  @has_idx_terms_primary_palace = 0,
  'ALTER TABLE encyclopedia_terms ADD INDEX idx_terms_primary_palace (primary_palace_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE encyclopedia_terms SET status = 'published' WHERE status IS NULL OR status = '';
UPDATE encyclopedia_terms SET entry_type = 'craft' WHERE entry_type IS NULL OR entry_type = '';
UPDATE encyclopedia_terms SET updated_at = created_at WHERE updated_at IS NULL;

-- 17 条新增词条（草稿；已存在则保持原样）
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

-- 英文标题与摘要（content_translations）
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

-- 自检（只读）
SELECT 'total' AS metric, COUNT(*) AS value FROM encyclopedia_terms
UNION ALL
SELECT 'building', COUNT(*) FROM encyclopedia_terms WHERE entry_type = 'building'
UNION ALL
SELECT 'building_missing_primary', COUNT(*) FROM encyclopedia_terms
  WHERE entry_type = 'building' AND (primary_palace_id IS NULL OR primary_palace_id = '')
UNION ALL
SELECT 'building_category_mismatch', COUNT(*) FROM encyclopedia_terms
  WHERE entry_type = 'building' AND category <> '名筑档案'
UNION ALL
SELECT 'building_invalid_primary', COUNT(*) FROM encyclopedia_terms t
  LEFT JOIN palaces p ON p.id = t.primary_palace_id
  WHERE t.entry_type = 'building' AND p.id IS NULL
UNION ALL
SELECT 'draft_new', COUNT(*) FROM encyclopedia_terms WHERE status = 'draft';
