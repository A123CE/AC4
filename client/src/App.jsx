import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import LoadingScreen from './components/LoadingScreen';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import ProfilePage from './pages/ProfilePage';
import QuizPage from './pages/QuizPage';
import QuizModal from './components/QuizModal';
import './styles/global.css';

/**
 * 受保护路由包装器
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { isLoggedIn } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页（已登录跳转到首页） */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* 首页 — 三栏博物馆布局 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* 时空地图 */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />

        {/* 历史沿革时间轴 */}
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <TimelinePage />
            </ProtectedRoute>
          }
        />

        {/* 营造法式百科 */}
        <Route
          path="/encyclopedia"
          element={
            <ProtectedRoute>
              <EncyclopediaPage />
            </ProtectedRoute>
          }
        />

        {/* 翰林院答题 */}
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />

        {/* 个人中心 */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 回首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
