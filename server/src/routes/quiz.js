/**
 * 翰林院答题API
 * GET  /api/quiz/questions      — 获取随机题目
 * GET  /api/quiz/questions/:id  — 获取单题 (不含正确答案)
 * POST /api/quiz/answer         — 提交答案
 * GET  /api/quiz/records        — 获取答题记录
 * GET  /api/quiz/stats          — 获取答题统计
 * GET  /api/quiz/achievements   — 获取功名榜
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const tagEngine = require('../services/tagEngine');

// 所有答题路由需要认证
router.use(authMiddleware);

/**
 * GET /api/quiz/questions
 * 获取随机题目列表
 * Query: difficulty (1-3), tags (逗号分隔), count (默认5), palace_id
 */
router.get('/questions', async (req, res) => {
  try {
    const { difficulty, tags, count = 5, palace_id } = req.query;

    let sql = 'SELECT id, question, options, difficulty, tags, palace_id FROM quiz_questions WHERE 1=1';
    const params = [];

    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(parseInt(difficulty));
    }
    if (palace_id) {
      sql += ' AND palace_id = ?';
      params.push(palace_id);
    }
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      for (const tag of tagList) {
        sql += ' AND tags LIKE ?';
        params.push(`%${tag}%`);
      }
    }

    sql += ` ORDER BY RAND() LIMIT ${parseInt(count)}`;

    const [rows] = await pool.query(sql, params);

    // 处理JSON字段但不返回正确答案
    const questions = rows.map(row => ({
      ...row,
      options: safeJSON(row.options, []),
      tags: safeJSON(row.tags, []),
    }));

    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('获取题目失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/questions/:id
 * 获取单题详情 (不含正确答案)
 */
router.get('/questions/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, question, options, difficulty, tags, palace_id, related_term_id FROM quiz_questions WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    res.json({
      success: true,
      data: {
        ...rows[0],
        options: safeJSON(rows[0].options, []),
        tags: safeJSON(rows[0].tags, []),
      },
    });
  } catch (err) {
    console.error('获取题目详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/quiz/answer
 * 提交答案并获取结果
 * Body: { question_id, answer }
 */
router.post('/answer', async (req, res) => {
  try {
    const { question_id, answer } = req.body;

    if (!question_id || !answer) {
      return res.status(400).json({ success: false, error: '缺少题目ID或答案' });
    }

    // 获取题目正确答案
    const [questions] = await pool.execute(
      'SELECT * FROM quiz_questions WHERE id = ?',
      [question_id]
    );
    if (questions.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    const question = questions[0];
    const isCorrect = answer.toUpperCase() === question.correct_answer.toUpperCase();
    const pointsEarned = isCorrect ? 20 : 0;

    // 记录答题
    await pool.execute(
      'INSERT INTO quiz_records (user_id, question_id, user_answer, is_correct, points_earned) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, question_id, answer.toUpperCase(), isCorrect ? 1 : 0, pointsEarned]
    );

    // 答对时更新积分
    if (isCorrect) {
      await pool.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [pointsEarned, req.user.id]
      );

      // 更新兴趣标签
      const questionTags = safeJSON(question.tags, []);
      if (questionTags.length > 0) {
        await tagEngine.onQuestionAnswered(req.user.id, questionTags);
      }
    }

    // 检查是否获得新徽章
    const newBadge = await checkAndAwardBadges(req.user.id);

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: isCorrect ? null : question.correct_answer,
        explanation: question.explanation || '',
        points_earned: pointsEarned,
        related_term_id: question.related_term_id || null,
        palace_id: question.palace_id || null,
        new_badge: newBadge,
      },
    });
  } catch (err) {
    console.error('提交答案失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/records
 * 获取用户答题记录
 * Query: page (默认1), limit (默认20)
 */
router.get('/records', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [records] = await pool.query(
      `SELECT qr.id, qr.question_id, qq.question, qr.user_answer,
              qr.is_correct, qr.points_earned, qr.answered_at,
              qq.related_term_id, qq.explanation
       FROM quiz_records qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       WHERE qr.user_id = ?
       ORDER BY qr.answered_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.user.id]
    );

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM quiz_records WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: records,
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error('获取答题记录失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/stats
 * 获取用户答题统计
 */
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS total_answers FROM quiz_records WHERE user_id = ?',
      [req.user.id]
    );
    const [[{ correct_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS correct_answers FROM quiz_records WHERE user_id = ? AND is_correct = 1',
      [req.user.id]
    );

    const accuracy = total_answers > 0
      ? Math.round((correct_answers / total_answers) * 100)
      : 0;

    // 按分类统计正确率
    const [categoryStats] = await pool.execute(
      `SELECT
         JSON_UNQUOTE(JSON_EXTRACT(qq.tags, '$[0]')) AS category,
         COUNT(*) AS total,
         SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM quiz_records qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       WHERE qr.user_id = ?
       GROUP BY category`,
      [req.user.id]
    );

    // 连续答对天数
    const [streak] = await pool.execute(
      `WITH daily_correct AS (
         SELECT DATE(qr.answered_at) AS answer_date,
                SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS daily_correct
         FROM quiz_records qr
         WHERE qr.user_id = ?
         GROUP BY DATE(qr.answered_at)
       )
       SELECT COUNT(*) AS streak FROM daily_correct WHERE daily_correct > 0
       AND answer_date >= DATE_SUB(CURDATE(), INTERVAL (
         SELECT COUNT(*) FROM (
           SELECT answer_date FROM daily_correct
           WHERE daily_correct > 0 AND answer_date < CURDATE()
           ORDER BY answer_date DESC
         ) s
         WHERE DATEDIFF(CURDATE(), answer_date) > 1
         LIMIT 1
       ) DAY)`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        total_answers,
        correct_answers,
        accuracy,
        streak: streak[0]?.streak || 0,
        category_stats: categoryStats,
      },
    });
  } catch (err) {
    console.error('获取答题统计失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/achievements
 * 获取功名榜 — 所有成就徽章及用户获得状态
 */
router.get('/achievements', async (req, res) => {
  try {
    // 获取所有答题相关徽章
    const [badges] = await pool.execute(
      `SELECT b.* FROM badges b
       WHERE b.condition_type IN ('quiz_correct', 'quiz_all_categories')
       ORDER BY b.condition_value ASC`
    );

    // 获取用户已获得的徽章
    const [earnedBadges] = await pool.execute(
      'SELECT badge_id FROM user_badges WHERE user_id = ?',
      [req.user.id]
    );
    const earnedSet = new Set(earnedBadges.map(b => b.badge_id));

    // 获取用户答题统计
    const [[{ correct_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS correct_answers FROM quiz_records WHERE user_id = ? AND is_correct = 1',
      [req.user.id]
    );

    const achievements = badges.map(badge => ({
      ...badge,
      is_earned: earnedSet.has(badge.id),
      progress: {
        current: correct_answers,
        target: badge.condition_value,
        percentage: badge.condition_value > 0
          ? Math.min(100, Math.round((correct_answers / badge.condition_value) * 100))
          : 0,
      },
    }));

    res.json({ success: true, data: achievements });
  } catch (err) {
    console.error('获取功名榜失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
//  辅助函数
// ============================================================

/**
 * 安全解析JSON
 */
function safeJSON(val, defaultVal = null) {
  if (!val) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}

/**
 * 检查并颁发新徽章
 * @param {number} userId
 * @returns {Object|null} 新获得的徽章信息
 */
async function checkAndAwardBadges(userId) {
  try {
    // 获取用户答对总数
    const [[{ correct_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS correct_answers FROM quiz_records WHERE user_id = ? AND is_correct = 1',
      [userId]
    );

    // 查找符合条件的徽章
    const [eligibleBadges] = await pool.execute(
      `SELECT b.* FROM badges b
       WHERE b.condition_type = 'quiz_correct' AND b.condition_value <= ?
       AND b.id NOT IN (
         SELECT badge_id FROM user_badges WHERE user_id = ?
       )
       ORDER BY b.condition_value DESC
       LIMIT 1`,
      [correct_answers, userId]
    );

    if (eligibleBadges.length > 0) {
      const badge = eligibleBadges[0];
      await pool.execute(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
        [userId, badge.id]
      );
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
      };
    }

    return null;
  } catch (err) {
    console.error('检查徽章失败:', err);
    return null;
  }
}

module.exports = router;
