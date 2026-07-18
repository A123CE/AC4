import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 请求拦截器 — 自动携带 JWT token
 * 与其他使用 axios.defaults.headers 的代码兼容
 */
api.interceptors.request.use((config) => {
  // 优先检查 config 上已设置的 Authorization
  let token = config.headers?.Authorization || config.headers?.authorization;
  if (!token) {
    // 直接从 localStorage 读取，确保与 AuthContext 同步
    try {
      const raw = localStorage.getItem('palace_auth');
      if (raw) {
        const auth = JSON.parse(raw);
        if (auth?.token) {
          token = `Bearer ${auth.token}`;
        }
      }
    } catch {}
  }
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

/**
 * 获取所有宫殿列表
 * @param {Object} params - { category, dynasty }
 */
export const getPalaces = (params = {}) =>
  api.get('/palaces', { params });

/**
 * 搜索宫殿
 * @param {string} query - 搜索关键词
 */
export const searchPalaces = (query) =>
  api.get('/palaces/search', { params: { q: query } });

/**
 * 获取单个宫殿详情
 * @param {string} id - 宫殿ID
 */
export const getPalaceById = (id) =>
  api.get(`/palaces/${id}`);

/**
 * 筛选宫殿
 * @param {Object} params - { category, dynasty }
 */
export const filterPalaces = (params = {}) =>
  api.get('/palaces/filter', { params });

// ============================================================
//  认证相关 API
// ============================================================

/**
 * 用户登录
 */
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

/**
 * 用户注册
 */
export const register = (username, password, email, interestTag) =>
  api.post('/auth/register', { username, password, email, interest_tag: interestTag });

/**
 * 获取用户信息
 */
export const getProfile = () =>
  api.get('/auth/profile');

/**
 * 获取游览历史
 */
export const getHistory = () =>
  api.get('/auth/history');

/**
 * 记录游览
 */
export const recordHistory = (palaceId, durationSeconds) =>
  api.post('/auth/history', { palace_id: palaceId, duration_seconds: durationSeconds });

/**
 * 获取收藏列表
 */
export const getCollections = () =>
  api.get('/auth/collections');

/**
 * 添加/更新收藏
 */
export const addCollection = (palaceId, category, note) =>
  api.post('/auth/collections', { palace_id: palaceId, category, note });

/**
 * 取消收藏
 */
export const removeCollection = (palaceId) =>
  api.delete(`/auth/collections/${palaceId}`);

// ============================================================
//  百科 API — "营造法式"
// ============================================================

/**
 * 获取百科术语列表
 * @param {Object} params - { category, search }
 */
export const getEncyclopediaTerms = (params = {}) =>
  api.get('/encyclopedia', { params });

/**
 * 获取百科分类列表
 */
export const getEncyclopediaCategories = () =>
  api.get('/encyclopedia/categories');

/**
 * 获取单条百科术语详情
 * @param {string} id - 术语ID
 */
export const getEncyclopediaTerm = (id) =>
  api.get(`/encyclopedia/${id}`);

// ============================================================
//  每日签到 API
// ============================================================

/**
 * 执行每日签到
 */
export const dailySignin = () =>
  api.post('/signin');

/**
 * 查询签到状态
 */
export const getSigninStatus = () =>
  api.get('/signin/status');

// ============================================================
//  翰林院答题 API
// ============================================================

/**
 * 获取随机题目
 * @param {Object} params - { difficulty, tags, count, palace_id }
 */
export const getQuizQuestions = (params = {}) =>
  api.get('/quiz/questions', { params });

/**
 * 获取单题详情
 * @param {number} id - 题目ID
 */
export const getQuizQuestion = (id) =>
  api.get(`/quiz/questions/${id}`);

/**
 * 提交答案
 * @param {number} questionId - 题目ID
 * @param {string} answer - 答案 (A/B/C/D)
 */
export const submitAnswer = (questionId, answer) =>
  api.post('/quiz/answer', { question_id: questionId, answer });

/**
 * 获取答题记录
 * @param {number} page - 页码
 * @param {number} limit - 每页条数
 */
export const getQuizRecords = (page = 1, limit = 20) =>
  api.get('/quiz/records', { params: { page, limit } });

/**
 * 获取答题统计
 */
export const getQuizStats = () =>
  api.get('/quiz/stats');

/**
 * 获取功名榜 (成就列表)
 */
export const getQuizAchievements = () =>
  api.get('/quiz/achievements');

// ============================================================
//  3D皮肤 API
// ============================================================

/**
 * 获取所有皮肤及用户状态
 */
export const getSkins = () =>
  api.get('/skins');

/**
 * 解锁皮肤
 * @param {string} skinType - 皮肤类型标识
 */
export const unlockSkin = (skinType) =>
  api.post('/skins/unlock', { skin_type: skinType });

/**
 * 切换激活皮肤
 * @param {string} skinType - 皮肤类型标识
 */
export const activateSkin = (skinType) =>
  api.put('/skins/activate', { skin_type: skinType });

export default api;
