import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const AUTH_API = '/api/auth';
const STORAGE_KEY = 'palace_auth';

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

  const value = {
    auth,
    user: auth?.user || null,
    token: auth?.token || null,
    isLoggedIn: !!auth?.token,
    loading,
    login,
    register,
    logout,
    fetchProfile,
    refreshAuth
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
