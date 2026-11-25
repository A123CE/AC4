import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import Graph3DScene from '../Graph3DScene';

const nodes = [
  { id: 'c', type: 'term', label: '中心', ring: 0, angle: -90, x: 500, y: 380, labelLines: ['中心'] },
  { id: 'a', type: 'building', label: '建筑A', ring: 1, angle: -90, x: 500, y: 190, labelLines: ['建筑A'] },
  { id: 'b', type: 'term', label: '词条B', ring: 1, angle: 30, x: 664.5, y: 475, labelLines: ['词条B'] },
  { id: 'd', type: 'term', label: '词条D', ring: 1, angle: 150, x: 335.5, y: 475, labelLines: ['词条D'] },
  { id: 'e', type: 'category', label: '类目E', ring: 2, angle: -80, x: 557, y: 55, labelLines: ['类目E'] },
];

const edges = [
  { from: 'c', to: 'a', kind: 'primary' },
  { from: 'a', to: 'b', kind: 'peer' },
  { from: 'c', to: 'e', kind: 'term' },
];

const defaultView = { azimuth: -18, pitch: -8, scale: 1 };

function setup(props = {}) {
  return render(<Graph3DScene nodes={nodes} edges={edges} view={defaultView} {...props} />);
}

function cssVar(container, name) {
  const world = container.querySelector('.enc-graph3d-world');
  return world ? world.style.getPropertyValue(name) : '';
}

function nodeOf(container, id) {
  return container.querySelector(`[data-node-id="${id}"]`);
}

function drag(stage, dx, dy) {
  fireEvent.pointerDown(stage, {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    button: 0,
    pointerType: 'mouse',
  });
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(stage, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Graph3DScene', () => {
  it('① 球面可见节点数：孤立节点不进球面', () => {
    const { container } = setup();
    expect(container.querySelectorAll('.enc-graph3d-node')).toHaveLength(nodes.length - 1);
    expect(nodeOf(container, 'd')).toBeNull();
  });

  it('② 边数等于输入边数', () => {
    const { container } = setup();
    expect(container.querySelectorAll('.enc-graph3d-edge')).toHaveLength(edges.length);
  });

  it('③ 无 canvas / getContext / three', () => {
    const { container } = setup();
    expect(container.querySelector('canvas')).toBeNull();
    const source = fs.readFileSync('src/components/Graph3DScene.jsx', 'utf8');
    expect(source).not.toMatch(/<canvas|getContext\(|from ['"]three['"]/);
  });

  it('④ 旋转一圈节点经历 front/back 切换', () => {
    const seen = new Set();
    for (const azimuth of [-180, -120, -60, 0, 60, 120, 180]) {
      const { container, unmount } = setup({ view: { azimuth, pitch: -8, scale: 1 } });
      for (const node of container.querySelectorAll('.enc-graph3d-node')) {
        seen.add(node.dataset.backfacing);
      }
      unmount();
    }
    expect(seen.has('true')).toBe(true);
    expect(seen.has('false')).toBe(true);
  });

  it('⑤ 背向节点仍保留 aria-label', () => {
    const { container } = setup({ view: { azimuth: 70, pitch: -8, scale: 1 } });
    const items = [...container.querySelectorAll('.enc-graph3d-node')];
    expect(items.length).toBeGreaterThan(0);
    for (const node of items) {
      expect(node.getAttribute('aria-label')).toContain('：');
    }
  });

  it('⑥ 节点是原生 button 且可聚焦', () => {
    const { container } = setup();
    const node = nodeOf(container, 'a');
    expect(node.tagName).toBe('BUTTON');
    act(() => {
      node.focus();
    });
    expect(document.activeElement).toBe(node);
  });

  it('⑦ 拖拽超过 4px 后松手不触发节点激活', () => {
    const onNodeActivate = vi.fn();
    const { container } = setup({ onNodeActivate });
    const stage = container.querySelector('.enc-graph3d-stage');

    drag(stage, 60, 4);
    fireEvent.click(nodeOf(container, 'a'));

    expect(onNodeActivate).not.toHaveBeenCalled();
  });

  it('⑧ 拖拽改变 --g3d-az', () => {
    const { container } = setup();
    const stage = container.querySelector('.enc-graph3d-stage');
    expect(parseFloat(cssVar(container, '--g3d-az'))).toBe(-18);

    drag(stage, 40, 0);

    expect(parseFloat(cssVar(container, '--g3d-az'))).toBeCloseTo(-4, 1);
  });

  it('⑨ 俯仰角被夹紧在 ±30°', () => {
    const { container } = setup();
    const stage = container.querySelector('.enc-graph3d-stage');

    drag(stage, 600, 1000);

    expect(parseFloat(cssVar(container, '--g3d-pitch'))).toBe(-30);
  });

  it('⑩ 放大按钮多次点击后缩放夹紧球面上限 1.8', () => {
    const { container } = setup();
    const zoomIn = container.querySelector('[aria-label="放大图谱"]');

    for (let index = 0; index < 10; index += 1) fireEvent.click(zoomIn);

    expect(parseFloat(cssVar(container, '--g3d-scale'))).toBe(1.8);
  });

  it('⑪ 复位在 520ms 内回到默认视角且不影响选中', () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    const { container } = setup({ selectedId: 'a' });
    fireEvent.click(container.querySelector('[aria-label="放大图谱"]'));
    expect(parseFloat(cssVar(container, '--g3d-scale'))).toBeGreaterThan(1);

    fireEvent.click(container.querySelector('[aria-label="复位视角"]'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(parseFloat(cssVar(container, '--g3d-az'))).toBe(-18);
    expect(parseFloat(cssVar(container, '--g3d-pitch'))).toBe(-8);
    expect(parseFloat(cssVar(container, '--g3d-scale'))).toBe(1);
    expect(nodeOf(container, 'a').getAttribute('aria-current')).toBe('true');
  });

  it('⑫ 邻接高亮只切类名，不改变节点顺序', () => {
    const { container, rerender } = setup();
    const order = () =>
      [...container.querySelectorAll('.enc-graph3d-node')].map((node) => node.dataset.nodeId);
    const before = order();

    rerender(
      <Graph3DScene
        nodes={nodes}
        edges={edges}
        view={defaultView}
        activeId="a"
        neighbors={new Set(['b', 'c'])}
      />
    );

    expect(order()).toEqual(before);
    expect(nodeOf(container, 'a').classList.contains('is-active')).toBe(true);
    expect(nodeOf(container, 'b').classList.contains('is-neighbor')).toBe(true);
    expect(nodeOf(container, 'e').classList.contains('is-dimmed')).toBe(true);
  });

  it('⑬ 自动旋转推进方位角，减效时不启动', () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });

    const first = setup({ autoRotate: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(parseFloat(cssVar(first.container, '--g3d-az'))).toBeGreaterThan(-14);

    cleanup();
    const second = setup({ autoRotate: true, reducedMotion: true });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(parseFloat(cssVar(second.container, '--g3d-az'))).toBe(-18);
  });

  it('⑭ Alt+→ 顺时针移动焦点（普通方向键改为旋转）', () => {
    const { container } = setup();
    const nodeA = nodeOf(container, 'a');
    fireEvent.focus(nodeA);

    fireEvent.keyDown(nodeA, { key: 'ArrowRight', altKey: true });

    expect(document.activeElement.getAttribute('data-node-id')).toBe('b');
  });

  it('⑮ Alt+↑ 跨环到角度最近的节点', () => {
    const { container } = setup();
    const nodeA = nodeOf(container, 'a');
    fireEvent.focus(nodeA);

    fireEvent.keyDown(nodeA, { key: 'ArrowUp', altKey: true });

    expect(document.activeElement.getAttribute('data-node-id')).toBe('c');
  });

  it('⑯ 普通方向键旋转视角而非移动焦点', () => {
    const { container } = setup();
    const nodeA = nodeOf(container, 'a');
    fireEvent.focus(nodeA);
    const before = parseFloat(cssVar(container, '--g3d-az'));

    fireEvent.keyDown(nodeA, { key: 'ArrowRight' });

    expect(parseFloat(cssVar(container, '--g3d-az'))).toBeCloseTo(before + 6, 3);
  });

  it('⑳ 非法矩阵/缺失端点不抛错', () => {
    const badEdges = [{ from: 'missing', to: 'a', kind: 'term' }];
    expect(() =>
      render(<Graph3DScene nodes={nodes} edges={badEdges} view={defaultView} />)
    ).not.toThrow();

    const { container } = render(
      <Graph3DScene nodes={nodes} edges={badEdges} view={defaultView} />
    );
    expect(container.querySelectorAll('.enc-graph3d-edge')).toHaveLength(1);
  });

  it('⑰ 球面节点带 tier，球心锚点位于平移层而非旋转层', () => {
    const { container } = setup();
    const tiers = new Set(
      [...container.querySelectorAll('.enc-graph3d-node')].map((node) => node.dataset.nodeTier)
    );
    expect(tiers.size).toBeGreaterThan(0);
    expect([...tiers].every(Boolean)).toBe(true);
    expect(container.querySelector('.enc-graph3d-chip')).not.toBeNull();

    const core = container.querySelector('.enc-graph3d-core');
    expect(core).not.toBeNull();
    expect(core.closest('.enc-graph3d-pan')).not.toBeNull();
    expect(core.closest('.enc-graph3d-world')).toBeNull();
    expect(core.getAttribute('data-core-mode')).toBe('neutral');
  });

  it('⑱ 平移模式拖动改变 --g3d-px 并被夹紧在舞台内', () => {
    const { container } = setup();
    const panToggle = [...container.querySelectorAll('.enc-graph3d-control')].find((button) =>
      button.textContent.includes('平移')
    );
    expect(panToggle).toBeTruthy();
    fireEvent.click(panToggle);

    const stage = container.querySelector('.enc-graph3d-stage');
    drag(stage, 4000, 4000);

    const panLayer = container.querySelector('.enc-graph3d-pan');
    const px = parseFloat(panLayer.style.getPropertyValue('--g3d-px'));
    const py = parseFloat(panLayer.style.getPropertyValue('--g3d-py'));
    expect(px).toBeGreaterThan(0);
    expect(py).toBeGreaterThan(0);
    expect(px).toBeLessThanOrEqual(600);
    expect(py).toBeLessThanOrEqual(460);
  });

  it('⑲ Enter 选中当前焦点节点，aria-current 始终唯一', () => {
    const { container } = setup();
    const nodeA = nodeOf(container, 'a');
    const nodeB = nodeOf(container, 'b');
    fireEvent.focus(nodeA);
    fireEvent.keyDown(nodeA, { key: 'Enter' });

    let current = container.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0].dataset.nodeId).toBe('a');

    fireEvent.click(nodeB);
    current = container.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0].dataset.nodeId).toBe('b');
  });

  it('㉑ 球面节点文字 billboard：变换串含反向旋转且卡片标注行数', () => {
    const { container } = setup();
    const node = nodeOf(container, 'a');
    expect(node.style.transform).toContain('translate3d(');
    expect(node.style.transform).toContain('rotateY(calc(-1 * var(--g3d-az)))');
    expect(node.style.transform).toContain('rotateX(calc(-1 * var(--g3d-pitch)))');

    const chip = node.querySelector('.enc-graph3d-chip');
    expect(chip).not.toBeNull();
    expect(['1', '2']).toContain(chip.dataset.lines);
    expect(chip.style.inlineSize).toMatch(/px$/);
  });

  it('㉒ 背面节点移出 Tab 焦点序列', () => {
    const { container } = setup({ view: { azimuth: 70, pitch: -8, scale: 1 } });
    const backs = [...container.querySelectorAll('.enc-graph3d-node[data-backfacing="true"]')];
    expect(backs.length).toBeGreaterThan(0);
    for (const node of backs) {
      expect(node.tabIndex).toBe(-1);
    }
  });

  it('㉓ 缩放时写入卡片反向缩放变量，屏幕尺寸保持恒定', () => {
    const { container } = setup();
    const world = container.querySelector('.enc-graph3d-world');
    expect(parseFloat(world.style.getPropertyValue('--g3d-chip-inv-scale'))).toBe(1);

    fireEvent.click(container.querySelector('[aria-label="放大图谱"]'));
    expect(parseFloat(world.style.getPropertyValue('--g3d-chip-inv-scale'))).toBeLessThan(1);
  });

  it('㉔ data-graph-theme 随属性透传到场景根', () => {
    const { container } = setup({ graphTheme: 'light' });
    const section = container.querySelector('.enc-graph3d');
    expect(section.getAttribute('data-graph-theme')).toBe('light');
  });
});