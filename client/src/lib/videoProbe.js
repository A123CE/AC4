/**
 * 视频可用性探测
 * HEAD → Range GET 两级；失败即缓存失败，避免重复请求。
 */

const cache = new Map();

function makeResult(reason, contentType = null) {
  return { ok: reason === 'ok', reason, contentType };
}

export async function probeVideo(url, { timeoutMs = 2500 } = {}) {
  if (!url || typeof url !== 'string') {
    return makeResult('invalid_url');
  }

  if (cache.has(url)) return cache.get(url);

  const controller = new AbortController();
  let timer = null;

  try {
    timer = setTimeout(() => controller.abort(), timeoutMs);

    let response = null;

    try {
      response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted) throw err;
      response = null;
    }

    if (!response || response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1' },
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      const result = makeResult('probe_failed');
      cache.set(url, result);
      return result;
    }

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.toLowerCase().startsWith('video/')
      ? makeResult('ok', contentType)
      : makeResult('wrong_type', contentType);

    cache.set(url, result);
    return result;
  } catch (err) {
    const result = controller.signal.aborted
      ? makeResult('timeout')
      : makeResult('probe_failed');
    cache.set(url, result);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function _clearProbeCache() {
  cache.clear();
}