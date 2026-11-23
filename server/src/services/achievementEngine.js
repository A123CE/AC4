const pool = require('../db');

/**
 * 统一成就引擎
 *
 * 一次 evaluate 完成：集章（可选）→ 指标聚合 → 徽章授予 → badges_count 二阶段复查。
 * 查询异常不向上抛，返回空结果，保证主业务流程不被成就系统拖垮。
 */

const CONDITION_METRIC = {
  login_count: 'login_count',
  palaces_viewed: 'palaces_viewed',
  collections_count: 'collections_count',
  points: 'points',
  badges_count: 'badges_count',
  quiz_correct: 'correct_answers',
  quiz_all_categories: 'quiz_categories_correct',
  consecutive_signin: 'consecutive_signin',
};

const EMPTY_RESULT = { stamps: [], badges: [], progress: [] };

async function getMetrics(userId) {
  const [rows] = await pool.execute(
    `SELECT
       u.login_count,
       u.points,
       (SELECT COUNT(*) FROM user_stamps WHERE user_id = u.id) AS palaces_viewed,
       (SELECT COUNT(*) FROM user_collections WHERE user_id = u.id) AS collections_count,
       (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) AS badges_count,
       (SELECT COUNT(*) FROM quiz_answer_facts
          WHERE user_id = u.id AND is_correct = 1 AND counted = 1) AS correct_answers,
       (SELECT COUNT(DISTINCT qq.category)
          FROM quiz_answer_facts f
          JOIN quiz_questions qq ON f.question_id = qq.id
         WHERE f.user_id = u.id AND f.is_correct = 1 AND f.counted = 1) AS quiz_categories_correct,
       COALESCE((SELECT consecutive_days FROM user_signins
                  WHERE user_id = u.id ORDER BY signin_date DESC LIMIT 1), 0) AS consecutive_signin,
       (SELECT COUNT(*) FROM palaces WHERE status = 'published') AS palaces_total
     FROM users u
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0] || null;
}

function targetFor(badge, metrics) {
  const raw = Number(badge.condition_value) || 0;
  if (badge.condition_type === 'palaces_viewed') {
    if (raw <= 0) return metrics.palaces_total;
    return Math.min(raw, metrics.palaces_total);
  }
  // quiz_all_categories 的种子值为 1（布尔语义），实际要求覆盖四类题库
  if (badge.condition_type === 'quiz_all_categories') {
    return raw > 1 ? raw : 4;
  }
  return raw;
}

function currentFor(badge, metrics) {
  const key = CONDITION_METRIC[badge.condition_type];
  if (!key) return 0;
  return Number(metrics[key] || 0);
}

function isSatisfied(badge, metrics) {
  const target = targetFor(badge, metrics);
  if (target <= 0) return true;
  return currentFor(badge, metrics) >= target;
}

async function getBadgesWithProgress(userId, metrics) {
  const [badges] = await pool.execute(
    `SELECT id, name, description, icon, condition_type, condition_value
     FROM badges
     ORDER BY condition_value ASC, id ASC`
  );
  const [earned] = await pool.execute(
    'SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?',
    [userId]
  );
  const earnedMap = new Map(earned.map((row) => [row.badge_id, row.earned_at]));

  return badges.map((badge) => {
    const target = Math.max(1, targetFor(badge, metrics));
    const rawCurrent = currentFor(badge, metrics);
    const current = Math.min(rawCurrent, target);
    return {
      ...badge,
      condition_value: Number(badge.condition_value) || 0,
      is_earned: earnedMap.has(badge.id),
      earned_at: earnedMap.get(badge.id) || null,
      progress: {
        current,
        target,
        percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100,
      },
    };
  });
}

async function grantBadge(userId, badgeId) {
  const [result] = await pool.execute(
    'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
    [userId, badgeId]
  );
  if (result.affectedRows !== 1) return null;

  const [rows] = await pool.execute(
    'SELECT id, name, description, icon, condition_type, condition_value FROM badges WHERE id = ?',
    [badgeId]
  );
  const [earned] = await pool.execute(
    'SELECT earned_at FROM user_badges WHERE user_id = ? AND badge_id = ?',
    [userId, badgeId]
  );
  return {
    ...(rows[0] || { id: badgeId }),
    earned_at: earned[0]?.earned_at || null,
  };
}

async function grantStamp(userId, palaceId) {
  if (!userId || !palaceId) return null;

  const [palaces] = await pool.execute(
    "SELECT id, name, category FROM palaces WHERE id = ? AND status = 'published'",
    [palaceId]
  );
  if (palaces.length === 0) return null;

  const palace = palaces[0];
  const [result] = await pool.execute(
    'INSERT IGNORE INTO user_stamps (user_id, palace_id, palace_name_snapshot) VALUES (?, ?, ?)',
    [userId, palaceId, palace.name]
  );
  if (result.affectedRows !== 1) return null;

  const [rows] = await pool.execute(
    'SELECT earned_at FROM user_stamps WHERE user_id = ? AND palace_id = ?',
    [userId, palaceId]
  );

  return {
    palace_id: palaceId,
    palace_name: palace.name,
    chinese_seal_text: palace.name,
    category: palace.category || null,
    design_key: palaceId,
    earned_at: rows[0]?.earned_at || null,
  };
}

/**
 * 统一判定并授予
 * @param {number} userId
 * @param {{trigger?: string, palaceId?: string}} options
 * @returns {Promise<{stamps:Array,badges:Array,progress:Array}>}
 */
async function evaluate(userId, options = {}) {
  const { palaceId = null } = options;

  try {
    if (!userId) return { ...EMPTY_RESULT };

    const stamps = [];
    if (palaceId) {
      const stamp = await grantStamp(userId, palaceId);
      if (stamp) stamps.push(stamp);
    }

    let metrics = await getMetrics(userId);
    if (!metrics) return { stamps, badges: [], progress: [] };

    let progress = await getBadgesWithProgress(userId, metrics);
    const unearned = progress
      .filter((badge) => !badge.is_earned)
      .sort((a, b) => (a.condition_value || 0) - (b.condition_value || 0));

    const newBadges = [];
    for (const badge of unearned) {
      if (badge.condition_type === 'badges_count') continue;
      if (!isSatisfied(badge, metrics)) continue;

      const granted = await grantBadge(userId, badge.id);
      if (granted) newBadges.push(granted);
    }

    // badges_count 二阶段复查：先授予其他徽章，再判断「集齐」类条件
    const countBadges = unearned.filter((badge) => badge.condition_type === 'badges_count');
    if (countBadges.length > 0) {
      metrics = await getMetrics(userId);
      for (const badge of countBadges.sort(
        (a, b) => (a.condition_value || 0) - (b.condition_value || 0)
      )) {
        if (!isSatisfied(badge, metrics)) continue;
        const granted = await grantBadge(userId, badge.id);
        if (granted) newBadges.push(granted);
      }
    }

    const finalMetrics = await getMetrics(userId);
    progress = await getBadgesWithProgress(userId, finalMetrics);

    return { stamps, badges: newBadges, progress };
  } catch (err) {
    console.error('成就判定失败:', err);
    return { ...EMPTY_RESULT };
  }
}

/**
 * 成就总览快照
 */
async function snapshot(userId) {
  try {
    const metrics = await getMetrics(userId);
    if (!metrics) {
      return { counts: {}, progress: [], next_targets: [] };
    }

    const progress = await getBadgesWithProgress(userId, metrics);
    const nextTargets = progress
      .filter((badge) => !badge.is_earned)
      .sort((a, b) => b.progress.percentage - a.progress.percentage)
      .slice(0, 3);

    return { counts: metrics, progress, next_targets: nextTargets };
  } catch (err) {
    console.error('成就快照失败:', err);
    return { counts: {}, progress: [], next_targets: [] };
  }
}

module.exports = {
  evaluate,
  grantStamp,
  grantBadge,
  snapshot,
  getMetrics,
  getBadgesWithProgress,
  CONDITION_METRIC,
};