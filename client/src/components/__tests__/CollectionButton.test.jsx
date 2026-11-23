import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { CollectionsProvider } from '../../context/CollectionsContext';
import CollectionButton from '../CollectionButton';
import guestSession from '../../lib/guestSession';

vi.mock('../../api', () => ({
  getCollections: vi.fn(),
  addCollection: vi.fn(),
  removeCollection: vi.fn(),
  updateCollectionNote: vi.fn(),
}));

import * as api from '../../api';

function renderButton() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CollectionsProvider>
          <CollectionButton palaceId="taihedian" showLabel />
        </CollectionsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function login() {
  localStorage.setItem(
    'palace_auth',
    JSON.stringify({ token: 'test-token', user: { id: 1, username: 'tester', role: 'user' } })
  );
}

beforeEach(() => {
  localStorage.clear();
  guestSession._resetForTest();
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  api.getCollections.mockResolvedValue({ data: { success: true, data: [] } });
  api.addCollection.mockResolvedValue({
    data: {
      success: true,
      data: {
        collection: {
          palace_id: 'taihedian',
          collection_category: '教学素材',
          note: '斗拱笔记',
        },
      },
    },
  });
  api.removeCollection.mockResolvedValue({ data: { success: true } });
});

describe('CollectionButton', () => {
  it('游客点击后出现登录引导并可暂存到本机', async () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: '收藏' }));
    expect(await screen.findByText('需要入馆凭证')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '暂存到本机' }));

    await waitFor(() => {
      expect(guestSession.snapshotForMerge().collections).toHaveLength(1);
    });
    expect(screen.getByRole('button', { name: '待合并' })).toBeInTheDocument();
    expect(api.addCollection).not.toHaveBeenCalled();
  });

  it('登录用户可保存分类与笔记', async () => {
    login();
    renderButton();

    await waitFor(() => expect(api.getCollections).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '收藏' }));
    expect(await screen.findByText('收藏到珍宝阁')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '教学素材' }));
    fireEvent.change(screen.getByLabelText('笔记'), {
      target: { value: '斗拱笔记' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存收藏' }));

    await waitFor(() => {
      expect(api.addCollection).toHaveBeenCalledWith('taihedian', '教学素材', '斗拱笔记');
    });
    expect(await screen.findByRole('button', { name: '已收藏' })).toBeInTheDocument();
  });
});