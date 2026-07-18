-- ============================================================
-- AC4 故宫可视化系统 — 百科术语图片路径更新
-- 为已有 encyclopedia_terms 数据添加对应的图片路径
-- 使用方法: mysql -u root -p ac4_db < server/db/migration_update_image_paths.sql
-- ============================================================

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/宫门等级对比图.png", "images/宫门等级对比图2.png"]' WHERE `id` = 'roof-ranking';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/庑殿顶结构图1.png", "images/庑殿顶结构图2.png", "images/庑殿顶结构图3.png"]' WHERE `id` = 'wudian-roof';

UPDATE `encyclopedia_terms` SET `image_paths` = '[]' WHERE `id` = 'xieshan-roof';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/悬山顶和硬山顶对比图1.png", "images/悬山顶和硬山顶对比图2.png"]' WHERE `id` = 'xuanshan-roof';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/斗拱拆解图1.png", "images/斗拱拆解图2.png", "images/斗拱拆解图3.png"]' WHERE `id` = 'dougong';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/斗拱踩数对比图1.png", "images/斗拱踩数对比图2.png", "images/斗拱踩数对比图3.png", "images/斗拱踩数对比图4.png"]' WHERE `id` = 'dougong-levels';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/和玺彩画纹样图1.png", "images/和玺彩画纹样图2.png", "images/和玺彩画纹样图3.png", "images/和玺彩画纹样图4.png", "images/和玺彩画纹样图5.png"]' WHERE `id` = 'caihua-hexi';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/旋子彩画纹样图1.png", "images/旋子彩画纹样图2.png", "images/旋子彩画纹样图3.png", "images/旋子彩画纹样图4.png", "images/旋子彩画纹样图5.png"]' WHERE `id` = 'caihua-xuanzi';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/柱础剖面图1.png", "images/柱础剖面图2.png", "images/柱础剖面图3.png", "images/柱础剖面图4.png"]' WHERE `id` = 'chuchu';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/故宫三层须弥座台基剖面图1.png", "images/故宫三层须弥座台基剖面图2.png", "images/故宫三层须弥座台基剖面图3.png"]' WHERE `id` = 'sumeru';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/宫门等级对比图.png", "images/宫门等级对比图2.png"]' WHERE `id` = 'gongmen';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/门饰构件示意图1.png", "images/门饰构件示意图2.png", "images/门饰构件示意图3.png", "images/门饰构件示意图4.png"]' WHERE `id` = 'menshi';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/太和殿脊兽排列示意图1.png", "images/太和殿脊兽排列示意图2.png", "images/太和殿脊兽排列示意图3.png", "images/太和殿脊兽排列示意图4.png"]' WHERE `id` = 'jishou-xianren';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/鸱吻结构图1.png", "images/鸱吻结构图2.png", "images/鸱吻结构图3.png", "images/鸱吻结构图4.png"]' WHERE `id` = 'chiwen';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/琉璃瓦等级色系图1.png"]' WHERE `id` = 'huangliuwa';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/宁寿宫九龙壁示意图1.png", "images/宁寿宫九龙壁示意图2.png", "images/宁寿宫九龙壁示意图3.png"]' WHERE `id` = 'liulizhaobi';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/太和殿龙纹图样1.png", "images/太和殿龙纹图样2.png", "images/太和殿龙纹图样集合3.png"]' WHERE `id` = 'longwen';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/凤纹与龙纹对比图1.png", "images/凤纹与龙纹对比图2.png"]' WHERE `id` = 'fengwen';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/祥云纹演变图1.png", "images/祥云纹演变图2.png"]' WHERE `id` = 'xiangyunwen';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/故宫三朝五门布局图.png"]' WHERE `id` = 'sanchaodian';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/故宫前朝后寝分区图.png"]' WHERE `id` = 'qianchaohouqin';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/太和殿藻井结构图.png"]' WHERE `id` = 'caisson';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/故宫影壁图片.png"]' WHERE `id` = 'screen-wall';

UPDATE `encyclopedia_terms` SET `image_paths` = '[]' WHERE `id` = 'gongdian-buju';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/榫卯类型图解.png"]' WHERE `id` = 'goudang';

UPDATE `encyclopedia_terms` SET `image_paths` = '["images/三大殿台基石雕分布图1.png", "images/三大殿台基石雕分布图2.png", "images/三大殿台基石雕分布图3.png"]' WHERE `id` = 'yubaoshi';
