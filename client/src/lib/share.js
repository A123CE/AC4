import { shareVisit } from '../api';

const VALID_CHANNELS = new Set(['copy', 'system', 'wechat', 'weibo', 'link']);

function normalizeChannel(channel) {
  return VALID_CHANNELS.has(channel) ? channel : 'copy';
}

/**
 * 生成站内分享链接
 * URL 中只允许 type/id/ch/query，绝不携带 token 或 user_id。
 */
export function buildShareUrl({ type = 'palace', id, channel = 'copy', query = {} } = {}) {
  const ch = normalizeChannel(channel);

  if (type === 'search') {
    const params = new URLSearchParams({ ...query, ch });
    return `/search?${params.toString()}`;
  }

  return `/share/${type}/${encodeURIComponent(id)}?ch=${ch}`;
}

export function buildAbsoluteShareUrl(params, origin) {
  const url = buildShareUrl(params);
  if (/^https?:\/\//i.test(url)) return url;
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${url}`;
}

const CLASSROOM_FONTS = new Set(['standard', 'large', 'xlarge']);

/**
 * 课堂只读链接：只携带视图与字号，不含 token/user_id/utm/score。
 */
export function buildClassroomLink(path, { font = 'large' } = {}) {
  const safeFont = CLASSROOM_FONTS.has(font) ? font : 'large';
  const separator = String(path).includes('?') ? '&' : '?';
  return `${path}${separator}view=classroom&font=${safeFont}&readonly=1`;
}

/**
 * 三级降级分享：系统分享 → 剪贴板 → 手动复制
 * @returns {Promise<{method:'system'|'clipboard'|'manual'|'cancel', url:string}>}
 */
export async function shareContent({
  type = 'palace',
  id,
  channel = 'copy',
  title = '华夏古建',
  text = '发现一座有意思的中国古建筑',
  query = {},
} = {}) {
  const url = buildAbsoluteShareUrl({ type, id, channel, query });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      shareVisit(type, id, 'system').catch(() => {});
      return { method: 'system', url };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'cancel', url };
    }
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(url);
      shareVisit(type, id, normalizeChannel(channel)).catch(() => {});
      return { method: 'clipboard', url };
    } catch {
      /* 继续走手动复制 */
    }
  }

  return { method: 'manual', url };
}