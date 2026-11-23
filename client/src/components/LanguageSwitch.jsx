import { useI18n } from '../context/I18nContext';

export default function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="language-switch" role="group" aria-label={t('nav.language', '语言')}>
      <button
        type="button"
        className={`language-switch-btn${lang === 'zh-CN' ? ' active' : ''}`}
        aria-pressed={lang === 'zh-CN'}
        onClick={() => setLang('zh-CN')}
      >
        中文
      </button>
      <button
        type="button"
        className={`language-switch-btn${lang === 'en' ? ' active' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  );
}