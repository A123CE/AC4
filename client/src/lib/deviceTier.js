/**
 * 设备档位判定
 *
 * 优先级：用户覆盖 > 省流量 > 无 WebGL2 > 低内存/低核数 > 慢网络 > 小视口
 * high 仅在宽屏、内存/核数充足、WebGL2 与 4g 同时满足时返回。
 */

export const TIER_KEY = 'ac4_tier_override';
export const TIERS = ['high', 'standard', 'smooth'];

let webgl2Cache = null;

export function probeWebGL2() {
  if (webgl2Cache !== null) return webgl2Cache;

  if (typeof document === 'undefined') {
    webgl2Cache = false;
    return webgl2Cache;
  }

  try {
    const canvas = document.createElement('canvas');
    webgl2Cache = !!canvas.getContext('webgl2');
  } catch {
    webgl2Cache = false;
  }
  return webgl2Cache;
}

export function clearWebGL2Cache() {
  webgl2Cache = null;
}

export function detectTierInfo(env = {}) {
  const width =
    env.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const deviceMemory =
    env.deviceMemory ??
    (typeof navigator !== 'undefined' ? navigator.deviceMemory : 8) ??
    8;
  const hardwareConcurrency =
    env.hardwareConcurrency ??
    (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 8) ??
    8;
  const connection =
    env.connection ??
    (typeof navigator !== 'undefined' ? navigator.connection : null);
  const saveData = env.saveData ?? connection?.saveData ?? false;
  const effectiveType = env.effectiveType ?? connection?.effectiveType ?? '4g';
  const webgl2 = env.webgl2 ?? probeWebGL2();

  if (saveData) return { tier: 'smooth', reason: 'save-data' };
  if (!webgl2) return { tier: 'smooth', reason: 'no-webgl2' };
  if (deviceMemory <= 4 || hardwareConcurrency <= 4) {
    return { tier: 'smooth', reason: 'low-memory' };
  }
  if (['slow-2g', '2g', '3g'].includes(effectiveType)) {
    return { tier: 'smooth', reason: 'slow-network' };
  }
  if (width < 768) return { tier: 'smooth', reason: 'small-viewport' };

  if (
    width >= 1024 &&
    deviceMemory >= 8 &&
    hardwareConcurrency >= 8 &&
    effectiveType === '4g'
  ) {
    return { tier: 'high', reason: null };
  }

  return { tier: 'standard', reason: null };
}

export function detectTier(env = {}) {
  return detectTierInfo(env).tier;
}

export function resolveTier(override, detected) {
  if (TIERS.includes(override)) return override;
  return TIERS.includes(detected) ? detected : 'standard';
}

export function readTierOverride() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(TIER_KEY);
    return TIERS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeTierOverride(value) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (TIERS.includes(value)) localStorage.setItem(TIER_KEY, value);
    else localStorage.removeItem(TIER_KEY);
  } catch {
    /* 忽略写入失败 */
  }
}

export function onNetworkChange(callback) {
  if (typeof navigator === 'undefined') return () => {};
  const connection = navigator.connection;
  if (!connection?.addEventListener) return () => {};

  const handler = () => callback();
  connection.addEventListener('change', handler);
  return () => connection.removeEventListener('change', handler);
}