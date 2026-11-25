import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveGestureOwner, isHorizontalIntent, GESTURE_LIMITS } from '../encyclopediaGestures';
import { createRafLoop, activeLoopCount } from '../raf';

function fakeTarget(selectorMap) {
  return {
    closest(selector) {
      return selectorMap[selector] ? { selector } : null;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('encyclopediaGestures', () => {
  it('区域归属：deck / graph / page', () => {
    expect(resolveGestureOwner(fakeTarget({ '.enc-deck': true }))).toBe('deck');
    expect(resolveGestureOwner(fakeTarget({ '.enc-graph-canvas': true }))).toBe('graph');
    expect(resolveGestureOwner(fakeTarget({}))).toBe('page');
  });

  it('null/无 closest 安全返回 page', () => {
    expect(resolveGestureOwner(null)).toBe('page');
    expect(resolveGestureOwner({})).toBe('page');
    expect(() => resolveGestureOwner(undefined)).not.toThrow();
  });

  it('水平意图：横向主导且超过阈值', () => {
    expect(isHorizontalIntent(20, 2)).toBe(true);
    expect(isHorizontalIntent(-30, 5)).toBe(true);
  });

  it('垂直意图：纵向主导返回 false', () => {
    expect(isHorizontalIntent(4, 30)).toBe(false);
  });

  it('阈值内与临界 30° 判定', () => {
    expect(isHorizontalIntent(3, 0)).toBe(false);
    expect(isHorizontalIntent(10, 17.32)).toBe(false);
    expect(GESTURE_LIMITS.threshold).toBe(8);
  });

  it('createRafLoop 共享单帧且 stop 可移除', () => {
    const scheduled = [];
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    const first = vi.fn();
    const second = vi.fn();
    const loopA = createRafLoop(first);
    const loopB = createRafLoop(second);

    loopA.start();
    loopA.start();
    loopB.start();

    expect(scheduled).toHaveLength(1);
    expect(activeLoopCount()).toBe(2);

    scheduled[0](16);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    loopA.stop();
    expect(activeLoopCount()).toBe(1);
    loopB.stop();
    expect(activeLoopCount()).toBe(0);
  });
});