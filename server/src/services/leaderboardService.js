const pool = require('../db');

function maskName(username) {
  const value = String(username || '');
  if (!value || value.includes('@')) return '营造学徒';

  const chars = Array.from(value);
  if (chars.length <= 2) return value;
  if (chars.length <= 4) return `${chars[0]}**`;
  return `${chars[0]}${'*'.repeat(Math.min(3, chars.length - 2))}${chars[chars.length - 1]}`;
}

function rowPrivacy(row) {
  if (row.minor_mode === 'minor') return 'minor';
  if (Number(row.leaderboard_opt_out) === 1) return 'opted_out';
  return 'normal';
}

function toISOTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(' ', 'T');
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toRow(row, overridePrivacy = null) {
  const privacy = overridePrivacy && overridePrivacy !== 'normal'
    ? overridePrivacy
    : rowPrivacy(row);
  const publicRow = privacy === 'normal';

  return {
    rank_no: publicRow ? Number(row.rank_no) : null,
    display_name: publicRow ? maskName(row.username) : '营造学徒',
    correct_answers: Number(row.distinct_correct || 0),
    badge_count: Number(row.badge_count || 0),
    first_correct_at: publicRow ? toISOTime(row.first_correct_at) : null,
    privacy_mode: privacy,
  };
}

function buildCte(category) {
  const join = category
    ? 'JOIN quiz_questions q ON q.id = f.question_id AND q.category = ?'
    : '';

  return {
    sql: `
      WITH agg AS (
        SELECT f.user_id, u.username, u.minor_mode, u.leaderboard_opt_out,
               SUM(CASE WHEN f.is_correct = 1 AND f.counted = 1 THEN 1 ELSE 0 END) AS distinct_correct,
               MIN(CASE WHEN f.is_correct = 1 AND f.counted = 1 THEN f.first_correct_at END) AS first_correct_at,
               (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = f.user_id) AS badge_count
        FROM quiz_answer_facts f
        JOIN users u ON u.id = f.user_id
        ${join}
        GROUP BY f.user_id, u.username, u.minor_mode, u.leaderboard_opt_out
        HAVING distinct_correct > 0
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER (
          ORDER BY distinct_correct DESC, first_correct_at ASC, user_id ASC
        ) AS rank_no
        FROM agg
      )
    `,
    params: category ? [category] : [],
  };
}

async function getLeaderboard({
  userId = null,
  limit = 10,
  category = null,
  privacyMode = 'normal',
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  try {
    const { sql, params } = buildCte(category || null);

    const [rows] = await pool.query(
      `${sql} SELECT * FROM ranked ORDER BY rank_no ASC LIMIT ?`,
      [...params, safeLimit]
    );

    const list = rows.map((row) => toRow(row));

    let me = null;
    if (userId) {
      const [meRows] = await pool.query(
        `${sql} SELECT * FROM ranked WHERE user_id = ?`,
        [...params, userId]
      );
      if (meRows[0]) {
        me = toRow(meRows[0], privacyMode);
        me.in_public_board = me.privacy_mode === 'normal';
      }
    }

    return {
      list,
      me,
      empty_reason: list.length === 0 ? 'no_data' : null,
      privacy_mode: privacyMode,
    };
  } catch (err) {
    console.error('榜单查询失败:', err);
    return {
      list: [],
      me: null,
      empty_reason: 'query_failed',
      privacy_mode: privacyMode,
    };
  }
}

module.exports = { getLeaderboard, maskName, toRow };