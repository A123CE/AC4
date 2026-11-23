-- ============================================================
--  故宫中轴线 10 座建筑档案补齐
--  目标: 与 7 座全国名筑保持同样的数据完整度
--    stats / tags / tagline / quote / quote_by / views_data / camera_preset
--  幂等: 可重复执行
--  用法: node server/scripts/apply-migration.js server/db/migration_axis_details.sql
-- ============================================================

UPDATE palaces SET tagline='中轴线上的礼仪巅峰',stats='[["35.05 米","殿高"],["2377 ㎡","殿面"],["十一开间","开间"]]',tags='最高等级,重檐庑殿顶,须弥座,皇家大典',quote='帝命式于九围, 兹惟艰哉, 奈何弗敬; 天心佑夫一德, 永保之哉, 遹求厥宁。',quote_by='清高宗御题太和殿楹联',views_data='[{\"src\":\"posters/forbidden-city/taihedian.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.42,\"radius\":3.6,\"target\":[0,0.2,0]}' WHERE id='taihedian';

UPDATE palaces SET tagline='紫禁城的正南门',stats='[["37.95 米","城楼高"],["五座门","城台"],["三券门","通道"]]',tags='正南门,凹字形城楼,颁诏大典,明代始建',quote='审曲面势, 以飭五材, 以辨民器, 谓之百工。',quote_by='《周礼 · 考工记》',views_data='[{\"src\":\"posters/forbidden-city/wumen.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.38,\"radius\":3.5,\"target\":[0,0.2,0]}' WHERE id='wumen';

UPDATE palaces SET tagline='外朝正门, 御门听政之地',stats='[["23.8 米","门楼高"],["九开间","面阔"],["约 1300 ㎡","门庑"]]',tags='外朝正门,御门听政,九开间',quote='凡构屋之制, 皆以材为祖。',quote_by='《营造法式 · 总释》',views_data='[{\"src\":\"posters/forbidden-city/taihemen.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.4,\"radius\":3.4,\"target\":[0,0.18,0]}' WHERE id='taihemen';

UPDATE palaces SET tagline='方形的典礼前厅',stats='[["约 23 米","殿高"],["四隅攒尖","屋面"],["方形","平面"]]',tags='方形平面,四角攒尖,大典前厅',quote='时乘六龙以御天, 所其无逸; 用敷五福而锡极, 彰厥有常。',quote_by='清高宗御题中和殿楹联',views_data='[{\"src\":\"posters/forbidden-city/zhonghedian.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.36,\"radius\":3.1,\"target\":[0,0.18,0]}' WHERE id='zhonghedian';

UPDATE palaces SET tagline='内廷正殿, 正大光明',stats='[["约 20 米","殿高"],["九开间","面阔"],["约 1400 ㎡","殿面"]]',tags='内廷正殿,正大光明,立储诏书,清代议政',quote='克宽克仁, 皇建其有极; 惟精惟一, 道积于厥躬。',quote_by='清高宗御题乾清宫楹联',views_data='[{\"src\":\"posters/forbidden-city/qianqinggong.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.4,\"radius\":3.2,\"target\":[0,0.18,0]}' WHERE id='qianqinggong';

UPDATE palaces SET tagline='二十四方宝玺之所',stats='[["约 17 米","殿高"],["25 方","清代宝玺"],["铜鎏金","宝座"]]',tags='宝玺存放,大婚礼堂,铜鎏金宝座',quote='天有时, 地有气, 材有美, 工有巧, 合此四者, 然后可以为良。',quote_by='《周礼 · 考工记》',views_data='[{\"src\":\"posters/forbidden-city/jiaotaidian.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.34,\"radius\":3,\"target\":[0,0.16,0]}' WHERE id='jiaotaidian';

UPDATE palaces SET tagline='萨满古风的大婚宫',stats='[["约 20 米","殿高"],["九开间","面阔"],["约 1300 ㎡","殿面"]]',tags='萨满祭祀,清代大婚,明代皇后寝宫',quote='知者创物, 巧者述之守之, 世谓之工。',quote_by='《周礼 · 考工记》',views_data='[{\"src\":\"posters/forbidden-city/kunninggong.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.4,\"radius\":3.2,\"target\":[0,0.18,0]}' WHERE id='kunninggong';

UPDATE palaces SET tagline='内外朝的分界线',stats='[["约 16 米","门楼高"],["内外朝分界","门址"],["清代听政","旧仪"]]',tags='内廷正门,内外朝分界,御门听政',quote='表正万邦, 慎厥身修思永; 弘敷五典, 无轻民事惟难。',quote_by='清世宗御题乾清门楹联',views_data='[{\"src\":\"posters/forbidden-city/qianqingmen.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.4,\"radius\":3.3,\"target\":[0,0.18,0]}' WHERE id='qianqingmen';

UPDATE palaces SET tagline='紫禁城北面的正门',stats='[["31.6 米","城楼高"],["北面","正门"],["玄武","旧称"]]',tags='北面正门,玄武旧名,康熙避讳',quote='百工居肆以成其事, 君子学以致其道。',quote_by='《周礼 · 考工记》',views_data='[{\"src\":\"posters/forbidden-city/shenwumen.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.42,\"radius\":3.6,\"target\":[0,0.2,0]}' WHERE id='shenwumen';

UPDATE palaces SET tagline='云龙石雕之下的宴会殿',stats='[["约 29.5 米","殿高"],["约 1240 ㎡","殿面"],["200 余吨","云龙石雕"]]',tags='云龙石雕,殿试科举,宴会典礼',quote='祖训昭垂, 我后嗣子尚克钦承有永; 天心降鉴, 惟万方臣庶当思容保无疆。',quote_by='清高宗御题保和殿楹联',views_data='[{\"src\":\"posters/forbidden-city/baohedian.png\",\"zh\":\"正面\",\"en\":\"Front\"}]',camera_preset='{\"theta\":0,\"phi\":1.4,\"radius\":3.3,\"target\":[0,0.18,0]}' WHERE id='baohedian';

-- 修正失效的图库记录 — 原记录指向不存在的 images/forbidden-city/*.jpeg
DELETE FROM palace_images WHERE image_path LIKE 'images/forbidden-city/%';
INSERT INTO palace_images (palace_id, image_path, sort_order)
SELECT id, CONCAT('posters/forbidden-city/', id, '.png'), 1
FROM palaces
WHERE model_path LIKE 'forbidden-city/%';
