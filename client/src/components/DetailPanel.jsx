import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBuiltYear } from '../lib/museumMeta';
import { getRecommendations, getPalaceContent, getEncyclopediaTerms } from '../api';
import { track } from '../lib/analytics';
import { useI18n } from '../context/I18nContext';
import CollectionButton from './CollectionButton';
import ShareButton from './ShareButton';
import AudioGuidePlayer from './AudioGuidePlayer';

/**
 * 清洗档案字段 — 空值与占位符统一显示为「暂未考订」
 */
function cleanValue(value, fallback = '暂未考订') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || ['—', '-', '－', 'N/A', 'null', 'undefined'].includes(text)) return fallback;
  return text;
}

/**
 * 从 palace 数据中提取仪表盘指标
 * 华夏名筑数据自带 stats 字段时优先使用, 否则回退到字段推导
 */
function extractDashboardData(palace) {
  // 数据自带关键数据: [["72 万㎡", "占地"], ...]
  if (Array.isArray(palace.stats) && palace.stats.length > 0) {
    return palace.stats.slice(0, 4).map(([value, label]) => ({
      value,
      label,
      icon: 'fa-gem',
    }));
  }

  const stats = [];

  if (palace.built_year) {
    stats.push({ value: formatBuiltYear(palace.built_year), label: '建成年代', icon: 'fa-calendar' });
  }
  if (palace.height) {
    const h = palace.height.replace(/[^0-9.]/g, '');
    if (h) {
      const isAltitude = palace.height.includes('海拔');
      stats.push({
        value: `${h} 米`,
        label: isAltitude ? '海拔高度' : '建筑高度',
        icon: 'fa-ruler-vertical',
      });
    }
  }
  if (palace.area) {
    const a = palace.area.replace(/[^0-9.]/g, '');
    if (a) {
      const isLength = palace.area.includes('公里');
      const isPainting = palace.area.includes('壁画');
      stats.push({
        value: isLength ? `${a} 公里` : isPainting ? `${a} 万平方米` : `${a} 平方米`,
        label: isLength ? '绵延长度' : isPainting ? '壁画面积' : '占地规模',
        icon: 'fa-up-right-and-down-left-from-center',
      });
    }
  }
  if (palace.style) {
    stats.push({ value: palace.style.length > 6 ? palace.style.slice(0, 6) + '…' : palace.style, label: '建筑风格', icon: 'fa-brush' });
  }

  return stats.slice(0, 4);
}

/**
 * 解析摘要 — 优先使用 tagline
 */
function getSummary(palace) {
  if (palace.tagline) return palace.tagline;
  if (palace.category === '关隘') {
    return `${palace.dynasty || '历代'}修筑的要冲门户`;
  }
  return `${palace.dynasty || '明清'}${palace.category || '建筑'}，庄严宏伟的主体殿宇`;
}

/**
 * 获取相关建筑推荐 — 相邻 → 同类型 → 同地区
 */
function getRelatedPalaces(palace, allPalaces) {
  if (!allPalaces || allPalaces.length <= 1) return [];

  const currentIndex = allPalaces.findIndex(p => p.id === palace.id);
  const related = [];

  // 相邻建筑优先
  if (currentIndex > 0) related.push(allPalaces[currentIndex - 1]);
  if (currentIndex < allPalaces.length - 1) related.push(allPalaces[currentIndex + 1]);

  // 同类型建筑
  const sameCategory = allPalaces.filter(
    p => p.id !== palace.id && p.category === palace.category && !related.find(r => r.id === p.id)
  );
  related.push(...sameCategory.slice(0, 2));

  // 同地区建筑 — 让全国名筑与中轴线建筑彼此可达
  if (related.length < 4) {
    const sameRegion = allPalaces.filter(
      p =>
        p.id !== palace.id &&
        (p.region || p.city) === (palace.region || palace.city) &&
        !related.find(r => r.id === p.id)
    );
    related.push(...sameRegion.slice(0, 4 - related.length));
  }

  return related.slice(0, 4);
}

/**
 * 右侧详情面板组件 — 下拉折叠式内容区
 * 所有区块默认展开，点击标题栏折叠/展开，
 * 避免典故等长文字溢出遮挡
 */
function DetailPanel({ palace, palaces = [], onNavigate, loading = false }) {
  // 默认全部展开
  const [collapsed, setCollapsed] = useState({});
  

  const { lang, t } = useI18n();
  const [localized, setLocalized] = useState(null);
  const [relatedFromApi, setRelatedFromApi] = useState([]);

  const dashboardData = useMemo(() => extractDashboardData(palace), [palace]);

  useEffect(() => {
    if (lang !== 'en' || !palace?.id) {
      setLocalized(null);
      return undefined;
    }

    let cancelled = false;
    getPalaceContent(palace.id, 'en')
      .then((res) => {
        if (!cancelled && res.data?.success) setLocalized(res.data.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [lang, palace?.id]);

  useEffect(() => {
    if (!palace?.id) {
      setRelatedFromApi([]);
      return undefined;
    }

    let cancelled = false;
    getRecommendations({ scene: 'detail', palace_id: palace.id, limit: 6 })
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setRelatedFromApi(res.data.data.items || []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [palace?.id]);

  const displayName =
    lang === 'en'
      ? localized?.name || palace.name_en || palace.name
      : palace.name;

  const relatedPalaces = useMemo(() => {
    if (relatedFromApi.length > 0) {
      return relatedFromApi.map((item) => ({
        id: item.palace_id,
        name: item.name,
        poster_path: item.poster_path,
        reason_text: item.reason_text,
      }));
    }
    return getRelatedPalaces(palace, palaces);
  }, [relatedFromApi, palace, palaces]);

  const toggleSection = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navigate = useNavigate();
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [knowledge, setKnowledge] = useState(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const knowledgeRequestedRef = useRef(false);

  useEffect(() => {
    setKnowledgeOpen(false);
    setKnowledge(null);
    setKnowledgeLoading(false);
    knowledgeRequestedRef.current = false;
  }, [palace?.id]);

  const toggleKnowledge = async () => {
    const next = !knowledgeOpen;
    setKnowledgeOpen(next);
    if (!next || knowledgeRequestedRef.current || !palace?.id) return;

    knowledgeRequestedRef.current = true;
    setKnowledgeLoading(true);
    try {
      const res = await getEncyclopediaTerms({ building: palace.id, page_size: 50 });
      const list = res.data?.data || [];
      const entries = list.filter((item) => item.entry_type === 'building');
      const crafts = list.filter((item) => item.entry_type !== 'building');
      setKnowledge({ entries, crafts });
      if (entries.length + crafts.length > 0) {
        track('encyclopedia_term_view', {
          entity_type: 'palace',
          entity_id: palace.id,
          reason: 'detail_panel',
        });
      }
    } catch {
      setKnowledge({ entries: [], crafts: [] });
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const openKnowledgeTerm = (termId) => {
    track('encyclopedia_reverse_click', {
      entity_type: 'term',
      entity_id: termId,
      palace_id: palace.id,
    });
    navigate(`/encyclopedia?term=${encodeURIComponent(termId)}&from=detail`);
  };

  const knowledgeEmpty =
    Boolean(knowledge) && knowledge.entries.length === 0 && knowledge.crafts.length === 0;

  // 加载骨架屏
  if (loading) {
    return (
      <div className="museum-detail" aria-busy="true" aria-label="正在加载详情">
        <div className="detail-skeleton">
          <div className="detail-skeleton-header">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="detail-skeleton-section">
              <div className="skeleton-line skeleton-line--heading" />
              <div className="skeleton-line skeleton-line--full" />
              <div className="skeleton-line skeleton-line--full" />
              <div className="skeleton-line skeleton-line--medium" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="museum-detail">
      {/* 面板头部 */}
      <div className="detail-header">
        <div className="detail-header-top">
          <h3>
            <i className="fas fa-scroll"></i>
            {t('detail.title', '卷宗详情')}
          </h3>
          <div className="detail-header-actions">
            <button
              type="button"
              className="detail-action"
              title={t('detail.knowledgeLink', '查看该建筑的知识')}
              aria-label={t('detail.knowledgeLink', '查看该建筑的知识')}
              onClick={() =>
                navigate(`/encyclopedia?building=${encodeURIComponent(palace.id)}&from=detail`)
              }
            >
              <i className="fas fa-book-open" />
            </button>
            <CollectionButton palaceId={palace.id} variant="icon" />
            <ShareButton
              type="palace"
              id={palace.id}
              title={palace.name}
              className="detail-action"
            />
            <button
              type="button"
              className="detail-action"
              title="朗读（即将上线）"
              aria-label="朗读（即将上线）"
              disabled
            >
              <i className="fas fa-volume-high" />
            </button>
          </div>
        </div>
        <p className="detail-summary">
          {localized?.description || getSummary(palace)}
        </p>
        {lang === 'en' && (!localized || localized.description_status !== 'full') && (
          <span className="i18n-missing">
            {t('detail.translationMissing', 'English coming soon')}
          </span>
        )}
      </div>

      {/* ====== 折叠式内容区块 ====== */}
      <div className="detail-accordion">
        {/* ---- 简介 ---- */}
        <div className={`detail-accordion-section${collapsed['intro'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('intro')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-book-open"></i>
              <span>简介</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {/* 数据仪表盘 */}
            {dashboardData.length > 0 && (
              <div className="detail-dashboard">
                {dashboardData.map((stat, i) => (
                  <div key={i} className="detail-stat">
                    <div className="detail-stat-value">{stat.value}</div>
                    <div className="detail-stat-label">
                      <i className={`fas ${stat.icon}`} style={{ marginRight: 4 }}></i>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="detail-description-text">
              {palace.description || '暂无简介'}
            </div>

            {/* 经典诗句引用 */}
            {palace.quote && (
              <div className="detail-quote">
                <div className="detail-quote-text">「{palace.quote}」</div>
                {palace.quote_by && (
                  <div className="detail-quote-by">—— {palace.quote_by}</div>
                )}
              </div>
            )}

            {/* 标签 */}
            {Array.isArray(palace.tags) && palace.tags.length > 0 && (
              <div className="detail-tags">
                {palace.tags.map((tag, i) => (
                  <span key={i} className="detail-tag">
                    <i className="fas fa-hashtag"></i>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 语音讲解播放器 */}
            {palace.audio_guide && (
              <AudioGuidePlayer
                text={palace.audio_guide}
                title="语音讲解"
                audioUrl={palace.audio?.url || ''}
                audioDuration={palace.audio?.duration}
                isCurrent={palace.audio?.is_current !== false}
              />
            )}
          </div>
        </div>

        {/* ---- 信息 ---- */}
        <div className={`detail-accordion-section${collapsed['info'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('info')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-circle-info"></i>
              <span>信息</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            <div className="detail-info-grid">
              <div className="detail-info-row">
                <span className="detail-info-label">{t('detail.name', '名称')}</span>
                <span className="detail-info-value">{displayName}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">{t('detail.englishName', '英文名')}</span>
                <span className="detail-info-value" style={{ fontStyle: 'italic' }}>
                  {palace.name_en || '-'}
                </span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">年代</span>
                <span className="detail-info-value">
                  {palace.dynasty || '年代待考'} · {formatBuiltYear(palace.built_year)}
                </span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">类别</span>
                <span className="detail-info-value">{cleanValue(palace.category)}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">地点</span>
                <span className="detail-info-value">{cleanValue(palace.city || palace.region)}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">占地 / 规模</span>
                <span className="detail-info-value">{cleanValue(palace.area)}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">高度</span>
                <span className="detail-info-value">{cleanValue(palace.height)}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">风格</span>
                <span className="detail-info-value">{cleanValue(palace.style)}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">历史意义</span>
                <span className="detail-info-value" style={{ maxWidth: '55%', lineHeight: 1.5 }}>
                  {cleanValue(palace.significance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- 沿革 ---- */}
        <div className={`detail-accordion-section${collapsed['timeline'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('timeline')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-timeline"></i>
              <span>沿革</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {palace.timeline && palace.timeline.length > 0 ? (
              <div className="detail-timeline">
                {palace.timeline.map((item, i) => (
                  <div key={i} className="detail-timeline-item">
                    <div className="timeline-dot"></div>
                    <span className="timeline-year">{item.year}</span>
                    <span className="timeline-event">{item.event}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-state">
                <i className="fas fa-clock"></i>
                暂无历史记录
              </div>
            )}
          </div>
        </div>

        {/* ---- 典故 ---- */}
        <div className={`detail-accordion-section${collapsed['facts'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('facts')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-feather"></i>
              <span>典故</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {palace.funFacts && palace.funFacts.length > 0 ? (
              <div className="detail-facts">
                {palace.funFacts.map((fact, i) => (
                  <div key={i} className="fact-item">
                    <i className="fas fa-quote-right fact-quote-icon"></i>
                    {fact}
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-state">
                <i className="fas fa-feather"></i>
                暂无趣味典故
              </div>
            )}
          </div>
        </div>
        {/* ---- 图影 (四视图画廊) ---- */}
        {Array.isArray(palace.views) && palace.views.length > 0 && (
          <div className={`detail-accordion-section${collapsed['views'] ? ' collapsed' : ''}`}>
            <div
              className="detail-accordion-header"
              onClick={() => toggleSection('views')}
            >
              <div className="detail-accordion-header-left">
                <i className="fas fa-images"></i>
                <span>图影</span>
              </div>
              <i className="fas fa-chevron-down detail-accordion-chevron"></i>
            </div>
            <div className="detail-accordion-body">
              <div className="detail-views-gallery">
                {palace.views.map((view, i) => (
                  <figure key={i} className="detail-view-item">
                    <img
                      src={`/images/${view.src}`}
                      alt={`${palace.name}${view.zh || ''}视图`}
                      loading="lazy"
                    />
                    <figcaption>{view.zh || view.en}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        )}

        {!knowledgeEmpty && (
          <div className={`detail-accordion-section${knowledgeOpen ? '' : ' collapsed'}`}>
            <div
              className="detail-accordion-header"
              role="button"
              tabIndex={0}
              aria-expanded={knowledgeOpen}
              onClick={toggleKnowledge}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleKnowledge();
                }
              }}
            >
              <div className="detail-accordion-header-left">
                <i className="fas fa-book-open"></i>
                <span>关联建筑知识</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-light, #5a5252)' }}>
                  来自营造法式
                </span>
              </div>
              <i className="fas fa-chevron-down detail-accordion-chevron"></i>
            </div>
            {knowledgeOpen && (
              <div className="detail-accordion-body">
                {knowledgeLoading ? (
                  <div className="detail-empty-state">
                    <i className="fas fa-spinner fa-spin"></i> 加载中…
                  </div>
                ) : (
                  <>
                    {knowledge?.entries?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <h5 style={{ margin: '8px 0 6px', fontSize: 12, color: 'var(--ink-light, #5a5252)' }}>
                          本建筑的专属知识
                        </h5>
                        <div className="related-list">
                          {knowledge.entries.map((term) => (
                            <button
                              key={term.id}
                              type="button"
                              className="related-item"
                              onClick={() => openKnowledgeTerm(term.id)}
                            >
                              <span>{term.term}</span>
                              {term.synopsis && (
                                <span className="related-reason">{term.synopsis}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {knowledge?.crafts?.length >= 3 && (
                      <div>
                        <h5 style={{ margin: '8px 0 6px', fontSize: 12, color: 'var(--ink-light, #5a5252)' }}>
                          相关营造术语
                        </h5>
                        <div className="enc-related-tags">
                          {knowledge.crafts.map((term) => (
                            <button
                              key={term.id}
                              type="button"
                              className="enc-related-tag"
                              onClick={() => openKnowledgeTerm(term.id)}
                            >
                              <span className="enc-related-name">{term.term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {knowledge && knowledge.entries.length === 0 && knowledge.crafts.length < 3 && (
                      <div className="detail-empty-state">暂未收录该建筑的知识</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 相关建筑推荐 */}
      {relatedPalaces.length > 0 && (
        <div className="related-section">
          <h4>相关建筑</h4>
          <div className="related-list">
            {relatedPalaces.map(p => (
              <button
                key={p.id}
                className="related-item"
                onClick={() => onNavigate(p)}
              >
                <span>{p.name}</span>
                {p.reason_text && (
                  <span className="related-reason">{p.reason_text}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DetailPanel;
