import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../context/AppProviders';

vi.mock('../components/MicroSlats', () => ({
  default: () => <div data-testid="micro-slats" />,
}));

vi.mock('../components/CircularCarousel', () => ({
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

vi.mock('../api', () => ({
  getQuizCategories: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        scope: 'guest',
        data: [
          {
            category: '古建筑',
            question_total: 30,
            answered: null,
            correct: null,
            accuracy: null,
          },
        ],
      },
    })
  ),
  getQuizQuestions: vi.fn(() =>
    Promise.resolve({ data: { success: true, scope: 'guest', data: [] } })
  ),
  getQuizStats: vi.fn(),
  getQuizRecords: vi.fn(),
  getQuizAchievements: vi.fn(),
  getQuizLeaderboard: vi.fn(),
  submitAnswer: vi.fn(),
}));

import QuizPage from '../pages/QuizPage';
import * as api from '../api';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('QuizPage 游客分支', () => {
  it('只请求分类与题目，不请求个人数据', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <QuizPage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getQuizCategories).toHaveBeenCalled();
    });

    expect(api.getQuizStats).not.toHaveBeenCalled();
    expect(api.getQuizRecords).not.toHaveBeenCalled();
    expect(api.getQuizAchievements).not.toHaveBeenCalled();
    expect(api.getQuizLeaderboard).not.toHaveBeenCalled();

    const startButton = await screen.findByRole('button', { name: /开始答题/ });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(api.getQuizQuestions).toHaveBeenCalledWith({ count: 5 });
    });
  });

  it('游客榜单区展示登录引导', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <QuizPage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.getQuizCategories).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /筑识榜/ }));

    expect(await screen.findByText(/登录后可参与筑识榜排行/)).toBeInTheDocument();
    expect(api.getQuizLeaderboard).not.toHaveBeenCalled();
  });
});