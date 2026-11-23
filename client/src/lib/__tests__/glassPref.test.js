import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readGlassOff, applyGlassPref, subscribeGlassPref } from '../glassPref';

const KEY = 'ac4_glass_off';
const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matches = false) {
  const listeners = new Set();
  const media = {
    matches,
    addEventListener: (type, handler) => {
      if (type === 'change') listeners.add(handler);
    },
    removeEventListener: (type, handler) => {
      if (type === 'change') listeners.delete(handler);
    },
    dispatch: () => listeners.forEach((handler) => handler({ matches })),
    listeners,
  };
  window.matchMedia = vi.fn(() => media);
  return media;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.glass;
});

afterEach(() => {
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  else delete window.matchMedia;
  delete document.documentElement.dataset.glass;
});

describe('glassPref 减少透明度', () => {
  it('默认关闭，且不写 data-glass', () => {
    expect(readGlassOff()).toBe(false);
    expect(applyGlassPref()).toBe(false);
    expect(document.documentElement.dataset.glass).toBeUndefined();
  });

  it('本机键为 1 时写入 data-glass=off', () => {
    localStorage.setItem(KEY, '1');
    expect(readGlassOff()).toBe(true);
    expect(applyGlassPref()).toBe(true);
    expect(document.documentElement.dataset.glass).toBe('off');
  });

  it('matchMedia 不存在时安静降级', () => {
    window.matchMedia = undefined;
    expect(() => readGlassOff()).not.toThrow();
    expect(readGlassOff()).toBe(false);
    expect(() => subscribeGlassPref(() => {})()).not.toThrow();
  });

  it('系统减少透明度变化触发订阅，取消后不再触发', () => {
    const media = mockMatchMedia(false);
    const callback = vi.fn();

    const unsubscribe = subscribeGlassPref(callback);
    localStorage.setItem(KEY, '1');
    media.dispatch();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(true);

    unsubscribe();
    expect(media.listeners.size).toBe(0);
    media.dispatch();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});