const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

function clampProgress(value, total) {
  const max = Math.max(1, Number(total) || 1);
  const parsed = Number(value);
  return Math.min(max, Math.max(1, Number.isFinite(parsed) ? parsed : 1));
}

/**
 * GET /api/routes
 * 已发布路线列表；登录用户附带进度
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.name, r.name_en, r.description, r.cover_path,
              r.duration_minutes, r.difficulty, r.sort_order,
              (SELECT COUNT(*) FROM route_stops s WHERE s.route_id = r.id) AS stops_count,
              urp.stop_order AS user_stop
       FROM curated_routes r
       LEFT JOIN user_route_progress urp
         ON urp.route_id = r.id AND urp.user_id = ?
       WHERE r.is_published = 1
       ORDER BY r.sort_order ASC, r.id ASC`,
      [req.user?.id || null]
    );

    const data = rows.map((row) => ({
      id: row.id,
      name: row.name,
      name_en: row.name_en,
      description: row.description,
      cover: row.cover_path,
      duration_minutes: Number(row.duration_minutes || 60),
      difficulty: row.difficulty,
      sort_order: Number(row.sort_order || 0),
      stops_count: Number(row.stops_count || 0),
      progress: {
        stop_order: clampProgress(row.user_stop, row.stops_count),
        total: Number(row.stops_count || 0),
      },
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('获取路线列表失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/routes/:id
 * 路线详情；建筑下线时进入 skipped[]
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [routes] = await pool.execute(
      `SELECT id, name, name_en, description, cover_path, duration_minutes,
              difficulty, sort_order
       FROM curated_routes
       WHERE id = ? AND is_published = 1`,
      [req.params.id]
    );

    if (routes.length === 0) {
      return res.status(404).json({ success: false, error: '路线不存在' });
    }

    const route = routes[0];

    const [stopRows] = await pool.execute(
      `SELECT s.stop_order, s.highlight, s.stay_minutes,
              s.palace_id AS route_palace_id,
              p.id AS palace_id, p.name, p.category, p.poster_path
       FROM route_stops s
       LEFT JOIN palaces p ON p.id = s.palace_id AND p.status = 'published'
       WHERE s.route_id = ?
       ORDER BY s.stop_order ASC`,
      [req.params.id]
    );

    const stops = [];
    const skipped = [];

    for (const row of stopRows) {
      if (!row.palace_id) {
        skipped.push({
          stop_order: Number(row.stop_order),
          palace_id: row.route_palace_id,
          reason: 'palace_offline',
        });
        continue;
      }
      stops.push({
        stop_order: Number(row.stop_order),
        highlight: row.highlight || '',
        stay_minutes: Number(row.stay_minutes || 10),
        palace: {
          id: row.palace_id,
          name: row.name,
          category: row.category,
          poster: row.poster_path,
        },
      });
    }

    let savedOrder = 1;
    if (req.user?.id) {
      const [progressRows] = await pool.execute(
        'SELECT stop_order FROM user_route_progress WHERE user_id = ? AND route_id = ?',
        [req.user.id, req.params.id]
      );
      if (progressRows.length > 0) savedOrder = progressRows[0].stop_order;
    }

    const total = stops.length;
    const stopOrder = clampProgress(savedOrder, total);
    const currentIndex = Math.max(
      0,
      stops.findIndex((stop) => stop.stop_order === stopOrder)
    );

    res.json({
      success: true,
      data: {
        route: {
          id: route.id,
          name: route.name,
          name_en: route.name_en,
          description: route.description,
          cover: route.cover_path,
          duration_minutes: Number(route.duration_minutes || 60),
          difficulty: route.difficulty,
          sort_order: Number(route.sort_order || 0),
        },
        stops,
        skipped,
        progress: {
          stop_order: stopOrder,
          total,
          percent:
            total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0,
        },
      },
    });
  } catch (err) {
    console.error('获取路线详情失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * PUT /api/routes/:id/progress
 * 登录用户保存路线进度
 */
router.put('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const [routes] = await pool.execute(
      'SELECT id FROM curated_routes WHERE id = ? AND is_published = 1',
      [req.params.id]
    );
    if (routes.length === 0) {
      return res.status(404).json({ success: false, error: '路线不存在' });
    }

    const [[{ max_order }]] = await pool.execute(
      'SELECT MAX(stop_order) AS max_order FROM route_stops WHERE route_id = ?',
      [req.params.id]
    );
    const total = Number(max_order || 0);
    const parsed = parseInt(req.body?.stop_order, 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > Math.max(total, 1)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        error: '站点序号超出范围',
      });
    }

    await pool.execute(
      `INSERT INTO user_route_progress (user_id, route_id, stop_order)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order)`,
      [req.user.id, req.params.id, parsed]
    );

    res.json({
      success: true,
      data: {
        route_id: req.params.id,
        stop_order: parsed,
        total,
        percent: total > 0 ? Math.round((parsed / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('保存路线进度失败:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;