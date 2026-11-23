import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getSkins, activateSkin } from '../api';

/**
 * 3D 皮肤上下文
 * - 登录用户：从 /api/skins 拉取激活皮肤，切换时乐观更新
 * - 游客：默认皮肤
 */
const SkinContext = createContext(null);

export function SkinProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [skin, setSkinState] = useState('default');
  const [unlocked, setUnlocked] = useState(() => new Set(['default']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSkinState('default');
      setUnlocked(new Set(['default']));
      return { success: false };
    }

    setLoading(true);
    try {
      const res = await getSkins();
      if (res.data?.success) {
        const data = res.data.data || {};
        setSkinState(data.active_skin || 'default');
        setUnlocked(
          new Set(
            (data.skins || [])
              .filter((item) => item.is_unlocked)
              .map((item) => item.skin_type)
          )
        );
        setError(null);
        return { success: true };
      }
      setError(res.data?.error || '加载皮肤失败');
      return { success: false };
    } catch (err) {
      setError(err.response?.data?.error || '加载皮肤失败');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSkin = useCallback(
    async (next) => {
      if (!next) return { success: false };
      if (next !== 'default' && !unlocked.has(next)) {
        return { success: false, error: '该皮肤尚未解锁' };
      }

      const previous = skin;
      setSkinState(next);

      if (!isLoggedIn) return { success: true };

      try {
        const res = await activateSkin(next);
        if (res.data?.success === false) {
          throw new Error(res.data?.error || '切换失败');
        }
        setError(null);
        return { success: true };
      } catch (err) {
        setSkinState(previous);
        setError(err.response?.data?.error || err.message || '切换失败');
        return { success: false };
      }
    },
    [isLoggedIn, skin, unlocked]
  );

  const value = useMemo(
    () => ({ skin, unlocked, loading, error, setSkin, refresh }),
    [skin, unlocked, loading, error, setSkin, refresh]
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be used within SkinProvider');
  return ctx;
}

export default SkinContext;