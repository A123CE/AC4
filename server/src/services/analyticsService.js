const pool = require('../db');

const EVENT_NAMES = new Set([
  'page_view',
  'guest_3d_enter',
  'guest_quota_blocked',
  'register_prompt_show',
  'register_prompt_click',
  'search',
  'search_zero',
  'favorite_click',
  'stamp_earned',
  'badge_earned',
  'share_click',
  'share_open',
  'tts_play',
  'tier_fallback',
  'video_unavailable',
]);

const ALLOWED_PROP_KEYS = new Set([
  'q_hash',
  'q_length',
  'entity_type',
  'entity_id',
  'channel',
  'reason',
  'route_id',
  'category',
  'stage',
]);

const PII_KEY_PATTERN = /email|username|password|token|^ip$|^q$/i;

function sanitizeProps(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};

  for (const [key, raw] of Object.entries(value)) {
    if (!ALLOWED_PROP_KEYS.has(key) || PII_KEY_PATTERN.test(key)) continue;
    if (raw === null || raw === undefined) continue;

    if (typeof raw === 'string') {
      output[key] = raw.slice(0, 200);
    } else if (typeof raw === 'number' || typeof raw === 'boolean') {
      output[key] = raw;
    }
  }

  return output;
}

function safeHash(value) {
  if (typeof value !== 'string') return null;
  return /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null;
}

function safeText(value, max) {
  if (typeof value !== 'string') return null;
  return value.slice(0, max);
}

async function recordEvents(events, meta = {}) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  const rows = events
    .filter((event) => event && EVENT_NAMES.has(event.event_name))
    .slice(0, 20)
    .map((event) => [
      event.event_name,
      safeText(event.entity_type, 16),
      safeText(event.entity_id, 64),
      safeHash(meta.anon_hash),
      safeHash(meta.session_hash),
      safeText(meta.locale, 10),
      safeText(meta.tier, 16),
      safeText(event.path || meta.path, 255),
      JSON.stringify(sanitizeProps(event.props)),
    ]);

  if (rows.length === 0) return 0;

  const placeholders = rows.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
  const values = rows.flat();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO metrics_events
         (event_name, entity_type, entity_id, anon_hash, session_hash, locale, tier, path, props)
       VALUES ${placeholders}`,
      values
    );
    await connection.commit();
    return rows.length;
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getFunnel({ from, to } = {}) {
  const toDate = to || formatLocalDate(new Date());
  const fromDate =
    from || formatLocalDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [rows] = await pool.execute(
    `SELECT event_name, COUNT(*) AS count,
            COUNT(DISTINCT anon_hash) AS users
     FROM metrics_events
     WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY event_name`,
    [fromDate, toDate]
  );

  const counts = new Map(
    rows.map((row) => [row.event_name, Number(row.count || 0)])
  );
  const users = new Map(
    rows.map((row) => [row.event_name, Number(row.users || 0)])
  );

  const visitors = users.get('page_view') || 0;
  const guest3d = counts.get('guest_3d_enter') || 0;
  const promptClicks = counts.get('register_prompt_click') || 0;
  const searchCount = counts.get('search') || 0;
  const searchZero = counts.get('search_zero') || 0;
  const shareClicks = counts.get('share_click') || 0;
  const shareOpens = counts.get('share_open') || 0;
  const favoriteClicks = counts.get('favorite_click') || 0;
  const stampUsers = users.get('stamp_earned') || 0;
  const ttsUsers = users.get('tts_play') || 0;
  const fallbackUsers = users.get('tier_fallback') || 0;

  return {
    from: fromDate,
    to: toDate,
    metrics: {
      visitors,
      trial_to_register: {
        rate: rate(promptClicks, guest3d),
        guest_3d_enters: guest3d,
        register_prompt_clicks: promptClicks,
      },
      search: {
        count: searchCount,
        zero_count: searchZero,
        zero_rate: rate(searchZero, searchCount),
      },
      share: {
        clicks: shareClicks,
        opens: shareOpens,
        return_rate: rate(shareOpens, shareClicks),
      },
      favorite_rate: rate(favoriteClicks, visitors),
      stamp_completion_rate: rate(stampUsers, visitors),
      tts_usage_rate: rate(ttsUsers, visitors),
      tier_fallback_rate: rate(fallbackUsers, visitors),
    },
  };
}

module.exports = {
  EVENT_NAMES,
  sanitizeProps,
  recordEvents,
  getFunnel,
};