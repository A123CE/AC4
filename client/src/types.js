/**
 * 前端数据契约与运行时守卫
 *
 * 仅使用 JSDoc + 纯函数，不引入 TypeScript 编译链与 zod/io-ts。
 * 所有守卫对 null / 缺字段 / 类型错误返回安全默认值，并在开发态提示一次。
 */

const warned = new Set();

function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[types] ${message}`);
  }
}

/**
 * @typedef {Object} Palace
 * @property {string} id
 * @property {string} name
 * @property {string|null} name_en
 * @property {string|null} category
 * @property {string|null} dynasty
 * @property {string|null} description
 * @property {string|null} poster_path
 * @property {string|null} model_path
 * @property {string[]} tags
 */

/**
 * @typedef {Object} CollectionItem
 * @property {number|string} id
 * @property {string} palace_id
 * @property {string|null} palace_name
 * @property {string|null} note
 */

/**
 * @typedef {Object} SearchItem
 * @property {string|number} id
 * @property {string} title
 * @property {string} href
 */

/**
 * @typedef {Object} SearchGroup
 * @property {string} type
 * @property {string} label
 * @property {SearchItem[]} items
 */

/**
 * @typedef {Object} AchievementResult
 * @property {Array} stamps
 * @property {Array} badges
 * @property {number} points
 */

/**
 * @typedef {'high'|'standard'|'smooth'} DeviceTier
 */

/**
 * @typedef {Object} GuestSession
 * @property {number} v
 * @property {string} gid
 * @property {Object} preview
 * @property {Object} quizQuota
 */

/**
 * @typedef {Object} SkinState
 * @property {string} skin
 * @property {Set<string>} unlocked
 */

/**
 * @typedef {Object} AssetManifest
 * @property {string} generated_at
 * @property {number} ttl_seconds
 * @property {Object} palaces
 */

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function isPalace(value) {
  if (!value || typeof value !== 'object') {
    warnOnce('isPalace', 'Palace 必须是对象');
    return false;
  }
  const valid = isNonEmptyString(value.id) && isNonEmptyString(value.name);
  if (!valid) warnOnce('isPalace:fields', 'Palace 缺少 id 或 name');
  return valid;
}

export function isCollectionItem(value) {
  if (!value || typeof value !== 'object') {
    warnOnce('isCollectionItem', 'CollectionItem 必须是对象');
    return false;
  }
  const valid = isNonEmptyString(String(value.palace_id ?? ''));
  if (!valid) warnOnce('isCollectionItem:fields', 'CollectionItem 缺少 palace_id');
  return valid;
}

export function isSearchGroup(value) {
  if (!value || typeof value !== 'object') {
    warnOnce('isSearchGroup', 'SearchGroup 必须是对象');
    return false;
  }
  const valid =
    isNonEmptyString(value.type) &&
    isNonEmptyString(value.label) &&
    Array.isArray(value.items);
  if (!valid) warnOnce('isSearchGroup:fields', 'SearchGroup 缺少 type/label/items');
  return valid;
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  warnOnce(`asArray:${typeof value}`, `期望数组，收到 ${typeof value}`);
  return [];
}

export function clampNumber(value, fallback = 0) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

export function toISO(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    warnOnce('toISO', '无法解析日期');
    return null;
  }
  return date.toISOString();
}