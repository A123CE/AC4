/**
 * 玻璃面板偏好（减少透明度）
 * 本机键 ac4_glass_off 优先；系统 prefers-reduced-transparency 作为兜底。
 */

const STORAGE_KEY = 'ac4_glass_off';
const MEDIA_QUERY = '(prefers-reduced-transparency: reduce)';

function getMediaQuery() {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia(MEDIA_QUERY);
    }
  } catch {
    /* 老浏览器无 matchMedia 时静默跳过 */
  }
  return null;
}

export function readGlassOff() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* 存储不可用 */
  }
  const media = getMediaQuery();
  return media?.matches === true;
}

export function applyGlassPref() {
  const off = readGlassOff();
  if (typeof document !== 'undefined') {
    if (off) document.documentElement.dataset.glass = 'off';
    else delete document.documentElement.dataset.glass;
  }
  return off;
}

export function subscribeGlassPref(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const media = getMediaQuery();
  const notify = () => callback(applyGlassPref());
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) notify();
  };

  media?.addEventListener?.('change', notify);
  window.addEventListener?.('storage', onStorage);

  return () => {
    media?.removeEventListener?.('change', notify);
    window.removeEventListener?.('storage', onStorage);
  };
}

export default {
  readGlassOff,
  applyGlassPref,
  subscribeGlassPref,
};