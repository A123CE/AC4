const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');
const tagEngine = require('../services/tagEngine');

const SALT_ROUNDS = 12;

// ============================================================
//  公开路由
// ============================================================

/**
 * POST /api/auth/register
 * 用户注册 — "领取腰牌"
 * Body: { username, password, email?, interest_tag? }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, interest_tag } = req.body;

    // 验证必填字段
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: '请输入用户名' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少6位' });
    }

    const trimmedUser = username.trim();
    const trimmedEmail = email ? email.trim() : null;

    // 检查用户名是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [trimmedUser]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '该用户名已被占用' });
    }

    // 检查邮箱是否已存在
    if (trimmedEmail) {
      const [emailExist] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [trimmedEmail]
      );
      if (emailExist.length > 0) {
        return res.status(409).json({ success: false, error: '该邮箱已被注册' });
      }
    }

    // 密码哈希
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 验证兴趣标签
    const validTags = ['tourist', 'student', 'designer'];
    const tag = validTags.includes(interest_tag) ? interest_tag : null;

    // 插入用户
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, interest_tag, login_count, last_login_at) VALUES (?, ?, ?, ?, 1, NOW())',
      [trimmedUser, trimmedEmail, password_hash, tag]
    );

    const user = {
      id: result.insertId,
      username: trimmedUser,
      email: trimmedEmail,
      role: 'user',
      interest_tag: tag,
      points: 0
    };

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '注册成功！欢迎加入故宫数字社区',
      data: {
        user,
        token
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ success: false, error: '服务器错误，注册失败' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录 — "验明正身"
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '请输入用户名和密码' });
    }

    // 查找用户（支持用户名或邮箱登录）
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, role, interest_tag, points, avatar_url FROM users WHERE username = ? OR email = ?',
      [username.trim(), username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 更新登录次数和最后登录时间
    await pool.execute(
      'UPDATE users SET login_count = login_count + 1, last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      interest_tag: user.interest_tag,
      points: user.points,
      avatar_url: user.avatar_url
    };

    const token = generateToken(userData);

    res.json({
      success: true,
      message: '登录成功！',
      data: {
        user: userData,
        token
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ success: false, error: '服务器错误，登录失败' });
  }
});

// ============================================================
//  受保护路由 (需JWT Token)
// ============================================================

/**
 * GET /api/auth/profile
 * 获取当前用户信息
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, interest_tag, points, avatar_url, login_count, last_login_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 获取游览进度统计
    const [historyCount] = await pool.execute(
      'SELECT COUNT(DISTINCT palace_id) AS viewed FROM user_history WHERE user_id = ?',
      [req.user.id]
    );
    const [totalCount] = await pool.execute(
      'SELECT COUNT(*) AS total FROM palaces'
    );

    // 获取收藏统计
    const [collectionCount] = await pool.execute(
      'SELECT COUNT(*) AS total FROM user_collections WHERE user_id = ?',
      [req.user.id]
    );

    // 获取徽章
    const [badges] = await pool.execute(
      `SELECT b.id, b.name, b.description, b.icon, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ?
       ORDER BY ub.earned_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...users[0],
        stats: {
          palaces_viewed: historyCount[0].viewed,
          palaces_total: totalCount[0].total,
          view_progress: totalCount[0].total > 0
            ? Math.round((historyCount[0].viewed / totalCount[0].total) * 100)
            : 0,
          collections: collectionCount[0].total
        },
        badges
      }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/auth/profile
 * 更新用户信息
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { avatar_url, interest_tag } = req.body;
    const updates = [];
    const params = [];

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }
    if (interest_tag !== undefined) {
      const validTags = ['tourist', 'student', 'designer'];
      if (validTags.includes(interest_tag)) {
        updates.push('interest_tag = ?');
        params.push(interest_tag);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的字段' });
    }

    params.push(req.user.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
//  游览历史 — "御览足迹"
// ============================================================

/**
 * GET /api/auth/history
 * 获取用户游览历史
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const [history] = await pool.execute(
      `SELECT uh.id, uh.palace_id, p.name AS palace_name, p.category, p.dynasty,
              uh.viewed_at, uh.duration_seconds
       FROM user_history uh
       JOIN palaces p ON uh.palace_id = p.id
       WHERE uh.user_id = ?
       ORDER BY uh.viewed_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ success: true, data: history });
  } catch (err) {
    console.error('获取游览历史失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/auth/history
 * 记录一次游览
 * Body: { palace_id, duration_seconds? }
 */
router.post('/history', authMiddleware, async (req, res) => {
  try {
    const { palace_id, duration_seconds } = req.body;

    if (!palace_id) {
      return res.status(400).json({ success: false, error: '缺少宫殿ID' });
    }

    // 检查宫殿是否存在
    const [palaces] = await pool.execute(
      'SELECT id FROM palaces WHERE id = ?',
      [palace_id]
    );
    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    await pool.execute(
      'INSERT INTO user_history (user_id, palace_id, duration_seconds) VALUES (?, ?, ?)',
      [req.user.id, palace_id, duration_seconds || 0]
    );

    // 首次浏览该宫殿 +10积分
    const [existing] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM user_history WHERE user_id = ? AND palace_id = ?',
      [req.user.id, palace_id]
    );
    if (existing[0].cnt === 1) {
      await pool.execute(
        'UPDATE users SET points = points + 10 WHERE id = ?',
        [req.user.id]
      );
    }

    // 更新用户兴趣标签
    tagEngine.onPalaceViewed(req.user.id, palace_id, duration_seconds || 0).catch(() => {});

    res.json({ success: true, message: '记录成功', points_earned: existing[0].cnt === 1 ? 10 : 0 });
  } catch (err) {
    console.error('记录游览历史失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
//  收藏/笔记 — "珍宝阁"
// ============================================================

/**
 * GET /api/auth/collections
 * 获取用户收藏
 */
router.get('/collections', authMiddleware, async (req, res) => {
  try {
    const [collections] = await pool.execute(
      `SELECT uc.id, uc.palace_id, p.name AS palace_name, p.category, p.dynasty,
              uc.category AS collection_category, uc.note, uc.created_at
       FROM user_collections uc
       JOIN palaces p ON uc.palace_id = p.id
       WHERE uc.user_id = ?
       ORDER BY uc.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: collections });
  } catch (err) {
    console.error('获取收藏失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/auth/collections
 * 添加收藏/笔记
 * Body: { palace_id, category?, note? }
 */
router.post('/collections', authMiddleware, async (req, res) => {
  try {
    const { palace_id, category, note } = req.body;

    if (!palace_id) {
      return res.status(400).json({ success: false, error: '缺少宫殿ID' });
    }

    // 检查宫殿是否存在
    const [palaces] = await pool.execute(
      'SELECT id FROM palaces WHERE id = ?',
      [palace_id]
    );
    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    // 检查是否已收藏
    const [existing] = await pool.execute(
      'SELECT id FROM user_collections WHERE user_id = ? AND palace_id = ?',
      [req.user.id, palace_id]
    );
    if (existing.length > 0) {
      // 更新已有收藏
      await pool.execute(
        'UPDATE user_collections SET category = ?, note = ? WHERE id = ?',
        [category || '默认', note || null, existing[0].id]
      );
      return res.json({ success: true, message: '收藏已更新' });
    }

    await pool.execute(
      'INSERT INTO user_collections (user_id, palace_id, category, note) VALUES (?, ?, ?, ?)',
      [req.user.id, palace_id, category || '默认', note || null]
    );

    // 收藏+5积分
    await pool.execute(
      'UPDATE users SET points = points + 5 WHERE id = ?',
      [req.user.id]
    );

    // 更新用户兴趣标签
    tagEngine.onPalaceCollected(req.user.id, palace_id).catch(() => {});

    res.status(201).json({ success: true, message: '收藏成功 (+5功德)', points_earned: 5 });
  } catch (err) {
    console.error('添加收藏失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * DELETE /api/auth/collections/:palaceId
 * 取消收藏
 */
router.delete('/collections/:palaceId', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM user_collections WHERE user_id = ? AND palace_id = ?',
      [req.user.id, req.params.palaceId]
    );
    res.json({ success: true, message: '已取消收藏' });
  } catch (err) {
    console.error('取消收藏失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
