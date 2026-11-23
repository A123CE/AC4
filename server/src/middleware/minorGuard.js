const pool = require('../db');

async function loadPrivacyMode(userId) {
  if (!userId) return 'normal';

  try {
    const [rows] = await pool.execute(
      'SELECT minor_mode, leaderboard_opt_out FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) return 'normal';
    if (rows[0].minor_mode === 'minor') return 'minor';
    if (Number(rows[0].leaderboard_opt_out) === 1) return 'opted_out';
    return 'normal';
  } catch (err) {
    console.warn('解析隐私模式失败，回退 normal:', err.message);
    return 'normal';
  }
}

function minorGuard(req, res, next) {
  if (req.privacyMode) return next();

  if (!req.user?.id) {
    req.privacyMode = 'normal';
    return next();
  }

  loadPrivacyMode(req.user.id).then((mode) => {
    req.privacyMode = mode;
    next();
  });
}

module.exports = { loadPrivacyMode, minorGuard };