/**
 * 用户兴趣标签引擎 — 根据用户行为更新兴趣标签权重
 *
 * 标签体系:
 *   朝代: 明代建筑, 清代建筑, 明永乐年间
 *   区域: 外朝, 内廷, 后宫
 *   建筑类型: 宫殿, 关隘, 城门
 *   结构: 屋顶, 斗拱, 彩画, 柱础, 台基
 *   功能: 典礼, 朝政, 寝居, 祭祀
 *
 * 权重规则:
 *   - 浏览宫殿 >10秒: +0.5 给宫殿关联的所有标签
 *   - 收藏宫殿: +2.0
 *   - 答对题目: +1.0 给题目关联的所有标签
 *   - 阈值: 权重 >5.0 时推荐引擎开始使用该标签
 */

const pool = require('../db');

// 宫殿ID -> 标签的映射表
const PALACE_TAGS = {
  wumen:        ['外朝', '城门', '明代建筑', '明永乐年间'],
  taihemen:     ['外朝', '宫殿', '明代建筑', '明永乐年间', '典礼'],
  taihedian:    ['外朝', '宫殿', '典礼', '明代建筑', '屋顶', '斗拱', '彩画'],
  zhonghedian:  ['外朝', '宫殿', '典礼', '明代建筑'],
  baohedian:    ['外朝', '宫殿', '典礼', '明代建筑', '屋顶'],
  qianqingmen:  ['内廷', '后宫', '城门', '明代建筑', '明永乐年间'],
  qianqinggong: ['内廷', '后宫', '寝居', '宫殿', '明代建筑', '屋顶'],
  jiaotaidian:  ['内廷', '后宫', '寝居', '宫殿', '明代建筑', '彩画'],
  kunninggong:  ['内廷', '后宫', '寝居', '宫殿', '明代建筑'],
  shenwumen:    ['内廷', '城门', '明代建筑', '明永乐年间'],
};

/**
 * 获取宫殿关联的所有标签
 * @param {string} palaceId - 宫殿ID
 * @returns {string[]} 标签数组
 */
function getPalaceTags(palaceId) {
  return PALACE_TAGS[palaceId] || [];
}

/**
 * 从标签名数组批量更新用户标签权重
 * @param {number} userId - 用户ID
 * @param {string[]} tags - 标签名数组
 * @param {number} increment - 权重增量
 */
async function updateTags(userId, tags, increment) {
  if (!tags || tags.length === 0 || !userId) return;

  try {
    for (const tag of tags) {
      await pool.execute(
        `INSERT INTO user_tags (user_id, tag_name, weight)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE weight = weight + ?`,
        [userId, tag, increment, increment]
      );
    }
  } catch (err) {
    // 标签更新失败不影响主流程
    console.error('更新用户标签失败:', err.message);
  }
}

/**
 * 记录宫殿浏览行为并更新标签
 * @param {number} userId - 用户ID
 * @param {string} palaceId - 宫殿ID
 * @param {number} durationSeconds - 浏览时长(秒)
 */
async function onPalaceViewed(userId, palaceId, durationSeconds = 0) {
  if (!userId || !palaceId) return;

  const tags = getPalaceTags(palaceId);
  if (tags.length === 0) return;

  // 浏览超过10秒才加权
  if (durationSeconds >= 10) {
    await updateTags(userId, tags, 0.5);
  }
}

/**
 * 记录收藏行为并更新标签
 * @param {number} userId - 用户ID
 * @param {string} palaceId - 宫殿ID
 */
async function onPalaceCollected(userId, palaceId) {
  if (!userId || !palaceId) return;

  const tags = getPalaceTags(palaceId);
  await updateTags(userId, tags, 2.0);
}

/**
 * 记录答题行为并更新标签
 * @param {number} userId - 用户ID
 * @param {string[]} questionTags - 题目关联的标签
 */
async function onQuestionAnswered(userId, questionTags) {
  if (!userId || !questionTags || questionTags.length === 0) return;

  await updateTags(userId, questionTags, 1.0);
}

/**
 * 获取用户所有标签及权重
 * @param {number} userId - 用户ID
 * @returns {Promise<Array<{tag_name: string, weight: number}>>}
 */
async function getUserTags(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT tag_name, weight FROM user_tags WHERE user_id = ? AND weight > 0 ORDER BY weight DESC',
      [userId]
    );
    return rows;
  } catch (err) {
    console.error('获取用户标签失败:', err.message);
    return [];
  }
}

/**
 * 检查是否有超过阈值的标签
 * @param {number} userId - 用户ID
 * @param {number} threshold - 阈值, 默认5.0
 * @returns {Promise<string[]>} 超过阈值的标签名数组
 */
async function getActiveTags(userId, threshold = 5.0) {
  try {
    const [rows] = await pool.execute(
      'SELECT tag_name FROM user_tags WHERE user_id = ? AND weight >= ?',
      [userId, threshold]
    );
    return rows.map(r => r.tag_name);
  } catch (err) {
    console.error('获取活跃标签失败:', err.message);
    return [];
  }
}

module.exports = {
  getPalaceTags,
  updateTags,
  onPalaceViewed,
  onPalaceCollected,
  onQuestionAnswered,
  getUserTags,
  getActiveTags,
};
