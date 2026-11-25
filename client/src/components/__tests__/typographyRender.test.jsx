import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import CardSwap from '../CardSwap';

afterEach(() => {
  document.body.innerHTML = '';
});

const SEMANTIC_CLASSES = [
  't-page-title',
  't-section',
  't-section-sm',
  't-title-sm',
  't-body',
  't-aux',
  't-control',
  't-num',
];

describe('排版渲染断言', () => {
  it('语义类名族已在 global.css 中定义且各自声明三项属性', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/global.css'),
      'utf8'
    );
    for (const name of SEMANTIC_CLASSES) {
      const block = css.match(new RegExp(`\\.${name} \\{[\\s\\S]*?\\}`));
      expect(block, name).toBeTruthy();
      expect(block[0]).toMatch(/font-family:\s*var\(--font-/);
      expect(block[0]).toMatch(/font-size:\s*var\(--fs-/);
      expect(block[0]).toMatch(/font-weight:\s*var\(--fw-/);
    }
  });

  it('CardSwap 渲染树不含内联字重与字体族', () => {
    const { container } = render(
      <div style={{ height: 400 }}>
        <CardSwap
          items={[
            { id: 'a', title: '斗拱', synopsis: '承托屋檐的构件' },
            { id: 'b', title: '台基', synopsis: '建筑的基础' },
          ]}
          autoplay={false}
        />
      </div>
    );

    const nodes = container.querySelectorAll('*');
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.style.fontWeight).toBe('');
      expect(node.style.fontFamily).toBe('');
    }
  });
});