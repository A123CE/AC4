/**
 * 每日签到API
 * POST /api/signin        — 执行签到
 * GET  /api/signin/status — 查询今日签到状态和连续天数
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

/**
 * POST /api/signin
 * 每日签到
 */
router.post('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 检查今日是否已签到
    const [existing] = await pool.execute(
      'SELECT id FROM user_signins WHERE user_id = ? AND signin_date = ?',
      [req.user.id, today]
    );

    if (existing.length > 0) {
      return res.json({
        success: false,
        error: '今日已签到',
        data: { already_signed: true },
      });
    }

    // 计算连续签到天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [lastSignin] = await pool.execute(
      'SELECT consecutive_days FROM user_signins WHERE user_id = ? AND signin_date = ?',
      [req.user.id, yesterdayStr]
    );

    const consecutiveDays = lastSignin.length > 0
      ? lastSignin[0].consecutive_days + 1
      : 1;

    // 连续签到额外奖励
    let bonusPoints = 0;
    if (consecutiveDays >= 30) bonusPoints = 5;  // 30天连续+5额外
    if (consecutiveDays >= 7) bonusPoints = 2;   // 7天连续+2额外

    const pointsEarned = 10 + bonusPoints;

    // 插入签到记录
    await pool.execute(
      'INSERT INTO user_signins (user_id, signin_date, points_earned, consecutive_days) VALUES (?, ?, ?, ?)',
      [req.user.id, today, pointsEarned, consecutiveDays]
    );

    // 更新用户积分
    await pool.execute(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsEarned, req.user.id]
    );

    // 检查签到徽章
    const newBadge = await checkSigninBadges(req.user.id, consecutiveDays);

    res.json({
      success: true,
      message: `签到成功！+${pointsEarned}赏银`,
      data: {
        points_earned: pointsEarned,
        consecutive_days: consecutiveDays,
        bonus: bonusPoints > 0 ? bonusPoints : 0,
        new_badge: newBadge,
      },
    });
  } catch (err) {
    console.error('签到失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/signin/status
 * 查询今日签到状态
 */
router.get('/status', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todaySignin] = await pool.execute(
      'SELECT * FROM user_signins WHERE user_id = ? AND signin_date = ?',
      [req.user.id, today]
    );

    // 获取当前连续签到天数
    const [lastSignin] = await pool.execute(
      'SELECT consecutive_days FROM user_signins WHERE user_id = ? AND signin_date = ?',
      [req.user.id, getYesterdayStr()]
    );

    // 本月签到天数
    const monthStart = today.substring(0, 7) + '-01';
    const [[{ monthCount }]] = await pool.execute(
      'SELECT COUNT(*) AS monthCount FROM user_signins WHERE user_id = ? AND signin_date >= ?',
      [req.user.id, monthStart]
    );

    // 本月签到日期列表
    const [monthDates] = await pool.execute(
      'SELECT signin_date FROM user_signins WHERE user_id = ? AND signin_date >= ? ORDER BY signin_date ASC',
      [req.user.id, monthStart]
    );

    res.json({
      success: true,
      data: {
        signed_today: todaySignin.length > 0,
        consecutive_days: todaySignin.length > 0
          ? todaySignin[0].consecutive_days
          : (lastSignin.length > 0 ? lastSignin[0].consecutive_days : 0),
        month_count: monthCount,
        month_dates: monthDates.map(d => d.signin_date),
      },
    });
  } catch (err) {
    console.error('获取签到状态失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 检查签到徽章
 */
async function checkSigninBadges(userId, consecutiveDays) {
  try {
    let conditionValue = null;
    if (consecutiveDays >= 30) conditionValue = 30;
    else if (consecutiveDays >= 7) conditionValue = 7;

    if (!conditionValue) return null;

    const [eligible] = await pool.execute(
      `SELECT b.* FROM badges b
       WHERE b.condition_type = 'consecutive_signin' AND b.condition_value = ?
       AND b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = ?)
       LIMIT 1`,
      [conditionValue, userId]
    );

    if (eligible.length > 0) {
      const badge = eligible[0];
      await pool.execute(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
        [userId, badge.id]
      );
      return { id: badge.id, name: badge.name, description: badge.description, icon: badge.icon };
    }

    return null;
  } catch (err) {
    console.error('检查签到徽章失败:', err);
    return null;
  }
}

function getYesterdayStr() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y.toISOString().split('T')[0];
}

module.exports = router;
