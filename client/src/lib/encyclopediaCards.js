/**
 * 百科 3D 卡片纯函数模块（T-CARD-03）
 * - 不依赖 React / DOM，可在 Node 环境单测
 * - 断点键集合引用 GRAPH_CONFIG.BREAKPOINTS，不复制像素数字
 */
import { GRAPH_CONFIG } from './encyclopediaGraph';

export const CARDS_CONFIG = Object.freeze({
  DEFAULTS: Object.freeze({
    cardDistance: 48,
    verticalDistance: 0,
    depth: 110,
    skewAmount: 5,
    visibleCards: 4,
    cardRadius: 18,
    delay: 4000,
    speed: 1,
    bounce: 0.35,
    parallax: 0.5,
    hoverSpread: 0.1,
    dim: 0.42,
    autoplay: 'auto',
    pauseOnHover: true,
    draggable: true,
  }),
  RANGES: Object.freeze({
    cardDistance: [0, 120],
    verticalDistance: [0, 140],
    depth: [0, 240],
    skewAmount: [0, 24],
    visibleCards: [1, 5],
    cardRadius: [0, 28],
    delay: [2000, 8000],
    speed: [0.5, 2],
    bounce: [0, 1],
    parallax: [0, 2],
    hoverSpread: [0, 0.5],
    dim: [0, 1],
  }),
  PRESET: Object.freeze({
    wide: Object.freeze({ visibleCards: 4, strength: 1 }),
    medium: Object.freeze({ visibleCards: 4, strength: 1 }),
    compact: Object.freeze({ visibleCards: 3, strength: 0.7 }),
    stacked: Object.freeze({ visibleCards: 3, strength: 0.5 }),
    narrow: Object.freeze({ visibleCards: 2, strength: 0 }),
    minimal: Object.freeze({ visibleCards: 0, strength: 0, listFallback: true }),
  }),
  MOTION: Object.freeze({ springMs: 300, settleMs: 300, hoverMs: 160, parallaxMaxPx: 14 }),
  DRAG: Object.freeze({
    threshold: 8,
    axisSin: 0.5,
    commitPx: 48,
    commitVelocity: 0.35,
    dropStepPx: 72,
    maxSteps: 3,
  }),
  CARD_SIZE: Object.freeze({
    height: 500,
    widthMin: 360,
    widthMax: 700,
    stageMinPx: 420,
    stageMaxPx: 720,
    stageVh: 0.62,
    chromePx: 28,
    viewportCapVh: 0.68,
    artHeight: 148,
    titleLines: 2,
    synopsisLines: 3,
  }),
  AUTOPLAY: Object.freeze({ minVisibleRatio: 0.4, touchDefault: false, desktopDefault: true }),
  LAYOUT: Object.freeze({ maxCardWidth: 360, minCardWidth: 200, aspect: 0.72, gapPx: 0 }),
  ICON: Object.freeze({ size: 20, strokeWidth: 1.6 }),
});

const NUMERIC_KEYS = Object.keys(CARDS_CONFIG.RANGES);
const warnedKeys = new Set();
const DEV = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV : false;

function warnOnce(key, message) {
  if (!DEV || warnedKeys.has(key)) return;
  warnedKeys.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[enc-cards] ${key}: ${message}`);
}

function clampNumber(key, rawValue, warnings) {
  const fallback = CARDS_CONFIG.DEFAULTS[key];
  if (rawValue === undefined || rawValue === null) return fallback;

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    warnings.push({ key, reason: 'invalid', value: rawValue });
    warnOnce(key, 'invalid value, fallback to default');
    return fallback;
  }

  const [min, max] = CARDS_CONFIG.RANGES[key];
  const clamped = Math.min(max, Math.max(min, value));
  if (clamped !== value) {
    warnings.push({ key, reason: 'clamped', from: value, to: clamped });
    warnOnce(key, `clamped ${value} → ${clamped}`);
  }
  return clamped;
}

export function clampDeckOptions(raw = {}, context = {}) {
  const warnings = [];
  const options = {};
  const source = raw && typeof raw === 'object' ? raw : {};

  for (const key of NUMERIC_KEYS) {
    options[key] = clampNumber(key, source[key], warnings);
  }

  const itemsLength = Number(context.itemsLength);
  if (Number.isFinite(itemsLength) && itemsLength >= 0) {
    options.visibleCards = Math.min(options.visibleCards, itemsLength);
  }

  if (source.pauseOnHover === undefined || source.pauseOnHover === null) {
    options.pauseOnHover = CARDS_CONFIG.DEFAULTS.pauseOnHover;
  } else {
    options.pauseOnHover = Boolean(source.pauseOnHover);
  }

  if (source.draggable === undefined || source.draggable === null) {
    options.draggable = CARDS_CONFIG.DEFAULTS.draggable;
  } else {
    options.draggable = Boolean(source.draggable);
  }

  const autoRequested = source.autoplay === undefined || source.autoplay === null
    ? 'auto'
    : source.autoplay;
  if (autoRequested === 'auto') {
    options.autoplay = context.reducedMotion
      ? false
      : !context.isTouch && CARDS_CONFIG.AUTOPLAY.desktopDefault;
  } else {
    options.autoplay = Boolean(autoRequested);
  }

  if (context.reducedMotion) {
    options.bounce = 0;
    options.parallax = 0;
    options.hoverSpread = 0;
    options.autoplay = false;
  }

  return { options, warnings };
}

export function deckPresetFor(viewport) {
  const preset = CARDS_CONFIG.PRESET[viewport] || CARDS_CONFIG.PRESET.wide;
  return {
    visibleCards: preset.visibleCards,
    strength: preset.strength,
    listFallback: Boolean(preset.listFallback),
  };
}

function parseImages(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function resolveCardAsset(item) {
  if (!item) return null;
  const images = parseImages(item.image_paths);
  const first = images.find((path) => typeof path === 'string' && path.trim());
  return first || null;
}

export function buildCardItems({ terms = [], taxonomy = null } = {}) {
  if (!Array.isArray(terms) || terms.length === 0) return [];

  const buildings = new Map(
    (taxonomy?.buildings || []).filter(Boolean).map((building) => [building.id, building])
  );

  return [...terms]
    .filter((term) => term?.id && term?.term)
    .sort((a, b) => {
      const typeA = a.entry_type === 'building' ? 0 : 1;
      const typeB = b.entry_type === 'building' ? 0 : 1;
      return (
        typeA - typeB ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        (a.level_value ?? 0) - (b.level_value ?? 0) ||
        String(a.id).localeCompare(String(b.id))
      );
    })
    .map((term) => {
      const building = term.primary_palace_id ? buildings.get(term.primary_palace_id) : null;
      return {
        id: term.id,
        term: term.term,
        synopsis: term.synopsis || '',
        category: term.category || '未分类',
        entry_type: term.entry_type || 'craft',
        dynasty: building?.dynasty || undefined,
        region: building?.region || undefined,
        badge3D: Boolean(building?.has_3d),
        asset: resolveCardAsset(term),
      };
    });
}

export function cardAriaLabel(item, index, total, t) {
  const title = item?.term || '';
  if (typeof t === 'function') {
    const translated = t('encyclopedia.card.aria', '第 {index} / {total} 张：{title}', {
      index: index + 1,
      total,
      title,
    });
    if (typeof translated === 'string' && translated) return translated;
  }
  return `第 ${index + 1} / ${total} 张：${title}`;
}

export function cardSelectIndex(items = [], id) {
  if (!id) return -1;
  return items.findIndex((item) => item.id === id);
}

export function breakpointKeys() {
  return Object.keys(GRAPH_CONFIG.BREAKPOINTS);
}
const numeric = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function resolveDrop(dx = 0, dy = 0, stageWidth = 0, velocityX = 0) {
  const step = CARDS_CONFIG.DRAG.dropStepPx;
  const stage =
    numeric(stageWidth, 0) > 0 ? numeric(stageWidth, 0) : CARDS_CONFIG.CARD_SIZE.widthMax;
  const offset = numeric(dx, 0);
  const raw = Math.floor(Math.abs(offset) / step + 0.35);
  const steps = Math.sign(offset) * Math.min(CARDS_CONFIG.DRAG.maxSteps, raw);
  const vx = numeric(velocityX, 0);
  const sameSign = vx !== 0 && Math.sign(vx) === Math.sign(offset);
  const commit =
    Math.abs(offset) >= 0.55 * step ||
    (Math.abs(vx) >= CARDS_CONFIG.DRAG.commitVelocity && sameSign);
  return { steps, commit, offset, dy: numeric(dy, 0), stageWidth: stage };
}

export function clampDragOffset(dx = 0, dy = 0, box = {}) {
  const width = numeric(box.width ?? box.stageWidth, CARDS_CONFIG.CARD_SIZE.stageMaxPx);
  const height = numeric(box.height ?? box.stageHeight, CARDS_CONFIG.CARD_SIZE.stageMaxPx);
  const maxX = Math.max(0, (width * 0.9) / 2);
  const maxY = Math.max(0, (height * 0.9) / 2);
  const clamp = (value, max) => Math.min(max, Math.max(-max, value));
  return { x: clamp(numeric(dx, 0), maxX), y: clamp(numeric(dy, 0), maxY) };
}

export function cardRectFor(box = {}) {
  const stageWidth = numeric(box.stageWidth ?? box.width, CARDS_CONFIG.CARD_SIZE.stageMaxPx);
  const stageHeight = numeric(box.stageHeight ?? box.height, CARDS_CONFIG.CARD_SIZE.stageMaxPx);
  const width = Math.min(
    stageWidth,
    CARDS_CONFIG.CARD_SIZE.widthMax,
    Math.max(
      CARDS_CONFIG.CARD_SIZE.widthMin,
      numeric(box.cardWidth, CARDS_CONFIG.CARD_SIZE.widthMax)
    )
  );
  const height = Math.min(stageHeight, numeric(box.cardHeight, CARDS_CONFIG.CARD_SIZE.height));
  return { width, height, x: (stageWidth - width) / 2, y: (stageHeight - height) / 2 };
}