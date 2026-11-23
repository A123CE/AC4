import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../context/AppProviders';

/**
 * 测试用 Provider + 路由包装器
 * 顺序与 AppProviders 保持一致；路由单独插入，避免测试内重复 BrowserRouter。
 */
export function createWrapper({ route = '/' } = {}) {
  return function Wrapper({ children }) {
    return (
      <AppProviders>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </AppProviders>
    );
  };
}

export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  return render(ui, { wrapper: createWrapper({ route }), ...options });
}

export default renderWithProviders;