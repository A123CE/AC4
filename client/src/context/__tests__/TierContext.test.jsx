import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TierProvider, useTier } from '../TierContext';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.tier;
});

describe('TierContext 根属性', () => {
  it('初始写入 data-tier，切档同步，卸载清理', () => {
    const { result, unmount } = renderHook(() => useTier(), {
      wrapper: TierProvider,
    });

    expect(document.documentElement.dataset.tier).toBe(result.current.tier);

    act(() => result.current.setTier('smooth'));
    expect(document.documentElement.dataset.tier).toBe('smooth');

    unmount();
    expect(document.documentElement.dataset.tier).toBeUndefined();
  });
});