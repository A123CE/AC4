import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useI18n } from '../context/I18nContext';
import TierBadge from './TierBadge';
import LanguageSwitch from './LanguageSwitch';

/**
 * 应用导航 — App Sidebar 风格
 * 左侧固定侧栏: 品牌 / 搜索 / 分组导航 / 用户区
 * 窄屏收起为抽屉, 由左上角按钮唤出
 */
const NAV_LABEL_KEYS = {
  '/': 'nav.home',
  category: 'nav.category',
  '/map': 'nav.map',
  '/timeline': 'nav.timeline',
  '/gallery': 'nav.gallery',
  '/encyclopedia': 'nav.encyclopedia',

  '/quiz': 'nav.quiz',
  '/curator?new=1': 'nav.upload',
  '/curator': 'nav.curator',
};

const NAV_GROUP_KEYS = {
  浏览: 'nav.groups.browse',
  展厅: 'nav.groups.exhibition',
  编修: 'nav.groups.edit',
};

const NAV_GROUPS = [
  {
    label: '浏览',
    items: [
      { key: '/', label: '首页总览', icon: 'fa-house' },
      { key: 'category', label: '古建筑分类', icon: 'fa-layer-group' },
      { key: '/map', label: '地理分布', icon: 'fa-map-location-dot' },
      { key: '/timeline', label: '历史时间轴', icon: 'fa-timeline' },
    ],
  },
  {
    label: '展厅',
    items: [
      { key: '/gallery', label: '3D 模型展厅', icon: 'fa-cube' },
      { key: '/encyclopedia', label: '建筑知识科普', icon: 'fa-book-open' },

      { key: '/quiz', label: '营造问答', icon: 'fa-pen-ruler' },
    ],
  },
  {
    label: '编修',
    requiresAuth: true,
    items: [
      { key: '/curator?new=1', label: '上传模型 · 新建档案', icon: 'fa-arrow-up-from-bracket' },
      { key: '/curator', label: '档案编修台', icon: 'fa-pen-nib' },
    ],
  },
];

export default function OverviewHeader({ onNavAction }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const { taxonomy } = useTaxonomy();
  const { t } = useI18n();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  // 桌面端侧栏折叠(收成图标细栏), 记忆到本地
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ov-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const searchRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    try {
      localStorage.setItem('ov-sidebar-collapsed', collapsed ? '1' : '0');
    } catch {
      /* 忽略隐私模式下的存储异常 */
    }
  }, [collapsed]);

  // ⌘K / Ctrl+K 聚焦检索
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCollapsed(false);
        setOpen(true);
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const close = () => setOpen(false);

  const go = (item) => {
    close();
    if (item.key === 'category') {
      onNavAction?.('category');
      return;
    }
    navigate(item.key);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onNavAction?.('search', keyword.trim());
    close();
  };

  const handleLogout = () => {
    close();
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* 窄屏唤出按钮 */}
      <button
        type="button"
        className={`ov-sidebar-toggle${open ? ' hide' : ''}`}
        aria-label="打开导航"
        onClick={() => setOpen(true)}
      >
        <i className="fas fa-bars" />
      </button>
      <div
        className={`ov-sidebar-backdrop${open ? ' show' : ''}`}
        onClick={close}
      />

      <aside
        className={`ov-sidebar${open ? ' open' : ''}${collapsed ? ' ov-sidebar--collapsed' : ''}`}
      >
        {/* 抽屉关闭 */}
        <button type="button" className="ov-side-close" aria-label="关闭导航" onClick={close}>
          <i className="fas fa-xmark" />
        </button>

        <div className="ov-sidebar-head">
          {/* 品牌 */}
          <div
            className="ov-sidebar-brand"
            onClick={() => go({ key: '/' })}
            role="button"
            tabIndex={0}
            title="首页总览"
            onKeyDown={(e) => e.key === 'Enter' && go({ key: '/' })}
          >
            <div className="ov-sidebar-seal">古<br />建</div>
            <div className="ov-sidebar-title">
              <h1>{t('nav.brand', '古建筑多维信息可视化')}</h1>
              <span>ANCIENT ARCHITECTURE</span>
            </div>
          </div>

          {/* 桌面端折叠开关 */}
          <button
            type="button"
            className="ov-sidebar-collapse"
            aria-label={collapsed ? '展开导航' : '收起导航'}
            aria-expanded={!collapsed}
            title={collapsed ? '展开导航' : '收起导航'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          </button>
        </div>

        {/* 检索 */}
        <form className="ov-sidebar-search" onSubmit={handleSearch}>
          <i className="fas fa-magnifying-glass" />
          <input
            ref={searchRef}
            type="text"
            value={keyword}
            placeholder={t('nav.searchPlaceholder', '检索古建筑…')}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <kbd>⌘K</kbd>
        </form>

        {/* 分组导航 */}
        <nav className="ov-sidebar-nav">
          {NAV_GROUPS.filter((group) => !group.requiresAuth || isLoggedIn).map((group) => (
            <div className="ov-sidebar-group" key={group.label}>
              <p className="ov-sidebar-group-label">
                {t(NAV_GROUP_KEYS[group.label], group.label)}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`ov-side-item${
                    location.pathname + location.search === item.key ? ' active' : ''
                  }`}
                  title={item.label}
                  onClick={() => go(item)}
                >
                  <i className={`fas ${item.icon}`} />
                  <span>{t(NAV_LABEL_KEYS[item.key], item.label)}</span>
                </button>
              ))}
            </div>
          ))}

          {(taxonomy.categories.length > 0 || taxonomy.dynasties.length > 0) && (
            <div className="ov-taxonomy">
              {taxonomy.categories.length > 0 && (
                <>
                  <p className="ov-sidebar-group-label">分类</p>
                  <div className="ov-taxonomy-chips">
                    {taxonomy.categories.slice(0, 6).map((category) => (
                      <button
                        key={category}
                        type="button"
                        className="ov-taxonomy-chip"
                        onClick={() => {
                          close();
                          navigate(`/gallery?category=${encodeURIComponent(category)}`);
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {taxonomy.dynasties.length > 0 && (
                <>
                  <p className="ov-sidebar-group-label">朝代</p>
                  <div className="ov-taxonomy-chips">
                    {taxonomy.dynasties.slice(0, 6).map((dynasty) => (
                      <button
                        key={dynasty}
                        type="button"
                        className="ov-taxonomy-chip"
                        onClick={() => {
                          close();
                          navigate(`/gallery?dynasty=${encodeURIComponent(dynasty)}`);
                        }}
                      >
                        {dynasty}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* 用户 / 登录 */}
        <div className="ov-sidebar-foot">
          <LanguageSwitch />
          <TierBadge />
          {isLoggedIn ? (
            <>
              <div
                className="ov-side-user"
                onClick={() => { close(); navigate('/profile'); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
              >
                <div className="ov-side-avatar">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="ov-side-user-meta">
                  <span className="ov-side-user-name">{user?.username}</span>
                  <span className="ov-side-user-role">
                    {t(isAdmin ? 'nav.admin' : 'nav.explorer', isAdmin ? '管理员' : '营造探索者')}
                  </span>
                </div>
                <button
                  type="button"
                  className="ov-side-logout"
                  title="退出登录"
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                >
                  <i className="fas fa-arrow-right-from-bracket" />
                </button>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="ov-side-admin"
                  title="编修台 — 档案与模型管理"
                  onClick={() => { close(); navigate('/curator'); }}
                >
                  <i className="fas fa-pen-nib" />
                  <span>编修台</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="ov-side-login"
              title="登录 / 注册"
              onClick={() => { close(); navigate('/login'); }}
            >
              <span className="ov-side-login-text">登录 / 注册</span>
              <i className="fas fa-right-to-bracket ov-side-login-icon" />
            </button>
          )}
          <p className="ov-sidebar-copy">以数字技术保存华夏营造之美</p>
        </div>
      </aside>
    </>
  );
}
