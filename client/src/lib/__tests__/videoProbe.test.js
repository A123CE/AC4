import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { probeVideo, _clearProbeCache } from '../videoProbe';

function response(status, contentType = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
  };
}

beforeEach(() => {
  _clearProbeCache();
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('videoProbe', () => {
  it('HEAD 200 + video 返回 ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, 'video/mp4'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(probeVideo('/videos/a.mp4')).resolves.toEqual({
      ok: true,
      reason: 'ok',
      contentType: 'video/mp4',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('HEAD 405 回退 Range GET 206', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(405))
      .mockResolvedValueOnce(response(206, 'video/webm'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeVideo('/videos/a.webm');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('HEAD 404 返回 probe_failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(404)));

    await expect(probeVideo('/videos/missing.mp4')).resolves.toEqual({
      ok: false,
      reason: 'probe_failed',
      contentType: null,
    });
  });

  it('HEAD 200 但类型非 video 返回 wrong_type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, 'text/html')));

    await expect(probeVideo('/videos/fake.mp4')).resolves.toEqual({
      ok: false,
      reason: 'wrong_type',
      contentType: 'text/html',
    });
  });

  it('超时不发起第二次请求', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url, options) => {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = probeVideo('/videos/slow.mp4', { timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(101);
    const result = await pending;

    expect(result.reason).toBe('timeout');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('缓存命中后不再请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, 'video/mp4'));
    vi.stubGlobal('fetch', fetchMock);

    await probeVideo('/videos/cache.mp4');
    await probeVideo('/videos/cache.mp4');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('空 URL 返回 invalid_url', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(probeVideo('')).resolves.toEqual({
      ok: false,
      reason: 'invalid_url',
      contentType: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});