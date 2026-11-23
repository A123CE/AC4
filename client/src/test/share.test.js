import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildShareUrl, buildAbsoluteShareUrl, shareContent } from '../lib/share';

vi.mock('../api', () => ({
  shareVisit: vi.fn(() => Promise.resolve()),
}));

import { shareVisit } from '../api';

const originalShare = navigator.share;
const originalClipboard = navigator.clipboard;

function setNavigatorShare(value) {
  Object.defineProperty(navigator, 'share', {
    value,
    configurable: true,
  });
}

function setClipboard(value) {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(navigator, 'share', {
    value: originalShare,
    configurable: true,
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
});

describe('分享链接工具', () => {
  it('生成站内分享链接且不携带 token/user_id', () => {
    const url = buildShareUrl({
      type: 'palace',
      id: 'taihedian',
      channel: 'copy',
    });
    expect(url).toBe('/share/palace/taihedian?ch=copy');
    expect(url).not.toContain('token');
    expect(url).not.toContain('user_id');
  });

  it('搜索分享使用 URLSearchParams 编码', () => {
    const url = buildShareUrl({
      type: 'search',
      channel: 'weibo',
      query: { q: '太和殿', type: 'all' },
    });
    expect(url.startsWith('/search?')).toBe(true);
    expect(url).toContain('q=%E5%A4%AA%E5%92%8C%E6%AE%BF');
    expect(url).toContain('ch=weibo');
  });

  it('无系统分享与剪贴板时降级为手动复制', async () => {
    setNavigatorShare(undefined);
    setClipboard(undefined);

    const result = await shareContent({ type: 'palace', id: 'taihedian' });
    expect(result.method).toBe('manual');
    expect(result.url).toContain('/share/palace/taihedian');
    expect(shareVisit).not.toHaveBeenCalled();
  });

  it('剪贴板可用时复制并上报 copy 渠道', async () => {
    setNavigatorShare(undefined);
    setClipboard({ writeText: vi.fn(() => Promise.resolve()) });

    const result = await shareContent({
      type: 'palace',
      id: 'taihedian',
      channel: 'copy',
    });

    expect(result.method).toBe('clipboard');
    expect(shareVisit).toHaveBeenCalledWith('palace', 'taihedian', 'copy');
  });

  it('系统分享可用时优先系统分享', async () => {
    setNavigatorShare(vi.fn(() => Promise.resolve()));
    setClipboard(undefined);

    const result = await shareContent({ type: 'palace', id: 'taihedian' });
    expect(result.method).toBe('system');
    expect(shareVisit).toHaveBeenCalledWith('palace', 'taihedian', 'system');
  });

  it('绝对链接基于 origin 拼接', () => {
    expect(
      buildAbsoluteShareUrl({ type: 'palace', id: 'taihedian' }, 'https://example.com')
    ).toBe('https://example.com/share/palace/taihedian?ch=copy');
  });
});