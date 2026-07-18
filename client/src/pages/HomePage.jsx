import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PalaceList from '../components/PalaceList';
import ModelViewer from '../components/ModelViewer';
import DetailPanel from '../components/DetailPanel';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { recordHistory } from '../api';
import QuizModal from '../components/QuizModal';

const API_BASE = '/api/palaces';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // 翰林院答题
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPalaceId, setQuizPalaceId] = useState(null);

  // 背景切换
  const [bgMode, setBgMode] = useState('warm');
  const [showHud, setShowHud] = useState(false);
  const idleTimerRef = useRef(null);

  const { user } = useAuth();

  // 从其他页面跳转过来时，自动选中指定建筑
  useEffect(() => {
    const targetId = location.state?.selectPalaceId;
    if (targetId && palaces.length > 0) {
      const target = palaces.find(p => p.id === targetId);
      if (target) {
        handleSelectPalace(target);
        // 清除 state 防止循环
        navigate('.', { replace: true, state: {} });
      }
    }
  }, [location.state?.selectPalaceId, palaces]);

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

  // 切换筛选
  const toggleFilter = (type) => {
    if (type === 'category') {
      setFilterCategory(prev => {
        if (prev === null) return '宫殿';
        if (prev === '宫殿') return '关隘';
        return null;
      });
    } else {
      setFilterDynasty(prev => {
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
    if (selectedPalace?.id) {
      recordHistory(selectedPalace.id, 0).catch(() => {});
    }
  }, [selectedPalace?.id]);

  return (
    <div className="museum-app">
      {/* 顶部栏 */}
      <header className="museum-topbar">
        {/* Logo 品牌区 */}
        <div className="topbar-brand">
          <div className="topbar-seal">
            <span>故<br/>宫</span>
          </div>
          <div className="topbar-logo">
            <h1>故宫可视化</h1>
            <span className="logo-subtitle">中国古代建筑数字博物馆</span>
          </div>
        </div>

        {/* 页面导航 */}
        <nav className="topbar-nav">
          <button className="topbar-nav-btn" onClick={() => navigate('/map')}>
            <i className="fas fa-map" />
            <span>时空地图</span>
          </button>
          <button className="topbar-nav-btn" onClick={() => navigate('/encyclopedia')}>
            <i className="fas fa-book" />
            <span>营造法式</span>
          </button>
          <button className="topbar-nav-btn" onClick={() => navigate('/timeline')}>
            <i className="fas fa-hourglass-half" />
            <span>历史沿革</span>
          </button>
          <button
            className="topbar-nav-btn quiz-entry"
            onClick={() => navigate('/quiz')}
          >
            <i className="fas fa-graduation-cap" />
            <span>翰林院</span>
          </button>
        </nav>

        {/* 搜索区 */}
        <div className="topbar-search-area">
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

        {/* 右侧功能区 */}
        <div className="topbar-actions">
          {/* 胶囊筛选器 */}
          <div className="filter-capsule-group">
            <button
              className={`filter-capsule${filterCategory ? ' active' : ''}`}
              onClick={() => toggleFilter('category')}
            >
              {filterCategory || '全部类别'}
            </button>
            <button
              className={`filter-capsule${filterDynasty ? ' active' : ''}`}
              onClick={() => toggleFilter('dynasty')}
            >
              {filterDynasty || '全部朝代'}
            </button>
          </div>

          {/* 背景切换器 */}
          <div className="bg-switcher" title="切换背景">
            <div
              className={`bg-swatch bg-swatch--warm${bgMode === 'warm' ? ' active' : ''}`}
              onClick={() => setBgMode('warm')}
            />
            <div
              className={`bg-swatch bg-swatch--sky${bgMode === 'sky' ? ' active' : ''}`}
              onClick={() => setBgMode('sky')}
            />
          </div>

          {/* 用户头像 — 已登录状态，跳转到个人中心 */}
          <button
            className="topbar-auth-btn logged-in"
            onClick={() => navigate('/profile')}
            title={`${user?.username || '用户'} · 功德: ${user?.points || 0}`}
          >
            <span className="topbar-auth-avatar">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </span>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="museum-main">
        {loading && <div className="loading-overlay">加载中...</div>}
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <aside className="sidebar">
              <PalaceList
                palaces={palaces}
                selectedId={selectedPalace?.id}
                onSelect={handleSelectPalace}
              />
            </aside>

            <section
              className="viewer-area"
              onMouseMove={handleViewerMouseMove}
              onMouseLeave={handleViewerMouseLeave}
            >
              {selectedPalace ? (
                <ModelViewer
                  palace={selectedPalace}
                  bgMode={bgMode}
                  showHud={showHud}
                  palaces={palaces}
                  onNavigate={handleSelectPalace}
                  onQuizTrigger={() => { setQuizPalaceId(selectedPalace?.id); setShowQuiz(true); }}
                />
              ) : (
                <div className="empty-viewer">
                  <div className="empty-icon">
                    <i className="fas fa-landmark"></i>
                  </div>
                  <p>请选择一座宫殿开始浏览</p>
                </div>
              )}
              {detailLoading && <div className="loading-overlay">加载详情...</div>}
            </section>

            <aside className="detail-panel">
              {selectedPalace ? (
                <DetailPanel
                  palace={selectedPalace}
                  palaces={palaces}
                  onNavigate={handleSelectPalace}
                  loading={detailLoading}
                />
              ) : (
                <div className="empty-detail">
                  <p>选择一座宫殿查看详情</p>
                </div>
              )}
            </aside>
          </>
        )}
      </main>

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
