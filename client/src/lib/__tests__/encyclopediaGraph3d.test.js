import { describe, it, expect } from 'vitest';
import {
  GRAPH_CONFIG,
  GRAPH_3D_CONFIG,
  ringDepth,
  clampView,
  facingAngleDeg,
  isBackFacing,
  segmentTransform,
  projectToScreen,
  ringNavigationTarget,
  computeLayout,
  buildGraphModel,
  neighborIds,
} from '../encyclopediaGraph';

function makeTerm(overrides = {}) {
  return {
    id: overrides.id,
    term: overrides.term || `词条${overrides.id}`,
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

const layout = [
  { id: 'c', ring: 0, angle: -90 },
  { id: 'a', ring: 1, angle: -90 },
  { id: 'b', ring: 1, angle: 30 },
  { id: 'd', ring: 1, angle: 150 },
  { id: 'e', ring: 2, angle: -80 },
  { id: 'f', ring: 2, angle: 40 },
];

describe('encyclopediaGraph 3D 纯函数', () => {
  it('G3D-01 ringDepth 同环同值且三环不同', () => {
    expect(ringDepth(0)).toBe(24);
    expect(ringDepth(1)).toBe(0);
    expect(ringDepth(2)).toBe(-140);
    expect(ringDepth(1)).toBe(ringDepth(1));
    expect(ringDepth(0)).not.toBe(ringDepth(1));
    expect(ringDepth(1)).not.toBe(ringDepth(2));
  });

  it('G3D-02 clampView 俯仰夹紧 ±30', () => {
    expect(clampView({ pitch: 45 }).pitch).toBe(GRAPH_3D_CONFIG.PITCH_MAX);
    expect(clampView({ pitch: -45 }).pitch).toBe(GRAPH_3D_CONFIG.PITCH_MIN);
    expect(clampView({ pitch: 12 }).pitch).toBe(12);
  });

  it('G3D-03 clampView 方位归一到 [-180,180)', () => {
    expect(clampView({ azimuth: -190 }).azimuth).toBe(170);
    expect(clampView({ azimuth: 540 }).azimuth).toBe(-180);
    expect(clampView({ azimuth: 190 }).azimuth).toBe(-170);
    expect(clampView({ azimuth: 18 }).azimuth).toBe(18);
  });

  it('G3D-04 clampView 缩放夹紧并回落默认值', () => {
    expect(clampView({ scale: 9 }).scale).toBe(GRAPH_CONFIG.ZOOM_MAX);
    expect(clampView({ scale: 0.1 }).scale).toBe(GRAPH_CONFIG.ZOOM_MIN);
    expect(clampView({})).toEqual({
      azimuth: GRAPH_3D_CONFIG.DEFAULT_AZIMUTH,
      pitch: GRAPH_3D_CONFIG.DEFAULT_PITCH,
      scale: 1,
    });
    expect(clampView({ azimuth: 'abc', pitch: Number.NaN, scale: null }).azimuth).toBe(
      GRAPH_3D_CONFIG.DEFAULT_AZIMUTH
    );
  });

  it('G3D-05 segmentTransform 同输入同输出', () => {
    const p1 = { x: 10, y: 20, z: 30 };
    const p2 = { x: 40, y: 60, z: 90 };
    const first = segmentTransform(p1, p2);
    const second = segmentTransform(p1, p2);
    expect(first).toEqual(second);
    expect(first.transform).toMatch(/^matrix3d\(/);
  });

  it('G3D-06 segmentTransform 长度等于端点距离', () => {
    const result = segmentTransform({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 });
    expect(result.length).toBe(13);
  });

  it('G3D-07 segmentTransform 重合点长度为 0 且不抛错', () => {
    const result = segmentTransform({ x: 3, y: 4, z: 5 }, { x: 3, y: 4, z: 5 });
    expect(result.length).toBe(0);
    expect(result.transform).toBe('translate3d(3px, 4px, 5px)');
  });

  it('G3D-08 segmentTransform 反向 -X 使用 (0,1,0) 轴转 180°', () => {
    const result = segmentTransform({ x: 0, y: 0, z: 0 }, { x: -10, y: 0, z: 0 });
    expect(result.length).toBe(10);
    expect(result.transform).toBe('matrix3d(-10, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, -5, 0, 0, 1)');
  });

  it('G3D-09 segmentTransform 平行 +X 不旋转', () => {
    const result = segmentTransform({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
    expect(result.transform).toBe('matrix3d(10, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1)');
  });

  it('G3D-10 facingAngleDeg 覆盖四个象限与回绕', () => {
    expect(facingAngleDeg({ angle: 45 }, { azimuth: 45 })).toBe(0);
    expect(facingAngleDeg({ angle: -90 }, { azimuth: 0 })).toBe(90);
    expect(facingAngleDeg({ angle: 90 }, { azimuth: 0 })).toBe(-90);
    expect(facingAngleDeg({ angle: 180 }, { azimuth: 0 })).toBe(-180);
    expect(facingAngleDeg({ angle: 0 }, { azimuth: 190 })).toBe(-170);
  });

  it('G3D-11 isBackFacing 60° 不隐藏、61° 隐藏', () => {
    expect(isBackFacing({ ring: 1, angle: 0 }, { azimuth: 60 })).toBe(false);
    expect(isBackFacing({ ring: 1, angle: 0 }, { azimuth: 61 })).toBe(true);
    expect(isBackFacing({ ring: 1, angle: 0 }, { azimuth: -61 })).toBe(true);
  });

  it('G3D-12 中心节点永不背向', () => {
    expect(isBackFacing({ ring: 0, angle: -90 }, { azimuth: 90 })).toBe(false);
    expect(isBackFacing({ ring: 0, angle: -90 }, { azimuth: -180 })).toBe(false);
  });

  it('G3D-13 projectToScreen 中心落在世界原点且 k 一致', () => {
    const result = projectToScreen(
      { x: GRAPH_CONFIG.CANVAS.cx, y: GRAPH_CONFIG.CANVAS.cy, ring: 0 },
      {},
      { width: 1000, height: 760 }
    );
    expect(result).toEqual({ x: 0, y: 0, z: 24, k: 1 });
  });

  it('G3D-14 projectToScreen 窄容器取最短边比例', () => {
    const result = projectToScreen(
      { x: GRAPH_CONFIG.CANVAS.cx + 190, y: GRAPH_CONFIG.CANVAS.cy, ring: 2 },
      {},
      { width: 320, height: 300 }
    );
    expect(result.k).toBe(0.32);
    expect(result.x).toBe(60.8);
    expect(result.y).toBe(0);
    expect(result.z).toBe(-140);
  });

  it('G3D-15 ringNavigationTarget 环内顺时针/逆时针并可回绕', () => {
    expect(ringNavigationTarget(layout, 'a', 'cw')).toBe('b');
    expect(ringNavigationTarget(layout, 'b', 'cw')).toBe('d');
    expect(ringNavigationTarget(layout, 'd', 'cw')).toBe('a');
    expect(ringNavigationTarget(layout, 'a', 'ccw')).toBe('d');
    expect(ringNavigationTarget(layout, 'd', 'ccw')).toBe('b');
  });

  it('G3D-16 ringNavigationTarget 跨环取角度最近节点', () => {
    expect(ringNavigationTarget(layout, 'b', 'in')).toBe('c');
    expect(ringNavigationTarget(layout, 'a', 'out')).toBe('e');
    expect(ringNavigationTarget(layout, 'd', 'out')).toBe('f');
  });

  it('G3D-17 ringNavigationTarget Home/End 落在当前环首末', () => {
    expect(ringNavigationTarget(layout, 'b', 'home')).toBe('a');
    expect(ringNavigationTarget(layout, 'b', 'end')).toBe('d');
  });

  it('G3D-18 ringNavigationTarget 跳过空环', () => {
    const sparse = [
      { id: 'x', ring: 0, angle: -90 },
      { id: 'y', ring: 2, angle: 0 },
    ];
    expect(ringNavigationTarget(sparse, 'y', 'in')).toBe('x');
    expect(ringNavigationTarget(sparse, 'x', 'out')).toBe('y');
    expect(ringNavigationTarget(sparse, 'missing', 'cw')).toBeNull();
  });

  it('G3D-19 computeLayout 输出与改造前逐项相等', () => {
    const nodes = [
      { id: 'c', type: 'term', label: '中心', depth: 0, weight: 0 },
      { id: 'a', type: 'term', label: 'A', depth: 1, weight: 0 },
      { id: 'd', type: 'building', label: 'D', depth: 2, weight: 0 },
    ];
    const byId = new Map(computeLayout(nodes, []).map((node) => [node.id, node]));

    expect(byId.get('c')).toMatchObject({ x: 500, y: 380, ring: 0, angle: -90, radius: 0 });
    expect(byId.get('a').x).toBeCloseTo(500, 6);
    expect(byId.get('a').y).toBeCloseTo(190, 6);
    expect(byId.get('a').ring).toBe(1);
    expect(byId.get('d').x).toBeCloseTo(500, 6);
    expect(byId.get('d').y).toBeCloseTo(50, 6);
    expect(byId.get('d').ring).toBe(2);
  });

  it('G3D-20 超预算数据仍受 120/300 约束且邻接与 2D 同源', () => {
    const terms = Array.from({ length: 200 }, (_, index) =>
      makeTerm({ id: `t${index}`, sort_order: index, related_terms: [`t${(index + 1) % 200}`] })
    );
    const model = buildGraphModel({ terms, taxonomy: null, selectedTermId: 't0' });
    expect(model.nodes.length).toBeLessThanOrEqual(GRAPH_CONFIG.NODE_LIMIT);
    expect(model.edges.length).toBeLessThanOrEqual(GRAPH_CONFIG.EDGE_LIMIT);

    const ids = neighborIds(model.edges, 'term:t0');
    const expected = new Set();
    for (const edge of model.edges) {
      if (edge.from === 'term:t0' && edge.to !== 'term:t0') expected.add(edge.to);
      if (edge.to === 'term:t0' && edge.from !== 'term:t0') expected.add(edge.from);
    }
    expect([...ids].sort()).toEqual([...expected].sort());
  });

  it('G3D-21 clampView 支持可选 pan 且缺省输出保持不变', () => {
    expect(clampView({})).toEqual({
      azimuth: GRAPH_3D_CONFIG.DEFAULT_AZIMUTH,
      pitch: GRAPH_3D_CONFIG.DEFAULT_PITCH,
      scale: 1,
    });
    expect(clampView({ panX: 24, panY: -12 })).toEqual({
      azimuth: GRAPH_3D_CONFIG.DEFAULT_AZIMUTH,
      pitch: GRAPH_3D_CONFIG.DEFAULT_PITCH,
      scale: 1,
      panX: 24,
      panY: -12,
    });
    expect(clampView({ panX: 'x' }).panX).toBe(0);
  });

  it('G3D-22 球面缩放区间 0.6~1.8 仅在 sphere 模式生效', () => {
    expect(clampView({ scale: 9 }, { sphere: true }).scale).toBe(GRAPH_3D_CONFIG.ZOOM_MAX);
    expect(clampView({ scale: 0.1 }, { sphere: true }).scale).toBe(GRAPH_3D_CONFIG.ZOOM_MIN);
    expect(clampView({ scale: 9 }).scale).toBe(GRAPH_CONFIG.ZOOM_MAX);
    expect(GRAPH_3D_CONFIG.RESET_MS).toBe(520);
    expect(GRAPH_3D_CONFIG.RESET_MS).not.toBe(GRAPH_3D_CONFIG.SETTLE_MS);
  });
});