import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getEncyclopediaTerms,
  getEncyclopediaTerm,
  getEncyclopediaTaxonomy,
} from '../api';

import EncyclopediaDiagramPanel from '../components/EncyclopediaDiagramPanel';
import AnimatedList from '../components/AnimatedList';
import ShareButton from '../components/ShareButton';
import AudioGuidePlayer from '../components/AudioGuidePlayer';
import EncyclopediaKnowledgeGraph from '../components/EncyclopediaKnowledgeGraph';
import CardSwap from '../components/CardSwap';
import { buildCardItems, deckPresetFor } from '../lib/encyclopediaCards';
import { useI18n } from '../context/I18nContext';
import { findHotspotForTerm } from '../data/buildingHotspots';
import {
  normalizeFilters,
  toSearchParams,
  filterTerms,
  groupTerms,
  countByType,
  highlightSegments,
  pickAlternatives,
} from '../lib/encyclopediaFilters';
import { track } from '../lib/analytics';
import { buildGraphModel, GRAPH_CONFIG } from '../lib/encyclopediaGraph';

/**
 * 营造法式百科页面（构件 + 建筑 双主轴）
 *
 * - 筛选状态与 URL 同步，可分享
 * - 列表按「名筑档案 / 营造术语」分组，命中高亮
 * - 3D 联动只跳当前词条关联建筑，不跨建筑兜底
 */

const CATEGORY_META = {
  all: { label: '全部', icon: 'fa-book' },
  名筑档案: { label: '名筑档案', icon: 'fa-landmark' },
  屋顶: { label: '屋顶等级', icon: 'fa-house' },
  斗拱: { label: '斗拱结构', icon: 'fa-cubes' },
  彩画: { label: '彩画纹样', icon: 'fa-palette' },
  柱础: { label: '柱础基石', icon: 'fa-dharmachakra' },
  台基: { label: '台基制度', icon: 'fa-layer-group' },
  门窗: { label: '宫门制式', icon: 'fa-door-open' },
  脊兽: { label: '脊兽装饰', icon: 'fa-dragon' },
  琉璃: { label: '琉璃构件', icon: 'fa-gem' },
  纹饰: { label: '纹样装饰', icon: 'fa-feather' },
  建筑规制: { label: '建筑规制', icon: 'fa-landmark' },
  建筑装饰: { label: '建筑装饰', icon: 'fa-star' },
};

const LEVEL_LABELS = {
  1: { text: '最高等级', color: '#c41e3a' },
  2: { text: '次高等级', color: '#b8860b' },
  3: { text: '中等', color: '#8b4513' },
  4: { text: '一般', color: '#666' },
};

const HOTSPOT_TERM_FALLBACK = {
  彩画: ['caihua-hexi'],
  纹饰: ['caihua-hexi', 'longwen', 'fengwen'],
  斗拱: ['dougong', 'dougong-levels'],
  屋顶: ['roof-ranking', 'wudian-roof', 'xieshan-roof'],
  建筑规制: ['sanchaodian', 'gongmen'],
  门窗: ['gongmen'],
  脊兽: ['jishou-xianren', 'chiwen'],
  台基: ['sumeru'],
  柱础: ['zhuchu'],
  琉璃: ['liuli'],
  建筑装饰: ['caisson'],
};

const ENC_3D_ENABLED = import.meta.env.VITE_ENC_3D !== 'off';

const DEFAULT_FILTERS = {
  building: '',
  entry_type: 'all',
  category: 'all',
  dynasty: 'all',
  region: 'all',
  q: '',
  term: '',
};

function safeJSON(val, defaultVal = []) {
  if (!val) return defaultVal;
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : defaultVal;
  } catch {
    return defaultVal;
  }
}

function readViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'wide';
  const matches = (px) => window.matchMedia(`(min-width: ${px}px)`).matches;
  const { wide, medium, compact, stacked, narrow } = GRAPH_CONFIG.BREAKPOINTS;
  if (matches(wide)) return 'wide';
  if (matches(medium)) return 'medium';
  if (matches(compact)) return 'compact';
  if (matches(stacked)) return 'stacked';
  if (matches(narrow)) return 'narrow';
  return 'minimal';
}

const EMPTY_GRAPH_MODEL = {
  mode: 'overview',
  centerId: null,
  nodes: [],
  edges: [],
  stats: { totalNodes: 0, totalEdges: 0, shownNodes: 0, shownEdges: 0, truncated: false },
};

function categoryMeta(category) {
  return CATEGORY_META[category] || { label: category, icon: 'fa-book' };
}

function SectionHead({ icon, title, hint }) {
  return (
    <div className="enc-section-head">
      <h3>
        <i className={`fas ${icon}`} /> {title}
      </h3>
      {hint && <span className="enc-section-hint">{hint}</span>}
    </div>
  );
}

function Highlighted({ text, query }) {
  const segments = highlightSegments(text, query);
  return segments.map((segment, index) =>
    segment.hit ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>
  );
}

export default function EncyclopediaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();

  const [terms, setTerms] = useState([]);
  const [taxonomy, setTaxonomy] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: 200 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [droppedNotice, setDroppedNotice] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [returnFocusCardId, setReturnFocusCardId] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [termLoading, setTermLoading] = useState(false);
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const [showMoreTaxonomy, setShowMoreTaxonomy] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef(null);
  const canonicalRef = useRef(null);
  const lastCardIdRef = useRef(null);
  const focusArticleRef = useRef(false);
  const CAROUSEL_INTERVAL = 4000;

  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const buildingMap = useMemo(() => {
    const map = new Map();
    (taxonomy?.buildings || []).forEach((item) => map.set(item.id, item));
    return map;
  }, [taxonomy]);

  const applyFromUrl = (params, currentTaxonomy) => {
    const { filters: nextFilters, dropped } = normalizeFilters(params, currentTaxonomy);
    setFilters(nextFilters);
    setSearchDraft(nextFilters.q || '');
    setSelectedTermId(nextFilters.term || '');
    setDroppedNotice(dropped.length > 0 ? '部分筛选条件已失效' : '');
    return nextFilters;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [termsResult, taxonomyResult] = await Promise.allSettled([
        getEncyclopediaTerms({ page_size: 500 }),
        getEncyclopediaTaxonomy(),
      ]);
      if (cancelled) return;

      if (termsResult.status === 'fulfilled') {
        const payload = termsResult.value?.data || {};
        setTerms(payload.data || []);
        setMeta(payload.meta || { total: (payload.data || []).length, page: 1, page_size: 200 });
      } else {
        console.error('加载百科术语失败:', termsResult.reason);
      }

      let loadedTaxonomy = null;
      if (taxonomyResult.status === 'fulfilled') {
        loadedTaxonomy = taxonomyResult.value?.data?.data || null;
        setTaxonomy(loadedTaxonomy);
      } else {
        console.error('加载百科分类体系失败:', taxonomyResult.reason);
      }

      applyFromUrl(new URLSearchParams(window.location.search), loadedTaxonomy);
      setLoading(false);

      if (termsResult.status === 'fulfilled') {
        track('encyclopedia_term_view', {
          category: 'all',
          stage: 'list',
          result_count: (termsResult.value?.data?.data || []).length,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 浏览器前进/后退与外部 URL 变化
  useEffect(() => {
    if (loading) return;
    const search = searchParams.toString();
    const current = toSearchParams({ ...filters, term: selectedTermId }).toString();
    if (search === current) return;
    applyFromUrl(new URLSearchParams(search), taxonomy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, taxonomy]);

  useEffect(() => {
    if (!selectedTermId) {
      setSelectedTerm(null);
      return;
    }
    let cancelled = false;
    setTermLoading(true);
    (async () => {
      try {
        const res = await getEncyclopediaTerm(selectedTermId);
        if (!cancelled) setSelectedTerm(res.data.data);
      } catch {
        if (!cancelled) {
          const found = terms.find((term) => term.id === selectedTermId);
          setSelectedTerm(found || null);
        }
      } finally {
        if (!cancelled) setTermLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTermId, terms]);

  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    const images = selectedTerm?.image_paths ? safeJSON(selectedTerm.image_paths, []) : [];
    if (!isPaused && images.length > 1) {
      autoplayRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % images.length);
      }, CAROUSEL_INTERVAL);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [isPaused, selectedTerm?.image_paths]);

  useEffect(() => {
    setCarouselIndex(0);
    setIsPaused(false);
  }, [selectedTermId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let link = canonicalRef.current;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
      canonicalRef.current = link;
    }
    const origin = window.location.origin;
    link.href = selectedTermId
      ? `${origin}/encyclopedia?term=${encodeURIComponent(selectedTermId)}`
      : `${origin}/encyclopedia`;
    return () => {
      if (link && link.parentNode) link.parentNode.removeChild(link);
      canonicalRef.current = null;
    };
  }, [selectedTermId]);

  useEffect(() => {
    if (lightboxIndex < 0) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex((index) => index - 1);
      else if (event.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) {
        setLightboxIndex((index) => index + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, lightboxImages]);

  const syncUrl = (nextFilters, nextTerm = selectedTermId, replace = true) => {
    setFilters(nextFilters);
    setSelectedTermId(nextTerm || '');
    setSearchParams(toSearchParams({ ...nextFilters, term: nextTerm || '' }), { replace });
  };

  const changeFilters = (patch, options = {}) => {
    const next = { ...filters, ...patch };
    setDroppedNotice('');
    if (options.trackBuilding) {
      track('encyclopedia_filter_building', {
        category: 'building',
        stage: 'filter',
        result_count: filterTerms(terms, next).length,
      });
    }
    syncUrl(next, '', true);
  };

  const selectTerm = (id) => {
    track('encyclopedia_term_open', {
      entity_type: 'term',
      entity_id: id,
      stage: 'list',
    });
    lastCardIdRef.current = id;
    setReturnFocusCardId(null);
    syncUrl(filters, id, false);
  };

  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };
  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(-1);
  };

  const filteredTerms = useMemo(() => filterTerms(terms, filters), [terms, filters]);
  const [viewport, setViewport] = useState(() => readViewport());
  const [graphCollapsed, setGraphCollapsed] = useState(() =>
    ['compact', 'stacked', 'narrow', 'minimal'].includes(readViewport())
  );

  const cardItems = useMemo(
    () => buildCardItems({ terms: filteredTerms, taxonomy }),
    [filteredTerms, taxonomy]
  );
  const deckPreset = deckPresetFor(viewport);

  const clearAllFilters = () => {
    changeFilters({
      building: '',
      entry_type: 'all',
      category: 'all',
      dynasty: 'all',
      region: 'all',
      q: '',
    });
  };

  const selectTermFromCard = (id) => {
    focusArticleRef.current = true;
    selectTerm(id);
  };

  const handleCardSelect = (id) => {
    lastCardIdRef.current = id;
    track('encyclopedia_card_select', {
      entity_type: 'term',
      entity_id: id,
      stage: 'deck',
    });
  };

  const backToDeck = () => {
    const cardId = lastCardIdRef.current;
    syncUrl(filters, '', true);
    setReturnFocusCardId(cardId || null);
  };

  useEffect(() => {
    if (!focusArticleRef.current || !selectedTerm) return;
    focusArticleRef.current = false;
    const title = document.querySelector('#enc-article .enc-head-title');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (!selectedTermId) return undefined;
    const handler = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;
      if (lightboxIndex >= 0) return;
      const cardId = lastCardIdRef.current;
      syncUrl(filters, '', true);
      setReturnFocusCardId(cardId || null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermId, lightboxIndex, filters]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const { wide, medium, compact, stacked, narrow } = GRAPH_CONFIG.BREAKPOINTS;
    const queries = [wide, medium, compact, stacked, narrow].map((px) =>
      window.matchMedia(`(min-width: ${px}px)`)
    );
    const update = () => setViewport(readViewport());
    queries.forEach((query) => query.addEventListener?.('change', update));
    return () => queries.forEach((query) => query.removeEventListener?.('change', update));
  }, []);

  useEffect(() => {
    setGraphCollapsed(['compact', 'stacked', 'narrow'].includes(viewport));
  }, [viewport]);

  const graph = useMemo(() => {
    try {
      const started = typeof performance !== 'undefined' ? performance.now() : 0;
      const model = buildGraphModel({
        terms: filteredTerms,
        taxonomy,
        filters,
        selectedTermId,
        selectedTerm,
      });
      const perfEnabled =
        typeof window !== 'undefined' &&
        (import.meta.env.DEV ||
          new URLSearchParams(window.location.search).get('perf') === '1');
      if (perfEnabled) {
        window.__encGraphPerf = {
          renderTotal: +(performance.now() - started).toFixed(1),
          nodes: model.stats.shownNodes,
          edges: model.stats.shownEdges,
          at: Date.now(),
        };
      }
      return { model, failed: false };
    } catch {
      return { model: null, failed: true };
    }
  }, [filteredTerms, taxonomy, filters, selectedTermId, selectedTerm]);

  const graphMode = viewport === 'minimal' ? 'list' : graphCollapsed ? 'collapsed' : 'docked';
  const graphModel = graph.model ?? EMPTY_GRAPH_MODEL;
  const groups = useMemo(() => groupTerms(filteredTerms), [filteredTerms]);
  const counts = useMemo(() => countByType(filteredTerms), [filteredTerms]);
  const alternatives = useMemo(
    () => pickAlternatives(terms, filters, taxonomy),
    [terms, filters, taxonomy]
  );

  const categories = useMemo(() => {
    const fromTaxonomy = (taxonomy?.categories || []).map((item) => ({
      key: item.category,
      label: categoryMeta(item.category).label,
      icon: categoryMeta(item.category).icon,
      count: item.count,
    }));
    return [{ key: 'all', label: '全部', icon: 'fa-book' }, ...fromTaxonomy];
  }, [taxonomy]);

  const buildings = taxonomy?.buildings || [];
  const visibleBuildings = showAllBuildings ? buildings : buildings.slice(0, 8);
  const dynasties = taxonomy?.dynasties || [];
  const regions = taxonomy?.regions || [];
  const hasActiveFilter =
    Boolean(filters.building) ||
    filters.entry_type !== 'all' ||
    filters.category !== 'all' ||
    filters.dynasty !== 'all' ||
    filters.region !== 'all' ||
    Boolean(filters.q);

  const listItems = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((term, index) => ({
          ...term,
          __groupFirst: index === 0 ? group.type : '',
          __groupCount: group.items.length,
        }))
      ),
    [groups]
  );


  const modelTarget = useMemo(() => {
    if (!selectedTerm) return null;
    const relatedIds = selectedTerm._relatedPalaces?.length
      ? selectedTerm._relatedPalaces.map((item) => item.id)
      : safeJSON(selectedTerm.related_palaces, []);
    const related = relatedIds
      .map((id) => {
        const fromDetail = selectedTerm._relatedPalaces?.find((item) => item.id === id);
        const fromTaxonomy = buildingMap.get(id);
        if (!fromDetail && !fromTaxonomy) return null;
        return {
          id,
          name: fromDetail?.name || fromTaxonomy?.name || id,
          dynasty: fromDetail?.dynasty || fromTaxonomy?.dynasty || '',
          has_3d: Boolean(fromTaxonomy?.has_3d),
        };
      })
      .filter(Boolean);

    const primary = selectedTerm.primary_palace_id
      ? buildingMap.get(selectedTerm.primary_palace_id)
      : null;

    const candidates = [
      ...new Set(
        [selectedTerm.id, ...(HOTSPOT_TERM_FALLBACK[selectedTerm.category] || [])].filter(Boolean)
      ),
    ];

    const ordered = [...related].sort((a, b) => {
      if (a.id === selectedTerm.primary_palace_id) return -1;
      if (b.id === selectedTerm.primary_palace_id) return 1;
      return String(a.id).localeCompare(String(b.id));
    });

    for (const termId of candidates) {
      for (const palace of ordered) {
        if (!palace.has_3d) continue;
        const hotspot = findHotspotForTerm(palace.id, [termId]);
        if (hotspot) {
          return {
            palace,
            hotspot,
            related,
            others: related.filter((item) => item.id !== palace.id),
            mode: '3d',
          };
        }
      }
    }

    const targetWith3d = ordered.find((palace) => palace.has_3d);
    if (targetWith3d) {
      return {
        palace: targetWith3d,
        hotspot: findHotspotForTerm(targetWith3d.id, candidates),
        related,
        others: related.filter((item) => item.id !== targetWith3d.id),
        mode: '3d',
      };
    }

    if (primary) {
      return {
        palace: { id: primary.id, name: primary.name, dynasty: primary.dynasty, has_3d: false },
        hotspot: null,
        related,
        others: [],
        mode: 'detail',
      };
    }

    if (ordered[0]) {
      return { palace: ordered[0], hotspot: null, related, others: ordered.slice(1), mode: 'detail' };
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, buildingMap]);

  const relatedTerms = useMemo(() => {
    if (!selectedTerm) return [];
    const picked = (selectedTerm._relatedTerms || []).slice(0, 6);
    const seen = new Set([selectedTerm.id, ...picked.map((term) => term.id)]);
    const extra = terms
      .filter((term) => term.category === selectedTerm.category && !seen.has(term.id))
      .slice(0, Math.max(0, 6 - picked.length));
    return [...picked, ...extra];
  }, [selectedTerm, terms]);

  const renderContent = (content) => {
    if (!content) return null;
    return content.split('\n\n').map((block, index) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('▲')) {
        return (
          <div key={index} className="encyclopedia-section-label">
            {trimmed.replace(/^▲\s*/, '')}
          </div>
        );
      }
      if (/^[◆■◉●○☐☑⬥]/.test(trimmed)) {
        return (
          <div key={index} className="encyclopedia-bullet-point">
            {trimmed}
          </div>
        );
      }
      return <p key={index}>{trimmed}</p>;
    });
  };

  const renderTopbar = (count, rate) => (
    <div className="profile-topbar">
      <button className="profile-back-btn" onClick={() => navigate('/')}>
        <i className="fas fa-arrow-left" /> {t('encyclopedia.page.back', '返回宫城')}
      </button>
      <h1 className="profile-title">
        <i className="fas fa-book" /> {t('encyclopedia.page.title', '营造法式')}
      </h1>
      <p className="profile-title-sub">
        {t(
          'encyclopedia.page.subtitle',
          '中国古代建筑知识百科 · 已发布 {count} 条 · 建筑覆盖 {rate}%',
          { count, rate }
        )}
      </p>
      <p className="encyclopedia-page-lead">
        {t(
          'encyclopedia.page.lead',
          '按建筑、构件、朝代或地区筛选，右侧知识图谱会同步呈现它们的关联'
        )}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="encyclopedia-page">
        {renderTopbar(0, 0)}
        <div className="profile-loading">
          <div className="loading-spinner" />
          <p>加载百科典籍中...</p>
        </div>
      </div>
    );
  }

  const galleryImages = selectedTerm?.image_paths
    ? safeJSON(selectedTerm.image_paths, [])
    : [];
  const level = selectedTerm?.level_value ? LEVEL_LABELS[selectedTerm.level_value] : null;
  const coverage = taxonomy?.totals;
  const canPage = meta.total > 500;

  return (
    <div className="encyclopedia-page">
      {renderTopbar(coverage?.published_terms ?? terms.length, coverage?.coverage_rate ?? 0)}

      <div className="encyclopedia-layout">
        <aside className="encyclopedia-sidebar" id="enc-filters">
          <div className="encyclopedia-search">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="搜索术语..."
              value={searchDraft}
              onChange={(event) => {
                const value = event.target.value;
                setSearchDraft(value);
                setFilters((prev) => ({ ...prev, q: value }));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  changeFilters({ q: searchDraft });
                }
              }}
            />
            {searchDraft && (
              <button
                className="encyclopedia-search-clear"
                onClick={() => {
                  setSearchDraft('');
                  changeFilters({ q: '' });
                }}
                aria-label="清空搜索"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {droppedNotice && (
            <p className="enc-result-count" role="status">
              <i className="fas fa-circle-info" /> {droppedNotice}
            </p>
          )}

          <div className="enc-filter-bar" role="group" aria-label="建筑筛选">
            <button
              type="button"
              className={`enc-filter-chip${filters.building === '' ? ' active' : ''}`}
              aria-pressed={filters.building === ''}
              onClick={() => changeFilters({ building: '' }, { trackBuilding: true })}
            >
              全部建筑
            </button>
            {visibleBuildings.map((building) => (
              <button
                key={building.id}
                type="button"
                className={`enc-filter-chip${filters.building === building.id ? ' active' : ''}`}
                aria-pressed={filters.building === building.id}
                onClick={() => changeFilters({ building: building.id }, { trackBuilding: true })}
                title={building.dynasty ? `${building.name} · ${building.dynasty}` : building.name}
              >
                {building.name}
                {building.entry_count > 0 && <span className="enc-filter-count">{building.entry_count}</span>}
              </button>
            ))}
            {buildings.length > 8 && (
              <button
                type="button"
                className="enc-filter-chip enc-filter-chip--ghost"
                onClick={() => setShowAllBuildings((value) => !value)}
              >
                {showAllBuildings ? '收起' : '更多'}
              </button>
            )}
          </div>

          {!showMoreTaxonomy ? (
            <button
              type="button"
              className="enc-filter-more"
              onClick={() => setShowMoreTaxonomy(true)}
            >
              <i className="fas fa-filter" /> 朝代 / 地区筛选
            </button>
          ) : (
            <div className="enc-filter-bar" role="group" aria-label="朝代与地区筛选">
              {dynasties.map((dynasty) => (
                <button
                  key={`d-${dynasty}`}
                  type="button"
                  className={`enc-filter-chip${filters.dynasty === dynasty ? ' active' : ''}`}
                  aria-pressed={filters.dynasty === dynasty}
                  onClick={() =>
                    changeFilters({ dynasty: filters.dynasty === dynasty ? 'all' : dynasty })
                  }
                >
                  {dynasty}
                </button>
              ))}
              {regions.map((region) => (
                <button
                  key={`r-${region}`}
                  type="button"
                  className={`enc-filter-chip${filters.region === region ? ' active' : ''}`}
                  aria-pressed={filters.region === region}
                  onClick={() =>
                    changeFilters({ region: filters.region === region ? 'all' : region })
                  }
                >
                  {region}
                </button>
              ))}
              <button
                type="button"
                className="enc-filter-chip enc-filter-chip--ghost"
                onClick={() => setShowMoreTaxonomy(false)}
              >
                收起
              </button>
            </div>
          )}

          <div className="encyclopedia-categories">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`encyclopedia-cat-chip ${filters.category === category.key ? 'active' : ''}`}
                aria-pressed={filters.category === category.key}
                onClick={() => changeFilters({ category: category.key })}
              >
                <i className={`fas ${category.icon}`} />
                {category.label}
                {typeof category.count === 'number' && (
                  <span className="enc-filter-count">{category.count}</span>
                )}
              </button>
            ))}
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              className="enc-filter-chip enc-filter-chip--clear"
              onClick={() => {
                setShowMoreTaxonomy(false);
                changeFilters({
                  building: '',
                  entry_type: 'all',
                  category: 'all',
                  dynasty: 'all',
                  region: 'all',
                  q: '',
                });
              }}
            >
              <i className="fas fa-rotate-left" /> 清除筛选
            </button>
          )}

          <p className="enc-result-count" role="status" aria-live="polite">
            命中 {counts.total} 条（建筑 {counts.building} 条 / 术语 {counts.craft} 条）
          </p>

          {filteredTerms.length === 0 ? (
            <div className="encyclopedia-empty">
              <i className="fas fa-search" />
              <p>未找到匹配的词条</p>
              <div className="enc-empty-actions">
                <button
                  type="button"
                  className="enc-filter-chip"
                  onClick={() =>
                    changeFilters({
                      building: '',
                      entry_type: 'all',
                      category: 'all',
                      dynasty: 'all',
                      region: 'all',
                      q: '',
                    })
                  }
                >
                  清除筛选
                </button>
                {alternatives.map((term) => (
                  <button
                    key={term.id}
                    type="button"
                    className="enc-filter-chip enc-filter-chip--ghost"
                    onClick={() => selectTerm(term.id)}
                  >
                    {term.term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatedList
              className="encyclopedia-term-animated"
              scrollClassName="encyclopedia-term-list"
              items={listItems}
              getKey={(item) => item.id}
              selectedKey={selectedTermId}
              staggerKey={`${filters.category}-${filters.building}-${filters.q}`}
              animation="slide"
              stagger={0.03}
              gap={0}
              showGradients
              fadeSize={44}
              enableArrowNavigation
              onItemSelect={(item) => {
                selectTerm(item.id);
              }}
              itemAs="div"
              itemClassName="encyclopedia-term-item"
              activeClassName="active"
              renderItem={(item) => (
                <>
                  {item.__groupFirst && (
                    <div className="enc-group-head">
                      {item.__groupFirst === 'building'
                        ? `名筑档案 · 建筑专属知识（${item.__groupCount}）`
                        : `营造术语（${item.__groupCount}）`}
                    </div>
                  )}
                  <div className="encyclopedia-term-item-header">
                    <span className="encyclopedia-term-item-name">
                      <Highlighted text={item.term} query={filters.q} />
                    </span>
                    {item.entry_type === 'building' && (
                      <span className="enc-badge--building">建筑</span>
                    )}
                    {item.level_value && (
                      <span
                        className="encyclopedia-term-item-level"
                        style={{ background: LEVEL_LABELS[item.level_value]?.color || '#666' }}
                      >
                        {LEVEL_LABELS[item.level_value]?.text || ''}
                      </span>
                    )}
                  </div>
                  <div className="encyclopedia-term-item-synopsis">
                    <Highlighted text={item.synopsis} query={filters.q} />
                  </div>
                </>
              )}
            />
          )}

          {canPage && (
            <div className="enc-empty-actions">
              <button
                type="button"
                className="enc-filter-chip"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                上一页
              </button>
              <span className="enc-result-count">
                第 {page} / {Math.ceil(meta.total / 200)} 页
              </span>
              <button
                type="button"
                className="enc-filter-chip"
                disabled={page >= Math.ceil(meta.total / 200)}
                onClick={() => setPage((value) => value + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </aside>

        <main className="encyclopedia-detail">
          <div className={`enc-detail-grid${graphCollapsed ? ' is-graph-collapsed' : ''}`}>
            <div className={!selectedTermId ? 'enc-detail-main enc-detail-main--deck' : 'enc-detail-main'}>
          {!selectedTermId ? (
            ENC_3D_ENABLED && (
              <CardSwap
                items={cardItems}
                selectedId={selectedTermId}
                selectMode="runtime"
                onSelect={handleCardSelect}
                onRequestArticle={selectTermFromCard}
                visibleCards={deckPreset.visibleCards}
                cardDistance={108}
                depth={220}
                skewAmount={22}
                speed={0.95}
                delay={3500}
                parallax={0}
                hoverSpread={0}
                dim={0.5}
                blur={6}
                falloff={0.2}
                perspective={1400}
                duration={700}
                skipHref="#enc-filters"
                onClearFilters={clearAllFilters}
                focusCardId={returnFocusCardId}
                t={t}
              />
            )
          ) : !selectedTerm ? (
            <div className="enc-article-loading">
              <div className="loading-spinner" />
              <p>{termLoading ? '正在展开词条…' : '该词条暂无内容'}</p>
            </div>
          ) : (
            <article id="enc-article" className="enc-article enc-article--fluid">
              {ENC_3D_ENABLED && (
                <button type="button" className="enc-back-to-deck" onClick={backToDeck}>
                  ← {t('encyclopedia.card.backToDeck', '返回卡片选择')}
                </button>
              )}
              <header className="enc-head">
                <div className="enc-head-tags">
                  <span className="enc-tag enc-tag--cat">
                    <i className={`fas ${selectedTerm.category_icon || 'fa-book'}`} />
                    {selectedTerm.category}
                  </span>
                  {level && (
                    <span className="enc-tag enc-tag--level" style={{ background: level.color }}>
                      {level.text}
                    </span>
                  )}
                </div>
                <h2 className="enc-head-title">{selectedTerm.term}</h2>
                <div className="enc-head-share">
                  <ShareButton type="term" id={selectedTerm.id} title={selectedTerm.term} showLabel />
                </div>
                <p className="enc-head-synopsis">{selectedTerm.synopsis}</p>
                <AudioGuidePlayer text={selectedTerm.content} title="朗读词条" />
              </header>

              {galleryImages.length > 0 && (
                <section className="enc-section">
                  <SectionHead icon="fa-images" title="实拍图像" hint="点击图片可放大预览" />
                  <div
                    className="encyclopedia-carousel"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                  >
                    <div className="encyclopedia-carousel-track">
                      <img
                        src={galleryImages[carouselIndex]}
                        alt={`${selectedTerm.term} 图 ${carouselIndex + 1}`}
                        className="encyclopedia-carousel-img"
                        onClick={() => openLightbox(galleryImages, carouselIndex)}
                      />
                    </div>
                    <button
                      className="encyclopedia-carousel-btn encyclopedia-carousel-btn--prev"
                      onClick={() =>
                        setCarouselIndex(
                          (index) => (index - 1 + galleryImages.length) % galleryImages.length
                        )
                      }
                      title="上一张"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                      className="encyclopedia-carousel-btn encyclopedia-carousel-btn--next"
                      onClick={() => setCarouselIndex((index) => (index + 1) % galleryImages.length)}
                      title="下一张"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                    <div className="encyclopedia-carousel-dots">
                      {galleryImages.map((_, index) => (
                        <button
                          key={index}
                          className={`encyclopedia-carousel-dot${index === carouselIndex ? ' active' : ''}`}
                          onClick={() => setCarouselIndex(index)}
                          aria-label={`第 ${index + 1} 张`}
                        />
                      ))}
                    </div>
                    <div className="encyclopedia-carousel-counter">
                      {carouselIndex + 1} / {galleryImages.length}
                    </div>
                  </div>
                </section>
              )}

              <section className="enc-section">
                <SectionHead
                  icon="fa-diagram-project"
                  title={selectedTerm.category === '斗拱' ? '三维拆解' : '图解示意'}
                  hint={
                    selectedTerm.category === '斗拱'
                      ? '拖拽旋转 · 点击构件查看构造'
                      : '悬停热点查看构件名称'
                  }
                />
                <EncyclopediaDiagramPanel term={selectedTerm} />
              </section>

              <section className="enc-section enc-section--text">
                <SectionHead icon="fa-scroll" title="知识详解" />
                <div className="enc-reading encyclopedia-article-content">
                  {renderContent(selectedTerm.content)}
                </div>
              </section>

              {modelTarget && (
                <section className="enc-section">
                  <div className="enc-3d-card">
                    <div className="enc-3d-text">
                      <span className="enc-3d-eyebrow">
                        <i className="fas fa-cube" /> 建筑联动
                      </span>
                      <h3>在建筑中查看「{selectedTerm.term}」</h3>
                      <p>
                        关联建筑「{modelTarget.palace.name}」
                        {modelTarget.hotspot
                          ? `，可在 3D 模型中高亮「${modelTarget.hotspot.label}」构件。`
                          : modelTarget.mode === '3d'
                            ? '，可前往 3D 展厅继续观察。'
                            : '，可打开建筑详情查看图文档案。'}
                      </p>
                      {modelTarget.others.length > 0 && (
                        <div className="enc-3d-chips">
                          <span>其他关联建筑</span>
                          {modelTarget.others.map((palace) => (
                            <button
                              key={palace.id}
                              type="button"
                              onClick={() => navigate(`/exhibition/${encodeURIComponent(palace.id)}`)}
                            >
                              {palace.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="enc-3d-btn"
                      onClick={() => {
                        if (modelTarget.mode === '3d') {
                          navigate('/gallery', {
                            state: {
                              selectPalaceId: modelTarget.palace.id,
                              highlightTermId: modelTarget.hotspot?.termId || null,
                            },
                          });
                        } else {
                          navigate(`/exhibition/${encodeURIComponent(modelTarget.palace.id)}`);
                        }
                      }}
                    >
                      <i className="fas fa-location-crosshairs" />
                      {modelTarget.mode === '3d' ? '前往 3D 模型查看该构件' : '查看该建筑详情'}
                    </button>
                  </div>
                </section>
              )}

              {relatedTerms.length > 0 && (
                <section className="enc-section">
                  <SectionHead icon="fa-link" title="相关术语" hint="点击直接切换词条" />
                  <div className="enc-related-tags">
                    {relatedTerms.map((term) => (
                      <button
                        key={term.id}
                        type="button"
                        className="enc-related-tag"
                        onClick={() => selectTerm(term.id)}
                      >
                        <span className="enc-related-cat">{term.category}</span>
                        <span className="enc-related-name">{term.term}</span>
                        <i className="fas fa-arrow-right" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </article>
          )}
            </div>
            <EncyclopediaKnowledgeGraph
              model={graphModel}
              mode={graphMode}
              collapsed={graphCollapsed}
              loading={loading}
              failed={graph.failed}
              selectedId={selectedTermId ? `term:${selectedTermId}` : null}
              skipTargetId="enc-article"
              viewport={viewport}
              t={t}
              onToggleCollapsed={() => setGraphCollapsed((value) => !value)}
              onSelectTerm={selectTerm}
              onOpenBuilding={(id) => navigate(`/exhibition/${encodeURIComponent(id)}`)}
              onApplyFilter={(patch) => changeFilters(patch)}
              onClearFilters={clearAllFilters}
            />
          </div>
        </main>
      </div>

      {lightboxIndex >= 0 && lightboxImages.length > 0 && (
        <div className="encyclopedia-lightbox-overlay" onClick={closeLightbox}>
          <button className="encyclopedia-lightbox-close" onClick={closeLightbox}>
            <i className="fas fa-times"></i>
          </button>
          <img
            className="encyclopedia-lightbox-img"
            src={lightboxImages[lightboxIndex]}
            alt={`图解 ${lightboxIndex + 1}/${lightboxImages.length}`}
            onClick={(event) => event.stopPropagation()}
          />
          <div className="encyclopedia-lightbox-counter">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}
    </div>
  );
}