-- 迁移: 为故宫 10 座建筑补全卡片封面图 (poster_path)
-- 图片文件位于 images/posters/forbidden-city/ 下, 以 palace id 命名
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
