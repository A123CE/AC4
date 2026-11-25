/**
 * 埋点节流与去重小工具（T-CARD-17）
 * 不依赖 React；时间戳由调用方环境决定（浏览器用 Date.now）。
 */

export function createThrottle(intervalMs = 500) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < intervalMs) return false;
    last = now;
    return true;
  };
}

const IMPRESSION_KEY = '__acEncyclopediaDeckImpressions';

export function impressionSeen(id) {
  if (!id || typeof globalThis === 'undefined') return false;
  if (!globalThis[IMPRESSION_KEY]) globalThis[IMPRESSION_KEY] = new Set();
  const seen = globalThis[IMPRESSION_KEY];
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
}