import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EncyclopediaGuide from '../EncyclopediaGuide';

const categories = [
  { key: '名筑档案', label: '名筑档案', count: 10 },
  { key: '屋顶', label: '屋顶等级', count: 5 },
  { key: '斗拱', label: '斗拱结构', count: 2 },
  { key: '建筑规制', label: '建筑规制', count: 8 },
];

describe('EncyclopediaGuide 文案 props', () => {
  it('不传 props 时与改造前逐字一致', () => {
    render(<EncyclopediaGuide categories={categories} />);

    expect(screen.getByText('营造导引')).toBeInTheDocument();
    expect(screen.getByText('从建筑或构件进入，查看对应的古建筑知识')).toBeInTheDocument();
    expect(screen.getByText('选择条目')).toBeInTheDocument();
    expect(screen.getByText('读图解')).toBeInTheDocument();
    expect(screen.getByText('进三维')).toBeInTheDocument();
    expect(
      screen.getByText('点击卡片进入对应分类，或从左侧列表直接选择词条')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('英文 props 生效且不再出现中文导引标题', () => {
    const onPick = vi.fn();
    render(
      <EncyclopediaGuide
        categories={categories}
        onPick={onPick}
        heading="How to start"
        hint="Pick a card"
        flow={{ pick: 'Pick', diagram: 'Diagram', model: '3D' }}
        foot="Choose a card"
        cardDesc="Start with {label}"
        cardTitle={{ 屋顶: 'Roof ranking' }}
      />
    );

    expect(screen.getByText('How to start')).toBeInTheDocument();
    expect(screen.queryByText('营造导引')).toBeNull();
    expect(screen.getByText('Pick')).toBeInTheDocument();
    expect(screen.getByText('Roof ranking')).toBeInTheDocument();
    expect(screen.getByText('Start with 屋顶')).toBeInTheDocument();
    expect(screen.getByText('Choose a card')).toBeInTheDocument();

    const cards = screen.getAllByRole('button');
    cards[3].click();
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});