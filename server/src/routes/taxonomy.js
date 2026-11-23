const express = require('express');
const router = express.Router();
const pool = require('../db');

const TTL_MS = 10 * 60 * 1000;
let cache = null;

async function buildTaxonomy() {
  const [categories] = await pool.query(
    "SELECT DISTINCT category FROM palaces WHERE status = 'published' AND category IS NOT NULL AND category <> '' ORDER BY category ASC"
  );
  const [regions] = await pool.query(
    "SELECT DISTINCT region FROM palaces WHERE status = 'published' AND region IS NOT NULL AND region <> '' ORDER BY region ASC"
  );
  const [dynasties] = await pool.query(
    "SELECT DISTINCT dynasty FROM palaces WHERE status = 'published' AND dynasty IS NOT NULL AND dynasty <> '' ORDER BY dynasty ASC"
  );
  const [terms] = await pool.query(
    "SELECT DISTINCT category FROM encyclopedia_terms WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC"
  );

  return {
    categories: categories.map((row) => row.category),
    regions: regions.map((row) => row.region),
    dynasties: dynasties.map((row) => row.dynasty),
    terms: terms.map((row) => row.category),
    // 路线表由 T-S2-05 提供
    routes: [],
  };
}

/**
 * GET /api/taxonomy
 * 由数据库 DISTINCT 聚合，新增建筑自动出现；10 分钟缓存
 */
router.get('/', async (req, res) => {
  const now = Date.now();

  if (cache && now - cache.at < TTL_MS) {
    return res.json({ success: true, data: cache.data });
  }

  try {
    const data = await buildTaxonomy();
    cache = { at: now, data };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('获取分类导航失败:', err);
    if (cache) return res.json({ success: true, data: cache.data });
    return res.json({
      success: true,
      data: { categories: [], regions: [], dynasties: [], terms: [], routes: [] },
    });
  }
});

module.exports = router;