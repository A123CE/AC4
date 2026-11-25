/**
 * 百科知识图谱纯函数模块
 * - 不依赖 React / DOM，可在 Node 环境单测
 * - 所有预算、断点、布局常量集中在 GRAPH_CONFIG
 */

export const GRAPH_CONFIG = Object.freeze({
  NODE_LIMIT: 120,
  EDGE_LIMIT: 300,
  OVERVIEW_NODE_LIMIT: 60,
  OVERVIEW_TERMS_PER_CATEGORY: 2,
  PEER_PER_GROUP: 3,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 2.0,
  DRAG_CLICK_THRESHOLD: 4,
  BREAKPOINTS: { wide: 1440, medium: 1284, compact: 1025, stacked: 721, narrow: 481, minimal: 480 },
  GRAPH_WIDTH: { min: 320, max: 420, medium: 320, rail: 52 },
  CANVAS: { width: 1000, height: 760, cx: 500, cy: 380 },
  RING: { R0: 0, R1: 190, R2: 330 },
  NODE_RADIUS: { default: 14, category: 18, meta: 12 },
  LABEL_MAX_CHARS: 6,
  LABEL_OFFSET: 20,
  MAX_LABEL_LINES: 2,
});

const NODE_KINDS = ['term', 'building', 'category', 'dynasty', 'region'];
const EDGE_KINDS = ['primary', 'palace', 'term', 'peer'];
const TYPE_RANK = { term: 0, building: 1, category: 2, dynasty: 3, region: 4 };
const EDGE_RANK = { primary: 0, palace: 1, term: 2, peer: 3 };

export function isGraphNodeKind(value) {
  return NODE_KINDS.includes(value);
}

export function isGraphEdgeKind(value) {
  return EDGE_KINDS.includes(value);
}

export function nodeId(type, ref) {
  return `${type}:${ref}`;
}

export function parseNodeId(id) {
  if (typeof id !== 'string') return null;
  const index = id.indexOf(':');
  if (index <= 0 || index === id.length - 1) return null;
  const type = id.slice(0, index);
  if (!isGraphNodeKind(type)) return null;
  return { type, ref: id.slice(index + 1) };
}

function labelOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function termLabel(term) {
  return labelOf(term?.term);
}

function buildingLabel(building) {
  return labelOf(building?.name);
}

function makeNode(type, ref, label, extra = {}) {
  return {
    id: nodeId(type, ref),
    type,
    ref: String(ref),
    label,
    depth: extra.depth ?? 2,
    weight: extra.weight ?? 0,
    ...extra,
  };
}

function makeEdge(kind, from, to, options = {}) {
  const directed = options.directed ?? (kind !== 'term' && kind !== 'peer');
  let a = from;
  let b = to;
  if (!directed && a > b) {
    [a, b] = [b, a];
  }
  return {
    id: directed ? `${a}>${b}#${kind}` : `${a}~${b}#${kind}`,
    kind,
    from: a,
    to: b,
    directed,
    weight: options.weight ?? 0,
  };
}

function sortTerms(a, b) {
  return (
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    (a.level_value ?? 0) - (b.level_value ?? 0) ||
    String(a.id).localeCompare(String(b.id))
  );
}

function nodeSortKey(node) {
  return [
    node.depth ?? 2,
    TYPE_RANK[node.type] ?? 9,
    -(node.weight ?? 0),
    String(node.label ?? '').localeCompare('zh-CN'),
    node.id,
  ];
}

function compareNode(a, b) {
  const left = nodeSortKey(a);
  const right = nodeSortKey(b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

function compareEdge(a, b) {
  return (
    (EDGE_RANK[a.kind] ?? 9) - (EDGE_RANK[b.kind] ?? 9) ||
    -(a.weight ?? 0) - -(b.weight ?? 0) ||
    String(a.from).localeCompare(String(b.from)) ||
    String(a.to).localeCompare(String(b.to)) ||
    String(a.id).localeCompare(String(b.id))
  );
}

function emptyModel(mode = 'overview') {
  return {
    mode,
    centerId: null,
    nodes: [],
    edges: [],
    stats: {
      totalNodes: 0,
      totalEdges: 0,
      shownNodes: 0,
      shownEdges: 0,
      truncated: false,
    },
  };
}

function dedupeEdges(edges) {
  const seen = new Set();
  const kept = [];
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    if (seen.has(edge.id)) continue;
    seen.add(edge.id);
    kept.push(edge);
  }
  return kept;
}

function computeWeights(nodes, edges) {
  const weight = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    weight.set(edge.from, (weight.get(edge.from) ?? 0) + 1);
    weight.set(edge.to, (weight.get(edge.to) ?? 0) + 1);
  }
  return nodes.map((node) => ({ ...node, weight: weight.get(node.id) ?? 0 }));
}

function groupBy(items, keyOf) {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

/**
 * 构造草稿图（未裁剪）
 */
function buildDraft({ terms, taxonomy, selectedTermId, selectedTerm, mode }) {
  const termPool = Array.isArray(terms) ? terms.filter((term) => term?.id && termLabel(term)) : [];
  const termMap = new Map(termPool.map((term) => [term.id, term]));

  let centerTerm = null;
  if (selectedTermId && termMap.has(selectedTermId)) {
    centerTerm = termMap.get(selectedTermId);
  } else if (selectedTermId && selectedTerm?.id === selectedTermId && termLabel(selectedTerm)) {
    centerTerm = selectedTerm;
    termMap.set(selectedTerm.id, selectedTerm);
  }
  if (selectedTerm?.id && termLabel(selectedTerm) && !termMap.has(selectedTerm.id)) {
    termMap.set(selectedTerm.id, selectedTerm);
  }

  const resolvedMode = mode === 'auto' ? (selectedTermId ? 'focus' : 'overview') : mode;
  const buildings = Array.isArray(taxonomy?.buildings)
    ? taxonomy.buildings.filter((building) => building?.id && buildingLabel(building))
    : [];
  const buildingMap = new Map(buildings.map((building) => [building.id, building]));

  const nodes = new Map();
  const edges = [];

  if (resolvedMode === 'focus') {
    const centerId = selectedTermId && termMap.has(selectedTermId)
      ? nodeId('term', selectedTermId)
      : null;
    const pool = [...termMap.values()];

    for (const term of pool) {
      nodes.set(nodeId('term', term.id), makeNode('term', term.id, termLabel(term), {
        depth: nodeId('term', term.id) === centerId ? 0 : 2,
        category: term.category || null,
      }));
    }

    const referencedBuildings = new Set();
    for (const term of pool) {
      if (term.primary_palace_id && buildingMap.has(term.primary_palace_id)) {
        referencedBuildings.add(term.primary_palace_id);
      }
      for (const palaceId of Array.isArray(term.related_palaces) ? term.related_palaces : []) {
        if (buildingMap.has(palaceId)) referencedBuildings.add(palaceId);
      }
    }
    for (const palaceId of referencedBuildings) {
      const building = buildingMap.get(palaceId);
      nodes.set(nodeId('building', palaceId), makeNode('building', palaceId, buildingLabel(building), {
        depth: 2,
        dynasty: building.dynasty || null,
        region: building.region || null,
      }));
    }

    for (const term of pool) {
      const from = nodeId('term', term.id);
      const primary = term.primary_palace_id;
      if (primary && buildingMap.has(primary)) {
        edges.push(makeEdge('primary', from, nodeId('building', primary)));
      }
      for (const palaceId of Array.isArray(term.related_palaces) ? term.related_palaces : []) {
        if (palaceId === primary || !buildingMap.has(palaceId)) continue;
        edges.push(makeEdge('palace', from, nodeId('building', palaceId)));
      }
      for (const relatedId of Array.isArray(term.related_terms) ? term.related_terms : []) {
        if (relatedId === term.id || !termMap.has(relatedId)) continue;
        edges.push(makeEdge('term', from, nodeId('term', relatedId)));
      }
    }

    // 同域边：每类目前 3 名两两连边
    for (const [category, group] of groupBy(pool, (term) => term.category)) {
      const representatives = [...group].sort(sortTerms).slice(0, GRAPH_CONFIG.PEER_PER_GROUP);
      for (let i = 0; i < representatives.length; i += 1) {
        for (let j = i + 1; j < representatives.length; j += 1) {
          edges.push(
            makeEdge('peer', nodeId('term', representatives[i].id), nodeId('term', representatives[j].id))
          );
        }
      }
      void category;
    }

    // 类目节点（同分类）
    for (const [category, group] of groupBy(pool, (term) => term.category)) {
      const categoryId = nodeId('category', category);
      nodes.set(categoryId, makeNode('category', category, labelOf(category), { depth: 2 }));
      const representatives = [...group].sort(sortTerms).slice(0, GRAPH_CONFIG.PEER_PER_GROUP);
      for (const term of representatives) {
        edges.push(makeEdge('peer', nodeId('term', term.id), categoryId));
      }
    }

    const ordered = [...nodes.values()].sort(compareNode);
    if (centerId) {
      const direct = new Set();
      for (const edge of edges) {
        if (edge.from === centerId) direct.add(edge.to);
        if (edge.to === centerId) direct.add(edge.from);
      }
      for (const node of ordered) {
        if (node.id === centerId) node.depth = 0;
        else if (direct.has(node.id)) node.depth = Math.min(node.depth, 1);
        else node.depth = Math.max(node.depth, 2);
      }
    }

    return {
      mode: resolvedMode,
      centerId,
      nodes: ordered,
      edges: dedupeEdges(edges),
    };
  }

  // overview：类目中心 + 建筑 + 每类代表词条
  const representativeTerms = [];
  const categoryGroups = groupBy(termPool, (term) => term.category);
  for (const [, group] of categoryGroups) {
    representativeTerms.push(
      ...[...group].sort(sortTerms).slice(0, GRAPH_CONFIG.OVERVIEW_TERMS_PER_CATEGORY)
    );
  }

  const categoryCounts = [...categoryGroups.entries()]
    .map(([category, group]) => ({
      category,
      count: group.length,
      icon: group[0]?.category_icon || null,
    }))
    .sort((a, b) => b.count - a.count || String(a.category).localeCompare(String(b.category), 'zh-CN'));

  const centerCategory =
    categoryCounts.find((item) => item.category === '名筑档案') || categoryCounts[0] || null;
  const centerId = centerCategory ? nodeId('category', centerCategory.category) : null;

  if (centerId) {
    nodes.set(centerId, makeNode('category', centerCategory.category, centerCategory.category, {
      depth: 0,
      count: centerCategory.count,
    }));
  }
  for (const item of categoryCounts) {
    const id = nodeId('category', item.category);
    if (!nodes.has(id)) nodes.set(id, makeNode('category', item.category, item.category, {
      depth: 0,
      count: item.count,
    }));
  }

  for (const building of buildings) {
    nodes.set(nodeId('building', building.id), makeNode('building', building.id, buildingLabel(building), {
      depth: 1,
      dynasty: building.dynasty || null,
      region: building.region || null,
    }));
  }

  for (const term of representativeTerms) {
    const id = nodeId('term', term.id);
    nodes.set(id, makeNode('term', term.id, termLabel(term), { depth: 2, category: term.category || null }));
    if (term.category) {
      edges.push(makeEdge('peer', id, nodeId('category', term.category)));
    }
    if (term.primary_palace_id && buildingMap.has(term.primary_palace_id)) {
      edges.push(makeEdge('primary', id, nodeId('building', term.primary_palace_id)));
    }
  }

  // 建筑同域：同朝代 / 同地区各取前 3 名两两连边
  for (const [dynasty, group] of groupBy(buildings, (building) => building.dynasty)) {
    const representatives = group.slice(0, GRAPH_CONFIG.PEER_PER_GROUP);
    for (let i = 0; i < representatives.length; i += 1) {
      for (let j = i + 1; j < representatives.length; j += 1) {
        edges.push(
          makeEdge('peer', nodeId('building', representatives[i].id), nodeId('building', representatives[j].id))
        );
      }
    }
    if (dynasty) {
      nodes.set(nodeId('dynasty', dynasty), makeNode('dynasty', dynasty, labelOf(dynasty), { depth: 2 }));
      for (const building of representatives) {
        edges.push(makeEdge('peer', nodeId('building', building.id), nodeId('dynasty', dynasty)));
      }
    }
  }
  for (const [region, group] of groupBy(buildings, (building) => building.region)) {
    const representatives = group.slice(0, GRAPH_CONFIG.PEER_PER_GROUP);
    for (let i = 0; i < representatives.length; i += 1) {
      for (let j = i + 1; j < representatives.length; j += 1) {
        edges.push(
          makeEdge('peer', nodeId('building', representatives[i].id), nodeId('building', representatives[j].id))
        );
      }
    }
    if (region) {
      nodes.set(nodeId('region', region), makeNode('region', region, labelOf(region), { depth: 2 }));
      for (const building of representatives) {
        edges.push(makeEdge('peer', nodeId('building', building.id), nodeId('region', region)));
      }
    }
  }

  const ordered = [...nodes.values()].sort(compareNode);
  return { mode: resolvedMode, centerId, nodes: ordered, edges: dedupeEdges(edges) };
}

/**
 * 预算裁剪（独立可测）
 */
export function selectWithinBudget(draft, options = {}) {
  const mode = options.mode || draft.mode || 'overview';
  const nodeLimit = options.nodeLimit
    ?? (mode === 'overview' ? GRAPH_CONFIG.OVERVIEW_NODE_LIMIT : GRAPH_CONFIG.NODE_LIMIT);
  const edgeLimit = options.edgeLimit ?? GRAPH_CONFIG.EDGE_LIMIT;
  const centerId = draft.centerId ?? null;

  const totalNodes = draft.nodes.length;
  const totalEdges = draft.edges.length;

  const weighted = computeWeights(draft.nodes, draft.edges);
  let nodes = [...weighted]
    .filter((node) => labelOf(node.label))
    .sort(compareNode)
    .slice(0, nodeLimit);

  const converge = () => {
    const ids = new Set(nodes.map((node) => node.id));
    let edges = draft.edges
      .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
      .sort(compareEdge)
      .slice(0, edgeLimit);
    const connected = new Set();
    for (const edge of edges) {
      connected.add(edge.from);
      connected.add(edge.to);
    }
    const before = nodes.length;
    nodes = nodes.filter((node) => node.id === centerId || connected.has(node.id));
    edges = edges.filter((edge) => {
      const keepIds = new Set(nodes.map((node) => node.id));
      return keepIds.has(edge.from) && keepIds.has(edge.to);
    });
    return before !== nodes.length;
  };

  let changed = true;
  let rounds = 0;
  while (changed && rounds < 2) {
    changed = converge();
    rounds += 1;
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      stats: {
        totalNodes,
        totalEdges,
        shownNodes: 0,
        shownEdges: 0,
        truncated: totalNodes > 0 || totalEdges > 0,
      },
    };
  }

  return {
    nodes,
    edges: draft.edges
      .filter((edge) => {
        const ids = new Set(nodes.map((node) => node.id));
        return ids.has(edge.from) && ids.has(edge.to);
      })
      .sort(compareEdge)
      .slice(0, edgeLimit),
    stats: {
      totalNodes,
      totalEdges,
      shownNodes: nodes.length,
      shownEdges: Math.min(edgeLimit,
        draft.edges.filter((edge) => {
          const ids = new Set(nodes.map((node) => node.id));
          return ids.has(edge.from) && ids.has(edge.to);
        }).length
      ),
      truncated: totalNodes > nodes.length || totalEdges > edgeLimit,
    },
  };
}

export function buildGraphModel(input = {}) {
  const { terms = [], taxonomy = null, selectedTermId = null, selectedTerm = null, mode = 'auto' } = input;
  if (!Array.isArray(terms) || terms.length === 0) {
    return emptyModel(mode === 'focus' ? 'focus' : 'overview');
  }

  const draft = buildDraft({ terms, taxonomy, selectedTermId, selectedTerm, mode });
  const selected = selectWithinBudget(draft, { mode: draft.mode });
  return {
    mode: draft.mode,
    centerId: draft.centerId,
    nodes: selected.nodes,
    edges: selected.edges,
    stats: selected.stats,
  };
}

export function graphStats(model) {
  return model?.stats ?? {
    totalNodes: 0,
    totalEdges: 0,
    shownNodes: 0,
    shownEdges: 0,
    truncated: false,
  };
}

export function splitLabel(label, maxChars = GRAPH_CONFIG.LABEL_MAX_CHARS) {
  const text = String(label ?? '');
  const chars = Array.from(text);
  if (chars.length <= maxChars) return [text];
  const first = chars.slice(0, maxChars).join('');
  const rest = chars.slice(maxChars);
  const limit = Math.max(1, maxChars - 1);
  const second = rest.length > limit ? `${rest.slice(0, limit).join('')}…` : rest.join('');
  return [first, second];
}

export function computeLayout(nodes = [], edges = [], size = GRAPH_CONFIG.CANVAS) {
  void edges;
  const width = size.width ?? GRAPH_CONFIG.CANVAS.width;
  const height = size.height ?? GRAPH_CONFIG.CANVAS.height;
  const cx = width / 2;
  const cy = height / 2;

  const buckets = new Map([[0, []], [1, []], [2, []]]);
  for (const node of nodes) {
    const depth = [0, 1, 2].includes(node.depth) ? node.depth : 2;
    buckets.get(depth).push(node);
  }
  for (const bucket of buckets.values()) {
    bucket.sort(compareNode);
  }

  const radiusByDepth = { 0: GRAPH_CONFIG.RING.R0, 1: GRAPH_CONFIG.RING.R1, 2: GRAPH_CONFIG.RING.R2 };
  const positions = new Map();

  for (const [depth, bucket] of buckets) {
    if (bucket.length === 0) continue;
    const radiusBase = radiusByDepth[depth];

    if (bucket.length === 1) {
      const node = bucket[0];
      const angle = -90;
      const radius = radiusBase;
      positions.set(node.id, {
        x: cx + radius * Math.cos((angle * Math.PI) / 180),
        y: cy + radius * Math.sin((angle * Math.PI) / 180),
        ring: depth,
        angle,
        radius,
      });
      continue;
    }

    const ordered = [...bucket];
    if (depth === 1) {
      const buildingIndex = ordered.findIndex((node) => node.type === 'building');
      if (buildingIndex > 0) {
        const [building] = ordered.splice(buildingIndex, 1);
        ordered.unshift(building);
      }
    }

    ordered.forEach((node, index) => {
      const angle = -90 + (360 * index) / ordered.length;
      const finalRadius = depth === 0
        ? 0
        : radiusBase * (index % 2 === 0 ? 1.04 : 0.96);
      positions.set(node.id, {
        x: cx + finalRadius * Math.cos((angle * Math.PI) / 180),
        y: cy + finalRadius * Math.sin((angle * Math.PI) / 180),
        ring: depth,
        angle,
        radius: finalRadius,
      });
    });
  }

  return nodes.map((node) => {
    const position = positions.get(node.id) || { x: cx, y: cy, ring: 0, angle: -90, radius: 0 };
    const nodeRadius = node.type === 'category'
      ? GRAPH_CONFIG.NODE_RADIUS.category
      : node.type === 'dynasty' || node.type === 'region'
        ? GRAPH_CONFIG.NODE_RADIUS.meta
        : GRAPH_CONFIG.NODE_RADIUS.default;
    return {
      ...node,
      ...position,
      anchor: 'middle',
      nodeRadius,
      labelLines: splitLabel(node.label),
    };
  });
}

export function neighborIds(edges = [], id) {
  const neighbors = new Set();
  if (!id) return neighbors;
  for (const edge of edges) {
    if (edge.from === id && edge.to !== id) neighbors.add(edge.to);
    if (edge.to === id && edge.from !== id) neighbors.add(edge.from);
  }
  return neighbors;
}

export function clampViewBox(next, initial, content) {
  const initialW = initial?.w ?? GRAPH_CONFIG.CANVAS.width;
  const initialH = initial?.h ?? GRAPH_CONFIG.CANVAS.height;
  const minW = initialW / GRAPH_CONFIG.ZOOM_MAX;
  const maxW = initialW / GRAPH_CONFIG.ZOOM_MIN;

  const w = Math.min(maxW, Math.max(minW, Number(next?.w) || initialW));
  const h = w * (initialH / initialW);

  const box = {
    x: content?.x ?? 0,
    y: content?.y ?? 0,
    w: content?.w ?? initialW,
    h: content?.h ?? initialH,
  };

  const minVisible = 0.3;
  const minX = box.x - w * (1 - minVisible);
  const maxX = box.x + box.w - w * minVisible;
  const minY = box.y - h * (1 - minVisible);
  const maxY = box.y + box.h - h * minVisible;

  const x = Math.min(maxX, Math.max(minX, Number(next?.x) || 0));
  const y = Math.min(maxY, Math.max(minY, Number(next?.y) || 0));

  return { x, y, w, h };
}
/* ==========================================================================
 * 3D 视角模型（T-CARD-09）
 * 仅文件末尾追加：既有 computeLayout / buildGraphModel / selectWithinBudget /
 * neighborIds / clampViewBox 的签名与输出不变。
 * ========================================================================== */

export const GRAPH_3D_CONFIG = Object.freeze({
  PERSPECTIVE: 1100,
  DEFAULT_AZIMUTH: -18,
  DEFAULT_PITCH: -8,
  PITCH_MIN: -30,
  PITCH_MAX: 30,
  AUTO_DEG_PER_SEC: 8,
  AUTO_MIN: 6,
  AUTO_MAX: 12,
  RING_Z: Object.freeze({ 0: 24, 1: 0, 2: -140 }),
  BACKFACE_DEG: 60,
  SETTLE_MS: 600,
  DRAG_AZ_PER_PX: 0.35,
  DRAG_PITCH_PER_PX: 0.25,
  LABEL_MIN_PX: 11,
  FALLBACK_FPS: 45,
  PAN_VISIBLE_MIN: 0.35,
  DRAG_PAN_PER_PX: 1.0,
  ZOOM_MIN: 0.6,
  ZOOM_MAX: 1.8,
  RESET_MS: 520,
  RESET_VIEW: Object.freeze({ azimuth: -18, pitch: -8, scale: 1, panX: 0, panY: 0 }),
  DEPTH_REFRESH_DEG: 0.75,
  BACKFACE_DEPTH_RATIO: -0.18,
  HOVER_RESUME_MS: 3000,
  FORM: Object.freeze({
    wide: 'full3d',
    medium: 'full3d',
    compact: '25d',
    stacked: '2d',
    narrow: '2d',
    minimal: 'list',
  }),
});

function round6(value) {
  return Number(value.toFixed(6));
}

function normalizeSignedAngle(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((numeric + 180) % 360 + 360) % 360 - 180;
}

function angularDistance(a, b) {
  return Math.abs(normalizeSignedAngle(a - b));
}

export function ringDepth(ring) {
  const key = ring === 0 || ring === 1 ? ring : 2;
  return GRAPH_3D_CONFIG.RING_Z[key];
}

export function clampView(next = {}, options = {}) {
  const azimuthRaw = Number(next?.azimuth);
  const pitchRaw = Number(next?.pitch);
  const scaleRaw = Number(next?.scale);
  const zoomMin = options.sphere ? GRAPH_3D_CONFIG.ZOOM_MIN : GRAPH_CONFIG.ZOOM_MIN;
  const zoomMax = options.sphere ? GRAPH_3D_CONFIG.ZOOM_MAX : GRAPH_CONFIG.ZOOM_MAX;

  const azimuth = Number.isFinite(azimuthRaw)
    ? normalizeSignedAngle(azimuthRaw)
    : GRAPH_3D_CONFIG.DEFAULT_AZIMUTH;
  const pitch = Number.isFinite(pitchRaw)
    ? Math.min(GRAPH_3D_CONFIG.PITCH_MAX, Math.max(GRAPH_3D_CONFIG.PITCH_MIN, pitchRaw))
    : GRAPH_3D_CONFIG.DEFAULT_PITCH;
  const scale = Number.isFinite(scaleRaw)
    ? Math.min(zoomMax, Math.max(zoomMin, scaleRaw))
    : 1;

  const base = { azimuth, pitch, scale };
  const hasPan = next?.panX !== undefined || next?.panY !== undefined;
  if (!hasPan) return base;

  return {
    ...base,
    panX: Number.isFinite(Number(next.panX)) ? Number(next.panX) : 0,
    panY: Number.isFinite(Number(next.panY)) ? Number(next.panY) : 0,
  };
}

export function facingAngleDeg(node, view = {}) {
  const angle = Number(node?.angle);
  if (!Number.isFinite(angle)) return 0;
  const azimuthRaw = Number(view?.azimuth);
  const azimuth = Number.isFinite(azimuthRaw) ? azimuthRaw : GRAPH_3D_CONFIG.DEFAULT_AZIMUTH;
  return normalizeSignedAngle(azimuth - angle);
}

export function isBackFacing(node, view = {}) {
  const ring = Number(node?.ring);
  if (!Number.isFinite(ring) || ring <= 0) return false;
  return Math.abs(facingAngleDeg(node, view)) > GRAPH_3D_CONFIG.BACKFACE_DEG;
}

export function segmentTransform(p1 = {}, p2 = {}) {
  const x1 = Number(p1?.x) || 0;
  const y1 = Number(p1?.y) || 0;
  const z1 = Number(p1?.z) || 0;
  const x2 = Number(p2?.x) || 0;
  const y2 = Number(p2?.y) || 0;
  const z2 = Number(p2?.z) || 0;

  const rawX = x2 - x1;
  const rawY = y2 - y1;
  const rawZ = z2 - z1;
  const length = Math.hypot(rawX, rawY, rawZ);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const midZ = (z1 + z2) / 2;

  if (!Number.isFinite(length) || length < 1e-6) {
    return {
      transform: `translate3d(${round6(midX)}px, ${round6(midY)}px, ${round6(midZ)}px)`,
      length: 0,
    };
  }

  const dx = rawX / length;
  const dy = rawY / length;
  const dz = rawZ / length;

  let axisX = 0;
  const axisY = -dz;
  const axisZ = dy;
  const sinTheta = Math.hypot(axisY, axisZ);
  let cosTheta = dx;
  let theta;

  if (sinTheta < 1e-9) {
    cosTheta = Math.min(1, Math.max(-1, cosTheta));
    if (cosTheta > 0) {
      theta = 0;
    } else {
      theta = Math.PI;
      axisX = 0;
      // axis 保持 (0, 1, 0)，用于 180° 反向
    }
  } else {
    theta = Math.atan2(sinTheta, cosTheta);
    axisX = 0;
  }

  const hasAxis = sinTheta >= 1e-9;
  const ax = hasAxis ? axisX : 0;
  const ay = hasAxis ? axisY / sinTheta : 1;
  const az = hasAxis ? axisZ / sinTheta : 0;

  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const t = 1 - c;

  const r11 = c + ax * ax * t;
  const r12 = ax * ay * t - az * s;
  const r13 = ax * az * t + ay * s;
  const r21 = ay * ax * t + az * s;
  const r22 = c + ay * ay * t;
  const r23 = ay * az * t - ax * s;
  const r31 = az * ax * t - ay * s;
  const r32 = az * ay * t + ax * s;
  const r33 = c + az * az * t;

  const matrix = [
    r11 * length, r21 * length, r31 * length, 0,
    r12, r22, r32, 0,
    r13, r23, r33, 0,
    midX, midY, midZ, 1,
  ].map(round6);

  return { transform: `matrix3d(${matrix.join(', ')})`, length: round6(length) };
}

export function projectToScreen(node = {}, view = {}, canvas = {}) {
  void view;
  const width = Number(canvas?.width ?? canvas?.w) || GRAPH_CONFIG.CANVAS.width;
  const height = Number(canvas?.height ?? canvas?.h) || GRAPH_CONFIG.CANVAS.height;
  const k = Math.min(width / GRAPH_CONFIG.CANVAS.width, height / GRAPH_CONFIG.CANVAS.height);
  const dx = (Number(node?.x) || 0) - GRAPH_CONFIG.CANVAS.cx;
  const dy = (Number(node?.y) || 0) - GRAPH_CONFIG.CANVAS.cy;

  return {
    x: round6(dx * k),
    y: round6(dy * k),
    z: round6(ringDepth(node?.ring)),
    k: round6(k),
  };
}

export function ringNavigationTarget(layout = [], activeId, dir) {
  const nodes = Array.isArray(layout) ? layout : [];
  const current = nodes.find((node) => node?.id === activeId);
  if (!current) return null;

  const ring = Number(current.ring);
  if (!Number.isFinite(ring)) return null;

  const ringNodes = nodes
    .filter((node) => Number(node?.ring) === ring)
    .sort((a, b) => Number(a.angle) - Number(b.angle));

  if (dir === 'home') return ringNodes.length > 0 ? ringNodes[0].id : null;
  if (dir === 'end') return ringNodes.length > 0 ? ringNodes[ringNodes.length - 1].id : null;

  if (dir === 'cw' || dir === 'ccw') {
    const others = ringNodes.filter((node) => node.id !== current.id);
    if (others.length === 0) return null;
    const angle = Number(current.angle);
    if (dir === 'cw') {
      const next = others.find((node) => Number(node.angle) > angle);
      return (next ?? others[0]).id;
    }
    const reversed = [...others].reverse();
    const prev = reversed.find((node) => Number(node.angle) < angle);
    return (prev ?? reversed[0]).id;
  }

  if (dir === 'in' || dir === 'out') {
    const step = dir === 'in' ? -1 : 1;
    const angle = Number(current.angle);
    for (let offset = 1; offset <= 2; offset += 1) {
      const targetRing = ring + step * offset;
      const candidates = nodes.filter((node) => Number(node?.ring) === targetRing);
      if (candidates.length === 0) continue;

      let best = candidates[0];
      let bestDistance = angularDistance(Number(best.angle), angle);
      for (const node of candidates.slice(1)) {
        const distance = angularDistance(Number(node.angle), angle);
        if (distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      }
      return best.id;
    }
    return null;
  }

  return null;
}