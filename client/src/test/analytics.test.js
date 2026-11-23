import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  track,
  trackSearch,
  flush,
  _resetAnalyticsForTest,
  _peekQueueForTest,
} from '../lib/analytics';
import guestSession from '../lib/guestSession';

const originalSendBeacon = navigator.sendBeacon;
let beacon;

beforeEach(() => {
  localStorage.clear();
  guestSession._resetForTest();
  _resetAnalyticsForTest();
  beacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', {
    value: beacon,
    configurable: true,
  });
});

afterEach(() => {
  if (originalSendBeacon) {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: originalSendBeacon,
      configurable: true,
    });
  } else {
    delete navigator.sendBeacon;
  }
});

describe('analytics 匿名埋点', () => {
  it('关闭统计后零上报', () => {
    localStorage.setItem('ac4_analytics_off', '1');

    expect(track('page_view')).toBe(false);
    expect(_peekQueueForTest()).toHaveLength(0);
  });

  it('队列达到 5 条自动批量上报', async () => {
    localStorage.setItem('ac4_analytics_off', '0');

    for (let i = 0; i < 4; i += 1) {
      track('page_view', {}, { path: '/' });
    }
    expect(_peekQueueForTest()).toHaveLength(4);

    track('page_view', {}, { path: '/' });

    await vi.waitFor(() => {
      expect(beacon).toHaveBeenCalled();
    });
  });

  it('搜索只上报哈希与长度，不包含原文', async () => {
    localStorage.setItem('ac4_analytics_off', '0');

    await trackSearch('斗拱');

    const queue = _peekQueueForTest();
    expect(queue).toHaveLength(1);
    expect(queue[0].event_name).toBe('search');
    expect(queue[0].props.q_length).toBe(2);
    expect(queue[0].props.q_hash).toMatch(/^[a-f0-9]{64}$/);
    expect('q' in queue[0].props).toBe(false);

    await flush(false);
  });

  it('视频与榜单失败埋点只保留白名单字段，未知事件被丢弃', () => {
    expect(
      track('video_unavailable', {
        reason: 'probe_failed',
        entity_type: 'palace',
        entity_id: 3,
        url: '/videos/sample.mp4',
      })
    ).toBe(true);

    const queue = _peekQueueForTest();
    expect(queue).toHaveLength(1);
    expect(queue[0].props).toEqual({
      reason: 'probe_failed',
      entity_type: 'palace',
      entity_id: 3,
    });
    expect(queue[0].props).not.toHaveProperty('url');

    expect(track('leaderboard_rate_limited', { category: '古建筑' })).toBe(true);
    expect(track('unknown_event', {})).toBe(false);
  });
});