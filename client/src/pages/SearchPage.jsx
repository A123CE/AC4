import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { search, searchSuggest } from '../api';
import HighlightText from '../components/HighlightText';
import ShareButton from '../components/ShareButton';
import CollectionButton from '../components/CollectionButton';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useI18n } from '../context/I18nContext';
import { track, trackSearch } from '../lib/analytics';

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'palace', label: '建筑' },
  { key: 'term', label: '术语' },
  { key: 'question', label: '题目' },
  { key: 'timeline', label: '时间轴' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { taxonomy } = useTaxonomy();
  const { t } = useI18n();
  const q = params.get('q')?.trim() || '';
  const type = params.get('type') || 'all';
  const category = params.get('category') || '';
  const dynasty = params.get('dynasty') || '';

  const setQuery = (patch) => {
    const next = { q, type, category, dynasty, ...patch };
    Object.keys(next).forEach((key) => {
      if (!next[key]) delete next[key];
    });
    setParams(next);
  };

  const [data, setData] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q) {
      setData(null);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    search(q, { type, limit: 8, category, dynasty })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) {
          setData(res.data.data);
          trackSearch(q);
          if (res.data.data.total === 0) {
            track('search_zero', { category });
          }
        } else setError(res.data?.error || '搜索失败');
      })
      .catch(() => {
        if (!cancelled) setError('搜索失败，请稍后再试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, type, category, dynasty]);

  useEffect(() => {
    if (!q || !data || data.total !== 0) {
      setSuggestions(null);
      return;
    }

    let cancelled = false;
    searchSuggest(q)
      .then((res) => {
        if (!cancelled && res.data?.success) setSuggestions(res.data.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [q, data]);

  const submitSearch = (event) => {
    event.preventDefault();
    const next = event.currentTarget.elements.searchQ.value.trim();
    if (!next) return;
    setQuery({ q: next });
  };

  return (
    <main id="main" className="search-page">
      <header className="search-page-head">
        <Link to="/" className="search-page-back">
          <i className="fas fa-arrow-left" /> 返回首页
        </Link>

        <form className="search-page-form" onSubmit={submitSearch} role="search">
          <input
            name="searchQ"
            className="search-page-input"
            defaultValue={q}
            aria-label="搜索建筑、术语、题目与时间轴"
            placeholder={t(
              'search.placeholder',
              '搜索建筑、术语、题目或历史事件…'
            )}
          />
          <button type="submit" className="search-page-submit">
            <i className="fas fa-search" /> {t('search.button', '搜索')}
          </button>
        </form>

        {q && (
          <ShareButton
            type="search"
            id={q}
            title={`搜索：${q}`}
            showLabel
            className="search-page-share"
            query={{ q, type, category, dynasty }}
          />
        )}
      </header>

      <nav className="search-type-tabs" aria-label="搜索类型">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`search-type-tab${type === tab.key ? ' active' : ''}`}
            aria-pressed={type === tab.key}
            onClick={() => setQuery({ type: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {(category ||
        dynasty ||
        taxonomy.categories.length > 0 ||
        taxonomy.dynasties.length > 0) && (
        <div className="search-filters" aria-label="分类与朝代筛选">
          {category && (
            <button
              type="button"
              className="search-filter-chip active"
              onClick={() => setQuery({ category: '' })}
            >
              {category} ×
            </button>
          )}
          {dynasty && (
            <button
              type="button"
              className="search-filter-chip active"
              onClick={() => setQuery({ dynasty: '' })}
            >
              {dynasty} ×
            </button>
          )}

          {!category &&
            taxonomy.categories.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                className="search-filter-chip"
                onClick={() => setQuery({ category: item })}
              >
                {item}
              </button>
            ))}

          {!dynasty &&
            taxonomy.dynasties.slice(0, 5).map((item) => (
              <button
                key={item}
                type="button"
                className="search-filter-chip"
                onClick={() => setQuery({ dynasty: item })}
              >
                {item}
              </button>
            ))}
        </div>
      )}

      {loading && (
        <p className="search-page-status" role="status">
          正在搜索…
        </p>
      )}
      {error && (
        <p className="search-page-status" role="alert">
          {error}
        </p>
      )}

      {data && !loading && !error && (
        <>
          <p className="search-page-status" role="status">
            {data.total > 0
              ? `找到 ${data.total} 条与「${q}」相关的内容`
              : `没有找到与「${q}」相关的内容`}
          </p>

          {data.groups.map((group) => (
            <section className="search-group glass-panel" key={group.type}>
              <header className="search-group-head">
                <h2>{group.label}</h2>
                <span>{group.total} 条</span>
                {type === 'all' && group.total > group.items.length && (
                  <button
                    type="button"
                    className="search-group-more"
                    onClick={() => setQuery({ type: group.type })}
                  >
                    查看更多
                  </button>
                )}
              </header>

              {group.items.length === 0 ? (
                <p className="search-group-empty">本类暂无结果</p>
              ) : (
                <ul className="search-result-list">
                  {group.items.map((item) => (
                    <li key={item.id} className="search-result-card">
                      <Link to={item.href} className="search-result-link">
                        <HighlightText
                          text={`${item.title} ${item.snippet}`.trim()}
                          matched={item.matched}
                        />
                        {item.meta?.category && (
                          <span className="search-result-meta">
                            {item.meta.category}
                            {item.meta.dynasty ? ` · ${item.meta.dynasty}` : ''}
                          </span>
                        )}
                      </Link>
                      {group.type === 'palace' && (
                        <CollectionButton palaceId={item.id} variant="icon" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {data.total === 0 && (
            <section className="search-zero">
              <h2>换个词试试</h2>

              {suggestions?.hot?.length > 0 && (
                <div className="search-zero-block">
                  <h3>热门搜索</h3>
                  <div className="search-chip-row">
                    {suggestions.hot.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="search-chip"
                        onClick={() =>
                          setQuery({
                            q: term,
                            type: 'all',
                            category: '',
                            dynasty: '',
                          })
                        }
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {suggestions?.categories?.length > 0 && (
                <div className="search-zero-block">
                  <h3>按类型浏览</h3>
                  <div className="search-chip-row">
                    {suggestions.categories.slice(0, 8).map((category) => (
                      <Link
                        key={category}
                        to={`/gallery?category=${encodeURIComponent(category)}`}
                        className="search-chip"
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {suggestions?.recommended?.length > 0 && (
                <div className="search-zero-block">
                  <h3>推荐建筑</h3>
                  <div className="search-chip-row">
                    {suggestions.recommended.map((palace) => (
                      <Link
                        key={palace.id}
                        to={`/exhibition/${palace.id}`}
                        className="search-chip"
                      >
                        {palace.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {!q && (
        <div className="search-zero">
          <h2>{t('search.title', '搜索华夏古建')}</h2>
          <p>可搜索建筑名称、术语、题目与历史事件，例如「斗拱」「太和殿」「庑殿顶」。</p>
        </div>
      )}
    </main>
  );
}