import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ModelViewer from '../components/ModelViewer';
import { findHotspotForTerm } from '../data/buildingHotspots';
import DetailPanel from '../components/DetailPanel';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import { useClassroomView } from '../context/ClassroomViewContext';
import { recordHistory, getAssetManifest } from '../api';
import guestSession from '../lib/guestSession';
import { emitAchievements } from '../lib/achievementBus';
import { track } from '../lib/analytics';
import QuizModal from '../components/QuizModal';
import CollectionButton from '../components/CollectionButton';
import PosterFallback from '../components/PosterFallback';
import HotspotInfoCard from '../components/HotspotInfoCard';
import '../styles/hall.css';

const API_BASE = '/api/palaces';

/* 顶栏导航 — 极简文字导航 */
const NAV_ITEMS = [
  { key: '/gallery', label: '3D 展厅' },
  { key: '/', label: '首页总览' },
  { key: '/map', label: '时空地图' },
  { key: '/encyclopedia', label: '营造法式' },
  { key: '/timeline', label: '历史沿革' },
  { key: '/quiz', label: '翰林院' },
];

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hidden } = useClassroomView();
  const [palaces, setPalaces] = useState([]);
  const [selectedPalace, setSelectedPalace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterDynasty, setFilterDynasty] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [assetManifest, setAssetManifest] = useState(null);
  const [activeInfoHotspot, setActiveInfoHotspot] = useState(null);

  // 翰林院答题
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPalaceId, setQuizPalaceId] = useState(null);

  // 舞台状态
  const [bgMode, setBgMode] = useState('warm');
  const [showHud, setShowHud] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 1100
  );

  // 百科三维联动带来的构件高亮（术语ID → 当前建筑上的热点）
  const [highlightTermId, setHighlightTermId] = useState(null);

  const idleTimerRef = useRef(null);
  const stageRef = useRef(null);
  const axisRef = useRef(null);

  const { user, isLoggedIn } = useAuth();
  const { skin } = useSkin();

  useEffect(() => {
    getAssetManifest()
      .then((res) => {
        if (res.data?.success) setAssetManifest(res.data.data);
      })
      .catch(() => {});
  }, []);

  // 分类 / 朝代导航：URL 参数驱动筛选
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilterCategory(params.get('category') || null);
    setFilterDynasty(params.get('dynasty') || null);
  }, [location.search]);

  // 从其他页面跳转过来时，自动选中指定建筑（可附带需要高亮的构件术语）
  useEffect(() => {
    const targetId = location.state?.selectPalaceId;
    const highlight = location.state?.highlightTermId;
    if (!targetId || palaces.length === 0) return;

    // 百科「三维联动」带来的构件高亮
    if (highlight) setHighlightTermId(highlight);

    const target = palaces.find((p) => p.id === targetId);
    if (target) {
      handleSelectPalace(target);
      // 清除 state 防止循环
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state?.selectPalaceId, location.state?.highlightTermId, palaces]);

  // 加载宫殿列表
  useEffect(() => {
    loadPalaces();
  }, [filterCategory, filterDynasty]);

  const loadPalaces = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterDynasty) params.dynasty = filterDynasty;

      const res = await axios.get(API_BASE, { params });
      if (res.data.success) {
        setPalaces(res.data.data);
        if (res.data.data.length > 0 && !selectedPalace) {
          handleSelectPalace(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('加载宫殿数据失败:', err);
      setError('无法连接后端服务，请确保服务器已启动 (port 3001)');
    } finally {
      setLoading(false);
    }
  };

  // 搜索宫殿
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await axios.get(`${API_BASE}/search`, {
        params: { q: query },
      });
      if (res.data.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.error('搜索失败:', err);
    }
  };

  // 选中宫殿
  const handleSelectPalace = async (palace) => {
    setIsSearching(false);
    setSearchResults([]);
    setSearchQuery('');
    setActiveInfoHotspot(null);

    // 游客 3D 试看额度：图文详情不受限，仅舞台按额度决定是否渲染模型
    if (!isLoggedIn) {
      const gate = guestSession.tryEnter3D(palace.id);
      track(gate.allowed ? 'guest_3d_enter' : 'guest_quota_blocked', {
        entity_type: 'palace',
        entity_id: palace.id,
      });
      setQuotaBlocked(!gate.allowed);
      if (gate.allowed) setPromptDismissed(false);
    } else {
      setQuotaBlocked(false);
    }

    try {
      setDetailLoading(true);
      const res = await axios.get(`${API_BASE}/${palace.id}`);
      if (res.data.success) {
        setSelectedPalace(res.data.data);
      } else {
        setSelectedPalace(palace);
      }
    } catch (err) {
      console.warn('获取宫殿详情失败，使用列表数据:', err);
      setSelectedPalace(palace);
    } finally {
      setDetailLoading(false);
    }
  };

  // 类别筛选循环
  const CATEGORIES = ['宫殿', '关隘', '楼阁', '佛塔', '寺庙', '石窟', '军事工程', '坛庙', '民居'];

  const toggleFilter = (type) => {
    if (type === 'category') {
      setFilterCategory((prev) => {
        if (prev === null) return CATEGORIES[0];
        const idx = CATEGORIES.indexOf(prev);
        if (idx === -1 || idx === CATEGORIES.length - 1) return null;
        return CATEGORIES[idx + 1];
      });
    } else {
      setFilterDynasty((prev) => {
        if (prev === null) return '明';
        if (prev === '明') return '清';
        return null;
      });
    }
  };

  const handleViewerMouseMove = useCallback(() => {
    setShowHud(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setShowHud(false), 3000);
  }, []);

  const handleViewerMouseLeave = useCallback(() => {
    setShowHud(false);
  }, []);

  // 选中宫殿时自动记录游览历史
  useEffect(() => {
    let timer = null;

    if (isLoggedIn && selectedPalace?.id) {
      const palaceId = selectedPalace.id;

      recordHistory(palaceId, 0, { interacted: true })
        .then((res) => emitAchievements(res.data?.data?.achievements))
        .catch(() => {});

      // 停留 10 秒后再次上报，触发兴趣标签加权（个性化推荐）
      timer = window.setTimeout(() => {
        recordHistory(palaceId, 10)
          .then((res) => emitAchievements(res.data?.data?.achievements))
          .catch(() => {});
      }, 10000);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isLoggedIn, selectedPalace?.id]);

  // 当前索引与前后导航
  const currentIndex = selectedPalace
    ? palaces.findIndex((p) => p.id === selectedPalace.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < palaces.length - 1;

  // 术语ID → 当前建筑上的热点（用于 3D 高亮）
  const activeHotspot = useMemo(() => {
    if (!selectedPalace || !highlightTermId) return null;
    return findHotspotForTerm(selectedPalace.id, [highlightTermId]);
  }, [selectedPalace?.id, highlightTermId]);

  const goPrev = () => hasPrev && handleSelectPalace(palaces[currentIndex - 1]);
  const goNext = () => hasNext && handleSelectPalace(palaces[currentIndex + 1]);

  // 建筑轴: 当前节点自动居中
  useEffect(() => {
    const el = axisRef.current?.querySelector('.hall-node.is-active');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedPalace?.id]);

  // 全屏状态同步
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  return (
    <div className="hall-app">
      {/* ===== 极简顶栏 ===== */}
      <header className="hall-topbar">
        <div className="hall-brand" onClick={() => navigate('/')}>
          <div className="hall-seal">华</div>
          <div className="hall-brand-text">
            <strong>华夏古建</strong>
            <span>ANCIENT ARCHITECTURE</span>
          </div>
        </div>

        <nav className="hall-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`hall-nav-btn${location.pathname === item.key ? ' active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hall-topbar-right">
          <div className="hall-search">
            <SearchBar
              value={searchQuery}
              onChange={handleSearch}
              onClear={() => {
                setSearchQuery('');
                setIsSearching(false);
                setSearchResults([]);
              }}
              results={isSearching ? searchResults : []}
              onSelect={handleSelectPalace}
              palaces={palaces}
            />
          </div>
          <button
            className="hall-user"
            onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
            title={
              isLoggedIn
                ? `${user?.username || '用户'} · 功德: ${user?.points || 0}`
                : '登录 / 注册'
            }
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : (isLoggedIn ? 'U' : '登')}
          </button>
        </div>
      </header>

      {/* ===== 主区 ===== */}
      <main id="main" className="hall-main">
        {/* 左侧档案 */}
        <aside className={`hall-archive${archiveOpen ? '' : ' is-collapsed'}`}>
          <div className="hall-archive-inner">
            <div className="hall-archive-head">
              <span className="hall-archive-label">建筑档案</span>
              <button
                className="hall-archive-close"
                onClick={() => setArchiveOpen(false)}
                title="收起档案"
              >
                <i className="fas fa-chevron-left" />
              </button>
            </div>
            {selectedPalace ? (
              <DetailPanel
                palace={selectedPalace}
                palaces={palaces}
                onNavigate={handleSelectPalace}
                loading={detailLoading}
              />
            ) : (
              <div className="hall-empty">
                <i className="fas fa-folder-open" />
                <p>选择一座建筑查看档案</p>
              </div>
            )}
          </div>
        </aside>

        {/* 中央舞台 */}
        <section
          className={`hall-stage${archiveOpen ? '' : ' has-archive-open'}`}
          ref={stageRef}
          onMouseMove={handleViewerMouseMove}
          onMouseLeave={handleViewerMouseLeave}
        >
          {!archiveOpen && (
            <button
              className="hall-archive-open"
              onClick={() => setArchiveOpen(true)}
              title="展开建筑档案"
            >
              <i className="fas fa-scroll" />
              建筑档案
            </button>
          )}

          {/* 百科「三维联动」定位提示 */}
          {activeHotspot && (
            <div className="hall-highlight-banner">
              <i className={`fas ${activeHotspot.icon || 'fa-location-crosshairs'}`} />
              <span>来自营造法式 · 已定位「{activeHotspot.label}」</span>
              <button title="关闭高亮" onClick={() => setHighlightTermId(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          <HotspotInfoCard
            hotspot={activeInfoHotspot}
            palaceId={selectedPalace?.id}
            onClose={() => setActiveInfoHotspot(null)}
            onNavigateToTerm={(spot) => {
              setActiveInfoHotspot(null);
              if (spot?.termId) {
                navigate(`/encyclopedia?term=${encodeURIComponent(spot.termId)}`);
              }
            }}
          />

          {selectedPalace ? (
            quotaBlocked ? (
              <div className="hall-quota-stage">
                {promptDismissed || hidden.registerPrompt ? (
                  <div className="hall-quota-muted">
                    <i className="fas fa-image" />
                    <p>今日 3D 试看额度已用完，图文档案仍可浏览</p>
                  </div>
                ) : (
                  <PosterFallback
                    palace={selectedPalace}
                    reason="quota"
                    onDismiss={() => {
                      setPromptDismissed(true);
                      guestSession.markDismissed('registerPrompt');
                    }}
                    onOpenDetail={() => setArchiveOpen(true)}
                    onLogin={() =>
                      navigate('/login', { state: { from: '/gallery' } })
                    }
                  />
                )}
              </div>
            ) : (
              <ModelViewer
                palace={selectedPalace}
                bgMode={bgMode}
                showHud={showHud}
                palaces={palaces}
                onNavigate={handleSelectPalace}
                onQuizTrigger={() => {
                  if (showQuiz) return;
                  setQuizPalaceId(selectedPalace?.id);
                  setShowQuiz(true);
                }}
                autoRotate={autoRotate}
                onAutoRotateChange={setAutoRotate}
                resetToken={resetToken}
                activeHotspotId={activeHotspot?.id || null}
                activeSkin={skin}
                assetManifest={assetManifest}
                onOpenDetail={() => setArchiveOpen(true)}
                onLogin={() => navigate('/login', { state: { from: '/gallery' } })}
                onHotspotClick={(spot) => setActiveInfoHotspot(spot)}
                minimal
              />
            )
          ) : (
            <div className="hall-empty">
              <i className="fas fa-landmark" />
              <p>{loading ? '正在载入建筑…' : error || '请选择一座建筑开始浏览'}</p>
            </div>
          )}

          {detailLoading && <div className="hall-loading">档案加载中…</div>}
        </section>

        {/* 右侧竖向工具栏 */}
        <aside className="hall-toolbar">
          <button
            className={`hall-tool${autoRotate ? ' is-active' : ''}`}
            title={autoRotate ? '暂停自转' : '开启自转'}
            onClick={() => setAutoRotate((v) => !v)}
          >
            <i className={`fas ${autoRotate ? 'fa-pause' : 'fa-rotate'}`} />
          </button>
          <button
            className="hall-tool"
            title="重置视角"
            onClick={() => setResetToken((t) => t + 1)}
          >
            <i className="fas fa-camera-rotate" />
          </button>

          <span className="hall-tool-sep" />

          <button
            className={`hall-tool${bgMode === 'sky' ? ' is-active' : ''}`}
            title={bgMode === 'warm' ? '切换为天光' : '切换为暖光'}
            onClick={() => setBgMode((m) => (m === 'warm' ? 'sky' : 'warm'))}
          >
            <i className="fas fa-sun" />
          </button>
          <button
            className="hall-tool"
            title={isFullscreen ? '退出全屏' : '全屏观赏'}
            onClick={toggleFullscreen}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
          </button>

          <span className="hall-tool-sep" />

          <button className="hall-tool" title="上一座建筑" disabled={!hasPrev} onClick={goPrev}>
            <i className="fas fa-chevron-up" />
          </button>
          <button className="hall-tool" title="下一座建筑" disabled={!hasNext} onClick={goNext}>
            <i className="fas fa-chevron-down" />
          </button>

          <div className="hall-toolbar-foot">
            <span className="hall-tool-sep" />
            <CollectionButton
              palaceId={selectedPalace?.id}
              variant="icon"
              className="hall-tool"
            />
            <button
              className="hall-tool"
              title="翰林问答"
              onClick={() => {
                setQuizPalaceId(selectedPalace?.id);
                setShowQuiz(true);
              }}
            >
              <i className="fas fa-graduation-cap" />
            </button>
            <button
              className={`hall-tool${archiveOpen ? ' is-active' : ''}`}
              title={archiveOpen ? '收起档案' : '展开档案'}
              onClick={() => setArchiveOpen((v) => !v)}
            >
              <i className="fas fa-scroll" />
            </button>
          </div>
        </aside>
      </main>

      {/* ===== 底部建筑轴 ===== */}
      <footer className="hall-axis">
        <div className="hall-axis-head">
          <span className="hall-axis-title">建筑轴</span>
          <div className="hall-axis-filters">
            <button
              className={`hall-chip${filterCategory ? ' is-active' : ''}`}
              onClick={() => toggleFilter('category')}
              title="按类别筛选"
            >
              {filterCategory || '全部类别'}
            </button>
            <button
              className={`hall-chip${filterDynasty ? ' is-active' : ''}`}
              onClick={() => toggleFilter('dynasty')}
              title="按朝代筛选"
            >
              {filterDynasty ? `${filterDynasty}代` : '全部朝代'}
            </button>
          </div>
          <span className="hall-axis-count">
            {currentIndex >= 0 ? String(currentIndex + 1).padStart(2, '0') : '--'}
            {' / '}
            {String(palaces.length).padStart(2, '0')}
          </span>
        </div>

        <div className="hall-axis-track" ref={axisRef}>
          {palaces.map((p) => (
            <button
              key={p.id}
              className={`hall-node${selectedPalace?.id === p.id ? ' is-active' : ''}`}
              onClick={() => handleSelectPalace(p)}
              title={`${p.name} · ${p.dynasty || '—'}${p.built_year ? ` · ${p.built_year}` : ''}`}
            >
              <span className="hall-node-year">{p.dynasty || '—'}</span>
              <span className="hall-node-dot" />
              <span className="hall-node-name">{p.name}</span>
            </button>
          ))}
        </div>
      </footer>

      {/* 翰林院答题弹窗 */}
      <QuizModal
        open={showQuiz}
        onClose={() => setShowQuiz(false)}
        palaceId={quizPalaceId}
      />
    </div>
  );
}

export default HomePage;
