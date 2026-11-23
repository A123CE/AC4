import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * 公开路由守卫
 * - 内容页公开可读，作为「公共可读」的显式审计标记
 * - 登录页在已登录时回跳到来源页或首页
 */
export default function PublicRoute({ meta = {}, children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (meta.loginPage && isLoggedIn) {
    const from = location.state?.from || '/';
    return <Navigate to={from} replace />;
  }

  return children;
}