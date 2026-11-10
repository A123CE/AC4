import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExhibitionViewer from '../components/ExhibitionViewer';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api/palaces';

/**
 * 沉浸式展览页 v2
 * 明亮优雅的博物馆展览风格 — 宣纸底色 + 金色装饰 + 柔和光影
 */
export default function ExhibitionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [palace, setPalace] = useState(null);
  const [allPalaces, setAllPalaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(false);

  // 注入模型路径到全局（供ExhibitionViewer读取）
  useEffect(() => {
    if (palace?.model_path) {
      window.__EXHIBITION_MODEL_PATH = `/models/${palace.model_path}`;
    }
    return () => { window.__EXHIBITION_MODEL_PATH = ''; };
  }, [palace?.model_path]);

  useEffect(() => {
    loadPalace();
  }, [id]);

  const loadPalace = async () => {
    try {
      setLoading(true);
      setError(null);

      const [detailRes, listRes] = await Promise.all([
        axios.get(`${API_BASE}/${id}`),
        axios.get(API_BASE),
      ]);

      if (detailRes.data.success) {
        setPalace(detailRes.data.data);
      } else {
        setError('建筑不存在');
      }
      if (listRes.data.success) {
        setAllPalaces(listRes.data.data);
      }
    } catch (err) {
      console.error('加载展览数据失败:', err);
      setError('无法加载建筑数据');
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = allPalaces.findIndex(p => p.id === id);
  const prevPalace = currentIndex > 0 ? allPalaces[currentIndex - 1] : null;
  const nextPalace = currentIndex < allPalaces.length - 1 ? allPalaces[currentIndex + 1] : null;

  const handleNavigate = useCallback((targetId) => {
    navigate(`/exhibition/${targetId}`, { replace: true });
  }, [navigate]);

  // 键盘快捷键
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setInfoExpanded(false);
      } else if (e.key === 'ArrowLeft' && prevPalace) {
        handleNavigate(prevPalace.id);
      } else if (e.key === 'ArrowRight' && nextPalace) {
        handleNavigate(nextPalace.id);
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoRotate(v => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevPalace, nextPalace, handleNavigate]);

  if (loading) {
    return (
      <div className="exhibition-page" style={styles.page}>
        <div style={styles.centered}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>正在布展...</p>
        </div>
      </div>
    );
  }

  if (error || !palace) {
    return (
      <div className="exhibition-page" style={styles.page}>
        <div style={styles.centered}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.8rem', color: 'var(--ink-muted)', marginBottom: 12 }} />
          <p style={styles.loadingText}>{error || '建筑不存在'}</p>
          <button onClick={() => navigate('/')} style={styles.textButton}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exhibition-page" style={styles.page}>
      {/* 3D 展览查看器 */}
      <div style={styles.viewerArea}>
        <ExhibitionViewer autoRotate={autoRotate} />
      </div>

      {/* 顶部导航 */}
      <div style={styles.topBar}>
        <button onClick={() => navigate('/')} style={styles.navBtn}>
          <i className="fas fa-arrow-left" />
          <span>返回</span>
        </button>

        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <h2 style={styles.title}>{palace.name}</h2>
          <p style={styles.subtitle}>{palace.dynasty} · {palace.category}</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAutoRotate(v => !v)} style={{
            ...styles.iconBtn,
            borderColor: autoRotate ? 'rgba(184,58,42,0.3)' : 'var(--border-warm)',
            color: autoRotate ? 'var(--vermillion)' : 'var(--ink-muted)',
          }} title={autoRotate ? '暂停旋转' : '开启旋转'}>
            <i className={`fas ${autoRotate ? 'fa-pause' : 'fa-play'}`} />
          </button>

          <button onClick={() => navigate('/encyclopedia')} style={styles.iconBtn} title="营造法式">
            <i className="fas fa-book" />
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              ...styles.iconBtn,
              color: 'var(--vermillion)',
              borderColor: 'rgba(184,58,42,0.2)',
            }}
            title="三栏浏览"
          >
            <i className="fas fa-columns" />
          </button>
        </div>
      </div>

      {/* 左右切换箭头 */}
      {prevPalace && (
        <button onClick={() => handleNavigate(prevPalace.id)} title={prevPalace.name}
          style={{ ...styles.arrowBtn, left: 12 }}>
          <i className="fas fa-chevron-left" />
        </button>
      )}
      {nextPalace && (
        <button onClick={() => handleNavigate(nextPalace.id)} title={nextPalace.name}
          style={{ ...styles.arrowBtn, right: 12 }}>
          <i className="fas fa-chevron-right" />
        </button>
      )}

      {/* 底部信息栏 */}
      <div style={styles.bottomBar} onClick={() => setInfoExpanded(v => !v)}>
        <div style={styles.bottomContent}>
          <div>
            <div style={styles.tagRow}>
              <span style={styles.tag}>{palace.built_year}年</span>
              {palace.height && <span style={styles.tag}>{palace.height}</span>}
              {palace.area && <span style={styles.tag}>{palace.area}</span>}
              <span style={{ ...styles.tag, color: 'var(--imperial-yellow)', borderColor: 'rgba(200,150,12,0.3)' }}>{palace.style}</span>
            </div>

            <h3 style={styles.buildingName}>{palace.name}</h3>
            <p style={styles.buildingEng}>{palace.name_en} · {palace.dynasty} · 北京故宫</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={styles.position}>#{currentIndex + 1} / {allPalaces.length}</span>
            <i className={`fas fa-chevron-${infoExpanded ? 'down' : 'up'}`}
              style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', transition: 'transform 0.3s ease' }} />
          </div>
        </div>

        {/* 展开详情 */}
        {infoExpanded && (
          <div style={styles.expandedInfo}>
            <p style={styles.desc}>{palace.description}</p>
            {palace.significance && (
              <p style={styles.significance}>
                <i className="fas fa-feather-alt" style={{ marginRight: 8 }} />
                {palace.significance}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* 内联样式 — 宣纸底色+故宫色系 */
const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#EDE7DA',
    position: 'relative',
  },
  viewerArea: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--ink-muted)',
  },
  spinner: {
    width: 40, height: 40,
    borderRadius: '50%',
    border: '2px solid var(--border-warm)',
    borderTopColor: 'var(--vermillion)',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 16,
  },
  loadingText: {
    margin: 0,
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '0.9rem',
    color: 'var(--ink-muted)',
  },
  textButton: {
    marginTop: 12,
    padding: '8px 20px',
    border: '1px solid var(--border-warm)',
    borderRadius: 20,
    background: 'var(--surface-glass)',
    color: 'var(--ink)',
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '0.85rem',
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '18px 24px',
    pointerEvents: 'none',
  },
  navBtn: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface-glass-heavy)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border-warm)',
    borderRadius: 24,
    padding: '9px 20px',
    color: 'var(--ink)',
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.25s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  title: {
    margin: 0,
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--ink)',
    letterSpacing: '0.02em',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '0.72rem',
    color: 'var(--ink-muted)',
    fontFamily: "'Noto Serif SC', serif",
  },
  iconBtn: {
    pointerEvents: 'auto',
    width: 38, height: 38,
    borderRadius: '50%',
    background: 'var(--surface-glass-heavy)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border-warm)',
    color: 'var(--ink-muted)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    width: 42, height: 42,
    borderRadius: '50%',
    background: 'var(--surface-glass-heavy)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border-warm)',
    color: 'var(--ink-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    cursor: 'pointer',
    background: 'linear-gradient(to top, rgba(237,231,218,0.98) 0%, rgba(237,231,218,0.88) 70%, transparent 100%)',
    padding: '40px 32px 24px',
  },
  bottomContent: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    maxWidth: 800,
    margin: '0 auto',
  },
  tagRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tag: {
    padding: '3px 10px',
    borderRadius: 10,
    background: 'rgba(247, 243, 235, 0.6)',
    border: '1px solid var(--border-warm)',
    fontSize: '0.65rem',
    color: 'var(--ink-light)',
    fontFamily: "'Noto Serif SC', serif",
  },
  buildingName: {
    margin: 0,
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--ink)',
  },
  buildingEng: {
    margin: '3px 0 0',
    fontSize: '0.72rem',
    color: 'var(--ink-muted)',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  position: {
    fontSize: '0.7rem',
    color: 'var(--ink-muted)',
    fontFamily: "'Noto Serif SC', serif",
  },
  expandedInfo: {
    maxWidth: 800,
    margin: '16px auto 0',
    padding: '16px 0',
    borderTop: '1px solid var(--border-warm)',
  },
  desc: {
    margin: 0,
    fontSize: '0.85rem',
    color: 'var(--ink-light)',
    lineHeight: 1.8,
    fontFamily: "'Noto Serif SC', serif",
  },
  significance: {
    margin: '12px 0 0',
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(184,58,42,0.04)',
    borderLeft: '3px solid var(--vermillion)',
    fontSize: '0.78rem',
    color: 'var(--ink-light)',
    fontFamily: "'Noto Serif SC', serif",
    lineHeight: 1.6,
  },
};
