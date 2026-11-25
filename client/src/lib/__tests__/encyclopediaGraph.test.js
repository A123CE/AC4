import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  GRAPH_CONFIG,
  nodeId,
  parseNodeId,
  buildGraphModel,
  selectWithinBudget,
  graphStats,
  computeLayout,
  neighborIds,
  clampViewBox,
  splitLabel,
} from '../encyclopediaGraph';

let seq = 0;
const uid = (prefix) => `${prefix}${(seq += 1)}`;

function makeTerm(overrides = {}) {
  const id = overrides.id || uid('t');
  return {
    id,
    term: overrides.term || `词条${id}`,
    category: overrides.category || '屋顶',
    entry_type: overrides.entry_type || 'craft',
    primary_palace_id: overrides.primary_palace_id ?? null,
    related_palaces: overrides.related_palaces || [],
    related_terms: overrides.related_terms || [],
    sort_order: overrides.sort_order ?? 0,
    level_value: overrides.level_value ?? null,
    ...overrides,
  };
}

function makeBuilding(overrides = {}) {
  const id = overrides.id || uid('p');
  return {
    id,
    name: overrides.name === null ? null : overrides.name || `建筑${id}`,
    dynasty: overrides.dynasty || '明',
    region: overrides.region || '北京',
    ...overrides,
  };
}

function makeTaxonomy(buildings = []) {
  return {
    buildings,
    dynasties: [...new Set(buildings.map((item) => item.dynasty).filter(Boolean))],
    regions: [...new Set(buildings.map((item) => item.region).filter(Boolean))],
    categories: [],
    entry_types: [],
    totals: {},
  };
}

const refs = (nodes) => nodes.map((node) => node.id);

describe('encyclopediaGraph 纯函数', () => {
  it('G-01 空输入返回空模型', () => {
    const model = buildGraphModel({ terms: [], taxonomy: makeTaxonomy() });
    expect(model.nodes).toEqual([]);
    expect(model.edges).toEqual([]);
    expect(model.stats.totalNodes).toBe(0);
    expect(model.mode).toBe('overview');
  });

  it('G-02 只使用传入池内对象', () => {
    const building = makeBuilding({ id: 'p1' });
    const term = makeTerm({ id: 't1', primary_palace_id: 'p1' });
    const model = buildGraphModel({
      terms: [term],
      taxonomy: makeTaxonomy([building]),
      selectedTermId: 't1',
    });
    for (const node of model.nodes) {
      if (node.type === 'term') expect(node.ref).toBe('t1');
      if (node.type === 'building') expect(node.ref).toBe('p1');
    }
  });

  it('G-03 失效建筑边被丢弃', () => {
    const term = makeTerm({ id: 't1', primary_palace_id: 'ghost', related_palaces: ['ghost'] });
    const model = buildGraphModel({
      terms: [term],
      taxonomy: makeTaxonomy([makeBuilding({ id: 'p1' })]),
      selectedTermId: 't1',
    });
    expect(refs(model.nodes)).not.toContain('building:ghost');
    expect(model.edges.every((edge) => !edge.from.includes('ghost') && !edge.to.includes('ghost'))).toBe(true);
  });

  it('G-04 自环被丢弃', () => {
    const term = makeTerm({ id: 't1', related_terms: ['t1'] });
    const model = buildGraphModel({ terms: [term], taxonomy: makeTaxonomy(), selectedTermId: 't1' });
    expect(model.edges.filter((edge) => edge.from === edge.to)).toEqual([]);
  });

  it('G-05 无向 term 边去重', () => {
    const a = makeTerm({ id: 'a', related_terms: ['b'] });
    const b = makeTerm({ id: 'b', related_terms: ['a'] });
    const model = buildGraphModel({ terms: [a, b], taxonomy: makeTaxonomy(), selectedTermId: 'a' });
    expect(model.edges.filter((edge) => edge.kind === 'term')).toHaveLength(1);
  });

  it('G-06 主关联唯一，其余进入 palace 边', () => {
    const term = makeTerm({ id: 't1', primary_palace_id: 'p1', related_palaces: ['p1', 'p2'] });
    const model = buildGraphModel({
      terms: [term],
      taxonomy: makeTaxonomy([makeBuilding({ id: 'p1' }), makeBuilding({ id: 'p2' })]),
      selectedTermId: 't1',
    });
    expect(model.edges.filter((edge) => edge.kind === 'primary')).toHaveLength(1);
    expect(model.edges.filter((edge) => edge.kind === 'palace')).toHaveLength(1);
  });

  it('G-07 节点预算 ≤120 且记录截断', () => {
    const terms = Array.from({ length: 200 }, (_, index) =>
      makeTerm({ id: `t${index}`, primary_palace_id: `p${index % 20}` })
    );
    const buildings = Array.from({ length: 20 }, (_, index) => makeBuilding({ id: `p${index}` }));
    const model = buildGraphModel({
      terms,
      taxonomy: makeTaxonomy(buildings),
      selectedTermId: 't0',
    });
    expect(model.stats.shownNodes).toBeLessThanOrEqual(GRAPH_CONFIG.NODE_LIMIT);
    expect(model.stats.truncated).toBe(true);
    expect(model.stats.totalNodes).toBeGreaterThan(GRAPH_CONFIG.NODE_LIMIT);
  });

  it('G-08 边预算 ≤300', () => {
    const terms = Array.from({ length: 120 }, (_, index) =>
      makeTerm({
        id: `t${index}`,
        related_terms: Array.from({ length: 10 }, (_, offset) => `t${(index + offset + 1) % 120}`),
      })
    );
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(), selectedTermId: 't0' });
    expect(model.stats.shownEdges).toBeLessThanOrEqual(GRAPH_CONFIG.EDGE_LIMIT);
  });

  it('G-09 所有边两端都在节点集合内', () => {
    const term = makeTerm({ id: 't1', primary_palace_id: 'p1', related_terms: ['t2'] });
    const model = buildGraphModel({
      terms: [term, makeTerm({ id: 't2' })],
      taxonomy: makeTaxonomy([makeBuilding({ id: 'p1' })]),
      selectedTermId: 't1',
    });
    const ids = new Set(refs(model.nodes));
    expect(model.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to))).toBe(true);
  });

  it('G-10 打乱输入顺序结果一致', () => {
    const terms = [
      makeTerm({ id: 'a', related_terms: ['b'] }),
      makeTerm({ id: 'b', related_terms: ['a'] }),
      makeTerm({ id: 'c', primary_palace_id: 'p1' }),
    ];
    const buildings = [makeBuilding({ id: 'p1', name: '建筑一' })];
    const first = buildGraphModel({ terms, taxonomy: makeTaxonomy(buildings), selectedTermId: 'a' });
    const second = buildGraphModel({
      terms: [terms[2], terms[0], terms[1]],
      taxonomy: makeTaxonomy(buildings),
      selectedTermId: 'a',
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('G-11 概览模式含类目与建筑且 ≤60', () => {
    const buildings = [makeBuilding({ id: 'p1' }), makeBuilding({ id: 'p2' })];
    const terms = [
      makeTerm({ id: 't1', category: '名筑档案', primary_palace_id: 'p1' }),
      makeTerm({ id: 't2', category: '屋顶', primary_palace_id: 'p2' }),
    ];
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(buildings) });
    expect(model.mode).toBe('overview');
    expect(model.stats.shownNodes).toBeLessThanOrEqual(GRAPH_CONFIG.OVERVIEW_NODE_LIMIT);
    expect(refs(model.nodes).some((id) => id.startsWith('category:'))).toBe(true);
    expect(refs(model.nodes).some((id) => id.startsWith('building:'))).toBe(true);
  });

  it('G-12 邻域模式中心 depth=0', () => {
    const terms = [makeTerm({ id: 'a', related_terms: ['b'] }), makeTerm({ id: 'b' })];
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(), selectedTermId: 'a' });
    expect(model.mode).toBe('focus');
    expect(model.centerId).toBe('term:a');
    const center = model.nodes.find((node) => node.id === 'term:a');
    expect(center.depth).toBe(0);
  });

  it('G-13 同键排序由 id 兜底', () => {
    const terms = [
      makeTerm({ id: 'b', term: '同' }),
      makeTerm({ id: 'a', term: '同' }),
    ];
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(), selectedTermId: 'a' });
    const ids = model.nodes.filter((node) => node.type === 'term').map((node) => node.id);
    expect(ids).toEqual(['term:a', 'term:b']);
  });

  it('G-14 parseNodeId 解析与非法值', () => {
    expect(nodeId('term', 'caisson')).toBe('term:caisson');
    expect(parseNodeId('term:caisson')).toEqual({ type: 'term', ref: 'caisson' });
    expect(parseNodeId('bad')).toBeNull();
    expect(parseNodeId('unknown:x')).toBeNull();
  });

  it('G-15 无名称建筑不生成节点', () => {
    const term = makeTerm({ id: 't1', primary_palace_id: 'p1' });
    const model = buildGraphModel({
      terms: [term],
      taxonomy: makeTaxonomy([makeBuilding({ id: 'p1', name: null })]),
      selectedTermId: 't1',
    });
    expect(refs(model.nodes)).not.toContain('building:p1');
    expect(JSON.stringify(model)).not.toContain('"p1"');
  });

  it('G-16 neighborIds 只含一跳邻接', () => {
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ];
    expect([...neighborIds(edges, 'a')]).toEqual(['b']);
    expect([...neighborIds(edges, 'b')].sort()).toEqual(['a', 'c']);
  });

  it('G-17 GRAPH_CONFIG 提供预算与断点常量', () => {
    expect(GRAPH_CONFIG.NODE_LIMIT).toBe(120);
    expect(GRAPH_CONFIG.EDGE_LIMIT).toBe(300);
    expect(GRAPH_CONFIG.ZOOM_MIN).toBe(0.5);
    expect(GRAPH_CONFIG.ZOOM_MAX).toBe(2.0);
    expect(GRAPH_CONFIG.BREAKPOINTS.wide).toBe(1440);
  });

  it('G-18 同域代表边 ≤3 条', () => {
    const terms = Array.from({ length: 10 }, (_, index) =>
      makeTerm({ id: `t${index}`, category: '屋顶', sort_order: index })
    );
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(), selectedTermId: 't0' });
    const termPeers = model.edges.filter(
      (edge) =>
        edge.kind === 'peer' &&
        edge.from.startsWith('term:') &&
        edge.to.startsWith('term:')
    );
    expect(termPeers.length).toBeLessThanOrEqual(3);
  });

  it('G-19 布局坐标确定且中心居中', () => {
    const terms = [makeTerm({ id: 'a', related_terms: ['b'] }), makeTerm({ id: 'b' })];
    const model = buildGraphModel({ terms, taxonomy: makeTaxonomy(), selectedTermId: 'a' });
    const first = computeLayout(model.nodes, model.edges);
    const second = computeLayout(model.nodes, model.edges);
    expect(first.map((node) => [node.id, node.x, node.y])).toEqual(
      second.map((node) => [node.id, node.x, node.y])
    );
    const center = first.find((node) => node.id === 'term:a');
    expect(center.x).toBeCloseTo(GRAPH_CONFIG.CANVAS.cx, 5);
    expect(center.y).toBeCloseTo(GRAPH_CONFIG.CANVAS.cy, 5);
  });

  it('G-20 布局按 depth 分环且同环半径差 ≤8%', () => {
    const nodes = [
      { id: 'c', type: 'term', label: '中心', depth: 0, weight: 0 },
      { id: 'a', type: 'term', label: 'A', depth: 1, weight: 0 },
      { id: 'b', type: 'term', label: 'B', depth: 1, weight: 0 },
      { id: 'd', type: 'term', label: 'D', depth: 2, weight: 0 },
      { id: 'e', type: 'term', label: 'E', depth: 2, weight: 0 },
    ];
    const positioned = computeLayout(nodes, []);
    for (const node of positioned) {
      expect(node.ring).toBe(nodes.find((item) => item.id === node.id).depth);
    }
    const ring1 = positioned.filter((node) => node.ring === 1).map((node) => node.radius);
    expect(Math.max(...ring1) - Math.min(...ring1)).toBeLessThanOrEqual(
      GRAPH_CONFIG.RING.R1 * 0.08 + 0.001
    );
  });

  it('G-21 clampViewBox 极端缩放/平移被夹紧', () => {
    const initial = { x: 0, y: 0, w: 1000, h: 760 };
    const content = { x: 100, y: 100, w: 800, h: 560 };
    const zoomed = clampViewBox({ x: -9999, y: 9999, w: 1, h: 1 }, initial, content);
    expect(zoomed.w).toBe(initial.w / GRAPH_CONFIG.ZOOM_MAX);
    expect(zoomed.h).toBeCloseTo(zoomed.w * (initial.h / initial.w), 5);
    const out = clampViewBox({ x: 0, y: 0, w: 99999, h: 99999 }, initial, content);
    expect(out.w).toBe(initial.w / GRAPH_CONFIG.ZOOM_MIN);
    expect(() => clampViewBox({}, initial, content)).not.toThrow();
  });

  it('G-22 模块不依赖 React/DOM', () => {
    const source = fs.readFileSync('src/lib/encyclopediaGraph.js', 'utf8');
    expect(source).not.toMatch(/from ['"]react['"]|require\(['"]react['"]\)/);
    expect(source).not.toMatch(/window\.|document\./);
  });

  it('G-23 splitLabel 最多两行且超长省略', () => {
    expect(splitLabel('应县木塔斗拱与转角铺作技法', 6)).toHaveLength(2);
    expect(splitLabel('应县木塔斗拱与转角铺作技法', 6)[1]).toContain('…');
    expect(splitLabel('斗拱', 6)).toEqual(['斗拱']);
  });

  it('G-24 graphStats 返回统计', () => {
    const model = buildGraphModel({ terms: [], taxonomy: makeTaxonomy() });
    expect(graphStats(model).shownNodes).toBe(0);
    expect(selectWithinBudget({ mode: 'overview', nodes: [], edges: [], centerId: null }).stats.shownNodes).toBe(0);
  });
});