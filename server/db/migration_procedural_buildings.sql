-- ============================================================
-- 迁移脚本: 程序化复原建筑 — 应县木塔 / 佛光寺东大殿 / 岳阳楼
-- 执行方式: node server/scripts/apply-migration.js server/db/migration_procedural_buildings.sql
-- 说明:
--   这三座建筑没有 GLB 资源, model_path 使用 procedural:<key> 约定,
--   由前端 <ProceduralModel> 实时生成几何体, 支持分层显隐与拆解动画。
--   幂等设计, 可重复执行。
-- ============================================================

USE ac4_db;

-- ---------- 1. 建筑主数据 ----------
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
   '[["19.42 米","楼高"],["3 层","三檐"],["223 年","始建"]]')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), name_en = VALUES(name_en), order_num = VALUES(order_num),
  description = VALUES(description), dynasty = VALUES(dynasty), built_year = VALUES(built_year),
  height = VALUES(height), area = VALUES(area), style = VALUES(style),
  significance = VALUES(significance), model_path = VALUES(model_path),
  category = VALUES(category), region = VALUES(region), city = VALUES(city),
  tagline = VALUES(tagline), quote = VALUES(quote), quote_by = VALUES(quote_by),
  tags = VALUES(tags), stats = VALUES(stats);

-- ---------- 2. 历史沿革 ----------
DELETE FROM palace_timeline WHERE palace_id IN ('yingxian_muta', 'foguangsi', 'yueyanglou');
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

-- ---------- 3. 趣味典故 ----------
DELETE FROM palace_fun_facts WHERE palace_id IN ('yingxian_muta', 'foguangsi', 'yueyanglou');
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

-- ---------- 4. 海报与四视图 (截图资源位于 images/posters/ 与 images/views/) ----------
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
