import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GRAPH_THEME_KEY,
  DEFAULT_GRAPH_THEME,
  GRAPH_THEMES,
  resolveGraphTheme,
  readGraphTheme,
  writeGraphTheme,
  nextTheme,
} from '../graphTheme';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('graphTheme 图谱主题偏好', () => {
  it('默认深色，非法值回退深色', () => {
    expect(DEFAULT_GRAPH_THEME).toBe('dark');
    expect(GRAPH_THEMES).toEqual(['dark', 'light']);
    expect(resolveGraphTheme(null)).toBe('dark');
    expect(resolveGraphTheme('sepia')).toBe('dark');
    expect(resolveGraphTheme('light')).toBe('light');
  });

  it('读写 localStorage 并记忆偏好', () => {
    writeGraphTheme('light');
    expect(localStorage.getItem(GRAPH_THEME_KEY)).toBe('light');
    expect(readGraphTheme()).toBe('light');
    writeGraphTheme('dark');
    expect(readGraphTheme()).toBe('dark');
  });

  it('只读会话不写存储', () => {
    writeGraphTheme('light', { readOnly: true });
    expect(localStorage.getItem(GRAPH_THEME_KEY)).toBeNull();
  });

  it('切换在深浅之间往返', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('weird')).toBe('light');
  });

  it('存储抛错时降级为内存态且不抛出', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => writeGraphTheme('light')).not.toThrow();
    expect(readGraphTheme()).toBe('light');
  });
});