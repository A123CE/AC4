/**
 * 翰林院答题API
 * GET  /api/quiz/categories     — 题库分类及题量
 * GET  /api/quiz/questions      — 获取随机题目
 * GET  /api/quiz/questions/:id  — 获取单题 (不含正确答案)
 * POST /api/quiz/answer         — 提交答案
 * GET  /api/quiz/records        — 获取答题记录
 * GET  /api/quiz/stats          — 获取答题统计
 * GET  /api/quiz/achievements   — 获取功名榜
 * GET  /api/quiz/leaderboard    — 获取筑识榜排名
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const tagEngine = require('../services/tagEngine');
const achievementEngine = require('../services/achievementEngine');
const quizAnswerService = require('../services/quizAnswerService');
const leaderboardService = require('../services/leaderboardService');
const { minorGuard } = require('../middleware/minorGuard');
const rateLimit = require('../middleware/rateLimit');

// 题库四大分类（顺序即展示顺序）
const QUIZ_CATEGORIES = ['古建筑', '传统民居', '近代经典建筑', '现代标志性建筑'];

const answerLimiter = rateLimit({
  windowMs: Number(process.env.QUIZ_ANSWER_RATE_WINDOW_MS) || 60000,
  max: Number(process.env.QUIZ_ANSWER_RATE_MAX) || 30,
  keyBy: (req) =>
    req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || 'unknown'}`,
});

const practiceLimiter = rateLimit({
  windowMs: 60000,
  max: 120,
  keyBy: (req) => `practice:${req.ip || 'unknown'}`,
});

/**
 * GET /api/quiz/categories
 * 题库分类及各自题量（公开读，登录后附带个人进度）
 */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category, COUNT(1) AS total
       FROM quiz_questions
       WHERE category IS NOT NULL AND category <> ''
       GROUP BY category`
    );
    const countMap = new Map(rows.map(r => [r.category, Number(r.total)]));

    // 合并用户已答情况，便于展示各题库进度；游客不下发个人进度
    let answerMap = new Map();
    if (req.user?.id) {
      const [answerRows] = await pool.query(
        `SELECT qq.category,
                COUNT(qr.id) AS answered,
                SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
         FROM quiz_records qr
         JOIN quiz_questions qq ON qr.question_id = qq.id
         WHERE qr.user_id = ?
         GROUP BY qq.category`,
        [req.user.id]
      );
      answerMap = new Map(answerRows.map(r => [r.category, r]));
    }

    let distinctMap = new Map();
    if (req.user?.id) {
      const [rows] = await pool.query(
        `SELECT qq.category, COUNT(*) AS distinct_correct
         FROM quiz_answer_facts f
         JOIN quiz_questions qq ON f.question_id = qq.id
         WHERE f.user_id = ? AND f.is_correct = 1 AND f.counted = 1
         GROUP BY qq.category`,
        [req.user.id]
      );
      distinctMap = new Map(rows.map((row) => [row.category, row.distinct_correct]));
    }

    const data = QUIZ_CATEGORIES.map(category => {
      const answered = req.user?.id
        ? Number(answerMap.get(category)?.answered || 0)
        : null;
      const correct = req.user?.id
        ? Number(answerMap.get(category)?.correct || 0)
        : null;
      return {
        category,
        question_total: countMap.get(category) || 0,
        answered,
        correct,
        distinct_correct: req.user?.id
          ? Number(distinctMap.get(category) || 0)
          : null,
        accuracy: req.user?.id && answered > 0
          ? Math.round((correct / answered) * 100)
          : null,
      };
    });

    res.json({
      success: true,
      scope: req.user?.id ? 'user' : 'guest',
      data,
    });
  } catch (err) {
    console.error('获取题库分类失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/questions
 * 获取随机题目列表
 * Query: category, difficulty (1-3), tags (逗号分隔), count (默认5), palace_id
 */
router.get('/questions', optionalAuth, async (req, res) => {
  try {
    const { category, difficulty, tags, count = 5, palace_id } = req.query;
    const parsedCount = parseInt(count, 10);
    const safeCount = Math.min(Math.max(Number.isFinite(parsedCount) ? parsedCount : 5, 1), 20);

    let sql = 'SELECT id, question, options, category, difficulty, tags, palace_id FROM quiz_questions WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
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

    sql += ` ORDER BY RAND() LIMIT ${safeCount}`;

    const [rows] = await pool.query(sql, params);

    // 处理JSON字段但不返回正确答案
    const questions = rows.map(row => ({
      ...row,
      options: safeJSON(row.options, []),
      tags: safeJSON(row.tags, []),
    }));

    res.json({
      success: true,
      scope: req.user?.id ? 'user' : 'guest',
      data: questions,
    });
  } catch (err) {
    console.error('获取题目失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/questions/:id
 * 获取单题详情 (不含正确答案)
 */
router.get('/questions/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, question, options, category, difficulty, tags, palace_id, related_term_id FROM quiz_questions WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    res.json({
      success: true,
      scope: req.user?.id ? 'user' : 'guest',
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
router.post('/answer', optionalAuth, answerLimiter, async (req, res) => {
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


    // 游客分支：只判定，不落库、不加积分、不发徽章
    if (!req.user?.id) {
      return res.json({
        success: true,
        data: {
          is_correct: isCorrect,
          correct_answer: isCorrect ? null : question.correct_answer,
          explanation: question.explanation || '',
          points_earned: 0,
          category: question.category || null,
          related_term_id: question.related_term_id || null,
          palace_id: question.palace_id || null,
          new_badge: null,
          achievements: { stamps: [], badges: [], progress: [] },
          scope: 'guest',
          leaderboard_hint: true,
        },
      });
    }

    const result = await quizAnswerService.recordAnswer({
      userId: req.user.id,
      questionId: question_id,
      answer: answer.toUpperCase(),
      isCorrect,
    });

    if (isCorrect) {
      const questionTags = safeJSON(question.tags, []);
      if (questionTags.length > 0) {
        await tagEngine.onQuestionAnswered(req.user.id, questionTags);
      }
    }

    const achievements =
      result.achievements || { stamps: [], badges: [], progress: [] };
    const newBadge = achievements.badges[0] || null;

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: isCorrect ? null : question.correct_answer,
        explanation: question.explanation || '',
        points_earned: result.points_earned,
        category: question.category || null,
        related_term_id: question.related_term_id || null,
        palace_id: question.palace_id || null,
        new_badge: newBadge,
        achievements,
        scope: 'user',
        leaderboard_hint: false,
        duplicated: result.duplicated,
        distinct_correct: result.distinct_correct,
      },
    });
  } catch (err) {
    console.error('提交答案失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/quiz/practice/answer
 * 随堂练习：只判定与解析，零写入（不写记录/事实/积分/徽章）
 */
router.post('/practice/answer', optionalAuth, practiceLimiter, async (req, res) => {
  try {
    const { question_id, answer } = req.body;

    if (!question_id || !answer) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '缺少题目ID或答案',
      });
    }

    const [questions] = await pool.execute(
      `SELECT id, correct_answer, explanation, category, palace_id, related_term_id
       FROM quiz_questions WHERE id = ?`,
      [question_id]
    );
    if (questions.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    const question = questions[0];
    const isCorrect =
      String(answer).toUpperCase() === String(question.correct_answer).toUpperCase();

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: isCorrect ? null : question.correct_answer,
        explanation: question.explanation || '',
        category: question.category || null,
        palace_id: question.palace_id || null,
        related_term_id: question.related_term_id || null,
        mode: 'practice',
      },
    });
  } catch (err) {
    console.error('随堂练习判定失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/quiz/records
 * 获取用户答题记录
 * Query: page (默认1), limit (默认20), category
 */
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { category } = req.query;

    let whereSql = 'WHERE qr.user_id = ?';
    const params = [req.user.id];
    if (category) {
      whereSql += ' AND qq.category = ?';
      params.push(category);
    }

    const [records] = await pool.query(
      `SELECT qr.id, qr.question_id, qq.question, qq.category, qr.user_answer,
              qr.is_correct, qr.points_earned, qr.answered_at,
              qq.related_term_id, qq.explanation
       FROM quiz_records qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       ${whereSql}
       ORDER BY qr.answered_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM quiz_records qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       ${whereSql}`,
      params
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
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [[{ total_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS total_answers FROM quiz_records WHERE user_id = ?',
      [req.user.id]
    );
    const [[{ correct_answers }]] = await pool.execute(
      'SELECT COUNT(*) AS correct_answers FROM quiz_records WHERE user_id = ? AND is_correct = 1',
      [req.user.id]
    );
    const [[{ distinct_correct }]] = await pool.execute(
      'SELECT COUNT(*) AS distinct_correct FROM quiz_answer_facts WHERE user_id = ? AND is_correct = 1 AND counted = 1',
      [req.user.id]
    );

    const accuracy = total_answers > 0
      ? Math.round((correct_answers / total_answers) * 100)
      : 0;

    // 按题库分类统计正确率（补全未作答的分类，便于前端展示四类进度）
    const [answeredStats] = await pool.execute(
      `SELECT qq.category,
              COUNT(*) AS total,
              SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM quiz_records qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       WHERE qr.user_id = ?
       GROUP BY qq.category`,
      [req.user.id]
    );

    const [categoryTotals] = await pool.execute(
      `SELECT category, COUNT(1) AS total
       FROM quiz_questions
       WHERE category IS NOT NULL AND category <> ''
       GROUP BY category`
    );

    const [distinctStats] = await pool.execute(
      `SELECT qq.category, COUNT(*) AS distinct_correct
       FROM quiz_answer_facts f
       JOIN quiz_questions qq ON f.question_id = qq.id
       WHERE f.user_id = ? AND f.is_correct = 1 AND f.counted = 1
       GROUP BY qq.category`,
      [req.user.id]
    );

    const answeredMap = new Map(answeredStats.map(r => [r.category, r]));
    const totalMap = new Map(categoryTotals.map(r => [r.category, Number(r.total)]));
    const distinctByCategory = new Map(
      distinctStats.map((row) => [row.category, Number(row.distinct_correct)])
    );
    const categoryStats = QUIZ_CATEGORIES.map(category => {
      const answered = Number(answeredMap.get(category)?.total || 0);
      const correct = Number(answeredMap.get(category)?.correct || 0);
      return {
        category,
        total: answered,
        correct,
        distinct_correct: distinctByCategory.get(category) || 0,
        question_total: totalMap.get(category) || 0,
        accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
      };
    });

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
        distinct_correct,
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
router.get('/achievements', authMiddleware, async (req, res) => {
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

/**
 * GET /api/quiz/leaderboard
 * 获取筑识榜 — 按答对题数排名
 * Query: limit (默认20), category (可选，按题库分类排名)
 */
router.get('/leaderboard', authMiddleware, minorGuard, async (req, res) => {
  const { category } = req.query;
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const data = await leaderboardService.getLeaderboard({
      userId: req.user.id,
      limit,
      category: category || null,
      privacyMode: req.privacyMode || 'normal',
    });

    res.json({
      success: true,
      data: {
        category: category || null,
        ...data,
      },
    });
  } catch (err) {
    console.error('获取筑识榜失败:', err);
    res.json({
      success: true,
      data: {
        category: category || null,
        list: [],
        me: null,
        empty_reason: 'query_failed',
        privacy_mode: 'normal',
      },
    });
  }
});

// ============================================================
//  辅助函数
// ============================================================

/**
 * 统一筑识榜行数据类型（SUM 结果可能以字符串返回）
 */
function normalizeRankRow(row) {
  return {
    ...row,
    points: Number(row.points || 0),
    total_answers: Number(row.total_answers || 0),
    correct_answers: Number(row.correct_answers || 0),
    accuracy: Number(row.accuracy || 0),
    rank_no: Number(row.rank_no || 0),
  };
}

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


module.exports = router;
