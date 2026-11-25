import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ROUTES } from '../App';
import AuthRoute from '../components/guards/AuthRoute';
import AdminRoute from '../components/guards/AdminRoute';
import RequireCapability from '../components/RequireCapability';
import { createWrapper } from './renderWithProviders';

const PUBLIC_EXPECTED = [
  '/',
  '/gallery',
  '/map',
  '/timeline',
  '/encyclopedia',
  '/exhibition/:id',

  '/quiz',
  '/search',

  '/login',
];

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}|{location.state?.from || ''}
    </div>
  );
}

function loginAs(role) {
  localStorage.setItem(
    'palace_auth',
    JSON.stringify({ token: 'test-token', user: { id: 1, username: 'tester', role } })
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('路由守卫分层', () => {
  it('公开路由清单符合预期', () => {
    const publicPaths = ROUTES.filter((route) => route.guard === 'public').map(
      (route) => route.path
    );
    expect(publicPaths.sort()).toEqual([...PUBLIC_EXPECTED].sort());
  });

  it('未登录访问受保护页跳登录并携带 from', () => {
    render(
      <Routes>
        <Route
          path="/profile"
          element={
            <AuthRoute>
              <div>个人中心</div>
            </AuthRoute>
          }
        />
        <Route path="/login" element={<LocationProbe />} />
      </Routes>,
      { wrapper: createWrapper({ route: '/profile' }) }
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/login|/profile');
  });

  it('已登录的普通用户访问编修台展示权限说明', () => {
    loginAs('user');
    render(
      <Routes>
        <Route
          path="/curator"
          element={
            <AdminRoute>
              <div>编修台内容</div>
            </AdminRoute>
          }
        />
      </Routes>,
      { wrapper: createWrapper({ route: '/curator' }) }
    );

    expect(screen.queryByText('编修台内容')).not.toBeInTheDocument();
  });

  it('能力级引导未登录时弹层且不改变 URL', async () => {
    render(
      <Routes>
        <Route
          path="/gallery"
          element={
            <>
              <RequireCapability capability="collect">收藏</RequireCapability>
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { wrapper: createWrapper({ route: '/gallery' }) }
    );

    fireEvent.click(screen.getByRole('button', { name: '收藏' }));

    expect(await screen.findByText('需要入馆凭证')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery|');
  });
});