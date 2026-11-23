import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import guestSession, {
  read,
  tryEnter3D,
  tryStartQuiz,
  stageCollection,
  draftNote,
  snapshotForMerge,
  applyMergeResult,
  getRouteProgress,
  setRouteProgress,
  isHotspotRead,
  markHotspotRead,
  getHotspotReads,
  markDismissed,
  _resetForTest,
  STORAGE_KEY,
} from '../guestSession';

beforeEach(() => {
  vi.useRealTimers();
  _resetForTest();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  _resetForTest();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('GuestSession', () => {
  it('read() 永不为 null', () => {
    const state = read();
    expect(state).toBeTruthy();
    expect(typeof state.gid).toBe('string');
    expect(state.gid.length).toBeGreaterThan(0);
    expect(state.preview.palaces).toEqual([]);
  });

  it('同一建筑当日重复进入不消耗额度', () => {
    expect(tryEnter3D('taihedian').allowed).toBe(true);
    expect(tryEnter3D('taihedian').allowed).toBe(true);
    expect(tryEnter3D('taihedian').allowed).toBe(true);
    expect(tryEnter3D('taihedian').remaining).toBe(2);
  });

  it('当日第 4 座建筑被拦截', () => {
    expect(tryEnter3D('a').allowed).toBe(true);
    expect(tryEnter3D('b').allowed).toBe(true);
    expect(tryEnter3D('c').allowed).toBe(true);

    const fourth = tryEnter3D('d');
    expect(fourth.allowed).toBe(false);
    expect(fourth.reason).toBe('limit');
    expect(fourth.remaining).toBe(0);
  });

  it('进入第 3 座后仍可回看第 1 座', () => {
    tryEnter3D('a');
    tryEnter3D('b');
    tryEnter3D('c');
    expect(tryEnter3D('a').allowed).toBe(true);
  });

  it('跨日重置额度', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00'));
    tryEnter3D('a');
    tryEnter3D('b');
    tryEnter3D('c');
    expect(tryEnter3D('d').allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T10:00:00'));
    expect(tryEnter3D('d').allowed).toBe(true);
  });

  it('localStorage 不可用时降级到内存态', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => read()).not.toThrow();
    expect(read().gid).toBeTruthy();
    expect(tryEnter3D('a').allowed).toBe(true);
  });

  it('损坏数据自动重建', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json');
    const state = read();
    expect(state.gid).toBeTruthy();
    expect(state.preview.palaces).toEqual([]);
    expect(state.stagedCollections).toEqual([]);
  });

  it('超过 30 天自动过期重建', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00'));
    const first = read();

    vi.setSystemTime(new Date('2026-02-01T10:00:01'));
    const second = read();
    expect(second.gid).not.toBe(first.gid);
  });

  it('收藏暂存上限 20 条', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(stageCollection(`palace-${i}`).ok).toBe(true);
    }
    const overflow = stageCollection('palace-overflow');
    expect(overflow.ok).toBe(false);
    expect(overflow.reason).toBe('limit');
  });

  it('草稿笔记超长被拒绝', () => {
    const result = draftNote('taihedian', 'x'.repeat(501));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('limit');
  });

  it('snapshotForMerge 形状稳定', () => {
    stageCollection('taihedian', '最美屋顶', '笔记');
    draftNote('taihedian', '草稿');

    const snapshot = snapshotForMerge();
    expect(Object.keys(snapshot).sort()).toEqual(
      ['capturedAt', 'collections', 'gid', 'lastVisited', 'notes'].sort()
    );
    expect(snapshot.collections).toHaveLength(1);
    expect(snapshot.notes).toHaveLength(1);
  });

  it('applyMergeResult 仅保留 rejected 暂存', () => {
    stageCollection('palace-a');
    stageCollection('palace-b');
    draftNote('palace-a', '本机笔记');

    const result = applyMergeResult([
      { palace_id: 'palace-a', type: 'collection', status: 'merged' },
      { palace_id: 'palace-b', type: 'collection', status: 'rejected' },
    ]);

    const state = read();
    expect(state.stagedCollections.map((item) => item.palace_id)).toEqual([
      'palace-b',
    ]);
    expect(state.noteDrafts).toHaveLength(0);
    expect(result).toEqual({ collections: 1, notes: 0 });
  });

  it('路线进度本地读写', () => {
    expect(getRouteProgress('axis-day')).toBe(1);

    const result = setRouteProgress('axis-day', 3);
    expect(result).toEqual({
      ok: true,
      route_id: 'axis-day',
      stop_order: 3,
    });
    expect(getRouteProgress('axis-day')).toBe(3);
    expect(getRouteProgress('missing-route')).toBe(1);
  });

  it('热点已读本地幂等', () => {
    expect(isHotspotRead('taihedian', 'dougong')).toBe(false);

    markHotspotRead('taihedian', 'dougong');
    markHotspotRead('taihedian', 'dougong');

    expect(isHotspotRead('taihedian', 'dougong')).toBe(true);
    expect(getHotspotReads('taihedian')).toHaveLength(1);
    expect(getHotspotReads('wumen')).toHaveLength(0);
  });

  it('markDismissed 幂等', () => {
    const first = markDismissed('guest-tip');
    const second = markDismissed('guest-tip');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(read().dismissed.filter((key) => key === 'guest-tip')).toHaveLength(1);
  });

  it('游客答题每日 3 题额度', () => {
    expect(tryStartQuiz().allowed).toBe(true);
    expect(tryStartQuiz().allowed).toBe(true);
    expect(tryStartQuiz().allowed).toBe(true);
    const fourth = tryStartQuiz();
    expect(fourth.allowed).toBe(false);
    expect(fourth.reason).toBe('limit');
  });

  it('导出对象包含全部 API', () => {
    for (const key of [
      'read',
      'update',
      'reset',
      'tryEnter3D',
      'tryStartQuiz',
      'stageCollection',
      'draftNote',
      'snapshotForMerge',
      'markDismissed',
    ]) {
      expect(typeof guestSession[key]).toBe('function');
    }
  });
});