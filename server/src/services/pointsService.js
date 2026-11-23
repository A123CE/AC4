const pool = require('../db');

const SOURCE_TYPES = new Set(['collection', 'visit', 'quiz', 'signin', 'merge', 'skin']);

/**
 * 幂等发放积分
 *
 * 同一 (userId, sourceType, sourceKey) 只会在 user_points_log 中留下 1 行，
 * 只有首次插入才更新 users.points，因此「取消收藏后再收藏」不会重复加分。
 *
 * @param {number} userId
 * @param {'collection'|'visit'|'quiz'|'signin'|'merge'|'skin'} sourceType
 * @param {string|number} sourceKey
 * @param {number} points
 * @returns {Promise<{awarded:boolean, points:number, reason?:string}>}
 */
async function awardPoints(userId, sourceType, sourceKey, points) {
  const amount = Number(points);

  if (!userId || !SOURCE_TYPES.has(sourceType) || sourceKey === undefined || sourceKey === null) {
    return { awarded: false, points: 0, reason: 'invalid' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { awarded: false, points: 0, reason: 'non-positive' };
  }

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // INSERT IGNORE 对重复键返回 affectedRows=0，比 ON DUPLICATE KEY 更可靠
      const [result] = await connection.execute(
        `INSERT IGNORE INTO user_points_log (user_id, source_type, source_key, points)
         VALUES (?, ?, ?, ?)`,
        [userId, sourceType, String(sourceKey), amount]
      );

      const awarded = result.affectedRows === 1;

      if (awarded) {
        await connection.execute(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [amount, userId]
        );
      }

      await connection.commit();
      return { awarded, points: awarded ? amount : 0 };
    } catch (err) {
      await connection.rollback().catch(() => {});

      const retryable =
        err.code === 'ER_LOCK_DEADLOCK' || err.code === 'ER_LOCK_WAIT_TIMEOUT';

      if (retryable && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
        continue;
      }

      console.warn('积分发放失败:', err.message);
      throw err;
    } finally {
      connection.release();
    }
  }

  return { awarded: false, points: 0, reason: 'retry-exhausted' };
}

/**
 * 积分流水
 */
async function getPointsHistory(userId, limit = 20) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, source_type, source_key, points, created_at
     FROM user_points_log
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
  return rows;
}

module.exports = { awardPoints, getPointsHistory, SOURCE_TYPES };