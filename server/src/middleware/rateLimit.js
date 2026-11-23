/**
 * 内存限流器
 *
 * 不依赖 Redis，按 key（默认 IP）维护固定窗口计数。
 * now() 可注入，便于单测窗口过期。
 */
function resolveKey(req, keyBy) {
  const fallback = req.ip || req.socket?.remoteAddress || 'unknown';

  try {
    if (!keyBy || keyBy === 'ip') return fallback;
    if (typeof keyBy === 'function') {
      const value = keyBy(req);
      return value ? String(value) : `ip:${fallback}`;
    }
    return String(req[keyBy] || `ip:${fallback}`);
  } catch {
    return `ip:${fallback}`;
  }
}

function rateLimit({ windowMs = 60000, max = 60, keyBy = 'ip', now = () => Date.now() } = {}) {
  const buckets = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const key = resolveKey(req, keyBy);

    const current = now();
    let bucket = buckets.get(key);

    if (!bucket || current >= bucket.resetAt) {
      bucket = { count: 0, resetAt: current + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: '请求过于频繁，请稍后再试',
      });
    }

    // 粗粒度清理，避免长期运行内存无界增长
    if (buckets.size > 5000) {
      for (const [bucketKey, value] of buckets) {
        if (current >= value.resetAt) buckets.delete(bucketKey);
      }
    }

    return next();
  };
}

module.exports = rateLimit;