/**
 * 成就事件总线
 *
 * 触发源（登录 / 浏览 / 答题 / 签到）只负责广播服务端返回的 achievements，
 * 由 AchievementToast 统一合并成一次结算弹层，避免多处弹窗。
 */

const EVENT_NAME = 'ac4:achievements';

export function emitAchievements(achievements) {
  if (!achievements || typeof window === 'undefined') return;

  const stamps = Array.isArray(achievements.stamps) ? achievements.stamps : [];
  const badges = Array.isArray(achievements.badges) ? achievements.badges : [];
  if (stamps.length === 0 && badges.length === 0) return;

  try {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { stamps, badges, at: Date.now() },
      })
    );
  } catch {
    /* 自定义事件不可用时静默 */
  }
}

export function onAchievements(handler) {
  if (typeof window === 'undefined') return () => {};

  const listener = (event) => {
    handler?.(event.detail || { stamps: [], badges: [] });
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export { EVENT_NAME };