import { useState, useEffect } from 'react';
import axios from 'axios';
import PalaceList from './components/PalaceList';
import ModelViewer from './components/ModelViewer';
import DetailPanel from './components/DetailPanel';
import SearchBar from './components/SearchBar';
import './styles/global.css';

const API_BASE = '/api/palaces';

function App() {
  const [palaces, setPalaces] = useState([]);
  const [selectedPalace, setSelectedPalace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDynasty, setFilterDynasty] = useState('all');
  const [detailLoading, setDetailLoading] = useState(false);

  // 加载宫殿列表
  useEffect(() => {
    loadPalaces();
  }, []);

  const loadPalaces = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterDynasty !== 'all') params.dynasty = filterDynasty;

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

  // 选中宫殿 — 先获取完整详情（含时间线、典故）
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
        // 降级：直接用列表数据
        setSelectedPalace(palace);
      }
    } catch (err) {
      console.warn('获取宫殿详情失败，使用列表数据:', err);
      setSelectedPalace(palace);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="museum-app">
      {/* 顶部栏 */}
      <header className="museum-topbar">
        <div className="topbar-title">
          <h1>故宫可视化</h1>
          <span className="subtitle">中国古代建筑瑰宝</span>
        </div>
        <div className="topbar-controls">
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
          />
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              loadPalaces();
            }}
          >
            <option value="all">全部类别</option>
            <option value="宫殿">宫殿</option>
            <option value="关隘">关隘</option>
          </select>
          <select
            className="filter-select"
            value={filterDynasty}
            onChange={(e) => {
              setFilterDynasty(e.target.value);
              loadPalaces();
            }}
          >
            <option value="all">全部朝代</option>
            <option value="明">明</option>
            <option value="清">清</option>
          </select>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="museum-main">
        {loading && <div className="loading-overlay">加载中...</div>}
        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* 左侧列表 */}
            <aside className="sidebar">
              <PalaceList
                palaces={palaces}
                selectedId={selectedPalace?.id}
                onSelect={handleSelectPalace}
              />
            </aside>

            {/* 中央3D查看器 */}
            <section className="viewer-area">
              {selectedPalace ? (
                <ModelViewer palace={selectedPalace} />
              ) : (
                <div className="empty-viewer">
                  <p>请选择一座宫殿开始浏览</p>
                </div>
              )}
              {detailLoading && <div className="loading-overlay">加载详情...</div>}
            </section>

            {/* 右侧详情面板 */}
            <aside className="detail-panel">
              {selectedPalace ? (
                <DetailPanel palace={selectedPalace} />
              ) : (
                <div className="empty-detail">
                  <p>选择一座宫殿查看详情</p>
                </div>
              )}
            </aside>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
