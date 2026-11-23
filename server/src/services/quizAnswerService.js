const pool = require('../db');
const pointsService = require('./pointsService');
const achievementEngine = require('./achievementEngine');

async function recordAnswer({
  userId,
  questionId,
  answer = null,
  isCorrect,
  points = 20,
}) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [factResult] = await connection.execute(
        `INSERT IGNORE INTO quiz_answer_facts
           (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
         VALUES (?, ?, ?, NOW(), IF(?, NOW(), NULL), 1, NOW())`,
        [userId, questionId, isCorrect ? 1 : 0, isCorrect ? 1 : 0]
      );

      const duplicated = factResult.affectedRows === 0;

      await connection.execute(
        'UPDATE quiz_answer_facts SET last_answered_at = NOW() WHERE user_id = ? AND question_id = ?',
        [userId, questionId]
      );

      await connection.execute(
        `INSERT INTO quiz_records (user_id, question_id, user_answer, is_correct, points_earned)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, questionId, answer, isCorrect ? 1 : 0, duplicated ? 0 : points]
      );

      await connection.commit();

      let pointsEarned = 0;
      let achievements = null;
      let suspicious = false;

      if (!duplicated) {
        if (isCorrect) {
          const award = await pointsService.awardPoints(
            userId,
            'quiz',
            questionId,
            points
          );
          pointsEarned = award.points;
        }
        achievements = await achievementEngine.evaluate(userId, {
          trigger: 'answer',
        });
      }

      const [[recent]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM quiz_records
         WHERE user_id = ? AND is_correct = 1
           AND answered_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)`,
        [userId]
      );

      if (Number(recent.total) >= 10) {
        suspicious = true;
        await pool.execute(
          'UPDATE quiz_answer_facts SET counted = 0 WHERE user_id = ? AND question_id = ?',
          [userId, questionId]
        );
        await pool.execute(
          `INSERT INTO quiz_abuse_flags (user_id, window_start, reason, evidence_json)
           VALUES (?, NOW(), 'non_human_cadence', ?)`,
          [userId, JSON.stringify({ question_id: questionId })]
        );
      }

      const [[distinct]] = await pool.execute(
        'SELECT COUNT(*) AS total FROM quiz_answer_facts WHERE user_id = ? AND is_correct = 1 AND counted = 1',
        [userId]
      );

      return {
        duplicated,
        points_earned: pointsEarned,
        distinct_correct: Number(distinct.total || 0),
        achievements,
        suspicious,
      };
    } catch (err) {
      await connection.rollback().catch(() => {});

      const retryable =
        err.code === 'ER_LOCK_DEADLOCK' || err.code === 'ER_LOCK_WAIT_TIMEOUT';
      if (retryable && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
        continue;
      }

      throw err;
    } finally {
      connection.release();
    }
  }

  throw new Error('答题写入重试次数已耗尽');
}

module.exports = { recordAnswer };