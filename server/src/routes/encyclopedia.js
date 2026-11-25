/**
 * 百科术语 API — 营造法式内容服务
 * GET /api/encyclopedia             — 词条列表（双主轴筛选）
 * GET /api/encyclopedia/taxonomy    — 建筑/朝代/地区/分类与覆盖率
 * GET /api/encyclopedia/stats       — 覆盖率统计
 * GET /api/encyclopedia/categories  — 分类列表
 * GET /api/encyclopedia/:id         — 词条详情
 */

const express = require('express');
const router = express.Router();
const service = require('../services/encyclopediaService');

const ENTRY_TYPES = new Set(['all', 'craft', 'building']);
const MAX_TEXT_LENGTH = 50;

function validationFailed(res, message) {
  return res.status(400).json({
    success: false,
    code: 'VALIDATION_FAILED',
    error: message,
  });
}

function readText(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (text.length > MAX_TEXT_LENGTH) return null;
  return text;
}

function readPositiveInt(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return undefined;
  return number;
}

router.get('/', async (req, res) => {
  try {
    const entryType = req.query.entry_type ? String(req.query.entry_type) : 'all';
    if (!ENTRY_TYPES.has(entryType)) {
      return validationFailed(res, 'entry_type 仅支持 all/craft/building');
    }

    const page = readPositiveInt(req.query.page, 1, 100);
    if (page === undefined) {
      return validationFailed(res, 'page 需为 1~100 的整数');
    }
    const pageSize = readPositiveInt(req.query.page_size, 1, 500);
    if (pageSize === undefined) {
      return validationFailed(res, 'page_size 需为 1~500 的整数');
    }

    const category = readText(req.query.category);
    const building = readText(req.query.building);
    const dynasty = readText(req.query.dynasty);
    const region = readText(req.query.region);
    const search = readText(req.query.search);
    if ([category, building, dynasty, region, search].includes(null)) {
      return validationFailed(res, `筛选参数长度不得超过 ${MAX_TEXT_LENGTH}`);
    }

    const include = req.query.include === 'content' ? 'content' : undefined;

    const result = await service.listTerms({
      entry_type: entryType === 'all' ? undefined : entryType,
      category: category === 'all' ? undefined : category,
      building,
      dynasty: dynasty === 'all' ? undefined : dynasty,
      region: region === 'all' ? undefined : region,
      search,
      include,
      page: page || 1,
      page_size: pageSize || 200,
    });

    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    console.error('获取百科术语失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/taxonomy', async (req, res) => {
  try {
    const lang = req.query.lang ? String(req.query.lang).slice(0, 10) : 'zh-CN';
    const taxonomy = await service.getTaxonomy(lang);
    res.json({ success: true, data: taxonomy });
  } catch (err) {
    console.error('获取百科分类体系失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await service.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('获取百科统计失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const taxonomy = await service.getTaxonomy();
    res.json({ success: true, data: taxonomy.categories });
  } catch (err) {
    console.error('获取百科分类失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const term = await service.getTermDetail(req.params.id);
    if (!term) {
      return res.status(404).json({ success: false, error: '术语不存在' });
    }
    res.json({ success: true, data: term });
  } catch (err) {
    console.error('获取百科术语详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;