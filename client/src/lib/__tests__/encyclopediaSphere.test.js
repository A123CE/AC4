import { describe, it, expect } from 'vitest';
import {
  SPHERE_CONFIG,
  computeSphereLayout,
  projectSphere,
  sphereDepthRatio,
  clampPan,
  resolveSphereForm,
  resolveCoreAnchor,
  projectSphereToPlane,
  lerpView,
  breakpointOf,
} from '../encyclopediaSphere';

function fixture() {
  const nodes = [
    { id: 'category:roof', type: 'category', depth: 0, label: '屋顶' },
    { id: 'term:dougong', type: 'term', depth: 1, label: '斗拱' },
    { id: 'term:taiji', type: 'term', depth: 1, label: '台基' },
    { id: 'term:caihua', type: 'term', depth: 1, label: '彩画' },
    { id: 'term:wazuo', type: 'term', depth: 1, label: '瓦作' },
    { id: 'term:gong', type: 'term', depth: 2, label: '栱' },
    { id: 'term:ang', type: 'term', depth: 2, label: '昂' },
    { id: 'term:shuatou', type: 'term', depth: 2, label: '耍头' },
    { id: 'term:jishou', type: 'term', depth: 2, label: '脊兽' },
    { id: 'dynasty:ming', type: 'dynasty', depth: 2, label: '明' },
  ];
  const edges = [
    { from: 'category:roof', to: 'term:dougong', kind: 'primary' },
    { from: 'category:roof', to: 'term:taiji', kind: 'primary' },
    { from: 'category:roof', to: 'term:caihua', kind: 'primary' },
    { from: 'category:roof', to: 'term:wazuo', kind: 'primary' },
    { from: 'term:dougong', to: 'term:gong', kind: 'term' },
    { from: 'term:dougong', to: 'term:ang', kind: 'term' },
    { from: 'term:dougong', to: 'term:shuatou', kind: 'term' },
    { from: 'term:gong', to: 'term:ang', kind: 'peer' },
    { from: 'term:caihua', to: 'term:jishou', kind: 'term' },
    { from: 'term:wazuo', to: 'dynasty:ming', kind: 'term' },
    { from: 'term:taiji', to: 'dynasty:ming', kind: 'term' },
  ];
  return { nodes, edges };
}

describe('enciesphere 球面几何（T-G3D-02）', () => {
  it('黄金角匀布：同层纬度互不相同且 |sin(lat)| ≤ LAT_LIMIT', () => {
    const { nodes, edges } = fixture();
    const { nodes: laid } = computeSphereLayout(nodes, edges, {
      width: 380,
      height: 340,
      centerId: 'category:roof',
    });
    const byTier = new Map();
    for (const node of laid) {
      if (node.tier === 'core') continue;
      const sin = Math.abs(Math.sin((node.lat * Math.PI) / 180));
      expect(sin).toBeLessThanOrEqual(SPHERE_CONFIG.LAT_LIMIT + 1e-9);
      if (!byTier.has(node.tier)) byTier.set(node.tier, []);
      byTier.get(node.tier).push(node.lat);
    }
    expect(byTier.size).toBeGreaterThanOrEqual(2);
    for (const lats of byTier.values()) {
      expect(new Set(lats.map((v) => v.toFixed(6))).size).toBe(lats.length);
    }
  });

  it('三层球半径单调递增且 tier 至少三种', () => {
    const { nodes, edges } = fixture();
    const { nodes: laid } = computeSphereLayout(nodes, edges, {
      centerId: 'category:roof',
    });
    expect(SPHERE_CONFIG.R_INNER).toBeLessThan(SPHERE_CONFIG.R_MID);
    expect(SPHERE_CONFIG.R_MID).toBeLessThan(SPHERE_CONFIG.R_OUTER);
    const tiers = new Set(laid.map((n) => n.tier));
    expect(tiers.has('inner')).toBe(true);
    expect(tiers.has('mid')).toBe(true);
    expect(tiers.has('outer')).toBe(true);
    const core = laid.find((n) => n.id === 'category:roof');
    expect(core.tier).toBe('core');
    expect(core.x).toBe(0);
    expect(core.y).toBe(0);
    expect(core.z).toBe(0);
  });

  it('单节点退化为球心', () => {
    const { nodes } = computeSphereLayout(
      [{ id: 'term:only', type: 'term', depth: 0, label: '孤点' }],
      [],
      { width: 300, height: 300 },
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].tier).toBe('core');
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(nodes[0].z).toBe(0);
  });

  it('孤立节点进 orphanIds，可见节点 degree ≥ 1', () => {
    const { nodes, edges } = fixture();
    const withOrphan = [...nodes, { id: 'term:lost', type: 'term', depth: 2, label: '孤立' }];
    const { nodes: laid, orphanIds } = computeSphereLayout(withOrphan, edges, {
      centerId: 'category:roof',
    });
    expect(orphanIds).toContain('term:lost');
    for (const node of laid) {
      if (node.tier === 'core' || orphanIds.includes(node.id)) continue;
      expect(node.degree).toBeGreaterThanOrEqual(1);
    }
  });

  it('clampPan 极限位移后球体残留可见 ≥ 35% 半径', () => {
    const box = { width: 600, height: 400, sphereScreenRadius: 200 };
    const clamped = clampPan({ x: 99999, y: -99999 }, box);
    expect(clamped.x).toBeCloseTo(600 / 2 - 200 * (1 - SPHERE_CONFIG.PAN_VISIBLE_MIN), 5);
    expect(600 / 2 - Math.abs(clamped.x)).toBeGreaterThanOrEqual(200 * SPHERE_CONFIG.PAN_VISIBLE_MIN);
    expect(400 / 2 - Math.abs(clamped.y)).toBeGreaterThanOrEqual(200 * SPHERE_CONFIG.PAN_VISIBLE_MIN);
    expect(clampPan({ x: 10, y: -10 }, box)).toEqual({ x: 10, y: -10 });
  });

  it('sphereDepthRatio 旋转一圈经历 front 与 back', () => {
    const node = { x: 120, y: 0, z: 0, tierRadius: 168 };
    const facings = new Set();
    for (let az = -180; az <= 180; az += 15) {
      const { facing, depth } = projectSphere(node, { azimuth: az, pitch: 0 }, 286);
      expect(depth).toBeGreaterThanOrEqual(-1);
      expect(depth).toBeLessThanOrEqual(1);
      facings.add(facing);
    }
    expect(facings.has('front')).toBe(true);
    expect(facings.has('back')).toBe(true);
    expect(SPHERE_CONFIG.BACKFACE_DEPTH_RATIO).toBeLessThan(0);
  });

  it('resolveSphereForm 六断点与能力组合', () => {
    const ok = { supports3d: true, reducedMotion: false };
    expect(resolveSphereForm('wide', ok)).toBe('full3d');
    expect(resolveSphereForm('medium', ok)).toBe('full3d');
    expect(resolveSphereForm('compact', ok)).toBe('25d');
    expect(resolveSphereForm('stacked', ok)).toBe('2d');
    expect(resolveSphereForm('narrow', ok)).toBe('2d');
    expect(resolveSphereForm('minimal', ok)).toBe('2d');
    expect(resolveSphereForm(1500, ok)).toBe('full3d');
    expect(resolveSphereForm('wide', { supports3d: false })).toBe('2d');
    expect(resolveSphereForm('wide', { supports3d: true, reducedMotion: true })).toBe('25d');
    expect(breakpointOf(1440)).toBe('wide');
    expect(breakpointOf(480)).toBe('minimal');
  });

  it('projectSphereToPlane 落在画布 90% 内且无横向溢出', () => {
    const size = { width: 400, height: 360 };
    const corners = [
      { lon: -180, lat: -90 },
      { lon: 180, lat: 90 },
      { lon: 0, lat: 0 },
    ];
    for (const point of corners) {
      const { x, y } = projectSphereToPlane(point, size);
      expect(Math.abs(x)).toBeLessThanOrEqual(size.width * 0.45 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(size.height * 0.45 + 1e-9);
    }
  });

  it('resolveCoreAnchor 覆盖 focus / center / overview', () => {
    expect(resolveCoreAnchor({ modelMode: 'focus', selectedId: 'term:a' }).tone).toBe('focus');
    expect(resolveCoreAnchor({ centerId: 'category:roof' }).fallback).toBe('图谱中心');
    expect(resolveCoreAnchor({}).fallback).toBe('营造法式');
  });

  it('lerpView 方位走最短路径且端点精确', () => {
    const mid = lerpView({ azimuth: 170, pitch: 0, scale: 1 }, { azimuth: -170, pitch: -8, scale: 1.5 }, 0.5);
    expect(Math.abs(mid.azimuth)).toBeGreaterThanOrEqual(170);
    const end = lerpView({ azimuth: 0 }, SPHERE_CONFIG.RESET_VIEW, 1);
    expect(end.azimuth).toBe(SPHERE_CONFIG.RESET_VIEW.azimuth);
    expect(end.pitch).toBe(SPHERE_CONFIG.RESET_VIEW.pitch);
    expect(end.scale).toBe(SPHERE_CONFIG.RESET_VIEW.scale);
  });
});