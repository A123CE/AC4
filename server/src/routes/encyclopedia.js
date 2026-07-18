/**
 * 百科术语API — 营造法式内容服务
 * GET /api/encyclopedia      — 获取所有术语 (支持 ?category=屋顶 筛选)
 * GET /api/encyclopedia/:id  — 获取单条术语详情
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/encyclopedia
 * 获取所有百科术语，支持按分类筛选
 * Query: category (可选) — 分类名
 */
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    let sql = 'SELECT * FROM encyclopedia_terms WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (term LIKE ? OR synopsis LIKE ? OR content LIKE ?)';
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY sort_order ASC, level_value ASC';

    const [rows] = await pool.execute(sql, params);

    // 解析JSON字段
    const terms = rows.map(row => ({
      ...row,
      related_palaces: safeJSON(row.related_palaces, []),
      related_terms: safeJSON(row.related_terms, []),
    }));

    res.json({ success: true, data: terms });
  } catch (err) {
    console.error('获取百科术语失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/encyclopedia/categories
 * 获取所有分类列表
 */
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category, category_icon FROM encyclopedia_terms ORDER BY category'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('获取百科分类失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/encyclopedia/:id
 * 获取单条术语详情 (含关联术语和关联宫殿)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM encyclopedia_terms WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '术语不存在' });
    }

    const term = {
      ...rows[0],
      related_palaces: safeJSON(rows[0].related_palaces, []),
      related_terms: safeJSON(rows[0].related_terms, []),
    };

    // 获取关联术语的简要信息
    if (term.related_terms && term.related_terms.length > 0) {
      const [relatedRows] = await pool.execute(
        `SELECT id, term, category, synopsis FROM encyclopedia_terms
         WHERE id IN (${term.related_terms.map(() => '?').join(',')})`,
        term.related_terms
      );
      term._relatedTerms = relatedRows;
    }

    // 获取关联宫殿的简要信息
    if (term.related_palaces && term.related_palaces.length > 0) {
      const [palaceRows] = await pool.execute(
        `SELECT id, name, dynasty FROM palaces
         WHERE id IN (${term.related_palaces.map(() => '?').join(',')})`,
        term.related_palaces
      );
      term._relatedPalaces = palaceRows;
    }

    res.json({ success: true, data: term });
  } catch (err) {
    console.error('获取百科术语详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 安全解析 JSON 字段
 */
function safeJSON(val, defaultVal = null) {
  if (!val) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}

module.exports = router;
