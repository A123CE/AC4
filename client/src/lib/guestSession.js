/**
 * 游客本机会话
 *
 * 纯前端匿名状态：不建服务端账号、不上传任何 PII。
 * - localStorage key: ac4_guest_v1
 * - 30 天未更新自动过期重建
 * - localStorage 不可用或数据损坏时降级为内存态，接口不变
 * - 3D 试看额度：每日 3 座，同建筑当日重复不消耗
 */

const STORAGE_KEY = 'ac4_guest_v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DAILY_3D_LIMIT = 3;
const DAILY_QUIZ_LIMIT = 3;
const MAX_STAGED_COLLECTIONS = 20;
const MAX_DRAFT_NOTES = 5;
const NOTE_MAX_LENGTH = 500;
const MAX_LAST_VISITED = 10;
const MAX_DISMISSED = 50;
const SCHEMA_VERSION = 1;

let memoryState = null;

function nowIso() {
  return new Date().toISOString();
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* 忽略 */ }
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createDefaultState() {
  const now = nowIso();
  return {
    v: SCHEMA_VERSION,
    gid: generateId(),
    createdAt: now,
    updatedAt: now,
    preview: { date: todayKey(), palaces: [] },
    quizQuota: { date: todayKey(), count: 0 },
    quiz: { sessionId: null, answers: [] },
    stagedCollections: [],
    noteDrafts: [],
    lastVisited: [],
    dismissed: [],
    routeProgress: {},
    hotspotReads: [],
    prefs: {
      reducedMotion: 'auto',
      personalizationEnabled: true,
    },
  };
}

function readRaw() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persist(state) {
  memoryState = state;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch { /* localStorage 不可用，保留内存态 */ }
  return state;
}

function isExpired(state) {
  const updated = Date.parse(state?.updatedAt);
  if (!Number.isFinite(updated)) return true;
  return Date.now() - updated > TTL_MS;
}

function normalizeCollection(item) {
  if (!item || typeof item !== 'object') return null;
  const palaceId = item.palace_id ?? item.palaceId;
  if (!palaceId) return null;
  return {
    palace_id: String(palaceId),
    category: item.category ? String(item.category).slice(0, 50) : '默认',
    note: item.note ? String(item.note).slice(0, NOTE_MAX_LENGTH) : null,
    stagedAt: item.stagedAt || nowIso(),
  };
}

function normalizeNote(item) {
  if (!item || typeof item !== 'object') return null;
  const palaceId = item.palace_id ?? item.palaceId;
  if (!palaceId) return null;
  return {
    palace_id: String(palaceId),
    note: item.note ? String(item.note).slice(0, NOTE_MAX_LENGTH) : '',
    updatedAt: item.updatedAt || nowIso(),
  };
}

function normalizeVisited(item) {
  if (!item || typeof item !== 'object') return null;
  const palaceId = item.palace_id ?? item.palaceId;
  if (!palaceId) return null;
  return {
    palace_id: String(palaceId),
    visitedAt: item.visitedAt || nowIso(),
  };
}

function normalize(raw) {
  const now = nowIso();
  const today = todayKey();

  const state = {
    v: SCHEMA_VERSION,
    gid: typeof raw.gid === 'string' && raw.gid ? raw.gid : generateId(),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    preview: {
      date: typeof raw.preview?.date === 'string' ? raw.preview.date : today,
      palaces: toArray(raw.preview?.palaces)
        .filter((id) => typeof id === 'string' && id)
        .slice(0, DAILY_3D_LIMIT),
    },
    quizQuota: {
      date: typeof raw.quizQuota?.date === 'string' ? raw.quizQuota.date : today,
      count: Number.isFinite(raw.quizQuota?.count) ? Math.max(0, raw.quizQuota.count) : 0,
    },
    quiz: {
      sessionId: typeof raw.quiz?.sessionId === 'string' ? raw.quiz.sessionId : null,
      answers: toArray(raw.quiz?.answers).slice(-20),
    },
    stagedCollections: toArray(raw.stagedCollections)
      .map(normalizeCollection)
      .filter(Boolean)
      .slice(0, MAX_STAGED_COLLECTIONS),
    noteDrafts: toArray(raw.noteDrafts)
      .map(normalizeNote)
      .filter(Boolean)
      .slice(0, MAX_DRAFT_NOTES),
    lastVisited: toArray(raw.lastVisited)
      .map(normalizeVisited)
      .filter(Boolean)
      .slice(0, MAX_LAST_VISITED),
    dismissed: toArray(raw.dismissed)
      .filter((key) => typeof key === 'string' && key)
      .slice(-MAX_DISMISSED),
    routeProgress:
      raw.routeProgress &&
      typeof raw.routeProgress === 'object' &&
      !Array.isArray(raw.routeProgress)
        ? Object.fromEntries(
            Object.entries(raw.routeProgress)
              .filter(([, value]) => Number.isFinite(Number(value)))
              .map(([key, value]) => [String(key), Math.max(1, Number(value))])
          )
        : {},
    hotspotReads: toArray(raw.hotspotReads)
      .filter(
        (item) =>
          item &&
          typeof item.palace_id === 'string' &&
          typeof item.hotspot_id === 'string'
      )
      .map((item) => ({
        palace_id: item.palace_id,
        hotspot_id: item.hotspot_id,
        read_at: item.read_at || nowIso(),
      }))
      .slice(-100),
    prefs: {
      reducedMotion: raw.prefs?.reducedMotion || 'auto',
      personalizationEnabled: raw.prefs?.personalizationEnabled !== false,
    },
  };

  // 跨日重置试看与答题额度
  if (state.preview.date !== today) {
    state.preview = { date: today, palaces: [] };
  }
  if (state.quizQuota.date !== today) {
    state.quizQuota = { date: today, count: 0 };
  }

  return state;
}

function reset() {
  const next = createDefaultState();
  persist(next);
  return clone(next);
}

function read() {
  const raw = readRaw();

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (isExpired(parsed)) return reset();
        const normalized = normalize(parsed);
        memoryState = normalized;
        return clone(normalized);
      }
    } catch { /* 数据损坏，重建 */ }
    return reset();
  }

  if (memoryState) {
    if (isExpired(memoryState)) return reset();
    return clone(memoryState);
  }

  return reset();
}

function update(patch) {
  const current = read();
  const next = {
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {}),
    updatedAt: nowIso(),
  };
  persist(next);
  return clone(next);
}

function rememberVisit(state, palaceId) {
  const rest = state.lastVisited.filter((item) => item.palace_id !== palaceId);
  state.lastVisited = [{ palace_id: palaceId, visitedAt: nowIso() }, ...rest].slice(
    0,
    MAX_LAST_VISITED
  );
}

/**
 * 3D 试看额度
 * 1. 跨日重置（read 已处理，这里再显式兜底）
 * 2. 已含该建筑 → 放行，不消耗额度
 * 3. 当日不足 3 座 → 加入并放行
 * 4. 否则 blocked
 */
function tryEnter3D(palaceId) {
  const id = String(palaceId || '').trim();
  if (!id) return { allowed: false, remaining: 0, reason: 'invalid' };

  const state = read();
  const today = todayKey();
  if (state.preview.date !== today) {
    state.preview = { date: today, palaces: [] };
  }

  if (state.preview.palaces.includes(id)) {
    rememberVisit(state, id);
    persist({ ...state, updatedAt: nowIso() });
    return {
      allowed: true,
      remaining: Math.max(0, DAILY_3D_LIMIT - state.preview.palaces.length),
      reason: 'already',
    };
  }

  if (state.preview.palaces.length < DAILY_3D_LIMIT) {
    state.preview.palaces.push(id);
    rememberVisit(state, id);
    persist({ ...state, updatedAt: nowIso() });
    return {
      allowed: true,
      remaining: Math.max(0, DAILY_3D_LIMIT - state.preview.palaces.length),
      reason: 'added',
    };
  }

  return { allowed: false, remaining: 0, reason: 'limit' };
}

/**
 * 游客答题额度 — 每日 3 题
 */
function tryStartQuiz() {
  const state = read();
  const today = todayKey();
  if (state.quizQuota.date !== today) {
    state.quizQuota = { date: today, count: 0 };
  }

  if (state.quizQuota.count >= DAILY_QUIZ_LIMIT) {
    return { allowed: false, remaining: 0, used: state.quizQuota.count, reason: 'limit' };
  }

  state.quizQuota.count += 1;
  state.quiz.sessionId = `guest_quiz_${today}`;
  persist({ ...state, updatedAt: nowIso() });

  return {
    allowed: true,
    remaining: Math.max(0, DAILY_QUIZ_LIMIT - state.quizQuota.count),
    used: state.quizQuota.count,
    reason: 'added',
  };
}

function normalizeCollectionInput(input, category, note) {
  if (input && typeof input === 'object') {
    return {
      palace_id: String(input.palace_id ?? input.palaceId ?? '').trim(),
      category: input.category || '默认',
      note: input.note ?? null,
    };
  }
  return {
    palace_id: String(input || '').trim(),
    category: category || '默认',
    note: note ?? null,
  };
}

function stageCollection(input, category, note) {
  const item = normalizeCollectionInput(input, category, note);
  if (!item.palace_id) return { ok: false, reason: 'invalid' };

  const state = read();
  const existingIndex = state.stagedCollections.findIndex(
    (entry) => entry.palace_id === item.palace_id
  );

  if (existingIndex >= 0) {
    state.stagedCollections[existingIndex] = {
      ...state.stagedCollections[existingIndex],
      category: String(item.category).slice(0, 50),
      note: item.note ? String(item.note).slice(0, NOTE_MAX_LENGTH) : null,
      stagedAt: state.stagedCollections[existingIndex].stagedAt || nowIso(),
    };
    persist({ ...state, updatedAt: nowIso() });
    return { ok: true, count: state.stagedCollections.length, item: clone(state.stagedCollections[existingIndex]) };
  }

  if (state.stagedCollections.length >= MAX_STAGED_COLLECTIONS) {
    return { ok: false, reason: 'limit', count: state.stagedCollections.length };
  }

  const entry = {
    palace_id: item.palace_id,
    category: String(item.category).slice(0, 50),
    note: item.note ? String(item.note).slice(0, NOTE_MAX_LENGTH) : null,
    stagedAt: nowIso(),
  };
  state.stagedCollections.push(entry);
  persist({ ...state, updatedAt: nowIso() });

  return { ok: true, count: state.stagedCollections.length, item: clone(entry) };
}

function draftNote(palaceId, note) {
  const id = String(palaceId || '').trim();
  const text = String(note ?? '');

  if (!id) return { ok: false, reason: 'invalid' };
  if (text.length > NOTE_MAX_LENGTH) {
    return { ok: false, reason: 'limit', maxLength: NOTE_MAX_LENGTH };
  }

  const state = read();
  const existingIndex = state.noteDrafts.findIndex((entry) => entry.palace_id === id);

  if (existingIndex >= 0) {
    state.noteDrafts[existingIndex] = { ...state.noteDrafts[existingIndex], note: text, updatedAt: nowIso() };
    persist({ ...state, updatedAt: nowIso() });
    return { ok: true, count: state.noteDrafts.length, item: clone(state.noteDrafts[existingIndex]) };
  }

  if (state.noteDrafts.length >= MAX_DRAFT_NOTES) {
    return { ok: false, reason: 'limit', count: state.noteDrafts.length };
  }

  const entry = { palace_id: id, note: text, updatedAt: nowIso() };
  state.noteDrafts.push(entry);
  persist({ ...state, updatedAt: nowIso() });

  return { ok: true, count: state.noteDrafts.length, item: clone(entry) };
}

/**
 * 合并完成后清理非 rejected 暂存，保留被拒绝条目供用户稍后处理
 */
function applyMergeResult(items = []) {
  const rejectedIds = new Set(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.status === 'rejected' && item?.palace_id)
      .map((item) => String(item.palace_id))
  );

  const state = read();
  state.stagedCollections = state.stagedCollections.filter((item) =>
    rejectedIds.has(item.palace_id)
  );
  state.noteDrafts = state.noteDrafts.filter((item) =>
    rejectedIds.has(item.palace_id)
  );

  persist({ ...state, updatedAt: nowIso() });

  return {
    collections: state.stagedCollections.length,
    notes: state.noteDrafts.length,
  };
}

function snapshotForMerge() {
  const state = read();
  return {
    gid: state.gid,
    collections: state.stagedCollections.map((item) => ({ ...item })),
    notes: state.noteDrafts.map((item) => ({ ...item })),
    lastVisited: state.lastVisited.map((item) => ({ ...item })),
    capturedAt: state.updatedAt,
  };
}

function getRouteProgress(routeId) {
  const id = String(routeId || '').trim();
  if (!id) return 1;
  const state = read();
  return Math.max(1, Number(state.routeProgress?.[id]) || 1);
}

function setRouteProgress(routeId, stopOrder) {
  const id = String(routeId || '').trim();
  if (!id) return { ok: false };

  const order = Math.max(1, Number(stopOrder) || 1);
  const state = read();
  state.routeProgress = { ...(state.routeProgress || {}), [id]: order };
  persist({ ...state, updatedAt: nowIso() });

  return { ok: true, route_id: id, stop_order: order };
}

function isHotspotRead(palaceId, hotspotId) {
  const state = read();
  return state.hotspotReads.some(
    (item) =>
      item.palace_id === String(palaceId) &&
      item.hotspot_id === String(hotspotId)
  );
}

function markHotspotRead(palaceId, hotspotId) {
  const palace = String(palaceId || '').trim();
  const hotspot = String(hotspotId || '').trim();
  if (!palace || !hotspot) return { ok: false };

  const state = read();
  if (
    !state.hotspotReads.some(
      (item) => item.palace_id === palace && item.hotspot_id === hotspot
    )
  ) {
    state.hotspotReads = [
      ...state.hotspotReads,
      { palace_id: palace, hotspot_id: hotspot, read_at: nowIso() },
    ].slice(-100);
    persist({ ...state, updatedAt: nowIso() });
  }

  return { ok: true, palace_id: palace, hotspot_id: hotspot };
}

function getHotspotReads(palaceId) {
  const state = read();
  const palace = String(palaceId || '').trim();
  return state.hotspotReads.filter(
    (item) => !palace || item.palace_id === palace
  );
}

function markDismissed(key) {
  const id = String(key || '').trim();
  if (!id) return { ok: false };

  const state = read();
  if (!state.dismissed.includes(id)) {
    state.dismissed = [...state.dismissed, id].slice(-MAX_DISMISSED);
    persist({ ...state, updatedAt: nowIso() });
  }

  return { ok: true, dismissed: state.dismissed.includes(id) };
}

/**
 * 仅供单测：清空内存态与持久化数据
 */
function _resetForTest() {
  memoryState = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch { /* 忽略 */ }
}

const guestSession = {
  read,
  update,
  reset,
  tryEnter3D,
  tryStartQuiz,
  stageCollection,
  draftNote,
  snapshotForMerge,
  applyMergeResult,
  getRouteProgress,
  setRouteProgress,
  isHotspotRead,
  markHotspotRead,
  getHotspotReads,
  markDismissed,
  _resetForTest,
  STORAGE_KEY,
  limits: {
    daily3D: DAILY_3D_LIMIT,
    dailyQuiz: DAILY_QUIZ_LIMIT,
    stagedCollections: MAX_STAGED_COLLECTIONS,
    draftNotes: MAX_DRAFT_NOTES,
    noteLength: NOTE_MAX_LENGTH,
    lastVisited: MAX_LAST_VISITED,
  },
};

export {
  read,
  update,
  reset,
  tryEnter3D,
  tryStartQuiz,
  stageCollection,
  draftNote,
  snapshotForMerge,
  applyMergeResult,
  getRouteProgress,
  setRouteProgress,
  isHotspotRead,
  markHotspotRead,
  getHotspotReads,
  markDismissed,
  _resetForTest,
  STORAGE_KEY,
};

export default guestSession;