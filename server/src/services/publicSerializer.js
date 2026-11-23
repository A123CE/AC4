/**
 * 公开字段白名单序列化
 *
 * 原则：公开读接口只输出白名单字段，绝不通过 `...row` 透传整行。
 * 这样即使将来 palaces / encyclopedia_terms 表新增敏感列，也不会随响应泄露。
 */

const PUBLIC_PALACE_FIELDS = [
  'id',
  'name',
  'name_en',
  'order_num',
  'axis_position',
  'description',
  'dynasty',
  'built_year',
  'height',
  'area',
  'style',
  'significance',
  'model_path',
  'audio_guide',
  'has_video',
  'video_url',
  'category',
  'region',
  'city',
  'tagline',
  'quote',
  'quote_by',
  'tags',
  'stats',
  'poster_path',
  'views',
  'camera',
  'status',
  'created_at',
  'updated_at',
];

const PUBLIC_TERM_FIELDS = [
  'id',
  'category',
  'category_icon',
  'term',
  'synopsis',
  'level_value',
  'content',
  'image_desc',
  'related_palaces',
  'related_terms',
  'sort_order',
  'image_paths',
  'created_at',
];

const PUBLIC_COLLECTION_FIELDS = [
  'id',
  'palace_id',
  'palace_name',
  'category',
  'dynasty',
  'collection_category',
  'note',
  'created_at',
  'updated_at',
  'poster_path',
];

const SENSITIVE_FIELDS = ['email', 'password_hash', 'user_id', 'points', 'interest_tag', 'total_quiz_score'];

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseTags(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toVideoInfo(row = {}) {
  const declared =
    row.has_video === 1 || row.has_video === '1' || row.has_video === true;

  let url = row.video_url ? String(row.video_url).trim() : '';
  if (url && !/^https?:\/\//i.test(url)) {
    url = url.startsWith('/videos/')
      ? url
      : `/videos/${url.replace(/^\/+/, '')}`;
  }

  let poster = row.poster_path ? String(row.poster_path).trim() : '';
  if (poster && !/^https?:\/\//i.test(poster)) {
    poster = poster.startsWith('/images/')
      ? poster
      : `/images/${poster.replace(/^\/+/, '')}`;
  }

  return {
    declared,
    url: url || null,
    poster: poster || null,
  };
}

function pickWhitelist(row, fields) {
  const output = {};
  for (const field of fields) {
    output[field] = row[field] === undefined ? null : row[field];
  }
  for (const field of SENSITIVE_FIELDS) {
    delete output[field];
  }
  return output;
}

/**
 * 建筑公开视图
 * @param {object|null} row - 数据库原始行
 * @param {{ detail?: boolean, extras?: { images?: string[], timeline?: object[], funFacts?: string[] } }} options
 */
function toPublicPalace(row, options = {}) {
  if (!row) return null;
  const { detail = false, extras = {} } = options;

  const output = pickWhitelist(row, PUBLIC_PALACE_FIELDS);

  output.tags = parseTags(row.tags);
  output.stats = parseJson(row.stats);
  output.views = parseJson(row.views_data);
  output.camera = parseJson(row.camera_preset);

  if (detail) {
    output.images = Array.isArray(extras.images) ? extras.images : [];
    output.timeline = Array.isArray(extras.timeline) ? extras.timeline : [];
    output.funFacts = Array.isArray(extras.funFacts) ? extras.funFacts : [];
    output.audio = row.audio_guide ?? null;
    output.coverage = null;
  }

  return output;
}

function toPublicTerm(row) {
  if (!row) return null;
  const output = pickWhitelist(row, PUBLIC_TERM_FIELDS);
  output.related_palaces = parseJson(row.related_palaces, []);
  output.related_terms = parseJson(row.related_terms, []);
  output.image_paths = parseJson(row.image_paths, []);
  return output;
}

function toPublicCollection(row) {
  if (!row) return null;
  return pickWhitelist(row, PUBLIC_COLLECTION_FIELDS);
}

module.exports = {
  toVideoInfo,
  toPublicPalace,
  toPublicTerm,
  toPublicCollection,
  PUBLIC_PALACE_FIELDS,
  PUBLIC_TERM_FIELDS,
  PUBLIC_COLLECTION_FIELDS,
};