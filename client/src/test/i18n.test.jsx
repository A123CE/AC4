import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { I18nProvider, useI18n } from '../context/I18nContext';

function Probe() {
  const { lang, t, setLang, formatUnit } = useI18n();

  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t('overview.title')}</span>
      <span data-testid="greeting">
        {t('common.greeting', undefined, { name: '张三' })}
      </span>
      <span data-testid="fallback">{t('missing.key', '回退文案')}</span>
      <span data-testid="unit">{formatUnit(38, '米')}</span>
      <button type="button" onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" onClick={() => setLang('zh-CN')}>
        中文
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ac4_lang', 'zh-CN');
  document.documentElement.lang = 'zh-CN';
});

describe('轻量 i18n', () => {
  it('中文默认、插值与缺失回退', () => {
    render(
      <AuthProvider>
        <I18nProvider>
          <Probe />
        </I18nProvider>
      </AuthProvider>
    );

    expect(screen.getByTestId('lang').textContent).toBe('zh-CN');
    expect(screen.getByTestId('title').textContent).toBe('古建筑多维信息可视化');
    expect(screen.getByTestId('greeting').textContent).toBe('你好，张三');
    expect(screen.getByTestId('fallback').textContent).toBe('回退文案');
    expect(screen.getByTestId('unit').textContent).toBe('38米');
  });

  it('切换英文后同步文档语言并持久化', () => {
    render(
      <AuthProvider>
        <I18nProvider>
          <Probe />
        </I18nProvider>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe(
      'Ancient Chinese Architecture, Visualized'
    );
    expect(screen.getByTestId('greeting').textContent).toBe('Hello, 张三');
    expect(screen.getByTestId('unit').textContent).toBe('38 m');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('ac4_lang')).toBe('en');

    fireEvent.click(screen.getByRole('button', { name: '中文' }));
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(localStorage.getItem('ac4_lang')).toBe('zh-CN');
  });
});