import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncyclopediaTerms, getEncyclopediaTerm } from '../api';

/**
 * 营造法式百科页面 — 古建筑知识库 (API驱动版)
 * 涵盖屋顶等级、斗拱、彩画、柱础、台基、门窗、琉璃、脊兽、纹饰、建筑规制等
 */

// 图片路径前缀 — 数据库存的是相对路径 images/xxx，需加 / 前缀形成绝对路径
// Vite 开发服务器会将 /images/* 代理到后端 express.static('images')
const IMG_PREFIX = '/';

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

// SVG图解组件 - 斗拱结构
function DougongDiagram() {
  return (
    <svg className="encyclopedia-diagram-svg" viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 柱子 */}
      <rect x="175" y="220" width="50" height="60" rx="3" fill="#8B4513" stroke="#6B3410" strokeWidth="2" />
      <text x="200" y="258" textAnchor="middle" fill="#fff" fontSize="14">柱</text>

      {/* 柱础 */}
      <rect x="165" y="260" width="70" height="15" rx="5" fill="#A0A0A0" stroke="#808080" strokeWidth="1.5" />
      <text x="200" y="272" textAnchor="middle" fill="#333" fontSize="11">柱础</text>

      {/* 斗 (大斗) */}
      <rect x="155" y="195" width="90" height="25" rx="4" fill="#C8960C" stroke="#A07800" strokeWidth="2" />
      <text x="200" y="212" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">斗 (大斗)</text>

      {/* 拱1 - 左右伸出 */}
      <path d="M140 195 L100 170 L100 185 L140 195Z" fill="#D4A574" stroke="#A07800" strokeWidth="1.5" />
      <path d="M260 195 L300 170 L300 185 L260 195Z" fill="#D4A574" stroke="#A07800" strokeWidth="1.5" />
      <text x="115" y="180" textAnchor="middle" fill="#6B3410" fontSize="11">拱</text>
      <text x="285" y="180" textAnchor="middle" fill="#6B3410" fontSize="11">拱</text>

      {/* 升 (小斗) */}
      <rect x="90" y="158" width="30" height="14" rx="3" fill="#C8960C" stroke="#A07800" strokeWidth="1.5" />
      <rect x="280" y="158" width="30" height="14" rx="3" fill="#C8960C" stroke="#A07800" strokeWidth="1.5" />
      <text x="105" y="168" textAnchor="middle" fill="#fff" fontSize="10">升</text>
      <text x="295" y="168" textAnchor="middle" fill="#fff" fontSize="10">升</text>

      {/* 昂 - 斜向构件 */}
      <path d="M200 195 L240 130 L250 130 L210 195Z" fill="#D4A574" stroke="#A07800" strokeWidth="1.5" />
      <text x="252" y="155" fill="#6B3410" fontSize="12">昂</text>

      {/* 上层斗和拱 */}
      <rect x="155" y="130" width="90" height="20" rx="4" fill="#C8960C" stroke="#A07800" strokeWidth="1.5" />
      <text x="200" y="144" textAnchor="middle" fill="#fff" fontSize="12">斗</text>

      <path d="M155 130 L100 100 L100 115 L155 130Z" fill="#D4A574" stroke="#A07800" strokeWidth="1.5" />
      <path d="M245 130 L300 100 L300 115 L245 130Z" fill="#D4A574" stroke="#A07800" strokeWidth="1.5" />

      {/* 屋顶示意 */}
      <path d="M90 100 L200 40 L310 100" fill="none" stroke="#C41E3A" strokeWidth="3" />
      <path d="M85 100 L200 35 L315 100" fill="none" stroke="#C41E3A" strokeWidth="1.5" opacity="0.5" />
      <text x="200" y="30" textAnchor="middle" fill="#C41E3A" fontSize="14">屋顶</text>

      {/* 标注线 */}
      <line x1="70" y1="220" x2="140" y2="220" stroke="#666" strokeWidth="1" strokeDasharray="3,3" />
      <text x="65" y="224" textAnchor="end" fill="#666" fontSize="12">承重传递</text>
      <line x1="320" y1="170" x2="340" y2="170" stroke="#666" strokeWidth="1" strokeDasharray="3,3" />
      <text x="348" y="174" fill="#666" fontSize="12">出挑方向→</text>
    </svg>
  );
}

// SVG图解组件 - 屋顶等级对比
function RoofComparisonDiagram() {
  return (
    <svg className="encyclopedia-diagram-svg" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="200" y="18" textAnchor="middle" fill="#2C2C2C" fontSize="14" fontWeight="bold">屋顶等级对比图</text>

      {/* 重檐庑殿顶 */}
      <rect x="10" y="30" width="180" height="80" rx="6" fill="rgba(196,30,58,0.06)" stroke="#C41E3A" strokeWidth="1.5" />
      <text x="100" y="48" textAnchor="middle" fill="#C41E3A" fontSize="12" fontWeight="bold">重檐庑殿顶 · 第一等</text>
      <path d="M30 95 L100 50 L170 95" fill="none" stroke="#C41E3A" strokeWidth="2.5" />
      <path d="M25 95 L100 45 L175 95" fill="none" stroke="#C41E3A" strokeWidth="1.5" />
      <path d="M15 95 L100 40 L185 95" fill="none" stroke="#C41E3A" strokeWidth="0.8" opacity="0.5" />
      <rect x="60" y="95" width="80" height="12" rx="2" fill="#D4A574" stroke="#A07800" strokeWidth="1" />

      {/* 重檐歇山顶 */}
      <rect x="210" y="30" width="180" height="80" rx="6" fill="rgba(184,134,11,0.06)" stroke="#B8860B" strokeWidth="1.5" />
      <text x="300" y="48" textAnchor="middle" fill="#B8860B" fontSize="12" fontWeight="bold">重檐歇山顶 · 第二等</text>
      <path d="M230 95 L300 50 L370 95" fill="none" stroke="#B8860B" strokeWidth="2.5" />
      <path d="M225 95 L300 45 L375 95" fill="none" stroke="#B8860B" strokeWidth="1.5" />
      <line x1="255" y1="80" x2="255" y2="95" stroke="#B8860B" strokeWidth="1.5" />
      <line x1="345" y1="80" x2="345" y2="95" stroke="#B8860B" strokeWidth="1.5" />

      {/* 单檐庑殿顶 */}
      <rect x="10" y="125" width="180" height="70" rx="6" fill="rgba(139,69,19,0.04)" stroke="#8B4513" strokeWidth="1.5" />
      <text x="100" y="142" textAnchor="middle" fill="#8B4513" fontSize="12" fontWeight="bold">单檐庑殿顶 · 第三等</text>
      <path d="M30 180 L100 135 L170 180" fill="none" stroke="#8B4513" strokeWidth="2" />

      {/* 单檐歇山顶 */}
      <rect x="210" y="125" width="180" height="70" rx="6" fill="rgba(102,102,102,0.04)" stroke="#666" strokeWidth="1.5" />
      <text x="300" y="142" textAnchor="middle" fill="#666" fontSize="12" fontWeight="bold">单檐歇山顶 · 第四等</text>
      <path d="M230 180 L300 135 L370 180" fill="none" stroke="#666" strokeWidth="2" />
      <line x1="255" y1="165" x2="255" y2="180" stroke="#666" strokeWidth="1" />
      <line x1="345" y1="165" x2="345" y2="180" stroke="#666" strokeWidth="1" />

      {/* 悬山顶/硬山顶 */}
      <rect x="60" y="210" width="280" height="60" rx="6" fill="rgba(136,136,136,0.04)" stroke="#999" strokeWidth="1" />
      <text x="200" y="228" textAnchor="middle" fill="#999" fontSize="12" fontWeight="bold">悬山顶 / 硬山顶 · 第五·六等</text>
      <path d="M100 255 L200 215 L300 255" fill="none" stroke="#999" strokeWidth="1.5" />
      <text x="200" y="272" textAnchor="middle" fill="#999" fontSize="11">用于一般官署和民居建筑</text>
    </svg>
  );
}

// 根据术语ID渲染对应的图解
function TermDiagram({ termId, categoryIcon }) {
  if (termId === 'dougong' || termId === 'dougong-levels') {
    return <DougongDiagram />;
  }
  if (termId === 'roof-ranking' || termId === 'wudian-roof' || termId === 'xieshan-roof') {
    return <RoofComparisonDiagram />;
  }
  // 默认占位
  return (
    <div className="encyclopedia-diagram-placeholder">
      <i className={`fas ${categoryIcon || 'fa-image'}`} />
      <span>点击展开查看完整图解</span>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiagram, setShowDiagram] = useState(false);
  // 轮播状态
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef(null);
  const CAROUSEL_INTERVAL = 4000; // 每 4 秒自动切换

  // 图片灯箱状态
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  /**
   * 安全解析 JSON 字段（可能是字符串或已解析的数组）
   */
  const safeJSON = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return defaultVal; }
  };

  // 轮播自动播放
  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    const images = selectedTerm?.image_paths ? safeJSON(selectedTerm.image_paths, []) : [];
    if (showDiagram && !isPaused && images.length > 1) {
      autoplayRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % images.length);
      }, CAROUSEL_INTERVAL);
    }
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [showDiagram, isPaused, selectedTerm?.image_paths]);

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
    try {
      const res = await getEncyclopediaTerm(id);
      setSelectedTerm(res.data.data);
    } catch (err) {
      // 降级：从列表中查找
      const found = terms.find(t => t.id === id);
      if (found) setSelectedTerm(found);
    }
  };

  // 打开灯箱
  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };

  // 关闭灯箱
  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(-1);
  };

  // 键盘导航灯箱
  useEffect(() => {
    if (lightboxIndex < 0) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(i => i - 1);
      else if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) setLightboxIndex(i => i + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, lightboxImages]);

  // 筛选术语
  const filteredTerms = useMemo(() => {
    let result = terms;
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        t.term.toLowerCase().includes(q) ||
        (t.synopsis && t.synopsis.toLowerCase().includes(q))
      );
    }
    return result;
  }, [terms, activeCategory, searchQuery]);

  // 获取分类列表 (从数据中动态提取)
  const availableCategories = useMemo(() => {
    const cats = new Set();
    terms.forEach(t => cats.add(t.category));
    return CATEGORIES.filter(c => c.key === 'all' || cats.has(c.key));
  }, [terms]);

  // 渲染内容块
  const renderContent = (content) => {
    if (!content) return null;
    return content.split('\n\n').map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // 图标开头的行 -> 带图标的bullet point
      if (/^[▲■◉◆●○☐☑⬥]/.test(trimmed)) {
        return (
          <div key={i} className="encyclopedia-bullet-point">
            {trimmed}
          </div>
        );
      }
      // 分类标题行
      if (/^(等级排序|等级细分|故宫常见|故宫台基等级|故宫中的|功能|特点|结构组成|名称由来|琉璃构件|故宫宫门|故宫龙纹|故宫凤纹|故宫中的|空间过渡|礼制意义|故宫藻井|故宫影壁|榫卯的|故宫中的石雕|石雕工艺|汉白玉的|故宫中的琉璃|纹样的演变|故宫中的脊兽|琉璃瓦的等级|故宫中的黄瓦)/.test(trimmed)) {
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
          <h1 className="profile-title"><i className="fas fa-book" /> 营造法式</h1>
        </div>
        <div className="profile-loading">
          <div className="loading-spinner" />
          <p>加载百科典籍中...</p>
        </div>
      </div>
    );
  }

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
          {/* 搜索框 */}
          <div className="encyclopedia-search">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="搜索术语..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedTermId(null); }}
            />
            {searchQuery && (
              <button className="encyclopedia-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {/* 分类筛选 */}
          <div className="encyclopedia-categories">
            {availableCategories.map(cat => (
              <button
                key={cat.key}
                className={`encyclopedia-cat-chip ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.key); setSelectedTermId(null); }}
              >
                <i className={`fas ${cat.icon}`} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* 词条列表 */}
          <div className="encyclopedia-term-list">
            {filteredTerms.length === 0 ? (
              <div className="encyclopedia-empty">
                <i className="fas fa-search" />
                <p>未找到匹配的术语</p>
              </div>
            ) : (
              filteredTerms.map(term => (
                <div
                  key={term.id}
                  className={`encyclopedia-term-item ${selectedTermId === term.id ? 'active' : ''}`}
                  onClick={() => setSelectedTermId(term.id)}
                >
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
                </div>
              ))
            )}
          </div>
        </aside>

        {/* 右侧：详情区域 */}
        <main className="encyclopedia-detail">
          {!selectedTerm ? (
            <div className="encyclopedia-placeholder">
              <div className="encyclopedia-placeholder-icon">
                <i className="fas fa-scroll" />
              </div>
              <h3>营造法式百科</h3>
              <p>左侧选择一个条目，查看详细的古建筑知识</p>
              <div className="encyclopedia-placeholder-hints">
                <div className="placeholder-hint">
                  <i className="fas fa-house" /> 了解屋顶等级制度
                </div>
                <div className="placeholder-hint">
                  <i className="fas fa-cubes" /> 拆解斗拱结构原理
                </div>
                <div className="placeholder-hint">
                  <i className="fas fa-palette" /> 赏析彩画艺术魅力
                </div>
              </div>
            </div>
          ) : (
            <div className="encyclopedia-article">
              {/* 词条头 */}
              <div className="encyclopedia-article-header">
                <h2>{selectedTerm.term}</h2>
                <div className="encyclopedia-article-meta">
                  <span className="encyclopedia-article-category">
                    <i className={`fas ${selectedTerm.category_icon || 'fa-book'}`} />
                    {selectedTerm.category}
                  </span>
                  {selectedTerm.level_value && (
                    <span
                      className="encyclopedia-article-level"
                      style={{ background: LEVEL_LABELS[selectedTerm.level_value]?.color || '#666' }}
                    >
                      {LEVEL_LABELS[selectedTerm.level_value]?.text}
                    </span>
                  )}
                </div>
                <p className="encyclopedia-article-synopsis">{selectedTerm.synopsis}</p>
              </div>

              {/* 图解区 — 轮播展示 */}
              <div className="encyclopedia-article-diagram">
                {(() => {
                  const images = selectedTerm?.image_paths ? safeJSON(selectedTerm.image_paths, []) : [];
                  return images.length > 0 ? (
                    <>
                      {/* 轮播容器 */}
                      <div
                        className="encyclopedia-carousel"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                      >
                        {/* 图片显示区 */}
                        <div className="encyclopedia-carousel-track">
                          <img
                            src={images[carouselIndex]}
                            alt={`${selectedTerm.term} 图 ${carouselIndex + 1}`}
                            className="encyclopedia-carousel-img"
                            onClick={() => openLightbox(images, carouselIndex)}
                          />
                        </div>

                        {/* 左右箭头 */}
                        <button
                          className="encyclopedia-carousel-btn encyclopedia-carousel-btn--prev"
                          onClick={() => setCarouselIndex(i => (i - 1 + images.length) % images.length)}
                          title="上一张"
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <button
                          className="encyclopedia-carousel-btn encyclopedia-carousel-btn--next"
                          onClick={() => setCarouselIndex(i => (i + 1) % images.length)}
                          title="下一张"
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>

                        {/* 指示点 */}
                        <div className="encyclopedia-carousel-dots">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              className={`encyclopedia-carousel-dot${i === carouselIndex ? ' active' : ''}`}
                              onClick={() => setCarouselIndex(i)}
                              aria-label={`第 ${i + 1} 张`}
                            />
                          ))}
                        </div>

                        {/* 计数 */}
                        <div className="encyclopedia-carousel-counter">
                          {carouselIndex + 1} / {images.length}
                        </div>

                        {/* 暂停/播放按钮 */}
                        <button
                          className="encyclopedia-carousel-pause"
                          onClick={() => setIsPaused(p => !p)}
                          title={isPaused ? '继续播放' : '暂停'}
                        >
                          <i className={`fas fa-${isPaused ? 'play' : 'pause'}`}></i>
                        </button>
                      </div>
                    </>
                  ) : showDiagram ? (
                    <TermDiagram
                      termId={selectedTerm.id}
                      categoryIcon={selectedTerm.category_icon}
                    />
                  ) : null;
                })()}
                {/* 无图片时保留展开/收起按钮 */}
                {selectedTerm?.image_paths && safeJSON(selectedTerm.image_paths, []).length === 0 && (
                  <button
                    className="encyclopedia-diagram-toggle"
                    onClick={() => setShowDiagram(!showDiagram)}
                  >
                    <i className={`fas fa-${showDiagram ? 'chevron-up' : 'diagram-project'}`} />
                    {showDiagram ? '收起图解' : '展开图解'}
                  </button>
                )}
                {/* 有图片时保留展开/收起按钮 */}
                {selectedTerm?.image_paths && safeJSON(selectedTerm.image_paths, []).length > 0 && (
                  <button
                    className="encyclopedia-diagram-toggle"
                    onClick={() => { setShowDiagram(d => !d); setCarouselIndex(0); }}
                  >
                    <i className={`fas fa-${showDiagram ? 'chevron-up' : 'diagram-project'}`} />
                    {showDiagram ? '收起图解' : '展开图解'}
                  </button>
                )}
              </div>

              {/* 正文 */}
              <div className="encyclopedia-article-content">
                {renderContent(selectedTerm.content)}
              </div>

              {/* 图片画廊 — 当有图片时展示 */}
              {selectedTerm?.image_paths && safeJSON(selectedTerm.image_paths, []).length > 0 && (() => {
                const images = safeJSON(selectedTerm.image_paths, []);
                return (
                  <div className="encyclopedia-gallery">
                    <h4><i className="fas fa-images" /> 讲解图解</h4>
                    <div className="encyclopedia-gallery-grid">
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className="encyclopedia-gallery-item"
                          onClick={() => openLightbox(images, i)}
                        >
                          <img
                            src={img}
                            alt={`${selectedTerm.term} 图${i + 1}`}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 相关术语 */}
              {selectedTerm._relatedTerms && selectedTerm._relatedTerms.length > 0 && (
                <div className="encyclopedia-related">
                  <h4><i className="fas fa-link" /> 相关术语</h4>
                  <div className="encyclopedia-related-terms">
                    {selectedTerm._relatedTerms.map(rt => (
                      <button
                        key={rt.id}
                        className="encyclopedia-related-term-btn"
                        onClick={() => setSelectedTermId(rt.id)}
                      >
                        <span className="encyclopedia-related-term-cat">{rt.category}</span>
                        <span className="encyclopedia-related-term-name">{rt.term}</span>
                        <i className="fas fa-arrow-right" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 关联建筑 */}
              {(selectedTerm._relatedPalaces && selectedTerm._relatedPalaces.length > 0) && (
                <div className="encyclopedia-related">
                  <h4><i className="fas fa-landmark" /> 关联建筑</h4>
                  <div className="encyclopedia-related-palaces">
                    {selectedTerm._relatedPalaces.map(palace => (
                      <button
                        key={palace.id}
                        className="encyclopedia-palace-card"
                        onClick={() => navigate('/', { state: { selectPalaceId: palace.id } })}
                      >
                        <div className="encyclopedia-palace-card-icon">
                          <i className="fas fa-building-columns" />
                        </div>
                        <div className="encyclopedia-palace-card-info">
                          <span className="encyclopedia-palace-card-name">{palace.name}</span>
                          <span className="encyclopedia-palace-card-dynasty">{palace.dynasty}</span>
                        </div>
                        <i className="fas fa-external-link-alt" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 降级：使用硬编码关联宫殿（当API未返回_relatedPalaces时） */}
              {(!selectedTerm._relatedPalaces || selectedTerm._relatedPalaces.length === 0) &&
                selectedTerm.related_palaces && selectedTerm.related_palaces.length > 0 && (
                <div className="encyclopedia-related">
                  <h4><i className="fas fa-landmark" /> 关联建筑</h4>
                  <div className="encyclopedia-related-btns">
                    {selectedTerm.related_palaces.map(pid => (
                      <button
                        key={pid}
                        className="encyclopedia-related-btn"
                        onClick={() => navigate('/', { state: { selectPalaceId: pid } })}
                      >
                        查看 {PALACE_NAMES[pid] || pid}
                        <i className="fas fa-external-link-alt" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
