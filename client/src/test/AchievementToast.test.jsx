import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AchievementToast from '../components/AchievementToast';
import { emitAchievements } from '../lib/achievementBus';

beforeEach(() => {
  vi.restoreAllMocks();
});

function renderToast() {
  return render(
    <MemoryRouter>
      <AchievementToast />
    </MemoryRouter>
  );
}

describe('AchievementToast', () => {
  it('展示徽章并合并同一批次的多条成就', async () => {
    renderToast();

    act(() => {
      emitAchievements({
        stamps: [{ palace_id: 'taihedian', chinese_seal_text: '太和殿' }],
        badges: [{ id: 1, name: '童生', description: '答对 10 题', icon: 'fa-award' }],
      });
    });

    expect(await screen.findByText('新成就解锁')).toBeInTheDocument();
    expect(await screen.findByText('童生')).toBeInTheDocument();
    expect(await screen.findByText('太和殿')).toBeInTheDocument();
  });

  it('同一会话同一徽章不重复弹层', async () => {
    renderToast();

    act(() => {
      emitAchievements({
        badges: [{ id: 2, name: '秀才', description: '答对 30 题', icon: 'fa-scroll' }],
      });
    });

    expect(await screen.findByText('秀才')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '知道了' }));

    act(() => {
      emitAchievements({
        badges: [{ id: 2, name: '秀才', description: '答对 30 题', icon: 'fa-scroll' }],
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('新成就解锁')).not.toBeInTheDocument();
    });
  });
});