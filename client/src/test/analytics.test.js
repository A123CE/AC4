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

  it('建筑知识四类埋点登记且只保留白名单属性', () => {
    expect(
      track('encyclopedia_filter_building', {
        category: 'building',
        stage: 'tiantan',
        result_count: 5,
        q: '塔',
        user_id: 1,
      })
    ).toBe(true);

    const queue = _peekQueueForTest();
    expect(queue[0].props).toEqual({
      category: 'building',
      stage: 'tiantan',
      result_count: 5,
    });

    expect(
      track('encyclopedia_term_view', { reason: 'list', entity_type: 'term', entity_id: 'x' })
    ).toBe(true);
    expect(
      track('encyclopedia_term_open', { entity_type: 'term', entity_id: 'x' })
    ).toBe(true);
    expect(
      track('encyclopedia_reverse_click', {
        entity_type: 'term',
        entity_id: 'x',
        palace_id: 'tiantan',
      })
    ).toBe(true);
  });

  it('图谱四类事件可入队且只保留 12 个白名单键', () => {
    const payload = {
      q_hash: 'a'.repeat(64),
      q_length: 3,
      entity_type: 'term',
      entity_id: 'tiantan-eaves',
      channel: 'copy',
      reason: 'render_error',
      route_id: 'encyclopedia',
      category: 'building',
      stage: 'detail',
      entry_type: 'building',
      palace_id: 'tiantan',
      result_count: 6,
      term: '藻井',
      query: '藻井',
      content: '正文',
    };

    for (const eventName of ['graph_view', 'graph_node_click', 'graph_expand', 'graph_fallback']) {
      expect(track(eventName, payload)).toBe(true);
    }

    const added = _peekQueueForTest().slice(-4);
    expect(added).toHaveLength(4);

    const allowed = [
      'category',
      'channel',
      'entity_id',
      'entity_type',
      'entry_type',
      'palace_id',
      'q_hash',
      'q_length',
      'reason',
      'result_count',
      'route_id',
      'stage',
    ].sort();

    for (const item of added) {
      expect(Object.keys(item.props).sort()).toEqual(allowed);
      expect(item.props).not.toHaveProperty('term');
      expect(item.props).not.toHaveProperty('query');
      expect(item.props).not.toHaveProperty('content');
    }
  });

  it('3D 卡片与旋转六事件登记且只保留 12 键', () => {
    for (const eventName of [
      'card_view',
      'card_swap',
      'card_drag',
      'graph_rotate',
      'graph_drag',
      'graph_reset',
    ]) {
      expect(track(eventName, { stage: 'deck_impression' })).toBe(true);
    }

    const payload = {
      q_hash: 'a'.repeat(64),
      q_length: 1,
      entity_type: 'card',
      entity_id: 'x',
      channel: 'copy',
      reason: 'r',
      route_id: 'encyclopedia',
      category: 'building',
      stage: 'drag_end',
      entry_type: 'building',
      palace_id: 'p',
      result_count: 1,
      angle: 1,
      fps: 60,
      term: 't',
      content: 'c',
    };

    expect(track('card_view', payload)).toBe(true);
    const last = _peekQueueForTest().slice(-1)[0];
    const allowed = [
      'category', 'channel', 'entity_id', 'entity_type', 'entry_type',
      'palace_id', 'q_hash', 'q_length', 'reason', 'result_count', 'route_id', 'stage',
    ].sort();
    expect(Object.keys(last.props).sort()).toEqual(allowed);
    expect(last.props).not.toHaveProperty('angle');
    expect(last.props).not.toHaveProperty('fps');
    expect(last.props).not.toHaveProperty('term');
    expect(last.props).not.toHaveProperty('content');
  });
});