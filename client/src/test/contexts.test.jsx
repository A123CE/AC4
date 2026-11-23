import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AppProviders } from '../context/AppProviders';
import { TierProvider, useTier } from '../context/TierContext';
import { SkinProvider, useSkin } from '../context/SkinContext';
import { CollectionsProvider, useCollections } from '../context/CollectionsContext';
import { I18nProvider, useI18n } from '../context/I18nContext';
import { UiPrefsProvider, useUiPrefs } from '../context/UiPrefsContext';
import { AuthProvider, useAuth } from '../context/AuthContext';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ac4_lang', 'zh-CN');
});

const CASES = [
  { name: 'useTier', hook: useTier, provider: TierProvider, message: /TierProvider/ },
  { name: 'useSkin', hook: useSkin, provider: SkinProvider, message: /SkinProvider/ },
  {
    name: 'useCollections',
    hook: useCollections,
    provider: CollectionsProvider,
    message: /CollectionsProvider/,
  },
  { name: 'useI18n', hook: useI18n, provider: I18nProvider, message: /I18nProvider/ },
  { name: 'useUiPrefs', hook: useUiPrefs, provider: UiPrefsProvider, message: /UiPrefsProvider/ },
];

describe('五个 Context 空壳', () => {
  it('Provider 外调用抛出清晰错误', () => {
    for (const item of CASES) {
      expect(() => renderHook(() => item.hook())).toThrow(item.message);
    }
  });

  it('Provider 内返回默认值', () => {
    const { result: tier } = renderHook(() => useTier(), { wrapper: TierProvider });
    expect(['high', 'standard', 'smooth']).toContain(tier.current.tier);
    expect(['high', 'standard', 'smooth']).toContain(tier.current.detectedTier);
    expect(typeof tier.current.supports3D).toBe('boolean');

    const { result: skin } = renderHook(() => useSkin(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <SkinProvider>{children}</SkinProvider>
        </AuthProvider>
      ),
    });
    expect(skin.current.skin).toBe('default');

    const { result: collections } = renderHook(() => useCollections(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <CollectionsProvider>{children}</CollectionsProvider>
        </AuthProvider>
      ),
    });
    expect(collections.current.collections.size).toBe(0);

    const { result: i18n } = renderHook(() => useI18n(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
      ),
    });
    expect(i18n.current.lang).toBe('zh-CN');

    const { result: prefs } = renderHook(() => useUiPrefs(), { wrapper: UiPrefsProvider });
    expect(prefs.current.uiPrefs.reducedMotion).toBe('auto');
    expect(prefs.current.uiPrefs.classroomMode).toBe(false);
    expect(prefs.current.uiPrefs.personalizationEnabled).toBe(true);
  });

  it('AppProviders 按序嵌套，全部 hook 可用', () => {
    const { result } = renderHook(
      () => ({
        loggedIn: useAuth().isLoggedIn,
        tier: useTier().tier,
        skin: useSkin().skin,
        lang: useI18n().lang,
        reducedMotion: useUiPrefs().uiPrefs.reducedMotion,
        collections: useCollections().collections,
      }),
      { wrapper: AppProviders }
    );

    expect(result.current.loggedIn).toBe(false);
    expect(['high', 'standard', 'smooth']).toContain(result.current.tier);
    expect(result.current.skin).toBe('default');
    expect(result.current.lang).toBe('zh-CN');
    expect(result.current.reducedMotion).toBe('auto');
    expect(result.current.collections.size).toBe(0);
  });
});