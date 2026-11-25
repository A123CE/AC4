import guestSession from './guestSession';

const EVENT_NAMES = new Set([
  'page_view',
  'guest_3d_enter',
  'guest_quota_blocked',
  'register_prompt_show',
  'register_prompt_click',
  'search',
  'search_zero',
  'favorite_click',
  'stamp_earned',
  'badge_earned',
  'share_click',
  'share_open',
  'tts_play',
  'tier_fallback',
  'video_unavailable',
  'leaderboard_view',
  'leaderboard_rate_limited',
  'encyclopedia_term_view',
  'encyclopedia_term_open',
  'encyclopedia_filter_building',
  'encyclopedia_reverse_click',
  // 知识图谱
  'graph_view',
  'graph_node_click',
  'graph_expand',
  'graph_fallback',
  // 3D 旋转
  'graph_rotate',
  'graph_drag',
  'graph_reset',
  // 卡片
  'card_view',
  'card_swap',
  'card_drag',
  
]);

const ALLOWED_PROP_KEYS = new Set([
  'q_hash',
  'q_length',
  'entity_type',
  'entity_id',
  'channel',
  'reason',
  'route_id',
  'category',
  'stage',
  'entry_type',
  'palace_id',
  'result_count',
]);

const OFF_KEY = 'ac4_analytics_off';
const BATCH_SIZE = 5;

let queue = [];
let installed = false;
let anonCache = { day: '', hash: '' };
const sessionHash = randomHex(64);

function readEnabled() {
  try {
    return localStorage.getItem(OFF_KEY) !== '1';
  } catch {
    return true;
  }
}

export function isAnalyticsEnabled() {
  return readEnabled();
}

export function setAnalyticsEnabled(enabled) {
  try {
    localStorage.setItem(OFF_KEY, enabled ? '0' : '1');
  } catch {
    /* 忽略存储失败 */
  }
  if (!enabled) queue = [];
}

function randomHex(length) {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(length / 2);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* 回退 */
  }
  let output = '';
  while (output.length < length) {
    output += Math.random().toString(16).slice(2);
  }
  return output.slice(0, length);
}

function fallbackHash(value) {
  let output = '';
  let seed = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
    output += seed.toString(16).padStart(8, '0');
  }
  return `${output}${randomHex(64)}`.slice(0, 64);
}

async function sha256(value) {
  try {
    if (globalThis.crypto?.subtle && typeof TextEncoder !== 'undefined') {
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(value)
      );
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    }
  } catch {
    /* 回退到本地哈希 */
  }
  return fallbackHash(value);
}

function sanitizeProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {};

  const output = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (key === 'q' || /email|username|password|token|^ip$/i.test(key)) continue;
    if (typeof value === 'string') output[key] = value.slice(0, 200);
    else if (typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    }
  }
  return output;
}

function safePath(value) {
  if (!value) return '';
  return String(value).split('?')[0].slice(0, 255);
}

function readLocale() {
  try {
    return localStorage.getItem('ac4_lang') === 'en' ? 'en' : 'zh-CN';
  } catch {
    return 'zh-CN';
  }
}

function readTier() {
  try {
    return localStorage.getItem('ac4_tier_override') || 'standard';
  } catch {
    return 'standard';
  }
}

async function getAnonHash() {
  const day = new Date().toISOString().slice(0, 10);
  if (anonCache.day === day && anonCache.hash) return anonCache.hash;

  const gid = guestSession.read().gid;
  const hash = await sha256(`${gid}|${day}|ac4`);
  anonCache = { day, hash };
  return hash;
}

export function track(eventName, props = {}, meta = {}) {
  if (!isAnalyticsEnabled() || !EVENT_NAMES.has(eventName)) return false;

  queue.push({
    event_name: eventName,
    entity_type: props.entity_type || null,
    entity_id: props.entity_id || null,
    path: safePath(meta.path || (typeof location !== 'undefined' ? location.pathname : '')),
    props: sanitizeProps(props),
  });

  if (queue.length >= BATCH_SIZE) flush();
  return true;
}

export function trackPageView(path) {
  track('page_view', {}, { path });
}

export async function trackSearch(query) {
  if (!isAnalyticsEnabled()) return;
  const qHash = await sha256(String(query));
  track(
    'search',
    { q_hash: qHash, q_length: String(query).length },
    { path: '/search' }
  );
}

export async function flush(useBeacon = true) {
  if (!isAnalyticsEnabled() || queue.length === 0) return;

  const events = queue;
  queue = [];

  const payload = {
    events,
    anon_hash: await getAnonHash(),
    session_hash: sessionHash,
    locale: readLocale(),
    tier: readTier(),
    path: events[events.length - 1]?.path || '',
  };

  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      if (navigator.sendBeacon('/api/metrics/events', blob)) return;
    }

    await fetch('/api/metrics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* 上报失败不阻塞业务 */
  }
}

export function installAnalyticsFlush() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush(true);
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => flush(true));
}

export function _resetAnalyticsForTest() {
  queue = [];
  installed = false;
  anonCache = { day: '', hash: '' };
}

export function _peekQueueForTest() {
  return [...queue];
}

export default {
  track,
  trackPageView,
  trackSearch,
  flush,
  setAnalyticsEnabled,
  isAnalyticsEnabled,
  installAnalyticsFlush,
};