/**
 * 3D皮肤API
 * GET  /api/skins           — 获取所有皮肤及用户解锁状态
 * POST /api/skins/unlock    — 使用积分解锁皮肤
 * PUT  /api/skins/activate  — 切换激活的皮肤
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 皮肤定义
const SKIN_DEFINITIONS = [
  {
    skin_type: 'default',
    skin_name: '默认模式',
    description: '经典故宫配色，朱墙黄瓦、雕梁画栋。',
    icon: 'fa-palace',
    unlock_cost: 0,
    is_default: true,
  },
  {
    skin_type: 'wireframe',
    skin_name: '线稿模式',
    description: '以建筑结构线稿方式呈现，清晰展现斗拱、梁柱、屋架的构造关系。',
    icon: 'fa-pencil',
    unlock_cost: 500,
    is_default: false,
  },
  {
    skin_type: 'snow',
    skin_name: '雪景模式',
    description: '故宫雪景——"白雪镶红墙，碎碎坠琼芳"。雪花在3D场景中缓缓飘落。',
    icon: 'fa-snowflake',
    unlock_cost: 500,
    is_default: false,
  },
  {
    skin_type: 'sepia',
    skin_name: '古画模式',
    description: '仿古画卷色调，以绢本设色的渲染方式呈现故宫古韵。',
    icon: 'fa-scroll',
    unlock_cost: 800,
    is_default: false,
  },
];

/**
 * GET /api/skins
 * 获取所有皮肤及用户解锁和激活状态
 */
router.get('/', async (req, res) => {
  try {
    // 获取用户皮肤状态
    const [userSkins] = await pool.execute(
      'SELECT skin_type, is_unlocked, unlocked_at FROM user_skins WHERE user_id = ?',
      [req.user.id]
    );
    const safeUserSkins = userSkins || [];
    const userSkinMap = {};
    safeUserSkins.forEach(s => { userSkinMap[s.skin_type] = s; });

    // 获取用户当前激活皮肤
    const [users] = await pool.execute(
      'SELECT active_skin, points FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const skins = SKIN_DEFINITIONS.map(skin => ({
      ...skin,
      is_unlocked: skin.is_default || (userSkinMap[skin.skin_type]?.is_unlocked === 1),
      unlocked_at: userSkinMap[skin.skin_type]?.unlocked_at || null,
      is_active: (users[0].active_skin || 'default') === skin.skin_type,
    }));

    res.json({
      success: true,
      data: {
        skins,
        current_points: users[0].points,
        active_skin: users[0].active_skin || 'default',
      },
    });
  } catch (err) {
    console.error('获取皮肤列表失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/skins/unlock
 * 使用积分兑换皮肤
 * Body: { skin_type }
 */
router.post('/unlock', async (req, res) => {
  try {
    const { skin_type } = req.body;

    if (!skin_type) {
      return res.status(400).json({ success: false, error: '缺少皮肤类型' });
    }

    const skinDef = SKIN_DEFINITIONS.find(s => s.skin_type === skin_type);
    if (!skinDef) {
      return res.status(404).json({ success: false, error: '皮肤不存在' });
    }
    if (skinDef.is_default) {
      return res.status(400).json({ success: false, error: '默认皮肤无需解锁' });
    }

    // 检查是否已解锁
    const [existing] = await pool.execute(
      'SELECT id FROM user_skins WHERE user_id = ? AND skin_type = ? AND is_unlocked = 1',
      [req.user.id, skin_type]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, error: '该皮肤已解锁' });
    }

    // 检查积分是否足够
    const [users] = await pool.execute(
      'SELECT points FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    if (users[0].points < skinDef.unlock_cost) {
      return res.status(400).json({
        success: false,
        error: `积分不足！需要 ${skinDef.unlock_cost} 赏银，当前 ${users[0].points} 赏银`,
      });
    }

    // 扣除积分并解锁皮肤
    await pool.execute(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [skinDef.unlock_cost, req.user.id]
    );

    await pool.execute(
      `INSERT INTO user_skins (user_id, skin_type, skin_name, is_unlocked, unlock_cost, unlocked_at)
       VALUES (?, ?, ?, 1, ?, NOW())
       ON DUPLICATE KEY UPDATE is_unlocked = 1, unlocked_at = NOW()`,
      [req.user.id, skin_type, skinDef.skin_name, skinDef.unlock_cost]
    );

    res.json({
      success: true,
      message: `成功解锁「${skinDef.skin_name}」！扣除 ${skinDef.unlock_cost} 赏银`,
      data: {
        skin_type,
        cost: skinDef.unlock_cost,
      },
    });
  } catch (err) {
    console.error('解锁皮肤失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/skins/activate
 * 切换激活的皮肤
 * Body: { skin_type }
 */
router.put('/activate', async (req, res) => {
  try {
    const { skin_type } = req.body;

    if (!skin_type) {
      return res.status(400).json({ success: false, error: '缺少皮肤类型' });
    }

    const skinDef = SKIN_DEFINITIONS.find(s => s.skin_type === skin_type);
    if (!skinDef) {
      return res.status(404).json({ success: false, error: '皮肤不存在' });
    }

    // 默认皮肤直接激活
    if (!skinDef.is_default) {
      const [unlocked] = await pool.execute(
        'SELECT id FROM user_skins WHERE user_id = ? AND skin_type = ? AND is_unlocked = 1',
        [req.user.id, skin_type]
      );
      if (!unlocked || unlocked.length === 0) {
        return res.status(400).json({ success: false, error: '该皮肤尚未解锁' });
      }
    }

    await pool.execute(
      'UPDATE users SET active_skin = ? WHERE id = ?',
      [skin_type === 'default' ? null : skin_type, req.user.id]
    );

    res.json({
      success: true,
      message: `已切换至「${skinDef.skin_name}」`,
      data: { active_skin: skin_type === 'default' ? 'default' : skin_type },
    });
  } catch (err) {
    console.error('切换皮肤失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
