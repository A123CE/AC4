import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { CollectionsProvider, useCollections } from '../CollectionsContext';
import guestSession from '../../lib/guestSession';

vi.mock('../../api', () => ({
  getCollections: vi.fn(),
  addCollection: vi.fn(),
  removeCollection: vi.fn(),
  updateCollectionNote: vi.fn(),
}));

import * as api from '../../api';

function wrapper({ children }) {
  return (
    <AuthProvider>
      <CollectionsProvider>{children}</CollectionsProvider>
    </AuthProvider>
  );
}

function login() {
  localStorage.setItem(
    'palace_auth',
    JSON.stringify({ token: 'test-token', user: { id: 1, username: 'tester', role: 'user' } })
  );
}

beforeEach(() => {
  localStorage.clear();
  guestSession._resetForTest();
  vi.clearAllMocks();
  api.getCollections.mockResolvedValue({ data: { success: true, data: [] } });
  api.addCollection.mockResolvedValue({ data: { success: true } });
  api.removeCollection.mockResolvedValue({ data: { success: true } });
  api.updateCollectionNote.mockResolvedValue({
    data: { success: true, data: { note: 'x', updated_at: '2026-01-01T00:00:00.000Z' } },
  });
});

describe('CollectionsContext', () => {
  it('登录后拉取收藏并生成 Set', async () => {
    login();
    api.getCollections.mockResolvedValue({
      data: {
        success: true,
        data: [{ palace_id: 'a', collection_category: '默认', note: null }],
      },
    });

    const { result } = renderHook(() => useCollections(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCollected('a')).toBe(true);
    });
    expect(api.getCollections).toHaveBeenCalled();
    expect(result.current.getCollection('a')?.collection_category).toBe('默认');
  });

  it('乐观添加成功后状态生效', async () => {
    login();
    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(api.getCollections).toHaveBeenCalled());

    await act(async () => {
      await result.current.toggle('b');
    });

    expect(result.current.isCollected('b')).toBe(true);
    expect(api.addCollection).toHaveBeenCalledWith('b', undefined, undefined);
  });

  it('请求失败时回滚并记录错误', async () => {
    login();
    api.addCollection.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(api.getCollections).toHaveBeenCalled());

    await act(async () => {
      await result.current.toggle('c');
    });

    expect(result.current.isCollected('c')).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('游客收藏进入本机暂存', async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });

    await act(async () => {
      await result.current.toggle('d');
    });

    expect(result.current.isStaged('d')).toBe(true);
    expect(result.current.stagedCount).toBe(1);
    expect(api.addCollection).not.toHaveBeenCalled();
  });

  it('连点两次只发一次请求', async () => {
    login();
    let resolveAdd;
    api.addCollection.mockImplementation(
      () => new Promise((resolve) => { resolveAdd = resolve; })
    );

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(api.getCollections).toHaveBeenCalled());

    let first;
    let second;
    await act(async () => {
      first = result.current.toggle('e');
      second = result.current.toggle('e');
      expect(api.addCollection).toHaveBeenCalledTimes(1);
      resolveAdd({ data: { success: true } });
      await Promise.all([first, second]);
    });

    expect(api.addCollection).toHaveBeenCalledTimes(1);
  });

  it('clear 清空收藏态', async () => {
    login();
    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(api.getCollections).toHaveBeenCalled());

    await act(async () => {
      await result.current.toggle('f');
    });
    expect(result.current.isCollected('f')).toBe(true);

    act(() => result.current.clear());
    expect(result.current.isCollected('f')).toBe(false);
  });
});