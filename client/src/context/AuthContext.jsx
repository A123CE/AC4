import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { emitAchievements } from '../lib/achievementBus';
import guestSession from '../lib/guestSession';

const AuthContext = createContext(null);

const AUTH_API = '/api/auth';
const STORAGE_KEY = 'palace_auth';
const GUEST_MERGE_KEY = 'ac4_pending_guest_merge';

function hasPendingGuestMerge() {
  try {
    return localStorage.getItem(GUEST_MERGE_KEY) === '1';
  } catch {
    return false;
  }
}

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw);
    if (auth && auth.token && auth.user) return auth;
  } catch { /* ignore corrupt data */ }
  return null;
}

function setStoredAuth(auth) {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(false);
  const [pendingGuestMerge, setPendingGuestMergeState] = useState(hasPendingGuestMerge);

  // 持久化 auth 变更
  useEffect(() => {
    setStoredAuth(auth);
  }, [auth]);

  // 设置 axios 默认 Authorization 头部
  useEffect(() => {
    if (auth?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [auth?.token]);

  // 登录
  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${AUTH_API}/login`, { username, password });
      if (res.data.success) {
        setAuth(res.data.data);
        emitAchievements(res.data.data?.achievements);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.error };
    } catch (err) {
      const msg = err.response?.data?.error || '网络错误，请稍后再试';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 注册
  const register = useCallback(async (username, password, email, interestTag) => {
    setLoading(true);
    try {
      const res = await axios.post(`${AUTH_API}/register`, {
        username,
        password,
        email: email || undefined,
        interest_tag: interestTag || undefined
      });
      if (res.data.success) {
        setAuth(res.data.data);
        emitAchievements(res.data.data?.achievements);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.error };
    } catch (err) {
      const msg = err.response?.data?.error || '网络错误，请稍后再试';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    setAuth(null);
    setStoredAuth(null);
  }, []);

  // 游客数据合并标记 — 由 T-S2-01 在登录后消费
  const setPendingGuestMerge = useCallback((value) => {
    const next = !!value;
    setPendingGuestMergeState(next);
    try {
      if (next) localStorage.setItem(GUEST_MERGE_KEY, '1');
      else localStorage.removeItem(GUEST_MERGE_KEY);
    } catch { /* 忽略写入失败 */ }
  }, []);

  // 获取完整用户信息
  const fetchProfile = useCallback(async () => {
    if (!auth?.token) return null;
    try {
      const res = await axios.get(`${AUTH_API}/profile`);
      if (res.data.success) return res.data.data;
    } catch { /* silent */ }
    return null;
  }, [auth?.token]);

  // 刷新本地 auth（合并 profile 数据）
  const refreshAuth = useCallback(async () => {
    const profile = await fetchProfile();
    if (profile) {
      setAuth(prev => prev ? { ...prev, user: { ...prev.user, ...profile } } : prev);
    }
  }, [fetchProfile]);

  // 合并本机游客收藏与笔记
  const mergeGuest = useCallback(async (payload) => {
    if (!auth?.token) return { success: false, message: '未登录' };

    try {
      const res = await axios.post(`${AUTH_API}/merge-guest`, payload);
      if (res.data.success) {
        guestSession.applyMergeResult(res.data.data.items || []);
        setPendingGuestMerge(false);
        emitAchievements(res.data.data.achievements);
        await refreshAuth();
        return { success: true, data: res.data.data };
      }
      return { success: false, message: res.data.error || '合并失败' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || '合并失败',
      };
    }
  }, [auth?.token, refreshAuth, setPendingGuestMerge]);

  const value = {
    auth,
    user: auth?.user || null,
    token: auth?.token || null,
    isLoggedIn: !!auth?.token,
    pendingGuestMerge,
    loading,
    login,
    register,
    logout,
    fetchProfile,
    refreshAuth,
    mergeGuest,
    setPendingGuestMerge
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
