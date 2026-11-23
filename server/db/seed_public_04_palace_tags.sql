-- ============================================================
-- 种子 04 · 为 10 座扩展建筑补充标签（仅当为空）
-- ============================================================

UPDATE palaces SET tags = '军事防御,烽燧关隘,依山就势,世界遗产'
WHERE id = 'changcheng' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '紫禁城,中轴线,皇家宫殿,世界遗产'
WHERE id = 'gugong' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '江南名楼,诗词,长江,重建'
WHERE id = 'huanghelou' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '石窟艺术,壁画,敦煌,世界遗产'
WHERE id = 'mogao' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '藏式宫堡,红宫白宫,拉萨,世界遗产'
WHERE id = 'potala' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '祭天,圜丘,祈年殿,世界遗产'
WHERE id = 'tiantan' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '夯土,客家,圆形方楼,世界遗产'
WHERE id = 'tulou' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '木塔,斗拱,榫卯,辽代'
WHERE id = 'yingxian_muta' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '唐代木构,庑殿顶,梁思成,五台山'
WHERE id = 'foguangsi' AND (tags IS NULL OR tags = '');

UPDATE palaces SET tags = '江南名楼,盔顶,岳阳楼记,洞庭湖'
WHERE id = 'yueyanglou' AND (tags IS NULL OR tags = '');