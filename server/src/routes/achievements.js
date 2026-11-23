const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const achievementEngine = require('../services/achievementEngine');

router.use(authMiddleware);

/**
 * 集章总览：包含全部建筑（未获得的 earned_at 为 null）
 */
async function getStamps(userId) {
  const [rows] = await pool.execute(
    `SELECT p.id AS palace_id, p.name, p.category, p.order_num, us.earned_at
     FROM palaces p
     LEFT JOIN user_stamps us
       ON us.palace_id = p.id AND us.user_id = ?
     ORDER BY p.order_num ASC, p.id ASC`,
    [userId]
  );

  const items = rows.map((row) => ({
    palace_id: row.palace_id,
    name: row.name,
    chinese_seal_text: row.name,
    category: row.category || null,
    design_key: row.palace_id,
    earned_at: row.earned_at || null,
  }));

  return {
    total: items.length,
    earned: items.filter((item) => item.earned_at).length,
    items,
  };
}

/**
 * GET /api/achievements
 * 成就总览：集章 + 徽章进度 + 下一目标
 */
router.get('/', async (req, res) => {
  try {
    const [snapshot, stamps] = await Promise.all([
      achievementEngine.snapshot(req.user.id),
      getStamps(req.user.id),
    ]);

    res.json({
      success: true,
      data: {
        stamps,
        badges: snapshot.progress,
        next_targets: snapshot.next_targets,
        points: Number(snapshot.counts.points || 0),
        // TODO(T-S2-10): palaces.status 引入后改为 WHERE status='published'
      },
    });
  } catch (err) {
    console.error('获取成就总览失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/achievements/stamps
 */
router.get('/stamps', async (req, res) => {
  try {
    const stamps = await getStamps(req.user.id);
    res.json({ success: true, data: stamps });
  } catch (err) {
    console.error('获取集章失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/achievements/learning
 * 学习记录占位，T-S2-08 填充
 */
router.get('/learning', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT hr.palace_id, p.name AS palace_name, hr.hotspot_id, hr.read_at
       FROM hotspot_reads hr
       JOIN palaces p ON p.id = hr.palace_id
       WHERE hr.user_id = ?
       ORDER BY hr.read_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({ success: true, data: { items: rows } });
  } catch (err) {
    console.error('获取学习记录失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;