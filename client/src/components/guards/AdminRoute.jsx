import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CuratorGate } from '../../pages/CuratorPage';

/**
 * 管理员路由守卫
 * 未登录跳登录页；已登录但无 admin 角色时展示权限说明页，
 * 而不是静默跳回首页，保证「编修 / 上传」入口始终可解释
 */
export default function AdminRoute({ children }) {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (user?.role !== 'admin') {
    return <CuratorGate />;
  }

  return children;
}