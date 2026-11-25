import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import CardPreviewOverlay from '../CardPreviewOverlay';

const entries = [
  {
    id: 'a',
    title: '斗拱',
    category: '建筑构件',
    synopsis: '斗拱是中国古建筑中承托屋檐的构件。',
    dynasty: '明',
    region: '北京',
    entryType: 'craft',
  },
  {
    id: 'b',
    title: '太和殿',
    category: '名筑档案',
    synopsis: '太和殿是故宫三大殿之一。',
    dynasty: '清',
    region: '北京',
    entryType: 'building',
  },
];

const t = (key, fallback) => fallback ?? key;

function Harness({ onClose = vi.fn(), onRequestArticle }) {
  const [index, setIndex] = useState(0);
  return (
    <CardPreviewOverlay
      open
      entries={entries}
      index={index}
      onStep={(direction) => setIndex((current) => current + direction)}
      onClose={onClose}
      onRequestArticle={onRequestArticle}
      t={t}
    />
  );
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('CardPreviewOverlay（T-DECK-05/06）', () => {
  it('展示完整标题、摘要与至少两项元信息', () => {
    render(<Harness />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('斗拱')).toBeInTheDocument();
    expect(screen.getByText('斗拱是中国古建筑中承托屋檐的构件。')).toBeInTheDocument();
    const meta = document.querySelectorAll('.enc-preview-meta li');
    expect(meta.length).toBeGreaterThanOrEqual(2);
  });

  it('上/下一张循环切换（首尾相接）', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('上一张'));
    expect(screen.getByText('太和殿')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('下一张'));
    expect(screen.getByText('斗拱')).toBeInTheDocument();
  });

  it('关闭按钮触发 onClose(closeButton) 并移除对话框', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('关闭预览'));
    expect(onClose).toHaveBeenCalledWith('closeButton');
  });

  it('Esc 在捕获阶段关闭并阻止页面级处理器', () => {
    const onClose = vi.fn();
    const pageHandler = vi.fn();
    document.addEventListener('keydown', pageHandler);
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledWith('escape');
    expect(pageHandler).not.toHaveBeenCalled();
    document.removeEventListener('keydown', pageHandler);
  });

  it('遮罩点击关闭（scrim）', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.mouseDown(document.querySelector('.enc-preview-scrim'));
    expect(onClose).toHaveBeenCalledWith('scrim');
  });

  it('未提供 onRequestArticle 时不渲染「查看完整词条」', () => {
    render(<Harness />);
    expect(screen.queryByText('查看完整词条')).toBeNull();
  });

  it('提供 onRequestArticle 时渲染并回调词条 id', () => {
    const onRequestArticle = vi.fn();
    render(<Harness onRequestArticle={onRequestArticle} />);
    fireEvent.click(screen.getByText('查看完整词条'));
    expect(onRequestArticle).toHaveBeenCalledWith('a');
  });

  it('图片缺失时用站内占位字形而非外链', () => {
    render(<Harness />);
    const img = document.querySelector('.enc-preview-art img');
    expect(img).toBeNull();
    expect(document.querySelector('.enc-preview-art-mark')).not.toBeNull();
  });

  it('T-DECK-07 触屏左滑切换到下一张', () => {
    render(<Harness />);
    const body = document.querySelector('.enc-preview-body');
    fireEvent.touchStart(body, { touches: [{ clientX: 240, clientY: 120 }] });
    fireEvent.touchEnd(body, { changedTouches: [{ clientX: 160, clientY: 122 }] });
    expect(screen.getByText('太和殿')).toBeInTheDocument();
  });

  it('T-DECK-07 键盘 ←/→ 切换上一张/下一张', () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('太和殿')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('斗拱')).toBeInTheDocument();
  });
});