import PublicRoute from './PublicRoute';
import AuthRoute from './AuthRoute';
import AdminRoute from './AdminRoute';

/**
 * 路由守卫分发器
 * guard: 'public' | 'auth' | 'admin'
 */
export default function RouteGuard({ guard = 'public', meta = {}, children }) {
  if (guard === 'admin') return <AdminRoute>{children}</AdminRoute>;
  if (guard === 'auth') return <AuthRoute>{children}</AuthRoute>;
  return <PublicRoute meta={meta}>{children}</PublicRoute>;
}