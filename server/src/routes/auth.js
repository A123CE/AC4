const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');
const tagEngine = require('../services/tagEngine');
const pointsService = require('../services/pointsService');
const achievementEngine = require('../services/achievementEngine');
const { toPublicCollection } = require('../services/publicSerializer');

const SALT_ROUNDS = 12;

// 收藏分类白名单与笔记长度上限
const COLLECTION_CATEGORIES = ['默认', '想去', '已研究', '教学素材'];
const MAX_NOTE_LENGTH = 500;

function normalizeCollectionCategory(value) {
  const category = typeof value === 'string' ? value.trim() : '';
  if (COLLECTION_CATEGORIES.includes(category)) {
    return { category, normalized: false };
  }
  return { category: '默认', normalized: true };
}

/**
 * 笔记文本清洗：转义 script 标签并去除首尾空白
 */
function sanitizeText(value) {
  return String(value ?? '')
    .replace(/<\s*script[^>]*>/gi, '&lt;script&gt;')
    .replace(/<\s*\/\s*script\s*>/gi, '&lt;/script&gt;')
    .trim();
}

async function fetchCollection(userId, palaceId) {
  const [rows] = await pool.execute(
    `SELECT uc.id, uc.palace_id, p.name AS palace_name, p.category, p.dynasty,
            uc.category AS collection_category, uc.note, uc.created_at, uc.updated_at,
            p.poster_path
     FROM user_collections uc
     JOIN palaces p ON uc.palace_id = p.id
     WHERE uc.user_id = ? AND uc.palace_id = ?`,
    [userId, palaceId]
  );
  return rows[0] || null;
}

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
    const achievements = await achievementEngine.evaluate(user.id, { trigger: 'register' });

    res.status(201).json({
      success: true,
      message: '注册成功！欢迎加入故宫数字社区',
      data: {
        user,
        token,
        achievements,
        pending_merge_hint: false,
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
      'SELECT id, username, email, password_hash, role, interest_tag, points, avatar_url, locale FROM users WHERE username = ? OR email = ?',
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
      avatar_url: user.avatar_url,
      locale: user.locale || 'zh-CN'
    };

    const token = generateToken(userData);
    const achievements = await achievementEngine.evaluate(userData.id, { trigger: 'login' });

    res.json({
      success: true,
      message: '登录成功！',
      data: {
        user: userData,
        token,
        achievements,
        pending_merge_hint: false,
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ success: false, error: '服务器错误，登录失败' });
  }
});

/**
 * POST /api/auth/merge-guest
 * 登录后合并本机暂存收藏与笔记；冲突以账号已有内容为准，积分幂等
 * Body: { collections[], notes[], source: 'guest_local' }
 */
router.post('/merge-guest', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const collectionList = Array.isArray(body.collections) ? body.collections : [];
    const noteList = Array.isArray(body.notes) ? body.notes : [];

    if (collectionList.length > 20 || noteList.length > 5) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '合并数据超出上限',
      });
    }
    if (body.source && body.source !== 'guest_local') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '不支持的数据来源',
      });
    }

    const items = [];
    let merged = 0;
    let skipped = 0;
    let rejected = 0;
    let pointsEarned = 0;

    const reject = (palaceId, type, reason) => {
      rejected += 1;
      items.push({ palace_id: palaceId, type, status: 'rejected', reason });
    };

    for (const entry of collectionList) {
      const palaceId = String(entry?.palace_id ?? '').trim();
      const category = String(entry?.category ?? '默认').trim();
      const note = sanitizeText(entry?.note);

      if (!palaceId) {
        reject(palaceId, 'collection', 'invalid_palace');
        continue;
      }
      if (!COLLECTION_CATEGORIES.includes(category)) {
        reject(palaceId, 'collection', 'invalid_category');
        continue;
      }
      if (note.length > MAX_NOTE_LENGTH) {
        reject(palaceId, 'collection', 'note_too_long');
        continue;
      }

      const [palaces] = await pool.execute(
        'SELECT id FROM palaces WHERE id = ?',
        [palaceId]
      );
      if (palaces.length === 0) {
        reject(palaceId, 'collection', 'invalid_palace');
        continue;
      }

      const existing = await fetchCollection(req.user.id, palaceId);
      if (existing) {
        skipped += 1;
        items.push({
          palace_id: palaceId,
          type: 'collection',
          status: 'skipped',
          reason: 'already_collected',
        });
        continue;
      }

      await pool.execute(
        'INSERT INTO user_collections (user_id, palace_id, category, note) VALUES (?, ?, ?, ?)',
        [req.user.id, palaceId, category, note || null]
      );

      const award = await pointsService.awardPoints(
        req.user.id,
        'collection',
        palaceId,
        5
      );
      pointsEarned += award.points;
      merged += 1;
      items.push({ palace_id: palaceId, type: 'collection', status: 'merged' });

      tagEngine.onPalaceCollected(req.user.id, palaceId).catch(() => {});
    }

    for (const entry of noteList) {
      const palaceId = String(entry?.palace_id ?? '').trim();
      const note = sanitizeText(entry?.note);

      if (!palaceId) {
        reject(palaceId, 'note', 'invalid_palace');
        continue;
      }
      if (note.length > MAX_NOTE_LENGTH) {
        reject(palaceId, 'note', 'note_too_long');
        continue;
      }

      const existing = await fetchCollection(req.user.id, palaceId);
      if (!existing) {
        reject(palaceId, 'note', 'not_collected');
        continue;
      }
      if (!existing.note) {
        await pool.execute(
          'UPDATE user_collections SET note = ? WHERE id = ?',
          [note, existing.id]
        );
        merged += 1;
        items.push({ palace_id: palaceId, type: 'note', status: 'merged' });
        continue;
      }

      skipped += 1;
      items.push({
        palace_id: palaceId,
        type: 'note',
        status: 'skipped',
        reason: existing.note === note ? 'already_merged' : 'account_note_kept',
      });
    }

    const achievements = await achievementEngine.evaluate(req.user.id, {
      trigger: 'merge',
    });

    res.json({
      success: true,
      message: '游客数据合并完成',
      data: {
        merged,
        skipped,
        rejected,
        points_earned: pointsEarned,
        achievements,
        items,
      },
    });
  } catch (err) {
    console.error('合并游客数据失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
//  受保护路由 (需JWT Token)
// ============================================================

/**
 * GET /api/auth/preferences
 * 读取个性化推荐开关
 */
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT personalization_enabled, analytics_enabled, classroom_mode,
              classroom_font_scale, minor_mode, leaderboard_opt_out
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    const row = rows[0];
    const fontScale = ['standard', 'large', 'xlarge'].includes(row.classroom_font_scale)
      ? row.classroom_font_scale
      : 'large';
    res.json({
      success: true,
      data: {
        personalization_enabled: Number(row.personalization_enabled) !== 0,
        analytics_enabled: Number(row.analytics_enabled) !== 0,
        classroom_mode: Number(row.classroom_mode) !== 0,
        classroom_font_scale: fontScale,
        minor_mode: row.minor_mode === 'minor' ? 'minor' : 'unset',
        leaderboard_opt_out: Number(row.leaderboard_opt_out) !== 0,
      },
    });
  } catch (err) {
    console.error('读取偏好失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/auth/preferences
 * 更新个性化推荐开关
 */
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    const result = {};

    if (body.personalization_enabled !== undefined) {
      if (![true, false, 1, 0].includes(body.personalization_enabled)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'personalization_enabled 必须为布尔值',
        });
      }
      const enabled = body.personalization_enabled ? 1 : 0;
      updates.personalization_enabled = enabled;
      result.personalization_enabled = !!enabled;
    }

    if (body.analytics_enabled !== undefined) {
      if (![true, false, 1, 0].includes(body.analytics_enabled)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'analytics_enabled 必须为布尔值',
        });
      }
      const enabled = body.analytics_enabled ? 1 : 0;
      updates.analytics_enabled = enabled;
      result.analytics_enabled = !!enabled;
    }

    if (body.classroom_mode !== undefined) {
      if (![true, false, 1, 0].includes(body.classroom_mode)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'classroom_mode 必须为布尔值',
        });
      }
      const enabled = body.classroom_mode ? 1 : 0;
      updates.classroom_mode = enabled;
      result.classroom_mode = !!enabled;
    }

    if (body.classroom_font_scale !== undefined) {
      if (!['standard', 'large', 'xlarge'].includes(body.classroom_font_scale)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'classroom_font_scale 仅支持 standard/large/xlarge',
        });
      }
      updates.classroom_font_scale = body.classroom_font_scale;
      result.classroom_font_scale = body.classroom_font_scale;
    }

    if (body.leaderboard_opt_out !== undefined) {
      if (![true, false, 1, 0].includes(body.leaderboard_opt_out)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'leaderboard_opt_out 必须为布尔值',
        });
      }
      const optedOut = body.leaderboard_opt_out ? 1 : 0;
      updates.leaderboard_opt_out = optedOut;
      result.leaderboard_opt_out = !!optedOut;
    }

    if (body.minor_mode !== undefined) {
      if (!['unset', 'minor'].includes(body.minor_mode)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_FAILED',
          error: 'minor_mode 仅支持 unset/minor',
        });
      }
      updates.minor_mode = body.minor_mode;
      result.minor_mode = body.minor_mode;
      if (body.minor_mode === 'minor') {
        updates.leaderboard_opt_out = 1;
        result.leaderboard_opt_out = true;
      }
    }

    const columns = Object.keys(updates);
    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '没有可更新的偏好字段',
      });
    }

    const params = columns.map((column) => updates[column]);
    params.push(req.user.id);
    await pool.execute(
      `UPDATE users SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('更新偏好失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/auth/locale
 * 保存用户语言偏好
 */
router.put('/locale', authMiddleware, async (req, res) => {
  try {
    const locale = req.body?.locale;
    if (locale !== 'zh-CN' && locale !== 'en') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: 'locale 仅支持 zh-CN 或 en',
      });
    }

    await pool.execute('UPDATE users SET locale = ? WHERE id = ?', [
      locale,
      req.user.id,
    ]);

    res.json({ success: true, data: { locale } });
  } catch (err) {
    console.error('保存语言偏好失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

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
    const body = req.body || {};
    const { palace_id, duration_seconds, interacted, source } = body;
    const dwellSeconds = Number.isFinite(Number(body.dwell_seconds))
      ? Number(body.dwell_seconds)
      : Number(duration_seconds) || 0;

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

    // 同一秒内重复上报由 uk_user_palace_view 约束，IGNORE 保证幂等
    await pool.execute(
      'INSERT IGNORE INTO user_history (user_id, palace_id, duration_seconds) VALUES (?, ?, ?)',
      [req.user.id, palace_id, Math.max(0, Math.round(dwellSeconds))]
    );

    // 有效浏览才盖章：停留 ≥5s 或发生交互
    let newStamp = null;
    let pointsEarned = 0;
    if (dwellSeconds >= 5 || interacted) {
      newStamp = await achievementEngine.grantStamp(req.user.id, palace_id);
      if (newStamp) {
        const award = await pointsService.awardPoints(
          req.user.id,
          'visit',
          palace_id,
          10
        );
        pointsEarned = award.points;
      }
    }

    const achievements = await achievementEngine.evaluate(req.user.id, {
      trigger: 'visit',
      source,
    });
    if (
      newStamp &&
      !achievements.stamps.some((item) => item.palace_id === palace_id)
    ) {
      achievements.stamps = [newStamp, ...achievements.stamps];
    }

    // 更新用户兴趣标签
    tagEngine.onPalaceViewed(req.user.id, palace_id, dwellSeconds).catch(() => {});

    const [[{ visited_total }]] = await pool.execute(
      'SELECT COUNT(*) AS visited_total FROM user_stamps WHERE user_id = ?',
      [req.user.id]
    );
    const [[{ palaces_total }]] = await pool.execute(
      'SELECT COUNT(*) AS palaces_total FROM palaces'
    );

    res.json({
      success: true,
      message: '记录成功',
      points_earned: pointsEarned,
      new_stamp: newStamp,
      achievements,
      visited_total: Number(visited_total || 0),
      palaces_total: Number(palaces_total || 0),
    });
  } catch (err) {
    console.error('记录游览历史失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
//  收藏/笔记 — "珍宝阁"
// ============================================================

const EMPTY_ACHIEVEMENTS = { stamps: [], badges: [] };

/**
 * GET /api/auth/collections?category=
 * 获取用户收藏（支持四分类筛选）
 */
router.get('/collections', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    const params = [req.user.id];
    let whereSql = 'WHERE uc.user_id = ?';

    if (category && COLLECTION_CATEGORIES.includes(category)) {
      whereSql += ' AND uc.category = ?';
      params.push(category);
    }

    const [collections] = await pool.execute(
      `SELECT uc.id, uc.palace_id, p.name AS palace_name, p.category, p.dynasty,
              uc.category AS collection_category, uc.note, uc.created_at, uc.updated_at,
              p.poster_path
       FROM user_collections uc
       JOIN palaces p ON uc.palace_id = p.id
       ${whereSql}
       ORDER BY uc.created_at DESC`,
      params
    );

    res.json({ success: true, data: collections.map(toPublicCollection) });
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
    const body = req.body || {};
    const palaceId = String(body.palace_id || '').trim();

    if (!palaceId) {
      return res.status(400).json({ success: false, error: '缺少宫殿ID' });
    }

    const { category, normalized } = normalizeCollectionCategory(body.category);
    const note = sanitizeText(body.note);
    if (note.length > MAX_NOTE_LENGTH) {
      return res.status(400).json({ success: false, error: '笔记不能超过 500 字' });
    }

    // 检查宫殿是否存在
    const [palaces] = await pool.execute(
      'SELECT id FROM palaces WHERE id = ?',
      [palaceId]
    );
    if (palaces.length === 0) {
      return res.status(404).json({ success: false, error: '宫殿不存在' });
    }

    const existing = await fetchCollection(req.user.id, palaceId);
    if (existing) {
      await pool.execute(
        'UPDATE user_collections SET category = ?, note = ? WHERE id = ?',
        [category, note || null, existing.id]
      );
      tagEngine.onPalaceCollected(req.user.id, palaceId).catch(() => {});
      const updated = await fetchCollection(req.user.id, palaceId);

      return res.json({
        success: true,
        message: '收藏已更新',
        data: {
          collection: toPublicCollection(updated),
          points_earned: 0,
          created: false,
          normalized,
          // TODO(T-M4-03): 统一成就引擎接入后返回真实 stamps/badges
          achievements: EMPTY_ACHIEVEMENTS,
        },
      });
    }

    await pool.execute(
      'INSERT INTO user_collections (user_id, palace_id, category, note) VALUES (?, ?, ?, ?)',
      [req.user.id, palaceId, category, note || null]
    );

    // 幂等积分：同一建筑取消后再收藏不会重复加分
    const award = await pointsService.awardPoints(
      req.user.id,
      'collection',
      palaceId,
      5
    );

    tagEngine.onPalaceCollected(req.user.id, palaceId).catch(() => {});
    const created = await fetchCollection(req.user.id, palaceId);

    res.status(201).json({
      success: true,
      message: award.points > 0 ? '收藏成功 (+5功德)' : '收藏成功',
      data: {
        collection: toPublicCollection(created),
        points_earned: award.points,
        created: true,
        normalized,
        achievements: EMPTY_ACHIEVEMENTS,
      },
    });
  } catch (err) {
    console.error('添加收藏失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * DELETE /api/auth/collections/:palaceId
 * 取消收藏（物理删除，积分流水保留以保证不重复加分）
 */
router.delete('/collections/:palaceId', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM user_collections WHERE user_id = ? AND palace_id = ?',
      [req.user.id, req.params.palaceId]
    );
    res.json({
      success: true,
      message: '已取消收藏',
      points_revoked: 0,
      data: { points_revoked: 0, removed: result.affectedRows },
    });
  } catch (err) {
    console.error('取消收藏失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/auth/collections/:palaceId/note
 * 独立更新收藏笔记（允许空串清空）
 */
router.put('/collections/:palaceId/note', authMiddleware, async (req, res) => {
  try {
    const note = sanitizeText(req.body?.note);
    if (note.length > MAX_NOTE_LENGTH) {
      return res.status(400).json({ success: false, error: '笔记不能超过 500 字' });
    }

    const existing = await fetchCollection(req.user.id, req.params.palaceId);
    if (!existing) {
      return res.status(404).json({ success: false, error: '收藏不存在' });
    }

    await pool.execute(
      'UPDATE user_collections SET note = ? WHERE user_id = ? AND palace_id = ?',
      [note || null, req.user.id, req.params.palaceId]
    );

    const updated = await fetchCollection(req.user.id, req.params.palaceId);
    res.json({
      success: true,
      message: '笔记已保存',
      data: {
        note: updated.note,
        updated_at: updated.updated_at,
        collection: toPublicCollection(updated),
      },
    });
  } catch (err) {
    console.error('更新收藏笔记失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
