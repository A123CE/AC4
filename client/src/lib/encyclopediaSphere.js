/**
 * 百科知识图谱 · 球面几何纯函数（批次 C / T-G3D-01）
 * - 选型 A′：CSS 3D 承担空间与透视，JS 承担球面坐标与深度语义
 * - 不依赖 React / DOM，可在 Node 环境单测
 * - 与既有 computeLayout / projectToScreen / isBackFacing / ringNavigationTarget 并存，互不替换
 */
import { GRAPH_CONFIG, GRAPH_3D_CONFIG } from './encyclopediaGraph';

export const SPHERE_CONFIG = Object.freeze({
  R_INNER: 168,
  R_MID: 228,
  R_OUTER: 286,
  LAT_LIMIT: 0.86,
  GOLDEN_ANGLE: Math.PI * (3 - Math.sqrt(5)),
  PERSPECTIVE: 1100,
  PITCH_MIN: -30,
  PITCH_MAX: 30,
  SPIN_DEG_PER_SEC: 8,
  DRAG_AZ_PER_PX: 0.35,
  DRAG_PITCH_PER_PX: 0.25,
  DRAG_PAN_PER_PX: 1.0,
  PAN_VISIBLE_MIN: 0.35,
  ZOOM_MIN: 0.6,
  ZOOM_MAX: 1.8,
  RESET_MS: 520,
  DEPTH_REFRESH_DEG: 0.75,
  BACKFACE_DEPTH_RATIO: -0.18,
  NODE_W_MIN: 80,
  NODE_W_MAX: 152,
  NODE_PAD_BLOCK: 6,
  NODE_PAD_INLINE: 12,
  NODE_FONT_PX: 13,
  NODE_LINE_MAX: 2,
  NODE_H_SINGLE: 32,
  NODE_H_DOUBLE: 56,
  NODE_SAFE_INSET: 8,
  NODE_CHARS_SINGLE: 9,
  CHIP_FONT_MIN: 12,
  CHIP_FONT_MAX: 16,
  BILLBOARD_TOLERANCE_DEG: 1.5,
  HOVER_RESUME_MS: 3000,
  FALLBACK_FPS: 45,
  RESET_VIEW: Object.freeze({ azimuth: -18, pitch: -8, scale: 1, panX: 0, panY: 0 }),
  TIER_RADIUS: Object.freeze({ core: 0, inner: 168, mid: 228, outer: 286 }),
  FORM: GRAPH_3D_CONFIG.FORM,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const rad = (deg) => (deg * Math.PI) / 180;

export function breakpointOf(width) {
  const w = toNumber(width, GRAPH_CONFIG.BREAKPOINTS.wide);
  if (w >= GRAPH_CONFIG.BREAKPOINTS.wide) return 'wide';
  if (w >= GRAPH_CONFIG.BREAKPOINTS.medium) return 'medium';
  if (w >= GRAPH_CONFIG.BREAKPOINTS.compact) return 'compact';
  if (w >= GRAPH_CONFIG.BREAKPOINTS.stacked) return 'stacked';
  if (w >= GRAPH_CONFIG.BREAKPOINTS.narrow) return 'narrow';
  return 'minimal';
}

function degreeMap(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    if (!edge) continue;
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  }
  return degree;
}

function labelWidthOf(label) {
  const len = String(label ?? '').length;
  const width =
    SPHERE_CONFIG.NODE_PAD_INLINE * 2 + 2 + 6 + len * SPHERE_CONFIG.NODE_FONT_PX;
  return clamp(width, SPHERE_CONFIG.NODE_W_MIN, SPHERE_CONFIG.NODE_W_MAX);
}

function tierOf(node, degree) {
  if (node.depth === 1) return 'inner';
  const meta = node.type === 'dynasty' || node.type === 'region';
  if (node.depth === 2 && degree >= 2 && !meta) return 'mid';
  return 'outer';
}

export function computeSphereLayout(nodes = [], edges = [], opts = {}) {
  const width =
    toNumber(opts.width, 0) > 0 ? toNumber(opts.width) : GRAPH_CONFIG.CANVAS.width;
  const height =
    toNumber(opts.height, 0) > 0 ? toNumber(opts.height) : GRAPH_CONFIG.CANVAS.height;
  const k =
    Math.min(width / GRAPH_CONFIG.CANVAS.width, height / GRAPH_CONFIG.CANVAS.height) || 1;
  const radii = {
    inner: toNumber(opts.radii?.inner, SPHERE_CONFIG.R_INNER),
    mid: toNumber(opts.radii?.mid, SPHERE_CONFIG.R_MID),
    outer: toNumber(opts.radii?.outer, SPHERE_CONFIG.R_OUTER),
  };
  const stageHalf = Math.min(width, height) / 2;
  const chipHalf = SPHERE_CONFIG.NODE_W_MAX / 2 + SPHERE_CONFIG.NODE_SAFE_INSET;
  const radiusCap = Math.max(1, stageHalf - chipHalf);
  const kEff = Math.min(k, radiusCap / Math.max(radii.outer, 1));

  const mode = opts.mode === 'focus' ? 'focus' : 'overview';
  const degree = degreeMap(nodes, edges);
  const single = nodes.length === 1;

  let coreId = null;
  if (single) coreId = nodes[0].id;
  else if (mode === 'focus' && opts.selectedId) coreId = opts.selectedId;
  else coreId = opts.centerId ?? null;
  if (coreId && !nodes.some((n) => n.id === coreId)) coreId = null;

  const orphanIds = [];
  const buckets = { inner: [], mid: [], outer: [] };
  for (const node of nodes) {
    if (node.id === coreId) continue;
    const d = degree.get(node.id) || 0;
    if (!single && d === 0) {
      orphanIds.push(node.id);
      if (opts.includeOrphans !== true) continue;
      buckets.outer.push(node);
      continue;
    }
    buckets[tierOf(node, d)].push(node);
  }

  const positions = new Map();
  for (const tier of ['inner', 'mid', 'outer']) {
    const bucket = buckets[tier].slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const n = bucket.length;
    const radius = radii[tier];
    bucket.forEach((node, index) => {
      const rawY = 1 - ((index + 0.5) * 2) / n;
      const y = clamp(rawY, -SPHERE_CONFIG.LAT_LIMIT, SPHERE_CONFIG.LAT_LIMIT);
      const rAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = SPHERE_CONFIG.GOLDEN_ANGLE * index;
      const lon = Math.atan2(Math.sin(theta) * rAtY, Math.cos(theta) * rAtY);
      const lat = Math.asin(y);
      positions.set(node.id, {
        tier,
        tierRadius: radius * kEff,
        lon: (lon * 180) / Math.PI,
        lat: (lat * 180) / Math.PI,
        x: radius * Math.cos(lat) * Math.cos(lon) * kEff,
        y: radius * Math.cos(lat) * Math.sin(lon) * kEff,
        z: radius * Math.sin(lat) * kEff,
      });
    });
  }

  const out = (opts.includeOrphans === true
    ? nodes
    : nodes.filter((node) => !orphanIds.includes(node.id))
  ).map((node) => {
    const pos =
      positions.get(node.id) ||
      { tier: 'core', tierRadius: 0, lon: 0, lat: 0, x: 0, y: 0, z: 0 };
    return {
      ...node,
      ...pos,
      degree: degree.get(node.id) || 0,
      labelWidthPx: labelWidthOf(node.label),
    };
  });

  const sphereRadius = Math.max(radii.outer * kEff, 1);
  return { nodes: out, sphereRadius, orphanIds, coreId };
}

export function sphereDepthRatio(node = {}, azimuth = 0, pitch = 0, sphereRadius = 0) {
  const a = rad(toNumber(azimuth));
  const p = rad(toNumber(pitch));
  const x = toNumber(node.x);
  const y = toNumber(node.y);
  const z = toNumber(node.z);
  const z1 = -x * Math.sin(a) + z * Math.cos(a);
  const z2 = y * Math.sin(p) + z1 * Math.cos(p);
  const radius = Math.max(
    toNumber(sphereRadius, 0) || Math.abs(toNumber(node.tierRadius, 1)) || 1,
    1
  );
  return clamp(z2 / radius, -1, 1);
}

export function projectSphere(node = {}, view = {}, sphereRadius = 0) {
  const depth = sphereDepthRatio(node, view.azimuth, view.pitch, sphereRadius);
  const facing = depth < SPHERE_CONFIG.BACKFACE_DEPTH_RATIO ? 'back' : 'front';
  const scaleFactor = 1 + 0.18 * depth;
  return { depth, facing, scaleFactor };
}

export function clampPan(pan = {}, box = {}) {
  const width = toNumber(box.width, 0) > 0 ? toNumber(box.width) : GRAPH_CONFIG.CANVAS.width;
  const height = toNumber(box.height, 0) > 0 ? toNumber(box.height) : GRAPH_CONFIG.CANVAS.height;
  const radius = Math.max(0, toNumber(box.sphereScreenRadius, 0));
  const stay = 1 - SPHERE_CONFIG.PAN_VISIBLE_MIN;
  const maxX = Math.max(0, width / 2 - radius * stay);
  const maxY = Math.max(0, height / 2 - radius * stay);
  return {
    x: clamp(toNumber(pan.x), -maxX, maxX),
    y: clamp(toNumber(pan.y), -maxY, maxY),
  };
}

export function resolveSphereForm(viewport, capability = {}) {
  const supports3d = capability.supports3d !== false;
  const reducedMotion = capability.reducedMotion === true;
  const key = typeof viewport === 'number' ? breakpointOf(viewport) : String(viewport || 'wide');
  const form = SPHERE_CONFIG.FORM[key] || '2d';
  if (!supports3d) return '2d';
  if (form === 'list') return '2d';
  if (reducedMotion && (form === 'full3d' || form === '25d')) return '25d';
  return form;
}

export function resolveCoreAnchor(input = {}) {
  const mode = input.modelMode === 'focus' ? 'focus' : 'overview';
  if (mode === 'focus' && input.selectedId) {
    return { labelKey: 'graph.core.focus', fallback: '当前聚焦', tone: 'focus' };
  }
  if (input.centerId) {
    return { labelKey: 'graph.core.center', fallback: '图谱中心', tone: 'neutral' };
  }
  return { labelKey: 'graph.core.overview', fallback: '营造法式', tone: 'neutral' };
}

export function projectSphereToPlane(point = {}, size = {}) {
  const width = toNumber(size.width, 0) > 0 ? toNumber(size.width) : GRAPH_CONFIG.CANVAS.width;
  const height = toNumber(size.height, 0) > 0 ? toNumber(size.height) : GRAPH_CONFIG.CANVAS.height;
  const lon = clamp(toNumber(point.lon), -180, 180);
  const lat = clamp(toNumber(point.lat), -90, 90);
  return {
    x: (lon / 180) * width * 0.45,
    y: (-lat / 90) * height * 0.45,
  };
}

export function lerpView(from = {}, to = SPHERE_CONFIG.RESET_VIEW, t = 0) {
  const k = clamp(toNumber(t), 0, 1);
  const azFrom = toNumber(from.azimuth, SPHERE_CONFIG.RESET_VIEW.azimuth);
  const azTo = toNumber(to.azimuth, SPHERE_CONFIG.RESET_VIEW.azimuth);
  const delta = ((((azTo - azFrom + 180) % 360) + 360) % 360) - 180;
  const pitchFrom = toNumber(from.pitch, SPHERE_CONFIG.RESET_VIEW.pitch);
  const pitchTo = toNumber(to.pitch, SPHERE_CONFIG.RESET_VIEW.pitch);
  const scaleFrom = toNumber(from.scale, SPHERE_CONFIG.RESET_VIEW.scale);
  const scaleTo = toNumber(to.scale, SPHERE_CONFIG.RESET_VIEW.scale);
  const panXFrom = toNumber(from.panX, SPHERE_CONFIG.RESET_VIEW.panX);
  const panXTo = toNumber(to.panX, SPHERE_CONFIG.RESET_VIEW.panX);
  const panYFrom = toNumber(from.panY, SPHERE_CONFIG.RESET_VIEW.panY);
  const panYTo = toNumber(to.panY, SPHERE_CONFIG.RESET_VIEW.panY);
  return {
    azimuth: k >= 1 ? azTo : azFrom + delta * k,
    pitch: pitchFrom + (pitchTo - pitchFrom) * k,
    scale: scaleFrom + (scaleTo - scaleFrom) * k,
    panX: panXFrom + (panXTo - panXFrom) * k,
    panY: panYFrom + (panYTo - panYFrom) * k,
  };
}