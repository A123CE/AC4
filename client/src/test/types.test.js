import { describe, it, expect } from 'vitest';
import {
  isPalace,
  isCollectionItem,
  isSearchGroup,
  asArray,
  clampNumber,
  toISO,
} from '../types';

describe('运行时守卫', () => {
  it('正常对象通过校验', () => {
    expect(isPalace({ id: 'taihedian', name: '太和殿' })).toBe(true);
    expect(isCollectionItem({ palace_id: 'taihedian' })).toBe(true);
    expect(
      isSearchGroup({ type: 'palace', label: '建筑', items: [] })
    ).toBe(true);
  });

  it('缺字段返回 false', () => {
    expect(isPalace({ id: 'taihedian' })).toBe(false);
    expect(isCollectionItem({})).toBe(false);
    expect(isSearchGroup({ type: 'palace', items: [] })).toBe(false);
  });

  it('类型错误时安全降级', () => {
    expect(isPalace(null)).toBe(false);
    expect(asArray(null)).toEqual([]);
    expect(asArray('not-array')).toEqual([]);
    expect(clampNumber('abc', 7)).toBe(7);
    expect(clampNumber('12', 0)).toBe(12);
    expect(toISO('bad-date')).toBeNull();
    expect(toISO('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
  });
});