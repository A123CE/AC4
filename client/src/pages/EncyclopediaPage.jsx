import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncyclopediaTerms, getEncyclopediaTerm } from '../api';
import EncyclopediaGuide from '../components/EncyclopediaGuide';
import EncyclopediaDiagramPanel from '../components/EncyclopediaDiagramPanel';
import AnimatedList from '../components/AnimatedList';
import ShareButton from '../components/ShareButton';
import AudioGuidePlayer from '../components/AudioGuidePlayer';
import { findHotspotForTerm } from '../data/buildingHotspots';

/**
 * 营造法式百科页面 — 古建筑知识库 (API驱动版)
 *
 * 结构:
 *   状态一（未选中词条）: 左侧分类 + 列表，右侧【营造导引看板】
 *   状态二（词条详情）  : 标题信息 → 实拍图像 → 图解示意 → 三维联动 → 相关术语
 */

// 扩展的分类定义
const CATEGORIES = [
  { key: 'all', label: '全部', icon: 'fa-book' },
  { key: '屋顶', label: '屋顶等级', icon: 'fa-house' },
  { key: '斗拱', label: '斗拱结构', icon: 'fa-cubes' },
  { key: '彩画', label: '彩画纹样', icon: 'fa-palette' },
  { key: '柱础', label: '柱础基石', icon: 'fa-dharmachakra' },
  { key: '台基', label: '台基制度', icon: 'fa-layer-group' },
  { key: '门窗', label: '宫门制式', icon: 'fa-door-open' },
  { key: '脊兽', label: '脊兽装饰', icon: 'fa-dragon' },
  { key: '琉璃', label: '琉璃构件', icon: 'fa-gem' },
  { key: '纹饰', label: '纹样装饰', icon: 'fa-feather' },
  { key: '建筑规制', label: '建筑规制', icon: 'fa-landmark' },
  { key: '建筑装饰', label: '建筑装饰', icon: 'fa-star' },
];

// 等级标签
const LEVEL_LABELS = {
  1: { text: '最高等级', color: '#c41e3a' },
  2: { text: '次高等级', color: '#b8860b' },
  3: { text: '中等', color: '#8b4513' },
  4: { text: '一般', color: '#666' },
};

// 宫殿ID到名称的映射表
const PALACE_NAMES = {
  wumen: '午门',
  taihemen: '太和门',
  taihedian: '太和殿',
  zhonghedian: '中和殿',
  baohedian: '保和殿',
  qianqingmen: '乾清门',
  qianqinggong: '乾清宫',
  jiaotaidian: '交泰殿',
  kunninggong: '坤宁宫',
  shenwumen: '神武门',
};

// 关联建筑有多座且都能命中时，按中轴线顺序取"更有代表性"的那座
const PALACE_PRIORITY = [
  'wumen',
  'taihemen',
  'taihedian',
  'zhonghedian',
  'baohedian',
  'qianqingmen',
  'qianqinggong',
  'jiaotaidian',
  'kunninggong',
  'shenwumen',
];

/**
 * 词条 → 3D 热点术语的兜底映射
 * 多数词条 id 与热点 termId 一致；不一致的（如「龙纹」对应彩画热点）走这里。
 */
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

/** 安全解析 JSON 字段（可能是字符串或已解析的数组） */
function safeJSON(val, defaultVal = []) {
  if (!val) return defaultVal;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
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

export default function EncyclopediaPage() {
  const navigate = useNavigate();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [termLoading, setTermLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 轮播状态
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef(null);
  const CAROUSEL_INTERVAL = 4000;

  // 图片灯箱状态
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  // 轮播自动播放
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

  // 选择新术语时重置轮播
  useEffect(() => {
    setCarouselIndex(0);
    setIsPaused(false);
  }, [selectedTermId]);

  // 加载百科术语
  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const res = await getEncyclopediaTerms();
      setTerms(res.data.data || []);

      // 分享深链：/encyclopedia?term=xxx
      const termFromQuery =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('term')
          : null;
      if (termFromQuery) setSelectedTermId(termFromQuery);
    } catch (err) {
      console.error('加载百科术语失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 选择术语时加载详情
  useEffect(() => {
    if (!selectedTermId) {
      setSelectedTerm(null);
      return;
    }
    loadTermDetail(selectedTermId);
  }, [selectedTermId]);

  const loadTermDetail = async (id) => {
    setTermLoading(true);
    try {
      const res = await getEncyclopediaTerm(id);
      setSelectedTerm(res.data.data);
    } catch (err) {
      // 降级：从列表中查找
      const found = terms.find((t) => t.id === id);
      if (found) setSelectedTerm(found);
    } finally {
      setTermLoading(false);
    }
  };

  // 打开/关闭灯箱
  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };
  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(-1);
  };

  // 键盘导航灯箱
  useEffect(() => {
    if (lightboxIndex < 0) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex((i) => i - 1);
      else if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1)
        setLightboxIndex((i) => i + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, lightboxImages]);

  // 筛选术语
  const filteredTerms = useMemo(() => {
    let result = terms;
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          (t.synopsis && t.synopsis.toLowerCase().includes(q))
      );
    }
    return result;
  }, [terms, activeCategory, searchQuery]);

  // 分类列表 (从数据中动态提取)
  const availableCategories = useMemo(() => {
    const cats = new Set();
    terms.forEach((t) => cats.add(t.category));
    return CATEGORIES.filter((c) => c.key === 'all' || cats.has(c.key));
  }, [terms]);

  // 导引卡点击 — 筛选分类并展开该分类首条词条
  const handleGuidePick = (categoryKey) => {
    setActiveCategory(categoryKey);
    setSearchQuery('');
    const first = terms.find((t) => t.category === categoryKey);
    setSelectedTermId(first ? first.id : null);
  };

  // 三维联动目标 — 优先选择带匹配热点的关联建筑
  const modelTarget = useMemo(() => {
    if (!selectedTerm) return null;
    const related = selectedTerm._relatedPalaces?.length
      ? selectedTerm._relatedPalaces
      : safeJSON(selectedTerm.related_palaces, []).map((id) => ({
          id,
          name: PALACE_NAMES[id] || id,
          dynasty: '',
        }));

    const candidates = [
      ...new Set(
        [selectedTerm.id, ...(HOTSPOT_TERM_FALLBACK[selectedTerm.category] || [])].filter(Boolean)
      ),
    ];

    // 同一候选术语命中多座建筑时，按中轴线顺序取代表建筑
    const ranked = [...related].sort((a, b) => {
      const ai = PALACE_PRIORITY.indexOf(a.id);
      const bi = PALACE_PRIORITY.indexOf(b.id);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

    // 按候选术语优先级逐个匹配（而非按建筑顺序），保证「龙纹」优先命中彩画热点
    let matched = null;
    for (const termId of candidates) {
      for (const p of ranked) {
        const h = findHotspotForTerm(p.id, [termId]);
        if (h) {
          matched = { palace: p, hotspot: h };
          break;
        }
      }
      if (matched) break;
    }

    const palace = matched?.palace || ranked[0] || { id: 'taihedian', name: '太和殿' };
    const hotspot = matched?.hotspot || findHotspotForTerm(palace.id, candidates);
    return {
      palace,
      hotspot,
      related,
      others: related.filter((r) => r.id !== palace.id),
    };
  }, [selectedTerm]);

  // 相关术语 — API 未提供时用同分类词条兜底
  const relatedTerms = useMemo(() => {
    if (!selectedTerm) return [];
    const picked = (selectedTerm._relatedTerms || []).slice(0, 6);
    const seen = new Set([selectedTerm.id, ...picked.map((t) => t.id)]);
    const extra = terms
      .filter((t) => t.category === selectedTerm.category && !seen.has(t.id))
      .slice(0, Math.max(0, 6 - picked.length));
    return [...picked, ...extra];
  }, [selectedTerm, terms]);

  // 正文渲染
  const renderContent = (content) => {
    if (!content) return null;
    return content.split('\n\n').map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      if (/^[▲■◉◆●○☐☑⬥]/.test(trimmed)) {
        return (
          <div key={i} className="encyclopedia-bullet-point">
            {trimmed}
          </div>
        );
      }
      if (
        /^(等级排序|等级细分|故宫常见|故宫台基等级|故宫中的|功能|特点|结构组成|名称由来|琉璃构件|故宫宫门|故宫龙纹|故宫凤纹|空间过渡|礼制意义|故宫藻井|故宫影壁|榫卯的|故宫中的石雕|石雕工艺|汉白玉的|故宫中的琉璃|纹样的演变|故宫中的脊兽|琉璃瓦的等级)/.test(
          trimmed
        )
      ) {
        return (
          <div key={i} className="encyclopedia-section-label">
            {trimmed.split('\n')[0]}
          </div>
        );
      }
      return <p key={i}>{trimmed}</p>;
    });
  };

  if (loading) {
    return (
      <div className="encyclopedia-page">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left" /> 返回宫城
          </button>
          <h1 className="profile-title">
            <i className="fas fa-book" /> 营造法式
          </h1>
        </div>
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

  return (
    <div className="encyclopedia-page">
      {/* 顶部栏 */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" /> 返回宫城
        </button>
        <h1 className="profile-title">
          <i className="fas fa-book" /> 营造法式
        </h1>
        <p className="profile-title-sub">中国古代建筑知识百科 · 共 {terms.length} 条术语</p>
      </div>

      <div className="encyclopedia-layout">
        {/* 左侧：分类 + 搜索 + 词条列表 */}
        <aside className="encyclopedia-sidebar">
          <div className="encyclopedia-search">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="搜索术语..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTermId(null);
              }}
            />
            {searchQuery && (
              <button className="encyclopedia-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          <div className="encyclopedia-categories">
            {availableCategories.map((cat) => (
              <button
                key={cat.key}
                className={`encyclopedia-cat-chip ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSelectedTermId(null);
                }}
              >
                <i className={`fas ${cat.icon}`} />
                {cat.label}
              </button>
            ))}
          </div>

          {filteredTerms.length === 0 ? (
            <div className="encyclopedia-empty">
              <i className="fas fa-search" />
              <p>未找到匹配的术语</p>
            </div>
          ) : (
            <AnimatedList
              className="encyclopedia-term-animated"
              scrollClassName="encyclopedia-term-list"
              items={filteredTerms}
              getKey={(term) => term.id}
              selectedKey={selectedTermId}
              staggerKey={activeCategory}
              animation="slide"
              stagger={0.03}
              gap={0}
              showGradients
              fadeSize={44}
              enableArrowNavigation
              onItemSelect={(term) => setSelectedTermId(term.id)}
              itemAs="div"
              itemClassName="encyclopedia-term-item"
              activeClassName="active"
              renderItem={(term) => (
                <>
                  <div className="encyclopedia-term-item-header">
                    <span className="encyclopedia-term-item-name">{term.term}</span>
                    {term.level_value && (
                      <span
                        className="encyclopedia-term-item-level"
                        style={{ background: LEVEL_LABELS[term.level_value]?.color || '#666' }}
                      >
                        {LEVEL_LABELS[term.level_value]?.text || ''}
                      </span>
                    )}
                  </div>
                  <div className="encyclopedia-term-item-synopsis">{term.synopsis}</div>
                </>
              )}
            />
          )}
        </aside>

        {/* 右侧：导引看板 / 词条详情 */}
        <main className="encyclopedia-detail">
          {!selectedTermId ? (
            <EncyclopediaGuide
              onPick={handleGuidePick}
              availableKeys={availableCategories.filter((c) => c.key !== 'all').map((c) => c.key)}
            />
          ) : !selectedTerm ? (
            <div className="enc-article-loading">
              <div className="loading-spinner" />
              <p>{termLoading ? '正在展开词条…' : '该词条暂无内容'}</p>
            </div>
          ) : (
            <article className="enc-article">
              {/* ① 标题信息区 */}
              <header className="enc-head">
                <div className="enc-head-tags">
                  <span className="enc-tag enc-tag--cat">
                    <i className={`fas ${selectedTerm.category_icon || 'fa-book'}`} />
                    {selectedTerm.category}
                  </span>
                  {level && (
                    <span
                      className="enc-tag enc-tag--level"
                      style={{ background: level.color }}
                    >
                      {level.text}
                    </span>
                  )}
                </div>
                <h2 className="enc-head-title">{selectedTerm.term}</h2>
                <div className="enc-head-share">
                  <ShareButton
                    type="term"
                    id={selectedTerm.id}
                    title={selectedTerm.term}
                    showLabel
                  />
                </div>
                <p className="enc-head-synopsis">{selectedTerm.synopsis}</p>
                <AudioGuidePlayer
                  text={selectedTerm.content}
                  title="朗读词条"
                />
              </header>

              {/* ② 实拍图像轮播 */}
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
                        setCarouselIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)
                      }
                      title="上一张"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                      className="encyclopedia-carousel-btn encyclopedia-carousel-btn--next"
                      onClick={() => setCarouselIndex((i) => (i + 1) % galleryImages.length)}
                      title="下一张"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>

                    <div className="encyclopedia-carousel-dots">
                      {galleryImages.map((_, i) => (
                        <button
                          key={i}
                          className={`encyclopedia-carousel-dot${
                            i === carouselIndex ? ' active' : ''
                          }`}
                          onClick={() => setCarouselIndex(i)}
                          aria-label={`第 ${i + 1} 张`}
                        />
                      ))}
                    </div>

                    <div className="encyclopedia-carousel-counter">
                      {carouselIndex + 1} / {galleryImages.length}
                    </div>

                    <button
                      className="encyclopedia-carousel-pause"
                      onClick={() => setIsPaused((p) => !p)}
                      title={isPaused ? '继续播放' : '暂停'}
                    >
                      <i className={`fas fa-${isPaused ? 'play' : 'pause'}`}></i>
                    </button>
                  </div>
                </section>
              )}

              {/* ③ 图解示意区 */}
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

              {/* 正文 */}
              <section className="enc-section enc-section--text">
                <SectionHead icon="fa-scroll" title="知识详解" />
                <div className="encyclopedia-article-content">
                  {renderContent(selectedTerm.content)}
                </div>
              </section>

              {/* ④ 三维联动区 */}
              {modelTarget && (
                <section className="enc-section">
                  <div className="enc-3d-card">
                    <div className="enc-3d-text">
                      <span className="enc-3d-eyebrow">
                        <i className="fas fa-cube" /> 三维联动
                      </span>
                      <h3>在三维场景中查看「{selectedTerm.term}」</h3>
                      <p>
                        将自动定位至「{modelTarget.palace.name}」
                        {modelTarget.hotspot
                          ? `，并在模型上高亮「${modelTarget.hotspot.label}」构件。`
                          : '，在 3D 展厅中继续观察该建筑。'}
                      </p>
                      {modelTarget.others.length > 0 && (
                        <div className="enc-3d-chips">
                          <span>其他关联建筑</span>
                          {modelTarget.others.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                navigate('/gallery', {
                                  state: {
                                    selectPalaceId: p.id,
                                    highlightTermId: modelTarget.hotspot?.termId || null,
                                  },
                                })
                              }
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="enc-3d-btn"
                      onClick={() =>
                        navigate('/gallery', {
                          state: {
                            selectPalaceId: modelTarget.palace.id,
                            highlightTermId: modelTarget.hotspot?.termId || null,
                          },
                        })
                      }
                    >
                      <i className="fas fa-location-crosshairs" />
                      前往 3D 模型查看该构件
                    </button>
                  </div>
                </section>
              )}

              {/* ⑤ 相关术语 */}
              {relatedTerms.length > 0 && (
                <section className="enc-section">
                  <SectionHead icon="fa-link" title="相关术语" hint="点击直接切换词条" />
                  <div className="enc-related-tags">
                    {relatedTerms.map((rt) => (
                      <button
                        key={rt.id}
                        type="button"
                        className="enc-related-tag"
                        onClick={() => setSelectedTermId(rt.id)}
                      >
                        <span className="enc-related-cat">{rt.category}</span>
                        <span className="enc-related-name">{rt.term}</span>
                        <i className="fas fa-arrow-right" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </article>
          )}
        </main>
      </div>

      {/* 图片灯箱 */}
      {lightboxIndex >= 0 && lightboxImages.length > 0 && (
        <div className="encyclopedia-lightbox-overlay" onClick={closeLightbox}>
          <button className="encyclopedia-lightbox-close" onClick={closeLightbox}>
            <i className="fas fa-times"></i>
          </button>
          <img
            className="encyclopedia-lightbox-img"
            src={lightboxImages[lightboxIndex]}
            alt={`图解 ${lightboxIndex + 1}/${lightboxImages.length}`}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="encyclopedia-lightbox-counter">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
