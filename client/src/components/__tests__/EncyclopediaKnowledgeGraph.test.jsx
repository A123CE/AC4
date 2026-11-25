import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import fs from 'node:fs';
import EncyclopediaKnowledgeGraph from '../EncyclopediaKnowledgeGraph';
import { track } from '../../lib/analytics';

vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

const t = (key, fallback, vars) => {
  if (!vars) return fallback;
  return String(fallback).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
};

const nodes = [
  { id: 'term:caisson', type: 'term', ref: 'caisson', label: '藻井', depth: 0, weight: 2 },
  { id: 'building:p1', type: 'building', ref: 'p1', label: '太和殿', depth: 1, weight: 1 },
  { id: 'category:屋顶', type: 'category', ref: '屋顶', label: '屋顶', depth: 2, weight: 1 },
];

const edges = [
  { id: 'term:caisson>building:p1#primary', kind: 'primary', from: 'term:caisson', to: 'building:p1', weight: 2 },
  { id: 'term:caisson~category:屋顶#peer', kind: 'peer', from: 'term:caisson', to: 'category:屋顶', weight: 1 },
];

const baseModel = {
  mode: 'focus',
  centerId: 'term:caisson',
  nodes,
  edges,
  stats: { totalNodes: 3, totalEdges: 2, shownNodes: 3, shownEdges: 2, truncated: false },
};

const callbacks = {
  onToggleCollapsed: vi.fn(),
  onSelectTerm: vi.fn(),
  onOpenBuilding: vi.fn(),
  onApplyFilter: vi.fn(),
  onClearFilters: vi.fn(),
};

function renderGraph(overrides = {}) {
  return render(
    <EncyclopediaKnowledgeGraph
      model={overrides.model ?? baseModel}
      mode={overrides.mode ?? 'docked'}
      collapsed={overrides.collapsed ?? false}
      loading={overrides.loading ?? false}
      failed={overrides.failed ?? false}
      selectedId={overrides.selectedId ?? null}
      skipTargetId="enc-article"
      viewport={overrides.viewport ?? 'stacked'}
      viewKind={overrides.viewKind ?? null}
      t={t}
      {...callbacks}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

describe('EncyclopediaKnowledgeGraph', () => {
  it('C-01 空模型展示空态与清除筛选，不渲染节点层', () => {
    const { container } = renderGraph({
      model: {
        ...baseModel,
        nodes: [],
        edges: [],
        stats: { totalNodes: 0, totalEdges: 0, shownNodes: 0, shownEdges: 0, truncated: false },
      },
    });
    expect(screen.getByText('当前筛选下暂无可展示的关联')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清除筛选' })).toBeInTheDocument();
    expect(container.querySelectorAll('.enc-graph-node')).toHaveLength(0);
  });

  it('C-02 failed 展示降级列表，点击触发 onSelectTerm', () => {
    renderGraph({ failed: true });
    expect(screen.getByText('图谱暂不可用，已切换为关联列表')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '藻井' }));
    expect(callbacks.onSelectTerm).toHaveBeenCalledWith('caisson');
  });

  it('C-03 词条节点点击回传去前缀 ref', () => {
    const { container } = renderGraph();
    fireEvent.click(container.querySelector('[data-node-type="term"]'));
    expect(callbacks.onSelectTerm).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelectTerm).toHaveBeenCalledWith('caisson');
  });

  it('C-04 建筑节点点击触发 onOpenBuilding', () => {
    const { container } = renderGraph();
    fireEvent.click(container.querySelector('[data-node-type="building"]'));
    expect(callbacks.onOpenBuilding).toHaveBeenCalledWith('p1');
  });

  it('C-05 类目节点点击触发 onApplyFilter', () => {
    const { container } = renderGraph();
    fireEvent.click(container.querySelector('[data-node-type="category"]'));
    expect(callbacks.onApplyFilter).toHaveBeenCalledWith({ category: '屋顶' });
  });

  it('C-06 键盘 Enter 与点击等价', () => {
    const { container } = renderGraph();
    const node = container.querySelector('[data-node-type="term"]');
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(callbacks.onSelectTerm).toHaveBeenCalledWith('caisson');
  });

  it('C-07 首个可聚焦为跳至正文，节点均可聚焦', () => {
    const { container } = renderGraph();
    const skip = container.querySelector('.enc-graph-skip');
    expect(skip).toBeTruthy();
    expect(skip.getAttribute('href')).toBe('#enc-article');
    const nodesEls = container.querySelectorAll('.enc-graph-node[tabindex="0"]');
    expect(nodesEls).toHaveLength(3);
  });

  it('C-08 节点 aria-label 形如「词条：藻井」', () => {
    const { container } = renderGraph();
    expect(container.querySelector('[data-node-type="term"]')).toHaveAttribute(
      'aria-label',
      '词条：藻井'
    );
  });

  it('C-09 高亮只改 class，不改变坐标', () => {
    const { container } = renderGraph();
    const group = container.querySelector('[data-node-type="term"]');
    const shape = group.querySelector('.enc-graph-node-shape');
    const before = shape.getAttribute('cx');
    fireEvent.focus(group);
    const state = group.querySelector('.enc-graph-node-state');
    expect(state.className.baseVal || state.getAttribute('class')).toContain('is-active');
    expect(shape.getAttribute('cx')).toBe(before);
    expect(container.querySelector('[data-node-type="building"] .enc-graph-node-state')
      .getAttribute('class')).toContain('is-neighbor');
  });

  it('C-10 折叠态渲染折叠条', () => {
    const { container } = renderGraph({ mode: 'collapsed', collapsed: true });
    expect(container.querySelector('.enc-graph-panel--rail')).toBeTruthy();
    expect(screen.getByText('展开图谱')).toBeInTheDocument();
  });

  it('C-11 list 模式不渲染 svg，渲染列表', () => {
    const { container } = renderGraph({ mode: 'list' });
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('ul.enc-graph-list')).toBeTruthy();
  });

  it('C-12 truncated 时显示规模提示', () => {
    renderGraph({
      model: {
        ...baseModel,
        stats: { totalNodes: 10, totalEdges: 20, shownNodes: 3, shownEdges: 2, truncated: true },
      },
    });
    expect(screen.getByText('已展示 3 / 共 10 个节点')).toBeInTheDocument();
  });

  it('C-13 复位视图回到初始 viewBox', () => {
    const { container } = renderGraph();
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 760');
    fireEvent.click(screen.getByRole('button', { name: '放大' }));
    expect(svg.getAttribute('viewBox')).not.toBe('0 0 1000 760');
    fireEvent.click(screen.getByRole('button', { name: '复位视图' }));
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 760');
  });

  it('C-14 reduced-motion 时使用 --reduced 类', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const { container } = renderGraph();
    const panel = container.querySelector('.enc-graph-panel');
    expect(panel.className).toContain('enc-graph-panel--reduced');
    expect(panel.className).not.toContain('enc-graph-panel--animated');
  });

  it('C-15 曝光/点击/折叠/降级分别上报', () => {
    const { container } = renderGraph();
    expect(track).toHaveBeenCalledWith('graph_view', expect.objectContaining({ stage: 'detail' }));
    fireEvent.click(container.querySelector('[data-node-type="term"]'));
    expect(track).toHaveBeenCalledWith(
      'graph_node_click',
      expect.objectContaining({ entity_id: 'caisson', entity_type: 'term' })
    );
    fireEvent.click(screen.getByRole('button', { name: '收起图谱' }));
    expect(track).toHaveBeenCalledWith('graph_expand', expect.anything());
    vi.clearAllMocks();
    renderGraph({ failed: true });
    expect(track).toHaveBeenCalledWith(
      'graph_fallback',
      expect.objectContaining({ reason: 'data_missing' })
    );
  });

  it('C-16 组件未引入第三方图库', () => {
    const source = fs.readFileSync('src/components/EncyclopediaKnowledgeGraph.jsx', 'utf8');
    expect(source).not.toMatch(/d3|cytoscape|echarts|vis-network|sigma/);
    expect(source).not.toMatch(/getContext\(['"]webgl['"]\)/);
  });

  it('D-01 wide/medium 断点渲染完整 3D 场景', () => {
    const wide = renderGraph({ viewport: 'wide' });
    expect(wide.container.querySelector('.enc-graph-panel--3d')).toBeTruthy();
    expect(wide.container.querySelector('.enc-graph3d-stage')).toBeTruthy();
    wide.unmount();

    const medium = renderGraph({ viewport: 'medium' });
    expect(medium.container.querySelector('.enc-graph3d-stage')).toBeTruthy();
  });

  it('D-02 compact 渲染静态 2.5D 容器', () => {
    const { container } = renderGraph({ viewport: 'compact' });
    expect(container.querySelector('.enc-graph-panel--25d')).toBeTruthy();
    expect(container.querySelector('svg.enc-graph-svg')).toBeTruthy();
    expect(container.querySelector('.enc-graph3d-stage')).toBeNull();
  });

  it('D-03 stacked/narrow 保持既有 2D SVG', () => {
    const stacked = renderGraph({ viewport: 'stacked' });
    expect(stacked.container.querySelector('.enc-graph-panel--25d')).toBeNull();
    expect(stacked.container.querySelector('svg.enc-graph-svg')).toBeTruthy();
    stacked.unmount();

    const narrow = renderGraph({ viewport: 'narrow' });
    expect(narrow.container.querySelector('svg.enc-graph-svg')).toBeTruthy();
  });

  it('D-04 minimal 走关联列表', () => {
    const { container } = renderGraph({ viewport: 'minimal' });
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('ul.enc-graph-list')).toBeTruthy();
  });

  it('D-05 显式 viewKind 覆盖断点', () => {
    const { container } = renderGraph({ viewport: 'wide', viewKind: '2d' });
    expect(container.querySelector('.enc-graph3d-stage')).toBeNull();
    expect(container.querySelector('svg.enc-graph-svg')).toBeTruthy();
  });

  it('D-06 VITE_ENC_3D=off 回滚到 2D', () => {
    vi.stubEnv('VITE_ENC_3D', 'off');
    const { container } = renderGraph({ viewport: 'wide' });
    expect(container.querySelector('.enc-graph3d-stage')).toBeNull();
    expect(container.querySelector('svg.enc-graph-svg')).toBeTruthy();
    vi.unstubAllEnvs();
  });

  it('D-07 3D 旋转按钮 aria-pressed 随状态切换', () => {
    const { container } = renderGraph({ viewport: 'wide' });
    const toggle = container.querySelector('.enc-graph3d-control[aria-pressed]');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(toggle);

    const next = container.querySelector('.enc-graph3d-control[aria-pressed]');
    expect(next.getAttribute('aria-pressed')).toBe('false');
  });

  it('D-08 节点集合变化后高亮按新集合重算', () => {
    const firstModel = { ...baseModel, nodes: [nodes[0], nodes[1]], edges: [edges[0]] };
    const { container, rerender } = renderGraph({ model: firstModel });
    fireEvent.focus(container.querySelector('[data-node-type="term"]'));
    expect(
      container.querySelector('[data-node-type="term"] .enc-graph-node-state').getAttribute('class')
    ).toContain('is-active');

    const secondModel = { ...baseModel, nodes: [nodes[1], nodes[2]], edges: [edges[1]] };
    rerender(
      <EncyclopediaKnowledgeGraph
        model={secondModel}
        mode="docked"
        collapsed={false}
        loading={false}
        failed={false}
        selectedId={null}
        skipTargetId="enc-article"
        viewport="stacked"
        viewKind={null}
        t={t}
        {...callbacks}
      />
    );

    expect(container.querySelectorAll('.enc-graph-node')).toHaveLength(2);
    for (const state of container.querySelectorAll('.enc-graph-node-state')) {
      expect(state.getAttribute('class')).not.toContain('is-active');
    }
  });
});