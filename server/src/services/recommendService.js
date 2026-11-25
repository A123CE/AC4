const pool = require('../db');
const tagEngine = require('./tagEngine');

const STRUCTURAL_TAGS = new Set(['屋顶', '斗拱', '彩画', '柱础', '台基', '榫卯']);
const ACTIVE_TAG_THRESHOLD = 5.0;

function parseTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    /* 逗号分隔 */
  }
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTag(value) {
  return String(value || '').trim().toLowerCase();
}

function toCandidate(row) {
  const tags = parseTags(row.tags);
  return {
    id: row.id,
    name: row.name,
    poster_path: row.poster_path,
    category: row.category,
    region: row.region,
    dynasty: row.dynasty,
    created_at: row.created_at,
    tags: tags.length > 0 ? tags : tagEngine.getPalaceTags(row.id),
  };
}

async function getPersonalizationEnabled(userId) {
  try {
    const [[row]] = await pool.execute(
      'SELECT personalization_enabled FROM users WHERE id = ?',
      [userId]
    );
    return row ? Number(row.personalization_enabled) !== 0 : true;
  } catch {
    return true;
  }
}

async function getPopularity() {
  try {
    const [rows] = await pool.execute(
      `SELECT palace_id, COUNT(*) AS visits
       FROM user_history
       WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY palace_id`
    );
    return new Map(rows.map((row) => [row.palace_id, Number(row.visits)]));
  } catch {
    return new Map();
  }
}


function fallbackItems(candidates, limit, excludeId, excludeIds, popularity) {
  return candidates
    .filter((candidate) => candidate.id !== excludeId && !excludeIds.has(candidate.id))
    .sort((a, b) => {
      const popularA = popularity.get(a.id) || 0;
      const popularB = popularity.get(b.id) || 0;
      if (popularA !== popularB) return popularB - popularA;
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    })
    .slice(0, limit)
    .map((candidate) => {
      const popular = (popularity.get(candidate.id) || 0) > 0;
      return {
        palace_id: candidate.id,
        name: candidate.name,
        poster_path: candidate.poster_path,
        reason_code: popular ? 'popular' : 'new',
        reason_text: popular ? '近期热门' : '新上建筑',
        score: 0,
      };
    });
}

/**
 * 个性化推荐
 * @param {{userId?:number, scene?:'home'|'detail', palaceId?:string, limit?:number}} options
 */
async function recommend({ userId = null, scene = 'home', palaceId = null, limit = 6 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 12);
  const [rows] = await pool.query(
    `SELECT id, name, poster_path, category, region, dynasty, tags, created_at
     FROM palaces
     WHERE status = 'published'
     ORDER BY order_num ASC`
  );

  const candidates = rows.map(toCandidate);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const popularity = await getPopularity();

  const enabled = userId ? await getPersonalizationEnabled(userId) : true;
  const excluded = { viewed: 0, collected: 0 };

  let strategy = 'popular';
  let items = [];

  if (userId && enabled) {
    try {
      const [tagRows] = await pool.execute(
        'SELECT tag_name, weight FROM user_tags WHERE user_id = ? AND weight >= ? ORDER BY weight DESC',
        [userId, ACTIVE_TAG_THRESHOLD]
      );
      const [collectionRows] = await pool.execute(
        'SELECT palace_id FROM user_collections WHERE user_id = ?',
        [userId]
      );
      const [historyRows] = await pool.execute(
        `SELECT palace_id, COUNT(*) AS visits
         FROM user_history WHERE user_id = ?
         GROUP BY palace_id`,
        [userId]
      );

      excluded.viewed = historyRows.length;
      excluded.collected = collectionRows.length;

      if (tagRows.length > 0) {
        const userTagMap = new Map(
          tagRows.map((row) => [normalizeTag(row.tag_name), Number(row.weight)])
        );
        const collectedIds = collectionRows.map((row) => row.palace_id);
        const collectedTags = new Set(
          collectedIds.flatMap((id) => byId.get(id)?.tags || [])
        );
        const collectedNames = collectedIds
          .map((id) => byId.get(id)?.name)
          .filter(Boolean);

        const viewedCount = new Map(
          historyRows.map((row) => [row.palace_id, Number(row.visits)])
        );
        const topViewed = historyRows
          .slice()
          .sort((a, b) => Number(b.visits) - Number(a.visits))[0];
        const topViewedCandidate = topViewed
          ? byId.get(topViewed.palace_id)
          : null;

        const scored = candidates
          .filter((candidate) => candidate.id !== palaceId)
          .map((candidate) => {
            const sharedTags = candidate.tags.filter((tag) =>
              userTagMap.has(normalizeTag(tag))
            );
            let score = sharedTags.reduce(
              (sum, tag) => sum + (userTagMap.get(normalizeTag(tag)) || 0),
              0
            );

            const collectedShared = candidate.tags.filter((tag) =>
              collectedTags.has(tag)
            );
            if (collectedShared.length > 0) score += 2;

            if (
              topViewedCandidate?.region &&
              candidate.region === topViewedCandidate.region
            ) {
              score += 0.5;
            }

            if (viewedCount.has(candidate.id)) score -= 1;

            let reason = null;

            if (collectedShared.length > 0) {
              reason = {
                code: 'because_collected',
                text: `与你收藏的${collectedNames[0] || '建筑'}相似`,
              };
            } else if (
              topViewedCandidate &&
              topViewedCandidate.tags.some((tag) => candidate.tags.includes(tag))
            ) {
              reason = {
                code: 'because_viewed',
                text: `因为你看过${topViewedCandidate.name}`,
              };
            } else {
              const structural = sharedTags.find((tag) =>
                STRUCTURAL_TAGS.has(tag)
              );
              if (structural) {
                reason = { code: 'same_structure', text: `同结构：${structural}` };
              } else if (
                topViewedCandidate &&
                candidate.category === topViewedCandidate.category
              ) {
                reason = {
                  code: 'same_category',
                  text: `同类建筑：${candidate.category}`,
                };
              } else if (
                topViewedCandidate &&
                candidate.dynasty === topViewedCandidate.dynasty
              ) {
                reason = {
                  code: 'same_dynasty',
                  text: `同朝代：${candidate.dynasty}`,
                };
              } else if (sharedTags.length > 0) {
                reason = { code: 'same_theme', text: `同主题：${sharedTags[0]}` };
              }
            }

            return {
              candidate,
              score,
              reason: reason || {
                code: 'same_theme',
                text: '与你近期兴趣相关',
              },
            };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score >= ACTIVE_TAG_THRESHOLD) {
          strategy = 'personalized';
          items = scored.slice(0, safeLimit).map((item) => ({
            palace_id: item.candidate.id,
            name: item.candidate.name,
            poster_path: item.candidate.poster_path,
            reason_code: item.reason.code,
            reason_text: item.reason.text,
            score: Number(item.score.toFixed(2)),
          }));

          if (items.length < safeLimit) {
            const existing = new Set(items.map((item) => item.palace_id));
            items.push(
              ...fallbackItems(
                candidates,
                safeLimit - items.length,
                palaceId,
                existing,
                popularity
              )
            );
          }
        }
      }
    } catch (err) {
      console.error('个性化推荐失败，回退通用推荐:', err.message);
    }
  }

  if (items.length === 0) {
    strategy = candidates.length > 0 ? 'popular' : 'fallback';
    items = fallbackItems(
      candidates,
      safeLimit,
      palaceId,
      new Set(),
      popularity
    );
  }

  return {
    strategy,
    personalization_enabled: enabled,
    items,
    excluded,
  };
}

module.exports = {
  recommend,
  parseTags,
  ACTIVE_TAG_THRESHOLD,
};