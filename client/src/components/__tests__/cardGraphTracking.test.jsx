import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import CardSwap from '../CardSwap';
import Graph3DScene from '../Graph3DScene';
import { track } from '../../lib/analytics';

vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

const items = Array.from({ length: 4 }, (_, index) => ({
  id: `t${index + 1}`,
  title: `词条${index + 1}`,
  category: '屋顶',
  entryType: 'craft',
}));

const nodes = [
  { id: 'c', type: 'term', label: '中心', ring: 0, angle: -90, x: 500, y: 380, labelLines: ['中心'] },
  { id: 'a', type: 'building', label: '建筑A', ring: 1, angle: -90, x: 500, y: 190, labelLines: ['建筑A'] },
];

const edges = [{ from: 'c', to: 'a', kind: 'primary' }];
const defaultView = { azimuth: -18, pitch: -8, scale: 1 };

function cardDrag(stage, dx, dy) {
  const card = stage.querySelector('[data-deck-card][data-index="0"]') ?? stage;
  fireEvent.pointerDown(card, {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    button: 0,
    pointerType: 'mouse',
  });
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(stage, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete globalThis.__acEncyclopediaDeckImpressions;
  vi.stubGlobal('CSS', { supports: () => true });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1440,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete globalThis.__acEncyclopediaDeckImpressions;
});

describe('卡片与 3D 图谱埋点', () => {
  it('card_view 带白名单属性且同一卡跨挂载只上报一次', () => {
    const first = render(<CardSwap items={items} />);
    const views = () => track.mock.calls.filter((call) => call[0] === 'card_view');
    expect(views()).toHaveLength(1);
    expect(views()[0][1]).toMatchObject({
      entity_type: 'term',
      entity_id: 't1',
      stage: 'deck_impression',
      result_count: 4,
    });
    first.unmount();

    render(<CardSwap items={items} />);
    expect(views()).toHaveLength(1);
  });

  it('card_swap 由命令式接口触发并做 500ms 去抖', () => {
    const ref = createRef();
    render(<CardSwap ref={ref} items={items} />);
    vi.clearAllMocks();

    act(() => {
      ref.current.next();
      ref.current.next();
      ref.current.next();
    });

    const swaps = track.mock.calls.filter((call) => call[0] === 'card_swap');
    expect(swaps).toHaveLength(1);
    expect(swaps[0][1]).toMatchObject({ entity_type: 'term', stage: 'api' });
  });

  it('card_drag 一次拖拽只上报一条且不含角度/帧率/设备', () => {
    const { container } = render(<CardSwap items={items} />);
    vi.clearAllMocks();
    const stage = container.querySelector('.enc-deck-stage');

    cardDrag(stage, 180, 4);

    const drags = track.mock.calls.filter((call) => call[0] === 'card_drag');
    expect(drags).toHaveLength(1);
    expect(drags[0][1]).toMatchObject({
      entity_type: 'term',
      stage: expect.stringMatching(/^(commit|revert|drag_end)$/),
    });
    for (const key of ['angle', 'fps', 'device']) {
      expect(drags[0][1]).not.toHaveProperty(key);
    }
  });

  it('graph_rotate 与 graph_reset 使用统一实体与 stage', () => {
    const { container } = render(
      <Graph3DScene nodes={nodes} edges={edges} view={defaultView} autoRotate />
    );
    vi.clearAllMocks();

    fireEvent.click(container.querySelector('.enc-graph3d-control[aria-pressed]'));
    expect(track).toHaveBeenCalledWith(
      'graph_rotate',
      expect.objectContaining({ entity_type: 'graph', entity_id: 'encyclopedia', stage: 'pause' })
    );

    fireEvent.click(container.querySelector('[aria-label="复位视角"]'));
    expect(track).toHaveBeenCalledWith(
      'graph_reset',
      expect.objectContaining({ entity_type: 'graph', entity_id: 'encyclopedia', stage: 'toolbar' })
    );
  });

  it('graph_drag 按主轴判定 stage 且不含角度', () => {
    const { container } = render(<Graph3DScene nodes={nodes} edges={edges} view={defaultView} />);
    vi.clearAllMocks();
    const stage = container.querySelector('.enc-graph3d-stage');

    fireEvent.pointerDown(stage, {
      pointerId: 2,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 300, clientY: 110 });
    fireEvent.pointerUp(stage, { pointerId: 2, clientX: 300, clientY: 110 });

    const drags = track.mock.calls.filter((call) => call[0] === 'graph_drag');
    expect(drags).toHaveLength(1);
    expect(drags[0][1]).toMatchObject({ entity_type: 'graph', stage: 'axis_x' });
    expect(drags[0][1]).not.toHaveProperty('angle');
  });

  it('键盘 0 复位上报 keyboard', () => {
    const { container } = render(<Graph3DScene nodes={nodes} edges={edges} view={defaultView} />);
    vi.clearAllMocks();
    const stage = container.querySelector('.enc-graph3d-stage');

    fireEvent.keyDown(stage, { key: '0' });

    expect(track).toHaveBeenCalledWith(
      'graph_reset',
      expect.objectContaining({ stage: 'keyboard' })
    );
  });
});