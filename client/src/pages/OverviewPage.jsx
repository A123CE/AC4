import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OverviewHeader from '../components/OverviewHeader';
import BuildingCard from '../components/BuildingCard';
import ScrollReveal from '../components/ScrollReveal';
import LiquidEther from '../components/LiquidEther';
import RecommendationRail from '../components/RecommendationRail';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useClassroomView } from '../context/ClassroomViewContext';
import { getPalaces, getRecommendations, getRoutes } from '../api';
import '../styles/overview.css';

const DYNASTY_TAGS = ['唐', '宋', '元', '明', '清'];

const SORT_OPTIONS = [
  { value: 'default', label: '默认排序' },
  { value: 'dynasty', label: '按年代' },
  { value: 'fame', label: '按知名度' },
];

const PAGE_SIZE = 9;

function regionOf(p) {
  return p.region || p.city || '北京';
}

function dynastyOf(p) {
  return p.dynasty || '';
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { t } = useI18n();
  const { enabled: classroomEnabled } = useClassroomView();
  const [firstRouteId, setFirstRouteId] = useState(null);
  const isAdmin = user?.role === 'admin';
  const [palaces, setPalaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // 影像带轮播状态(不取模, 一直前进; 渲染时再对总数取模)
  const [bannerIndex, setBannerIndex] = useState(0);
  // 鼠标悬停暂停自动轮播
  const [paused, setPaused] = useState(false);

  // 全屏模糊背景 — 双槽交替, 用于交叉淡入
  const [bgSlots, setBgSlots] = useState([null, null]);

  // 筛选状态
  const [selCategories, setSelCategories] = useState([]);
  const [selRegions, setSelRegions] = useState([]);
  const [selDynasties, setSelDynasties] = useState([]);
  const [sortBy, setSortBy] = useState('default');
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const gridRef = useRef(null);
  const filterRef = useRef(null);
  const pageRef = useRef(null);
  const heroRef = useRef(null);

  // 加载数据
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPalaces()
      .then((res) => {
        if (!mounted) return;
        setPalaces(res.data?.data || []);
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setError('无法加载古建筑数据，请确认后端服务已启动');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getRecommendations({ scene: 'home', limit: 6 })
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setRecommendations(res.data.data.items || []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // 影像带轮播 — 鼠标悬停时暂停
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setBannerIndex((i) => i + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused]);

  // 首屏视差 — 滚动时背景缓慢上移, 文字信息轻微下沉
  useEffect(() => {
    const page = pageRef.current;
    const hero = heroRef.current;
    if (!page || !hero) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = Math.min(page.scrollTop, hero.offsetHeight);
        hero.style.setProperty('--ov-par', `${(y * 0.16).toFixed(1)}px`);
        hero.style.setProperty('--ov-par-text', `${(y * -0.05).toFixed(1)}px`);
      });
    };
    page.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      page.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // 有海报图的建筑 — 全屏曲面画廊数据源
  const posters = useMemo(
    () => palaces.filter((p) => p.poster_path),
    [palaces]
  );

  // 当前展示的建筑(取模) & 背景槽位(奇偶交替)
  const activeIndex = posters.length
    ? ((bannerIndex % posters.length) + posters.length) % posters.length
    : -1;
  const activeSlot = ((bannerIndex % 2) + 2) % 2;

  // 当前画面关联的建筑 — 文字信息附着在影像上
  const currentPoster = activeIndex >= 0 ? posters[activeIndex] : null;
  const currentMeta = currentPoster
    ? [currentPoster.dynasty, currentPoster.category, regionOf(currentPoster)].filter(Boolean)
    : [];
  const currentIntro = currentPoster
    ? (currentPoster.tagline || currentPoster.description || '').slice(0, 72)
    : '';

  // 背景图实时跟随当前卡片, 交叉淡入
  useEffect(() => {
    if (activeIndex < 0) return;
    const url = `/images/${posters[activeIndex].poster_path}`;
    setBgSlots((slots) => {
      if (slots[activeSlot] === url) return slots;
      const next = [...slots];
      next[activeSlot] = url;
      return next;
    });
  }, [activeIndex, activeSlot, posters]);

  // 环形距离: 把 i 相对当前索引折算到 [-n/2, n/2], 得到最短方向
  const ringOffset = useCallback((i, current, n) => {
    let d = ((i - current) % n + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }, []);

  // 筛选选项 — 从数据动态推导（新增建筑自动兼容）
  const categories = useMemo(
    () => [...new Set(palaces.map((p) => p.category).filter(Boolean))],
    [palaces]
  );
  const regions = useMemo(
    () => [...new Set(palaces.map(regionOf).filter(Boolean))],
    [palaces]
  );

  // 首页数据看板 — 多维统计(总数 / 类型 / 地区 / 朝代 + 类型分布)
  const stats = useMemo(() => {
    const catMap = new Map();
    palaces.forEach((p) => {
      if (p.category) catMap.set(p.category, (catMap.get(p.category) || 0) + 1);
    });
    const rows = [...catMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const max = rows[0]?.count || 1;
    // 朝代按「唐→清」规范顺序统计（原始 dynasty 字段写法不统一，如「明永乐年间」）
    const dynasties = DYNASTY_TAGS.filter((d) =>
      palaces.some((p) => `${dynastyOf(p)}${p.built_year || ''}`.includes(d))
    );
    return {
      total: palaces.length,
      categoryCount: catMap.size,
      regionCount: regions.length,
      dynastyCount: dynasties.length,
      typeTop: rows[0] || null,
      regionList: regions,
      dynastyList: dynasties,
      rows: rows.slice(0, 6).map((r) => ({
        ...r,
        pct: Math.round((r.count / max) * 100),
      })),
    };
  }, [palaces, regions]);

  const toggle = (list, value, setter) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const resetFilters = () => {
    setSelCategories([]);
    setSelRegions([]);
    setSelDynasties([]);
    setSearchKeyword('');
    setPage(1);
  };

  // 过滤 + 排序
  const filtered = useMemo(() => {
    let result = palaces.filter((p) => {
      if (selCategories.length && !selCategories.includes(p.category)) return false;
      if (selRegions.length && !selRegions.includes(regionOf(p))) return false;
      if (selDynasties.length) {
        const text = `${dynastyOf(p)}${p.built_year || ''}`;
        if (!selDynasties.some((d) => text.includes(d))) return false;
      }
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const hay = `${p.name}${p.name_en || ''}${p.category}${p.description || ''}${p.tags || ''}${regionOf(p)}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    if (sortBy === 'fame') {
      // 知名度：有海报图（全国名筑）优先，其余按 order_num
      result = [...result].sort((a, b) => {
        const fa = a.poster_path ? 0 : 1;
        const fb = b.poster_path ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return (a.order_num || 0) - (b.order_num || 0);
      });
    } else {
      // 默认 / 按年代：均按 order_num（数据本身按年代排布）
      result = [...result].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }
    return result;
  }, [palaces, selCategories, selRegions, selDynasties, searchKeyword, sortBy]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  // 筛选变化时回到第一页
  useEffect(() => { setPage(1); }, [selCategories, selRegions, selDynasties, searchKeyword, sortBy]);

  const scrollToGrid = useCallback(() => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToFilter = useCallback(() => {
    filterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleNavAction = useCallback((action, keyword) => {
    if (action === 'category') {
      scrollToFilter();
    } else if (action === 'search') {
      if (keyword) setSearchKeyword(keyword);
      scrollToGrid();
    }
  }, [scrollToFilter, scrollToGrid]);

  // 查看详情 → 3D 展厅（三栏页，右侧展示文字/历史/构造信息）
  const handleDetail = (palace) => {
    navigate('/gallery', { state: { selectPalaceId: palace.id } });
  };

  useEffect(() => {
    if (!classroomEnabled) return undefined;
    let mounted = true;

    getRoutes()
      .then((res) => {
        if (!mounted || !res?.data?.success) return;
        const first = (res.data.data || [])[0];
        setFirstRouteId(first?.id || null);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [classroomEnabled]);

  // 3D 模型浏览 → 沉浸式 3D 展览页
  const handleModel = (palace) => {
    navigate(`/exhibition/${palace.id}`);
  };

  return (
    <div className="overview-page" ref={pageRef}>
      {/* ===== 下翻页面背景 — 液态以太(朱红 / 暖橙), 固定在视口, 首屏被 Hero 完全覆盖 ===== */}
      <div className="ov-ambient" aria-hidden="true">
        <LiquidEther
          className="ov-ambient-ether"
          colors={['#ff2727', '#ffc49f', '#ff2727']}
          intro={false}
          intensity={1.6}
          resolution={0.5}
          cursorSize={150}
          mouseForce={22}
          persistence={0.68}
          autoSpeed={0.62}
          autoIntensity={3.2}
          maxDevicePixelRatio={1.5}
        />
        <div className="ov-ambient-veil" />
      </div>

      <div className="ov-shell">
        <OverviewHeader onNavAction={handleNavAction} />

        {classroomEnabled && (
          <nav
            className="classroom-entry-bar"
            aria-label="课堂快捷入口"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              padding: '10px 16px',
              background: 'var(--paper-white, #f7f3eb)',
              borderBottom: '1px solid var(--border-warm, #d4c9b8)',
            }}
          >
            <button
              type="button"
              className="profile-pref-toggle on"
              onClick={() => navigate(firstRouteId ? `/routes/${firstRouteId}` : '/routes')}
            >
              主题路线
            </button>
            <button
              type="button"
              className="profile-pref-toggle"
              onClick={() => navigate('/quiz?mode=practice&view=classroom')}
            >
              随堂练习
            </button>
          </nav>
        )}

        <main className="ov-main">
          {/* ===== Hero 首屏 — 全屏曲面画廊 ===== */}
      <section
        className="ov-hero"
        ref={heroRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* 当前卡片对应的全屏模糊背景 — 双层交叉淡入, 实时跟随 */}
        <div
          className="ov-hero-bg"
          style={{
            backgroundImage: bgSlots[0] ? `url(${bgSlots[0]})` : undefined,
            opacity: bgSlots[0] && activeSlot === 0 ? 1 : 0,
          }}
        />
        <div
          className="ov-hero-bg"
          style={{
            backgroundImage: bgSlots[1] ? `url(${bgSlots[1]})` : undefined,
            opacity: bgSlots[1] && activeSlot === 1 ? 1 : 0,
          }}
        />
        <div className="ov-hero-veil" />

        <div className="ov-hero-inner">
          <div className="ov-hero-copy">
            <div className="ov-hero-rule" />
            <h1 className="ov-hero-title">
              {t('overview.title', '古建筑多维信息可视化')}
            </h1>
            <p className="ov-hero-sub">
              {t(
                'overview.subtitle',
                '以数字技术保存并呈现华夏营造之美：三维模型、文物信息与空间可视化。'
              )}
            </p>

            {/* 信息附着 — 随画面切换的建筑名 / 年代标签 / 小字简介 */}
            {currentPoster && (
              <div className="ov-hero-attach" key={currentPoster.id}>
                <div className="ov-hero-attach-head">
                  <span className="ov-hero-attach-name">{currentPoster.name}</span>
                  <span className="ov-hero-attach-meta">{currentMeta.join(' ｜ ')}</span>
                </div>
                {currentIntro && <p className="ov-hero-attach-desc">{currentIntro}</p>}
              </div>
            )}

            <div className="ov-hero-cta">
              <button className="ov-hero-btn ov-hero-btn--primary" onClick={() => navigate('/gallery')}>
                {t('overview.enterGallery', '进入模型展厅')}
              </button>
              <button className="ov-hero-btn ov-hero-btn--outline" onClick={scrollToFilter}>
                {t('overview.explore', '探索古建筑')}
              </button>
              {isLoggedIn && (
                <button
                  className="ov-hero-btn ov-hero-btn--outline ov-hero-btn--upload"
                  onClick={() => navigate('/curator?new=1')}
                  title={isAdmin ? '上传模型并新建建筑档案' : '查看编修台权限'}
                >
                  <i className="fas fa-arrow-up-from-bracket" />
                  {t('overview.upload', '上传模型')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 全屏曲面画廊 — 中央大图, 两侧弯曲退后 */}
        {posters.length > 0 && (
          <>
            <div className="ov-ring">
              {posters.map((p, i) => {
                const d = ringOffset(i, bannerIndex, posters.length);
                const abs = Math.abs(d);
                return (
                  <div
                    className={`ov-ring-panel${d < 0 ? ' ov-ring-panel--out' : ''}`}
                    key={p.id}
                    style={{
                      '--d': d,
                      zIndex: 20 - abs,
                      /* 左侧卡片让位给叠加文字, 右侧保留 3 张 */
                      visibility: d < -1 || abs > 3 ? 'hidden' : 'visible',
                    }}
                    onClick={() =>
                      abs === 0
                        ? navigate('/gallery', { state: { selectPalaceId: p.id } })
                        : setBannerIndex(bannerIndex + d)
                    }
                  >
                    <img src={`/images/${p.poster_path}`} alt={p.name} loading="lazy" />
                  </div>
                );
              })}
            </div>

            {/* 画廊下方 — 点状指示器 + 序号 */}
            <div className="ov-ring-caption">
              <div className="ov-ring-dots" role="tablist" aria-label="建筑影像轮播">
                {posters.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={p.name}
                    className={`ov-ring-dot${i === activeIndex ? ' active' : ''}`}
                    onClick={() => setBannerIndex(bannerIndex + ringOffset(i, bannerIndex, posters.length))}
                  />
                ))}
              </div>
              <p className="ov-ring-count">
                <span className="ov-ring-count-cur">{String(activeIndex + 1).padStart(2, '0')}</span>
                {' / '}
                {String(posters.length).padStart(2, '0')}
              </p>
            </div>
          </>
        )}
      </section>

      {/* ===== 数据看板 — 多维信息可视化 ===== */}
      {stats.total > 0 && (
        <section className="ov-stats">
          <div className="ov-stats-panel">
            <div className="ov-stats-metrics">
              {[
                {
                  value: stats.total,
                  unit: '座',
                  label: '古建筑总数',
                  caption: stats.typeTop
                    ? `${stats.typeTop.name}类最多，共 ${stats.typeTop.count} 座`
                    : '收录于图录',
                },
                {
                  value: stats.categoryCount,
                  unit: '类',
                  label: '建筑类型',
                  caption: stats.rows
                    .slice(0, 3)
                    .map((r) => r.name)
                    .join(' · '),
                },
                {
                  value: stats.regionCount,
                  unit: '地',
                  label: '覆盖地区',
                  caption:
                    stats.regionList.slice(0, 3).join(' · ') +
                    (stats.regionList.length > 3 ? ' 等' : ''),
                },
                {
                  value: stats.dynastyCount,
                  unit: '朝',
                  label: '历史朝代',
                  caption: stats.dynastyList.slice(0, 5).join(' · '),
                },
              ].map((m) => (
                <div className="ov-stat" key={m.label}>
                  <p className="ov-stat-eyebrow">{m.label}</p>
                  <hr className="ov-stat-rule" />
                  <p className="ov-stat-line">
                    <span className="ov-stat-value">{m.value}</span>
                    <span className="ov-stat-unit">{m.unit}</span>
                  </p>
                  <p className="ov-stat-caption">{m.caption}</p>
                </div>
              ))}
            </div>

            <div className="ov-stats-chart">
              <p className="ov-stats-chart-title">建筑类型分布</p>
              {stats.rows.map((r) => (
                <div className="ov-stats-row" key={r.name}>
                  <span className="ov-stats-row-label">{r.name}</span>
                  <span className="ov-stats-row-track">
                    <i style={{ width: `${r.pct}%` }} />
                  </span>
                  <span className="ov-stats-row-num">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 快速筛选区 ===== */}
      <section className="ov-filter" ref={filterRef}>
        <div className="ov-filter-head">
          <h2 className="ov-filter-title">古建筑分类筛选</h2>
          <div className="ov-filter-sort">
            <span>排序方式</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ov-filter-group">
          <span className="ov-filter-label">按类型</span>
          <div className="ov-filter-tags">
            {categories.map((c) => (
              <button
                key={c}
                className={`ov-filter-tag${selCategories.includes(c) ? ' active' : ''}`}
                onClick={() => toggle(selCategories, c, setSelCategories)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="ov-filter-group">
          <span className="ov-filter-label">按地区</span>
          <div className="ov-filter-tags">
            {regions.map((r) => (
              <button
                key={r}
                className={`ov-filter-tag${selRegions.includes(r) ? ' active' : ''}`}
                onClick={() => toggle(selRegions, r, setSelRegions)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="ov-filter-group">
          <span className="ov-filter-label">按年代</span>
          <div className="ov-filter-tags">
            {DYNASTY_TAGS.map((d) => (
              <button
                key={d}
                className={`ov-filter-tag${selDynasties.includes(d) ? ' active' : ''}`}
                onClick={() => toggle(selDynasties, d, setSelDynasties)}
              >
                {d}代
              </button>
            ))}
          </div>
          {(selCategories.length > 0 || selRegions.length > 0 || selDynasties.length > 0) && (
            <button className="ov-filter-reset" onClick={resetFilters}>清除筛选</button>
          )}
        </div>
      </section>

      {/* ===== 卡片网格区 ===== */}
      <section className="ov-grid" ref={gridRef}>
        {loading ? (
          <div className="ov-grid-empty"><i className="fas fa-spinner fa-spin" /><p>加载中…</p></div>
        ) : error ? (
          <div className="ov-grid-empty"><i className="fas fa-exclamation-triangle" /><p>{error}</p></div>
        ) : (
          <>
            {pageItems.length > 0 ? (
              <ScrollReveal
                className="ov-grid-list"
                animateFrom="bottom"
                stagger={0.05}
                duration={0.6}
                bounce={0.15}
                blurToFocus
                revealOnScroll
              >
                {pageItems.map((p) => (
                  <BuildingCard
                    key={p.id}
                    palace={p}
                    onDetail={handleDetail}
                    onModel={handleModel}
                  />
                ))}
              </ScrollReveal>
            ) : (
              <div className="ov-grid-list">
                <div className="ov-grid-empty">
                  <i className="fas fa-fan" />
                  <p>没有符合条件的古建筑，试试调整筛选条件</p>
                </div>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="ov-pagination">
                <button
                  className="ov-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <i className="fas fa-chevron-left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`ov-page-btn${n === page ? ' active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="ov-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
          </section>

          {recommendations.length > 0 && (
            <div className="ov-recommendations">
              <RecommendationRail
                title="为你推荐"
                items={recommendations}
                renderItem={(item) => (
                  <button
                    type="button"
                    className="ov-rec-card"
                    onClick={() => navigate(`/exhibition/${item.palace_id}`)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.reason_text}</span>
                  </button>
                )}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
