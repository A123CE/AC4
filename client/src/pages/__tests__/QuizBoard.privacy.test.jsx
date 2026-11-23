import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../../context/AppProviders';

vi.mock('../../components/MicroSlats', () => ({
  default: () => <div data-testid="micro-slats" />,
}));

vi.mock('../../components/CircularCarousel', () => ({
  default: ({ items = [], onItemClick }) => (
    <div data-testid="carousel">
      {items.map((item) => (
        <div key={item.key} onClick={() => onItemClick?.(item)}>
          {item.content}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../api', () => ({
  getQuizCategories: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [
          {
            category: '古建筑',
            question_total: 30,
            answered: 4,
            correct: 3,
            accuracy: 75,
          },
        ],
      },
    })
  ),
  getQuizQuestions: vi.fn(() =>
    Promise.resolve({ data: { success: true, data: [] } })
  ),
  getQuizStats: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          total_answers: 5,
          correct_answers: 3,
          distinct_correct: 3,
          accuracy: 60,
        },
      },
    })
  ),
  getQuizRecords: vi.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
  getQuizAchievements: vi.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
  getQuizLeaderboard: vi.fn(),
  submitAnswer: vi.fn(),
}));

import QuizPage from '../QuizPage';
import * as api from '../../api';

const AUTH_KEY = 'palace_auth';

function mockAuth() {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ token: 'test-token', user: { id: 7, username: '张三' } })
  );
}

async function renderBoard(leaderboardData) {
  api.getQuizLeaderboard.mockResolvedValue({
    data: { success: true, data: leaderboardData },
  });

  const view = render(
    <MemoryRouter>
      <AppProviders>
        <QuizPage />
      </AppProviders>
    </MemoryRouter>
  );

  await waitFor(() => expect(api.getQuizLeaderboard).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /筑识榜/ }));

  return view;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('QuizPage 筑识榜隐私与空态', () => {
  it('未成年模式不展示精确名次、真实昵称与头像图片', async () => {
    mockAuth();
    const { container } = await renderBoard({
      list: [
        {
          rank_no: null,
          display_name: '营造学徒',
          correct_answers: 3,
          badge_count: 1,
          privacy_mode: 'minor',
          username: '张三',
          avatar_url: '/avatar/zhangsan.png',
        },
      ],
      me: {
        rank_no: null,
        display_name: '营造学徒',
        correct_answers: 3,
        badge_count: 1,
        privacy_mode: 'minor',
        in_public_board: false,
      },
      privacy_mode: 'minor',
      empty_reason: null,
    });

    expect(container.textContent).not.toMatch(/#\d/);
    expect(container.textContent).not.toMatch(/#null/);
    expect(container.textContent).not.toContain('张三');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText(/名次已隐藏/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/营造学徒/).length).toBeGreaterThan(0);
  });

  it('退出公开榜展示未参与文案且不渲染名次', async () => {
    mockAuth();
    const { container } = await renderBoard({
      list: [
        {
          rank_no: null,
          display_name: '营造学徒',
          correct_answers: 2,
          badge_count: 0,
          privacy_mode: 'opted_out',
        },
      ],
      me: {
        rank_no: null,
        display_name: '营造学徒',
        correct_answers: 2,
        badge_count: 0,
        privacy_mode: 'opted_out',
        in_public_board: false,
      },
      privacy_mode: 'opted_out',
      empty_reason: null,
    });

    expect(container.textContent).not.toMatch(/#\d/);
    expect(container.textContent).not.toMatch(/#null/);
    expect(screen.getAllByText(/未参与公开榜/).length).toBeGreaterThan(0);
  });

  it('公开榜渲染脱敏昵称与名次，且不依赖 username 字段', async () => {
    mockAuth();
    const { container } = await renderBoard({
      list: [
        {
          rank_no: 1,
          display_name: '张*三',
          correct_answers: 5,
          badge_count: 2,
          privacy_mode: 'normal',
          username: '张三',
        },
      ],
      me: {
        rank_no: 1,
        display_name: '张*三',
        correct_answers: 5,
        badge_count: 2,
        privacy_mode: 'normal',
        in_public_board: true,
      },
      privacy_mode: 'normal',
      empty_reason: null,
    });

    expect(screen.getAllByText('张*三').length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('张三');
    expect(screen.getAllByText('#1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('我').length).toBeGreaterThan(0);
  });

  it('空数据展示暂无成绩与去答题入口', async () => {
    mockAuth();
    await renderBoard({
      list: [],
      me: null,
      privacy_mode: 'normal',
      empty_reason: 'no_data',
    });

    expect(await screen.findByText('暂无成绩')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /去答题/ })).toBeInTheDocument();
    expect(screen.queryByText(/#0/)).toBeNull();
  });

  it('查询失败时复用空态，不显示报错原文', async () => {
    mockAuth();
    const { container } = await renderBoard({
      list: [],
      me: null,
      privacy_mode: 'normal',
      empty_reason: 'query_failed',
    });

    expect(await screen.findByText('暂无成绩')).toBeInTheDocument();
    expect(container.textContent).not.toContain('query_failed');
    expect(container.textContent).not.toMatch(/#0/);
  });
});