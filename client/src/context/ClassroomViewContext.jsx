import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUiPrefs } from './UiPrefsContext';
import { normalizeFontScale, readClassroomRoute } from '../lib/classroomRoute';

const ClassroomViewContext = createContext(null);

const HIDDEN_ALL = {
  recommendation: true,
  share: true,
  social: true,
  registerPrompt: true,
  achievementToast: true,
  personalizationHint: true,
};

const HIDDEN_NONE = {
  recommendation: false,
  share: false,
  social: false,
  registerPrompt: false,
  achievementToast: false,
  personalizationHint: false,
};

export function ClassroomViewProvider({ children }) {
  const { uiPrefs } = useUiPrefs();
  const [routeVersion, setRouteVersion] = useState(0);

  useEffect(() => {
    const onPopState = () => setRouteVersion((value) => value + 1);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const route = useMemo(() => readClassroomRoute(), [routeVersion]);
  const enabled = route.isClassroom || !!uiPrefs.classroomMode;
  const fontScale = route.isClassroom && route.hasFont
    ? route.fontScale
    : normalizeFontScale(uiPrefs.classroomFontScale);
  const readOnly = route.readOnly;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.classroom = enabled ? 'on' : 'off';
    root.dataset.font = fontScale;

    return () => {
      delete root.dataset.classroom;
      delete root.dataset.font;
    };
  }, [enabled, fontScale]);

  const value = useMemo(
    () => ({
      enabled,
      fontScale,
      readOnly,
      hidden: enabled ? HIDDEN_ALL : HIDDEN_NONE,
    }),
    [enabled, fontScale, readOnly]
  );

  return (
    <ClassroomViewContext.Provider value={value}>{children}</ClassroomViewContext.Provider>
  );
}

const FALLBACK = {
  enabled: false,
  fontScale: 'large',
  readOnly: false,
  hidden: HIDDEN_NONE,
};

export function useClassroomView() {
  return useContext(ClassroomViewContext) || FALLBACK;
}

export default ClassroomViewContext;