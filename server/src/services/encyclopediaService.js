/**
 * 百科词条读取服务（唯一数据入口）
 * - 列表/详情/分类/统计/覆盖率全部由本文件提供
 * - 派生字段一次批量补齐，避免 N+1
 */

const pool = require('../db');

const MIN_PUBLISHED_TERMS = 40;
const BUILDING_CATEGORY = '名筑档案';
const KNOWLEDGE_DIMENSIONS = [
  'site-layout',
  'structure-material',
  'roof-decoration',
  'ritual-function',
  'conservation-heritage',
];
// 仅用于从“非故宫建筑”分母中排除，不参与任何展示
const FORBIDDEN_CITY_UNITS = [
  'wumen',
  'taihemen',
  'taihedian',
  'zhonghedian',
  'baohedian',
  'qianqingmen',
  'qianqinggong',
  'jiaotaidian',
  'kunninggong',
  'shenwumen',
];

const ENTRY_TYPES = ['craft', 'building'];

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'object') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function has3d(modelPath) {
  if (!modelPath) return false;
  return !String(modelPath).startsWith('procedural:');
}

function normalizeRow(row) {
  return {
    id: row.id,
    category: row.category,
    category_icon: row.category_icon || null,
    term: row.term,
    synopsis: row.synopsis || null,
    level_value: toNumber(row.level_value),
    image_desc: row.image_desc || null,
    related_palaces: toArray(row.related_palaces),
    related_terms: toArray(row.related_terms),
    sort_order: toNumber(row.sort_order, 0),
    image_paths: toArray(row.image_paths),
    entry_type: row.entry_type || 'craft',
    status: row.status || 'published',
    primary_palace_id: row.primary_palace_id || null,
    knowledge_dimensions: toArray(row.knowledge_dimensions),
    source_refs: toArray(row.source_refs),
    image_credits: toArray(row.image_credits),
    updated_at: row.updated_at || null,
    primary_palace_name: row.primary_palace_name || null,
    dynasty: row.dynasty || null,
    region: row.region || null,
    order_num: toNumber(row.order_num),
    has_3d: has3d(row.primary_palace_model_path),
    related_palace_names: [],
    ...(Object.prototype.hasOwnProperty.call(row, 'content') ? { content: row.content } : {}),
  };
}

async function attachRelatedPalaceNames(rows) {
  const ids = [
    ...new Set(rows.flatMap((row) => row.related_palaces).map((id) => String(id))),
  ].filter(Boolean);
  if (ids.length === 0) return;

  const [palaces] = await pool.query(
    `SELECT id, name FROM palaces WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const nameMap = new Map(palaces.map((palace) => [palace.id, palace.name]));

  for (const row of rows) {
    row.related_palace_names = row.related_palaces
      .map((id) => nameMap.get(String(id)))
      .filter(Boolean);
  }
}

async function getCoverageBase() {
  const [rows] = await pool.query(
    `SELECT id, name, dynasty, region, order_num, model_path
     FROM palaces WHERE status = 'published' ORDER BY order_num ASC, id ASC`
  );
  const nonForbidden = rows.filter((row) => !FORBIDDEN_CITY_UNITS.includes(row.id));
  return { palaces: rows, nonForbidden };
}

async function listTerms(params = {}) {
  const page = Math.min(100, Math.max(1, Number(params.page) || 1));
  const pageSize = Math.min(500, Math.max(1, Number(params.page_size) || 200));
  const includeContent = params.include === 'content';

  const where = ["t.status = 'published'"];
  const args = [];

  if (params.entry_type && params.entry_type !== 'all') {
    where.push('t.entry_type = ?');
    args.push(params.entry_type);
  }
  if (params.category && params.category !== 'all') {
    where.push('t.category = ?');
    args.push(params.category);
  }
  if (params.building) {
    where.push(
      "(t.primary_palace_id = ? OR (t.entry_type = 'craft' AND JSON_VALID(t.related_palaces) AND JSON_CONTAINS(t.related_palaces, JSON_QUOTE(?))))"
    );
    args.push(params.building, params.building);
  }
  if (params.dynasty && params.dynasty !== 'all') {
    where.push('p.dynasty = ?');
    args.push(params.dynasty);
  }
  if (params.region && params.region !== 'all') {
    where.push('p.region = ?');
    args.push(params.region);
  }
  if (params.search && String(params.search).trim()) {
    const keyword = `%${String(params.search).trim()}%`;
    where.push('(t.term LIKE ? OR t.synopsis LIKE ? OR t.content LIKE ?)');
    args.push(keyword, keyword, keyword);
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM encyclopedia_terms t
     LEFT JOIN palaces p ON p.id = t.primary_palace_id
     WHERE ${whereSql}`,
    args
  );
  const total = Number(countRows[0]?.total) || 0;

  const contentColumn = includeContent ? 't.content,' : '';
  const [rows] = await pool.query(
    `SELECT t.id, t.category, t.category_icon, t.term, t.synopsis, t.level_value,
            ${contentColumn} t.image_desc, t.related_palaces, t.related_terms,
            t.sort_order, t.image_paths, t.entry_type, t.status,
            t.primary_palace_id, t.knowledge_dimensions, t.source_refs,
            t.image_credits, t.updated_at,
            p.name AS primary_palace_name, p.dynasty, p.region, p.order_num,
            p.model_path AS primary_palace_model_path
     FROM encyclopedia_terms t
     LEFT JOIN palaces p ON p.id = t.primary_palace_id
     WHERE ${whereSql}
     ORDER BY t.sort_order ASC, t.level_value ASC, t.id ASC
     LIMIT ? OFFSET ?`,
    [...args, pageSize, (page - 1) * pageSize]
  );

  const data = rows.map(normalizeRow);
  await attachRelatedPalaceNames(data);

  const { palaces, nonForbidden } = await getCoverageBase();

  return {
    data,
    meta: {
      total,
      page,
      page_size: pageSize,
      filters_applied: {
        entry_type: params.entry_type || 'all',
        category: params.category || 'all',
        building: params.building || null,
        dynasty: params.dynasty || 'all',
        region: params.region || 'all',
        search: params.search ? String(params.search).trim() : null,
        include: includeContent ? 'content' : 'default',
      },
      buildings_total: palaces.length,
      non_forbidden_total: nonForbidden.length,
    },
  };
}

let taxonomyCache = new Map();
const TAXONOMY_TTL_MS = 60 * 1000;

function clearTaxonomyCache() {
  taxonomyCache = new Map();
}

async function getTaxonomy(lang = 'zh-CN') {
  const cacheKey = `taxonomy:${lang}`;
  const cached = taxonomyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const { palaces, nonForbidden } = await getCoverageBase();

  const [buildingCounts] = await pool.query(
    `SELECT primary_palace_id AS id, COUNT(*) AS n
     FROM encyclopedia_terms
     WHERE status = 'published' AND entry_type = 'building' AND primary_palace_id IS NOT NULL
     GROUP BY primary_palace_id`
  );
  const buildingCountMap = new Map(
    buildingCounts.map((row) => [row.id, Number(row.n) || 0])
  );

  const [craftRows] = await pool.query(
    `SELECT related_palaces FROM encyclopedia_terms
     WHERE status = 'published' AND entry_type = 'craft'`
  );
  const craftCountMap = new Map();
  for (const row of craftRows) {
    for (const palaceId of toArray(row.related_palaces)) {
      craftCountMap.set(palaceId, (craftCountMap.get(palaceId) || 0) + 1);
    }
  }

  const buildings = palaces.map((palace) => ({
    id: palace.id,
    name: palace.name,
    dynasty: palace.dynasty || null,
    region: palace.region || null,
    order_num: toNumber(palace.order_num),
    has_3d: has3d(palace.model_path),
    entry_count: buildingCountMap.get(palace.id) || 0,
    craft_count: craftCountMap.get(palace.id) || 0,
    covered: (buildingCountMap.get(palace.id) || 0) > 0,
  }));

  const [countRows] = await pool.query(
    "SELECT COUNT(*) AS n FROM encyclopedia_terms WHERE status = 'published'"
  );
  const publishedTerms = Number(countRows[0]?.n) || 0;
  const coveredBuildings = nonForbidden.filter(
    (palace) => (buildingCountMap.get(palace.id) || 0) > 0
  ).length;
  const expectedMin = 26 + nonForbidden.length;
  const minFloor = Math.max(expectedMin, MIN_PUBLISHED_TERMS);
  const coverageRate = nonForbidden.length === 0
    ? 100
    : Number(((coveredBuildings / nonForbidden.length) * 100).toFixed(1));

  const [categoryRows] = await pool.query(
    `SELECT t.category, COUNT(*) AS count, MIN(t.sort_order) AS sort,
            MIN(t.entry_type) AS entry_type,
            (SELECT category_icon FROM encyclopedia_terms t2
             WHERE t2.status = 'published' AND t2.category = t.category
             ORDER BY t2.sort_order ASC LIMIT 1) AS category_icon
     FROM encyclopedia_terms t
     WHERE t.status = 'published'
     GROUP BY t.category
     ORDER BY sort ASC, t.category ASC`
  );
  const categories = categoryRows
    .map((row) => ({
      category: row.category,
      category_icon: row.category_icon || null,
      entry_type: row.entry_type || 'craft',
      count: Number(row.count) || 0,
      sort: row.category === BUILDING_CATEGORY ? 0 : toNumber(row.sort, 0),
    }))
    .sort((a, b) => a.sort - b.sort || a.category.localeCompare(b.category, 'zh-CN'));

  const [typeRows] = await pool.query(
    `SELECT entry_type, COUNT(*) AS count FROM encyclopedia_terms
     WHERE status = 'published' GROUP BY entry_type`
  );
  const entryTypes = ENTRY_TYPES.map((type) => {
    const found = typeRows.find((row) => row.entry_type === type);
    return { value: type, count: found ? Number(found.count) : 0 };
  });

  const dynasties = [...new Set(palaces.map((palace) => palace.dynasty).filter(Boolean))];
  const regions = [...new Set(palaces.map((palace) => palace.region).filter(Boolean))];

  const value = {
    buildings,
    dynasties,
    regions,
    entry_types: entryTypes,
    categories,
    totals: {
      published_terms: publishedTerms,
      expected_min: expectedMin,
      min_floor: minFloor,
      coverage_rate: coverageRate,
      buildings_total: palaces.length,
      non_forbidden_total: nonForbidden.length,
      covered_buildings: coveredBuildings,
    },
  };

  taxonomyCache.set(cacheKey, { value, expiresAt: Date.now() + TAXONOMY_TTL_MS });
  return value;
}

async function getStats() {
  const { palaces, nonForbidden } = await getCoverageBase();

  const [buildingCounts] = await pool.query(
    `SELECT primary_palace_id AS id, COUNT(*) AS n
     FROM encyclopedia_terms
     WHERE status = 'published' AND entry_type = 'building' AND primary_palace_id IS NOT NULL
     GROUP BY primary_palace_id`
  );
  const buildingCountMap = new Map(
    buildingCounts.map((row) => [row.id, Number(row.n) || 0])
  );

  const [craftRows] = await pool.query(
    `SELECT related_palaces FROM encyclopedia_terms
     WHERE status = 'published' AND entry_type = 'craft'`
  );
  const craftCountMap = new Map();
  for (const row of craftRows) {
    for (const palaceId of toArray(row.related_palaces)) {
      craftCountMap.set(palaceId, (craftCountMap.get(palaceId) || 0) + 1);
    }
  }

  const [[publishedRow]] = await pool.query(
    "SELECT COUNT(*) AS n FROM encyclopedia_terms WHERE status = 'published'"
  );
  const [[draftRow]] = await pool.query(
    "SELECT COUNT(*) AS n FROM encyclopedia_terms WHERE status = 'draft'"
  );
  const [[invalidRow]] = await pool.query(
    `SELECT COUNT(*) AS n FROM encyclopedia_terms t
     LEFT JOIN palaces p ON p.id = t.primary_palace_id
     WHERE t.status = 'published' AND t.entry_type = 'building'
       AND (t.primary_palace_id IS NULL OR p.id IS NULL OR p.status <> 'published')`
  );

  const publishedTerms = Number(publishedRow?.n) || 0;
  const expectedMin = 26 + nonForbidden.length;
  const minFloor = Math.max(expectedMin, MIN_PUBLISHED_TERMS);
  const coveredBuildings = nonForbidden.filter(
    (palace) => (buildingCountMap.get(palace.id) || 0) > 0
  ).length;
  const coverageRate = nonForbidden.length === 0
    ? 100
    : Number(((coveredBuildings / nonForbidden.length) * 100).toFixed(1));

  return {
    published_terms: publishedTerms,
    draft_terms: Number(draftRow?.n) || 0,
    expected_min: expectedMin,
    min_floor: minFloor,
    meets_minimum: publishedTerms >= minFloor,
    coverage_rate: coverageRate,
    buildings_total: palaces.length,
    non_forbidden_total: nonForbidden.length,
    covered_buildings: coveredBuildings,
    invalid_primary_refs: Number(invalidRow?.n) || 0,
    per_building: palaces.map((palace) => ({
      id: palace.id,
      name: palace.name,
      entry_count: buildingCountMap.get(palace.id) || 0,
      craft_count: craftCountMap.get(palace.id) || 0,
      covered: (buildingCountMap.get(palace.id) || 0) > 0,
      has_3d: has3d(palace.model_path),
    })),
  };
}

async function getTermDetail(id) {
  const [rows] = await pool.query(
    `SELECT t.*, p.name AS primary_palace_name, p.dynasty, p.region, p.order_num,
            p.model_path AS primary_palace_model_path, p.status AS primary_palace_status
     FROM encyclopedia_terms t
     LEFT JOIN palaces p ON p.id = t.primary_palace_id
     WHERE t.id = ? AND t.status = 'published'`,
    [id]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const term = normalizeRow(row);
  term.content = row.content;
  term.image_desc = row.image_desc || null;

  const primaryStatus = row.primary_palace_status;
  term.primary_building =
    row.primary_palace_id && primaryStatus === 'published'
      ? {
          id: row.primary_palace_id,
          name: row.primary_palace_name || null,
          dynasty: row.dynasty || null,
          region: row.region || null,
          has_3d: has3d(row.primary_palace_model_path),
        }
      : null;

  if (term.related_terms.length > 0) {
    const [relatedRows] = await pool.query(
      `SELECT id, term, category, synopsis FROM encyclopedia_terms
       WHERE status = 'published' AND id IN (${term.related_terms.map(() => '?').join(',')})`,
      term.related_terms
    );
    term._relatedTerms = relatedRows;
  } else {
    term._relatedTerms = [];
  }

  if (term.related_palaces.length > 0) {
    const [palaceRows] = await pool.query(
      `SELECT id, name, dynasty, region FROM palaces
       WHERE status = 'published' AND id IN (${term.related_palaces.map(() => '?').join(',')})`,
      term.related_palaces
    );
    term._relatedPalaces = palaceRows;
  } else {
    term._relatedPalaces = [];
  }

  const [translationRows] = await pool.query(
    `SELECT field, value, status FROM content_translations
     WHERE entity_type = 'term' AND entity_id = ? AND locale = 'en'
       AND field IN ('term', 'synopsis')`,
    [id]
  );
  const translations = {};
  for (const item of translationRows) {
    translations[item.field] = { value: item.value, status: item.status };
  }
  term.translations = translations;

  term.fact_checked = Boolean(row.fact_checked_at);
  term.rights_checked = Boolean(row.rights_checked_at);

  return term;
}

async function validateTerm(row) {
  const violations = [];
  const push = (rule, detail) => violations.push({ rule, detail });

  if (!row || typeof row !== 'object') {
    return { ok: false, violations: [{ rule: 'PG-BK-02', detail: '词条为空' }] };
  }

  const entryType = row.entry_type || 'craft';
  const dimensions = toArray(row.knowledge_dimensions);
  const sources = toArray(row.source_refs);
  const relatedTerms = toArray(row.related_terms);
  const imagePaths = toArray(row.image_paths);
  const credits = toArray(row.image_credits);
  const content = String(row.content || '');
  const synopsis = String(row.synopsis || '');

  if (entryType === 'building') {
    if (!row.primary_palace_id) {
      push('PG-BK-02', '建筑专属词条必须设置 primary_palace_id');
    }
    if (row.category !== BUILDING_CATEGORY) {
      push('PG-BK-03', `建筑专属词条类目必须为 ${BUILDING_CATEGORY}`);
    }
  }

  if (dimensions.length === 0) {
    push('PG-BK-04', 'knowledge_dimensions 至少 1 个');
  }
  for (const dimension of dimensions) {
    if (!KNOWLEDGE_DIMENSIONS.includes(dimension)) {
      push('PG-BK-05', `非法维度：${dimension}`);
    }
  }

  if (sources.length === 0) {
    push('PG-BK-06', 'source_refs 至少 1 条');
  }
  if (synopsis.length < 40 || synopsis.length > 120) {
    push('PG-BK-07', `synopsis 长度需 40–120，当前 ${synopsis.length}`);
  }
  if (content.length < 300) {
    push('PG-BK-08', `content 长度需 ≥300，当前 ${content.length}`);
  }
  const sectionCount = (content.match(/▲/g) || []).length;
  if (sectionCount < 3) {
    push('PG-BK-09', `正文 ▲ 小节需 ≥3，当前 ${sectionCount}`);
  }
  if (entryType === 'building') {
    if (!/独有|特有|与该建筑的关系/.test(content)) {
      push('PG-BK-10', '建筑专属词条缺少“独有做法”小节');
    }
    if (!/通用术语/.test(content)) {
      push('PG-BK-14', '建筑专属词条缺少“与通用术语的关系”小节');
    }
  }

  if (relatedTerms.includes(row.id)) {
    push('PG-BK-11', 'related_terms 不得包含自身');
  }
  if (imagePaths.length > 0) {
    if (credits.length < imagePaths.length) {
      push('PG-BK-12', 'image_credits 未覆盖全部图片');
    } else if (!credits.every((item) => item && typeof item === 'object' && item.license)) {
      push('PG-BK-13', 'image_credits 每项必须包含 license');
    }
  }

  const knownTerms = relatedTerms.filter((id) => id && id !== row.id);
  if (knownTerms.length > 0) {
    const [found] = await pool.query(
      `SELECT id FROM encyclopedia_terms WHERE id IN (${knownTerms.map(() => '?').join(',')})`,
      knownTerms
    );
    const foundIds = new Set(found.map((item) => item.id));
    const missing = knownTerms.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      push('PG-BK-15', `related_terms 含不存在的 id：${missing.join(',')}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

module.exports = {
  MIN_PUBLISHED_TERMS,
  BUILDING_CATEGORY,
  KNOWLEDGE_DIMENSIONS,
  FORBIDDEN_CITY_UNITS,
  listTerms,
  getTaxonomy,
  getStats,
  getTermDetail,
  validateTerm,
  clearTaxonomyCache,
  has3d,
};