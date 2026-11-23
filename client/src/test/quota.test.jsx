import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../context/AppProviders';

const PALACES = [
  { id: 'a', name: 'A殿', dynasty: '明', category: '宫殿' },
  { id: 'b', name: 'B殿', dynasty: '明', category: '宫殿' },
  { id: 'c', name: 'C殿', dynasty: '清', category: '宫殿' },
  { id: 'd', name: 'D殿', dynasty: '清', category: '宫殿' },
];

vi.mock('axios', () => ({
  default: {
    defaults: { headers: { common: {} } },
    get: vi.fn((url) => {
      if (url === '/api/palaces') {
        return Promise.resolve({ data: { success: true, data: PALACES } });
      }
      if (url.startsWith('/api/palaces/')) {
        const id = url.split('/').pop();
        const palace = PALACES.find((item) => item.id === id) || PALACES[0];
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...palace,
              timeline: [],
              funFacts: [],
              views: [],
              stats: [],
            },
          },
        });
      }
      return Promise.resolve({ data: { success: false } });
    }),
  },
}));

vi.mock('../api', () => ({
  recordHistory: vi.fn(() => Promise.resolve({ data: { success: true } })),
  getAssetManifest: vi.fn(() => Promise.resolve({ data: { success: false } })),
}));

vi.mock('../components/ModelViewer', () => ({
  default: () => <div data-testid="model-viewer" />,
}));

vi.mock('../components/DetailPanel', () => ({
  default: ({ palace }) => <div data-testid="detail-panel">{palace?.name}</div>,
}));

vi.mock('../components/SearchBar', () => ({
  default: () => <input aria-label="搜索建筑" />,
}));

vi.mock('../components/QuizModal', () => ({
  default: () => null,
}));

import HomePage from '../pages/HomePage';
import guestSession from '../lib/guestSession';

beforeEach(() => {
  localStorage.clear();
  guestSession._resetForTest();
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
});

describe('游客 3D 试看额度', () => {
  it('第 4 座建筑显示注册引导，图文档案仍可见', async () => {
    const { container } = render(
      <MemoryRouter>
        <AppProviders>
          <HomePage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.hall-node')).toHaveLength(4);
    });

    // 首屏自动选中第 1 座

    await waitFor(() => {
      expect(screen.getByTestId('model-viewer')).toBeInTheDocument();
    });

    const nodes = container.querySelectorAll('.hall-node');

    fireEvent.click(nodes[1]);
    await waitFor(() => expect(screen.getByTestId('model-viewer')).toBeInTheDocument());

    fireEvent.click(nodes[2]);
    await waitFor(() => expect(screen.getByTestId('model-viewer')).toBeInTheDocument());

    fireEvent.click(nodes[3]);
    expect(
      await screen.findByText('今日 3D 试看额度已用完，图文档案仍可浏览')
    ).toBeInTheDocument();
    expect(container.querySelector('.poster-fallback')).not.toBeNull();
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('D殿');
  });

  it('关闭引导后同一会话不再出现引导块', async () => {
    const { container } = render(
      <MemoryRouter>
        <AppProviders>
          <HomePage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.hall-node')).toHaveLength(4);
    });

    const nodes = container.querySelectorAll('.hall-node');
    fireEvent.click(nodes[1]);
    fireEvent.click(nodes[2]);
    fireEvent.click(nodes[3]);

    const dismiss = await screen.findByRole('button', { name: '暂不' });
    fireEvent.click(dismiss);

    expect(await screen.findByText(/3D 试看额度已用完/)).toBeInTheDocument();
    expect(container.querySelector('.poster-fallback')).toBeNull();
  });
});