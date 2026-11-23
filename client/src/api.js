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

/**
 * 获取聚合历史沿革事件（单次请求，替代逐座详情）
 * @param {Object} params - { category, dynasty }
 */
export const getTimeline = (params = {}) =>
  api.get('/timeline', { params });

// ============================================================
//  档案编修 API — 增删改 + 资源上传（需管理员）
// ============================================================

/**
 * 新增建筑档案
 * @param {Object} payload - 建筑字段 + timeline / funFacts / images
 */
export const createPalace = (payload) =>
  api.post('/palaces', payload);

/**
 * 更新建筑档案
 * @param {string} id - 建筑ID
 * @param {Object} payload - 需要变更的字段
 */
export const updatePalace = (id, payload) =>
  api.put(`/palaces/${id}`, payload);

/**
 * 删除建筑档案（连带沿革 / 典故 / 图影）
 * @param {string} id - 建筑ID
 */
export const deletePalace = (id) =>
  api.delete(`/palaces/${id}`);

/**
 * 上传建筑资源 — 模型 / 封面图
 * 以二进制直传，文件名通过 X-File-Name 头部传递
 * @param {'model'|'poster'} kind - 资源类型
 * @param {File} file - 浏览器 File 对象
 * @param {(percent:number)=>void} onProgress - 进度回调
 */
export const uploadPalaceAsset = (kind, file, onProgress) =>
  api.post('/palaces/upload', file, {
    params: { kind },
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    },
    timeout: 0,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    },
  });

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
 * 合并游客本机收藏与笔记
 */
export const mergeGuest = (payload) =>
  api.post('/auth/merge-guest', payload);

/**
 * 获取游览历史
 */
export const getHistory = () =>
  api.get('/auth/history');

/**
 * 记录游览
 */
export const recordHistory = (palaceId, durationSeconds = 0, options = {}) =>
  api.post('/auth/history', {
    palace_id: palaceId,
    duration_seconds: durationSeconds,
    ...options,
  });

/**
 * 获取收藏列表
 * @param {string} [category] - 默认 / 想去 / 已研究 / 教学素材
 */
export const getCollections = (category) =>
  api.get('/auth/collections', { params: category ? { category } : {} });

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

/**
 * 更新收藏笔记
 */
export const updateCollectionNote = (palaceId, note) =>
  api.put(`/auth/collections/${palaceId}/note`, { note });

/**
 * 成就总览（集章 + 徽章进度 + 下一目标）
 */
export const getAchievements = () =>
  api.get('/achievements');

// ============================================================
//  分享回流 API
// ============================================================

export const shareVisit = (entityType, entityId, channel) =>
  api.post('/share/visit', {
    entity_type: entityType,
    entity_id: entityId,
    channel,
  });

export const getShareStats = (params = {}) =>
  api.get('/share/stats', { params });

/**
 * 资源清单（三档模型 / 海报 / 体积）
 */
export const getAssetManifest = () =>
  api.get('/assets/manifest');

// ============================================================
//  跨类型搜索 API
// ============================================================

export const search = (q, params = {}) =>
  api.get('/search', { params: { q, ...params } });

export const searchSuggest = (q = '') =>
  api.get('/search/suggest', { params: q ? { q } : {} });

/**
 * 分类 / 地区 / 朝代 / 术语导航
 */
export const getTaxonomy = () => api.get('/taxonomy');

// ============================================================
//  主题导览路线
// ============================================================

export const getRoutes = () => api.get('/routes');

export const getRoute = (routeId) => api.get(`/routes/${routeId}`);

export const updateRouteProgress = (routeId, stopOrder) =>
  api.put(`/routes/${routeId}/progress`, { stop_order: stopOrder });

// ============================================================
//  个性化推荐
// ============================================================

export const getRecommendations = ({
  scene = 'home',
  palace_id,
  limit = 6,
} = {}) =>
  api.get('/recommend', {
    params: { scene, limit, ...(palace_id ? { palace_id } : {}) },
  });

export const getPreferences = () => api.get('/auth/preferences');

export const updatePreferences = (payload) =>
  api.put('/auth/preferences', payload);

export const updateLocale = (locale) =>
  api.put('/auth/locale', { locale });

// ============================================================
//  内容翻译与覆盖度
// ============================================================

export const getContentCoverage = () => api.get('/content/coverage');

export const getPalaceContent = (palaceId, lang = 'en') =>
  api.get(`/content/palace/${palaceId}`, { params: { lang } });

// ============================================================
//  热点已读与学习记录
// ============================================================

export const markHotspotRead = (palaceId, hotspotId) =>
  api.post('/hotspots/read', { palace_id: palaceId, hotspot_id: hotspotId });

export const getHotspotReads = (palaceId) =>
  api.get('/hotspots/reads', {
    params: palaceId ? { palace_id: palaceId } : {},
  });

export const getLearningRecords = () => api.get('/achievements/learning');

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
 * 获取题库分类及题量
 */
export const getQuizCategories = () =>
  api.get('/quiz/categories');

/**
 * 获取随机题目
 * @param {Object} params - { category, difficulty, tags, count, palace_id }
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
 * 随堂练习判定（零写入）
 * @param {number} questionId
 * @param {string} answer
 */
export const practiceAnswer = (questionId, answer) =>
  api.post('/quiz/practice/answer', { question_id: questionId, answer });

/**
 * 获取答题记录
 * @param {number} page - 页码
 * @param {number} limit - 每页条数
 * @param {string} [category] - 题库分类筛选
 */
export const getQuizRecords = (page = 1, limit = 20, category) =>
  api.get('/quiz/records', {
    params: category ? { page, limit, category } : { page, limit },
  });

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

/**
 * 获取筑识榜排名
 * @param {Object} params - { limit, category }
 */
export const getQuizLeaderboard = (params = {}) =>
  api.get('/quiz/leaderboard', { params });

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
