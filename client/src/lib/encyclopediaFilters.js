/**
 * 百科筛选/分组/高亮的纯函数集合
 * 不发起请求、不依赖 React，便于单测与页面复用。
 */

export const FILTER_KEYS = ['building', 'entry_type', 'category', 'dynasty', 'region', 'q'];
export const MAX_FILTER_LENGTH = 50;

const ENTRY_TYPES = new Set(['all', 'craft', 'building']);

const TEXT_MAP = {
  臺: '台',
  檯: '台',
  門: '门',
  宮: '宫',
  樓: '楼',
  閣: '阁',
  園: '园',
  龍: '龙',
  鳳: '凤',
  雲: '云',
  獸: '兽',
  額: '额',
  牆: '墙',
  墻: '墙',
  磚: '砖',
  翹: '翘',
  飛: '飞',
  簷: '檐',
  構: '构',
  築: '筑',
  層: '层',
  頂: '顶',
  階: '阶',
};

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .split('')
    .map((char) => TEXT_MAP[char] || char)
    .join('');
}

function toParams(searchParams) {
  if (searchParams instanceof URLSearchParams) return searchParams;
  return new URLSearchParams(searchParams || '');
}

function readFilterValue(params, key, dropped) {
  const raw = params.get(key) || '';
  if (!raw) return '';
  if (raw.length > MAX_FILTER_LENGTH) {
    dropped.push({ key, value: raw });
    return '';
  }
  return raw;
}

export function normalizeFilters(searchParams, taxonomy) {
  const params = toParams(searchParams);
  const dropped = [];
  const filters = {
    building: '',
    entry_type: 'all',
    category: 'all',
    dynasty: 'all',
    region: 'all',
    q: '',
    term: params.get('term') || '',
  };

  const entryType = readFilterValue(params, 'entry_type', dropped);
  if (entryType) {
    if (ENTRY_TYPES.has(entryType)) filters.entry_type = entryType;
    else dropped.push({ key: 'entry_type', value: entryType });
  }

  const hasTaxonomy = Boolean(taxonomy);
  const buildings = new Set((taxonomy?.buildings || []).map((item) => item.id));
  const dynasties = new Set(taxonomy?.dynasties || []);
  const regions = new Set(taxonomy?.regions || []);
  const categories = new Set((taxonomy?.categories || []).map((item) => item.category));

  const building = readFilterValue(params, 'building', dropped);
  if (building) {
    if (!hasTaxonomy || buildings.has(building)) filters.building = building;
    else dropped.push({ key: 'building', value: building });
  }

  const category = readFilterValue(params, 'category', dropped);
  if (category) {
    if (category === 'all') filters.category = 'all';
    else if (!hasTaxonomy || categories.has(category)) filters.category = category;
    else dropped.push({ key: 'category', value: category });
  }

  const dynasty = readFilterValue(params, 'dynasty', dropped);
  if (dynasty) {
    if (dynasty === 'all') filters.dynasty = 'all';
    else if (!hasTaxonomy || dynasties.has(dynasty)) filters.dynasty = dynasty;
    else dropped.push({ key: 'dynasty', value: dynasty });
  }

  const region = readFilterValue(params, 'region', dropped);
  if (region) {
    if (region === 'all') filters.region = 'all';
    else if (!hasTaxonomy || regions.has(region)) filters.region = region;
    else dropped.push({ key: 'region', value: region });
  }

  filters.q = readFilterValue(params, 'q', dropped);

  return { filters, dropped };
}

export function toSearchParams(filters = {}) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (!value) continue;
    if (key === 'entry_type' && value === 'all') continue;
    if ((key === 'category' || key === 'dynasty' || key === 'region') && value === 'all') continue;
    params.set(key, String(value));
  }
  if (filters.term) params.set('term', String(filters.term));
  return params;
}

export function filterTerms(terms = [], filters = {}) {
  const query = normalizeText(filters.q || '').trim();
  return terms.filter((term) => {
    if (filters.entry_type && filters.entry_type !== 'all') {
      if ((term.entry_type || 'craft') !== filters.entry_type) return false;
    }
    if (filters.category && filters.category !== 'all') {
      if (term.category !== filters.category) return false;
    }
    if (filters.building) {
      const related = Array.isArray(term.related_palaces) ? term.related_palaces : [];
      if (term.primary_palace_id !== filters.building && !related.includes(filters.building)) {
        return false;
      }
    }
    if (filters.dynasty && filters.dynasty !== 'all') {
      const dynasty = String(term.dynasty || term.primary_palace_dynasty || '');
      if (!dynasty.includes(filters.dynasty)) return false;
    }
    if (filters.region && filters.region !== 'all') {
      if (String(term.region || '') !== filters.region) return false;
    }
    if (query) {
      const haystack = `${normalizeText(term.term)} ${normalizeText(term.synopsis)}`;
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function groupTerms(terms = []) {
  const building = terms.filter((term) => term.entry_type === 'building');
  const craft = terms.filter((term) => term.entry_type !== 'building');
  return [
    { type: 'building', items: building },
    { type: 'craft', items: craft },
  ].filter((group) => group.items.length > 0);
}

export function countByType(terms = []) {
  let building = 0;
  let craft = 0;
  for (const term of terms) {
    if (term.entry_type === 'building') building += 1;
    else craft += 1;
  }
  return { total: terms.length, building, craft };
}

export function highlightSegments(text, query) {
  const source = String(text ?? '');
  const needle = normalizeText(query).trim();
  if (!needle) return source ? [{ text: source, hit: false }] : [];

  const haystack = normalizeText(source);
  const segments = [];
  let cursor = 0;

  while (cursor < haystack.length) {
    const index = haystack.indexOf(needle, cursor);
    if (index < 0) {
      segments.push({ text: source.slice(cursor), hit: false });
      break;
    }
    if (index > cursor) {
      segments.push({ text: source.slice(cursor, index), hit: false });
    }
    segments.push({ text: source.slice(index, index + needle.length), hit: true });
    cursor = index + needle.length;
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function pickAlternatives(terms = [], filters = {}, taxonomy = null) {
  const sorted = [...terms].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      (a.level_value ?? 0) - (b.level_value ?? 0) ||
      String(a.id).localeCompare(String(b.id))
  );
  const excludedBuilding = filters.building || '';
  const picked = [];

  const buildingCandidates = sorted.filter(
    (term) =>
      term.entry_type === 'building' &&
      term.primary_palace_id &&
      term.primary_palace_id !== excludedBuilding
  );
  if (buildingCandidates[0]) picked.push(buildingCandidates[0]);

  if (picked.length < 2) {
    const craftCandidate = sorted.find(
      (term) => term.entry_type !== 'building' && !picked.includes(term)
    );
    if (craftCandidate) picked.push(craftCandidate);
  }

  for (const term of sorted) {
    if (picked.length >= 2) break;
    if (picked.includes(term)) continue;
    if (term.primary_palace_id && term.primary_palace_id === excludedBuilding) continue;
    picked.push(term);
  }

  // taxonomy 仅用于保持签名稳定，当前替代策略不依赖其顺序
  void taxonomy;
  return picked.slice(0, 2);
}