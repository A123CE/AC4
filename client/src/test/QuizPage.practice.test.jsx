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
    Promise.resolve({ data: { success: true, data: [] } })
  ),
  getQuizQuestions: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [
          {
            id: 11,
            question: '斗拱的主要作用是什么？',
            options: ['A. 承重与出挑', 'B. 装饰'],
            category: '古建筑',
            difficulty: 1,
          },
        ],
      },
    })
  ),
  getQuizStats: vi.fn(),
  getQuizRecords: vi.fn(),
  getQuizAchievements: vi.fn(),
  getQuizLeaderboard: vi.fn(),
  submitAnswer: vi.fn(),
  practiceAnswer: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          is_correct: true,
          correct_answer: null,
          explanation: '斗拱用于承重与出挑。',
          category: '古建筑',
          mode: 'practice',
        },
      },
    })
  ),
}));

import QuizPage from '../pages/QuizPage';
import * as api from '../api';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('QuizPage 随堂练习模式', () => {
  it('只加载题库分类，不请求统计/记录/榜单/成就', async () => {
    render(
      <MemoryRouter initialEntries={['/quiz?mode=practice&view=classroom']}>
        <AppProviders>
          <QuizPage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.getQuizCategories).toHaveBeenCalled());

    expect(api.getQuizStats).not.toHaveBeenCalled();
    expect(api.getQuizRecords).not.toHaveBeenCalled();
    expect(api.getQuizAchievements).not.toHaveBeenCalled();
    expect(api.getQuizLeaderboard).not.toHaveBeenCalled();

    expect(await screen.findByText(/随堂练习 · 不计分/)).toBeInTheDocument();
  });

  it('提交走 practiceAnswer，不触发正式答题与成就', async () => {
    render(
      <MemoryRouter initialEntries={['/quiz?mode=practice&view=classroom']}>
        <AppProviders>
          <QuizPage />
        </AppProviders>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.getQuizCategories).toHaveBeenCalled());

    const start = await screen.findByRole('button', { name: /开始答题/ });
    fireEvent.click(start);

    await waitFor(() => expect(api.getQuizQuestions).toHaveBeenCalledWith({ count: 10 }));

    const option = await screen.findByRole('button', { name: /承重与出挑/ });
    fireEvent.click(option);

    const submit = await screen.findByRole('button', { name: /确认答案/ });
    fireEvent.click(submit);

    await waitFor(() => expect(api.practiceAnswer).toHaveBeenCalledWith(11, 'A'));
    expect(api.submitAnswer).not.toHaveBeenCalled();
    expect(api.getQuizStats).not.toHaveBeenCalled();
  });
});