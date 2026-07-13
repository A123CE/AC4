import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
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

export default api;
