import { AuthProvider } from './AuthContext';
import { I18nProvider } from './I18nContext';
import { UiPrefsProvider } from './UiPrefsContext';
import { TaxonomyProvider } from './TaxonomyContext';
import { TierProvider } from './TierContext';
import { SkinProvider } from './SkinContext';
import { CollectionsProvider } from './CollectionsContext';
import { ClassroomViewProvider } from './ClassroomViewContext';

/**
 * 全局 Provider 装配
 * 顺序固定：Auth → I18n → UiPrefs → ClassroomView → Tier → Skin → Collections
 *
 * 单独抽成模块，便于单测验证装配顺序，同时避免测试加载页面与 Three.js。
 */
export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <I18nProvider>
        <UiPrefsProvider>
          <ClassroomViewProvider>
            <TaxonomyProvider>
              <TierProvider>
                <SkinProvider>
                  <CollectionsProvider>{children}</CollectionsProvider>
                </SkinProvider>
              </TierProvider>
            </TaxonomyProvider>
          </ClassroomViewProvider>
        </UiPrefsProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

export default AppProviders;