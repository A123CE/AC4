import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HighlightText from '../components/HighlightText';

describe('HighlightText', () => {
  it('按区间渲染 mark 且不发生 HTML 注入', () => {
    const text = '斗拱是中国古建筑构件';
    const { container } = render(
      <HighlightText text={text} matched={[[0, 2]]} />
    );

    expect(screen.getByText('斗拱')).toBeInTheDocument();
    expect(container.querySelector('mark')?.textContent).toBe('斗拱');
    expect(container.innerHTML).not.toContain('<script');
  });

  it('无匹配时原样输出', () => {
    render(<HighlightText text="庑殿顶" matched={[]} />);
    expect(screen.getByText('庑殿顶')).toBeInTheDocument();
  });

  it('越界区间被安全截断', () => {
    const { container } = render(
      <HighlightText text="彩画" matched={[[0, 99]]} />
    );
    expect(container.querySelector('mark')?.textContent).toBe('彩画');
  });
});