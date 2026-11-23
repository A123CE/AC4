import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AuthContext from './AuthContext';
import { getPreferences, updatePreferences } from '../api';
import { applyGlassPref } from '../lib/glassPref';
import { isReadOnlySession, normalizeFontScale } from '../lib/classroomRoute';

/**
 * 界面偏好上下文
 * - 课堂/未成年人偏好：登录走服务端，游客走本机 ac4_classroom_v1
 * - 只读课堂链接下只改内存，不写存储、不发请求
 */
const UiPrefsContext = createContext(null);

const STORAGE_KEY = 'ac4_classroom_v1';

const DEFAULT_PREFS = {
  reducedMotion: 'auto',
  classroomMode: false,
  classroomFontScale: 'large',
  personalizationEnabled: true,
  analyticsEnabled: true,
  minorMode: 'unset',
  leaderboardOptOut: false,
};

function readLocalClassroom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return null;
    return {
      enabled: parsed.enabled === true,
      fontScale: normalizeFontScale(parsed.fontScale),
    };
  } catch {
    return null;
  }
}

function writeLocalClassroom(enabled, fontScale) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        enabled: !!enabled,
        fontScale: normalizeFontScale(fontScale),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* 存储不可用时仅保留内存态 */
  }
}

function serverPayload(patch) {
  const payload = {};
  if (patch.classroomMode !== undefined) payload.classroom_mode = !!patch.classroomMode;
  if (patch.classroomFontScale !== undefined) {
    payload.classroom_font_scale = normalizeFontScale(patch.classroomFontScale);
  }
  if (patch.minorMode !== undefined) payload.minor_mode = patch.minorMode;
  if (patch.leaderboardOptOut !== undefined) {
    payload.leaderboard_opt_out = !!patch.leaderboardOptOut;
  }
  if (patch.personalizationEnabled !== undefined) {
    payload.personalization_enabled = !!patch.personalizationEnabled;
  }
  if (patch.analyticsEnabled !== undefined) payload.analytics_enabled = !!patch.analyticsEnabled;
  return payload;
}

export function UiPrefsProvider({ children }) {
  const auth = useContext(AuthContext);
  const isLoggedIn = !!auth?.token;
  const [uiPrefs, setUiPrefs] = useState(() => {
    const base = { ...DEFAULT_PREFS };
    try {
      base.analyticsEnabled = localStorage.getItem('ac4_analytics_off') !== '1';
    } catch {
      /* 忽略存储失败 */
    }
    const local = readLocalClassroom();
    if (local) {
      base.classroomMode = local.enabled;
      base.classroomFontScale = local.fontScale;
    }
    return base;
  });

  const prefsRef = useRef(uiPrefs);
  prefsRef.current = uiPrefs;

  useEffect(() => {
    applyGlassPref();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const res = await getPreferences();
        if (cancelled || !res?.data?.success) return;

        const data = res.data.data || {};
        const serverPrefs = {
          classroomMode: !!data.classroom_mode,
          classroomFontScale: normalizeFontScale(data.classroom_font_scale),
          minorMode: data.minor_mode === 'minor' ? 'minor' : 'unset',
          leaderboardOptOut: !!data.leaderboard_opt_out,
        };
        setUiPrefs((prev) => ({ ...prev, ...serverPrefs }));

        const local = readLocalClassroom();
        if (local?.enabled && !serverPrefs.classroomMode) {
          const put = await updatePreferences({
            classroom_mode: true,
            classroom_font_scale: local.fontScale,
          });
          if (!cancelled && put?.data?.success) {
            setUiPrefs((prev) => ({
              ...prev,
              classroomMode: true,
              classroomFontScale: local.fontScale,
            }));
            writeLocalClassroom(true, local.fontScale);
          }
        }
      } catch {
        /* 服务端不可用时保留本机/默认值 */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const updatePrefs = useCallback(
    async (patch) => {
      const previous = prefsRef.current;
      const next = { ...previous, ...patch };
      setUiPrefs(next);

      if (isReadOnlySession()) {
        return { success: true, readOnly: true };
      }

      if (patch.classroomMode !== undefined || patch.classroomFontScale !== undefined) {
        writeLocalClassroom(next.classroomMode, next.classroomFontScale);
      }

      if (!isLoggedIn) {
        return { success: true };
      }

      const payload = serverPayload(patch);
      if (Object.keys(payload).length === 0) {
        return { success: true };
      }

      try {
        const res = await updatePreferences(payload);
        if (!res?.data?.success) {
          throw new Error(res?.data?.error || '设置未保存，请重试');
        }
        const data = res.data.data || {};
        if (
          patch.minorMode === 'minor' &&
          patch.leaderboardOptOut === undefined &&
          data.leaderboard_opt_out !== undefined
        ) {
          setUiPrefs((current) => ({ ...current, leaderboardOptOut: !!data.leaderboard_opt_out }));
        }
        return { success: true, data };
      } catch (err) {
        setUiPrefs(previous);
        throw err instanceof Error ? err : new Error('设置未保存，请重试');
      }
    },
    [isLoggedIn]
  );

  const setAnalyticsEnabled = useCallback(
    (enabled) => {
      setUiPrefs((prev) => ({ ...prev, analyticsEnabled: !!enabled }));
      try {
        localStorage.setItem('ac4_analytics_off', enabled ? '0' : '1');
      } catch {
        /* 忽略存储失败 */
      }
    },
    []
  );

  const value = useMemo(
    () => ({ uiPrefs, updatePrefs, setAnalyticsEnabled }),
    [uiPrefs, updatePrefs, setAnalyticsEnabled]
  );

  return <UiPrefsContext.Provider value={value}>{children}</UiPrefsContext.Provider>;
}

export function useUiPrefs() {
  const ctx = useContext(UiPrefsContext);
  if (!ctx) throw new Error('useUiPrefs must be used within UiPrefsProvider');
  return ctx;
}

export default UiPrefsContext;