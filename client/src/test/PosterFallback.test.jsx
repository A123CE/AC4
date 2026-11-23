import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PosterFallback from '../components/PosterFallback';

const PALACE = {
  id: 'taihedian',
  name: '太和殿',
  poster_path: 'posters/forbidden-city/taihedian.png',
};

describe('PosterFallback', () => {
  it('展示海报、原因与操作按钮', () => {
    const onRetry = vi.fn();
    const onOpenDetail = vi.fn();
    const onLogin = vi.fn();

    render(
      <PosterFallback
        palace={PALACE}
        reason="load-timeout"
        onRetry={onRetry}
        onOpenDetail={onOpenDetail}
        onLogin={onLogin}
      />
    );

    expect(screen.getByText('太和殿')).toBeInTheDocument();
    expect(screen.getByText(/模型加载超时/)).toBeInTheDocument();
    expect(screen.getByAltText('太和殿')).toHaveAttribute(
      'src',
      '/images/posters/forbidden-city/taihedian.png'
    );

    fireEvent.click(screen.getByRole('button', { name: '尝试 3D' }));
    expect(onRetry).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '查看图文详情' }));
    expect(onOpenDetail).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '注册 / 登录' }));
    expect(onLogin).toHaveBeenCalled();
  });

  it('无海报时显示占位图', () => {
    render(<PosterFallback palace={{ name: '无名建筑' }} reason="no-webgl" />);
    expect(screen.getByText('无名建筑')).toBeInTheDocument();
    expect(screen.getByText(/不支持 3D 渲染/)).toBeInTheDocument();
  });
});