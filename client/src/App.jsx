import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackPageView, installAnalyticsFlush } from './lib/analytics';
import { AppProviders } from './context/AppProviders';
import LoginPage from './components/LoginPage';
import OverviewPage from './pages/OverviewPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import ProfilePage from './pages/ProfilePage';
import ExhibitionPage from './pages/ExhibitionPage';
import EighteenDouPage from './pages/EighteenDouPage';
import QuizPage from './pages/QuizPage';
import CuratorPage from './pages/CuratorPage';
import SearchPage from './pages/SearchPage';
import RoutePage from './pages/RoutePage';
import RouteGuard from './components/guards/RouteGuard';
import GlobalSearchDialog from './components/GlobalSearchDialog';
import SkipLink from './components/SkipLink';
import AchievementToast from './components/AchievementToast';
import './styles/global.css';

/**
 * 路由表 — 表驱动守卫
 * guard: 'public' 公开可读 / 'auth' 需登录 / 'admin' 需管理员
 *
 * 公开读页面不拆数据边界：页面可进入，写操作仍由各页面能力级引导。
 */
const ROUTES = [
  {
    path: '/login',
    element: <LoginPage />,
    guard: 'public',
    meta: { loginPage: true, publicReadonly: true },
  },
  {
    path: '/',
    element: <OverviewPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/gallery',
    element: <HomePage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/map',
    element: <MapPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/timeline',
    element: <TimelinePage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/encyclopedia',
    element: <EncyclopediaPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/quiz',
    element: <QuizPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/search',
    element: <SearchPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/routes',
    element: <RoutePage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/routes/:id',
    element: <RoutePage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/exhibition/:id',
    element: <ExhibitionPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/douba-eighteen',
    element: <EighteenDouPage />,
    guard: 'public',
    meta: { publicReadonly: true },
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    guard: 'auth',
  },
  {
    path: '/curator',
    element: <CuratorPage />,
    guard: 'admin',
  },
  ];


function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    installAnalyticsFlush();
  }, []);

  return null;
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
      <AnalyticsTracker />
      <SkipLink />
      <AchievementToast />
      <GlobalSearchDialog />
      <Routes>
        {ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RouteGuard guard={route.guard} meta={route.meta}>
                {route.element}
              </RouteGuard>
            }
          />
        ))}

        {/* 404 回首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export { ROUTES };
export { AppProviders };
export default App;