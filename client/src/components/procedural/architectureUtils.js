import * as THREE from 'three';

/* ============================================================
 *  程序化古建筑 — 统一材质色板与曲面几何工具
 *  色板取故宫朱墙、黄瓦、木构、青瓦与石台基的经典配色
 * ============================================================ */

export const PALETTE = {
  stone: '#D8CDBB',
  stoneDark: '#BFB09A',
  wall: '#EFE5D3',
  wallShade: '#E2D5BE',
  vermilion: '#A8432F',
  vermilionDark: '#7C2D20',
  wood: '#8B5A3C',
  woodLight: '#B07E55',
  gold: '#C9A24B',
  goldDark: '#9A7729',
  tile: '#57616B',
  tileDark: '#3F4852',
  tileGreen: '#41594A',
};

/**
 * 曲面庑殿顶几何体
 * 四面坡从檐口向正脊收拢, 沿坡面高度使用幂函数形成中国建筑的凹曲屋面。
 * 参数均为归一化场景单位。
 */
export function createCurvedHipGeometry({
  baseW,
  baseD,
  ridgeW,
  height,
  segments = 12,
  curve = 1.55,
}) {
  const hw = baseW / 2;
  const hd = baseD / 2;
  const hr = ridgeW / 2;

  // 四个坡面: [檐口起点A, 正脊起点A, 檐口起点B, 正脊起点B]
  const faces = [
    { a0: [-hw, hd], a1: [-hr, 0], b0: [hw, hd], b1: [hr, 0] },
    { a0: [hw, -hd], a1: [hr, 0], b0: [-hw, -hd], b1: [-hr, 0] },
    { a0: [-hw, -hd], a1: [-hr, 0], b0: [-hw, hd], b1: [-hr, 0] },
    { a0: [hw, hd], a1: [hr, 0], b0: [hw, -hd], b1: [hr, 0] },
  ];

  const positions = [];
  const indices = [];

  faces.forEach(({ a0, a1, b0, b1 }) => {
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * Math.pow(t, curve);
      positions.push(
        a0[0] + (a1[0] - a0[0]) * t,
        y,
        a0[1] + (a1[1] - a0[1]) * t
      );
      positions.push(
        b0[0] + (b1[0] - b0[0]) * t,
        y,
        b0[1] + (b1[1] - b0[1]) * t
      );
    }
    for (let i = 0; i < segments; i++) {
      const i0 = start + i * 2;
      indices.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 曲面攒尖 / 屋檐裙沿几何体 — 旋转体
 * t=0 位于外檐(高度 0), t=1 收至内圈(高度 height), 幂函数形成反宇曲面。
 * segments=8 为八角(佛塔), segments=4 为四角(楼阁盔顶), angleOffset 用于对齐平面朝向。
 */
export function createSkirtGeometry({
  outerRadius,
  innerRadius = 0.02,
  height,
  segments = 8,
  curve = 1.8,
  angleOffset = 0,
}) {
  const points = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = THREE.MathUtils.lerp(outerRadius, innerRadius, t);
    const y = height * Math.pow(t, curve);
    points.push(new THREE.Vector2(Math.max(r, 0.001), y));
  }
  const geo = new THREE.LatheGeometry(points, segments);
  if (angleOffset) geo.rotateY(angleOffset);
  return geo;
}

/**
 * 矩形栏杆 — 返回 4 条边上的立柱位置 (用于楼阁平座)
 */
export function squarePosts(size, inset = 0) {
  const half = size / 2 - inset;
  const posts = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const t = -half + (i / (count - 1)) * (size - inset * 2);
    posts.push([t, half], [t, -half], [half, t], [-half, t]);
  }
  return posts;
}
