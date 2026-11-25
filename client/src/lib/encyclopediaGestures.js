/**
 * 卡片与图谱共享的手势基础（T-CARD-04）
 * 不依赖 React；不直接读 document（仅通过传入的 target）。
 */

export const GESTURE_LIMITS = Object.freeze({
  threshold: 8,
  axisSin: 0.5,
  verticalRatio: 1.732,
});

export function resolveGestureOwner(target) {
  if (!target || typeof target.closest !== 'function') return 'page';
  if (target.closest('.enc-deck')) return 'deck';
  if (target.closest('.enc-graph-canvas')) return 'graph';
  return 'page';
}

export function isHorizontalIntent(dx, dy, options = {}) {
  const threshold = Number.isFinite(options.threshold)
    ? options.threshold
    : GESTURE_LIMITS.threshold;
  const distance = Math.hypot(dx, dy);
  if (distance < threshold) return false;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx === 0) return false;
  if (absDy / absDx >= GESTURE_LIMITS.verticalRatio) return false;
  return true;
}