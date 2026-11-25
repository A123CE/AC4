/**
 * 百科知识图谱面板（SVG，只读）
 *
 * 类名契约（供 T-BG-11 样式实现）：
 * - 面板：.enc-graph-panel / --rail / --list / --animated / --reduced
 * - 头部：.enc-graph-head .enc-graph-title .enc-graph-hint .enc-graph-toggle
 * - 图例：.enc-graph-legend .enc-graph-legend-group .enc-graph-legend-item
 *         .enc-graph-legend-shape .enc-graph-legend-line
 * - 画布：.enc-graph-canvas .enc-graph-svg .enc-graph-edge .enc-graph-node
 *         .enc-graph-node-shape .enc-graph-node-label
 *         状态：.is-active .is-neighbor .is-dimmed .is-selected
 * - 其它：.enc-graph-scale .enc-graph-tools .enc-graph-tool .enc-graph-skip
 *         .enc-graph-empty .enc-graph-fallback .enc-graph-list .enc-graph-skeleton
 * - 数据属性：data-graph-ready data-node-type
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRAPH_CONFIG,
  GRAPH_3D_CONFIG,
  computeLayout,
  neighborIds,
  clampView,
  clampViewBox,
  isGraphNodeKind,
} from '../lib/encyclopediaGraph';
import {
  SPHERE_CONFIG,
  computeSphereLayout,
  projectSphereToPlane,
  resolveSphereForm,
} from '../lib/encyclopediaSphere';
import { isGraphThemeEnabled, isSphereEnabled } from '../lib/featureFlags';
import { supports3D } from '../lib/graphCapability';
import { nextTheme, readGraphTheme, writeGraphTheme } from '../lib/graphTheme';
import { isReadOnlySession } from '../lib/classroomRoute';
import { track } from '../lib/analytics';
import Graph3DScene from './Graph3DScene';

const EDGE_DASH = {
  primary: 'none',
  palace: 'none',
  term: '6 4',
  peer: '2 5',
};

const LEGEND_NODES = [
  ['building', 'encyclopedia.graph.legend.node.building', '建筑'],
  ['term', 'encyclopedia.graph.legend.node.term', '词条'],
  ['category', 'encyclopedia.graph.legend.node.category', '类目'],
  ['dynasty', 'encyclopedia.graph.legend.node.dynasty', '朝代'],
  ['region', 'encyclopedia.graph.legend.node.region', '地区'],
];

const LEGEND_EDGES = [
  ['primary', 'encyclopedia.graph.legend.edge.primary', '主关联'],
  ['palace', 'encyclopedia.graph.legend.edge.palace', '关联建筑'],
  ['term', 'encyclopedia.graph.legend.edge.term', '关联术语'],
  ['peer', 'encyclopedia.graph.legend.edge.peer', '同域'],
];

const INITIAL_VIEWBOX = { x: 0, y: 0, w: GRAPH_CONFIG.CANVAS.width, h: GRAPH_CONFIG.CANVAS.height };

function hexPoints(cx, cy, radius) {
  const points = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function NodeShape({ node }) {
  const radius = node.nodeRadius ?? GRAPH_CONFIG.NODE_RADIUS.default;
  const common = {
    className: `enc-graph-node-shape enc-graph-node-shape--${node.type}`,
    'data-node-type': node.type,
  };

  if (node.type === 'building') {
    return (
      <rect
        {...common}
        x={node.x - radius}
        y={node.y - radius}
        width={radius * 2}
        height={radius * 2}
        rx={3}
      />
    );
  }
  if (node.type === 'category') {
    return <polygon {...common} points={hexPoints(node.x, node.y, radius * 1.15)} />;
  }
  if (node.type === 'dynasty') {
    return (
      <polygon
        {...common}
        points={`${node.x},${node.y - radius} ${node.x + radius},${node.y} ${node.x},${node.y + radius} ${node.x - radius},${node.y}`}
      />
    );
  }
  if (node.type === 'region') {
    return (
      <polygon
        {...common}
        points={`${node.x},${node.y - radius} ${node.x + radius},${node.y + radius} ${node.x - radius},${node.y + radius}`}
      />
    );
  }
  return <circle {...common} cx={node.x} cy={node.y} r={radius} />;
}

const NODE_TYPE_LABELS = {
  term: '词条',
  building: '建筑',
  category: '类目',
  dynasty: '朝代',
  region: '地区',
};

function nodeTextType(node, t) {
  return t(
    `encyclopedia.graph.legend.node.${node.type}`,
    NODE_TYPE_LABELS[node.type] || node.type
  );
}

function buildContentBounds(positioned) {
  if (positioned.length === 0) {
    return {
      x: 0,
      y: 0,
      w: GRAPH_CONFIG.CANVAS.width,
      h: GRAPH_CONFIG.CANVAS.height,
    };
  }
  const xs = positioned.map((node) => node.x);
  const ys = positioned.map((node) => node.y);
  const pad = 48;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) };
}

function GraphPanel({
  model,
  mode = 'docked',
  collapsed = false,
  loading = false,
  failed = false,
  selectedId = null,
  onToggleCollapsed,
  onSelectTerm,
  onOpenBuilding,
  onApplyFilter,
  onClearFilters,
  skipTargetId = 'enc-article',
  viewport = 'stacked',
  viewKind = null,
  t,
}) {
  const nodes = model?.nodes ?? [];
  const edges = model?.edges ?? [];
  const stats = model?.stats ?? { shownNodes: 0, totalNodes: 0, truncated: false };
  const [activeId, setActiveId] = useState(null);
  const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [listView, setListView] = useState(false);
  const [graphView, setGraphView] = useState(() =>
    clampView({
      azimuth: GRAPH_3D_CONFIG.DEFAULT_AZIMUTH,
      pitch: GRAPH_3D_CONFIG.DEFAULT_PITCH,
      scale: 1,
    })
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [degradeLevel, setDegradeLevel] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);
  const dragRef = useRef({ active: false, dragging: false, startX: 0, startY: 0, x: 0, y: 0 });
  const frameRef = useRef(null);

  const sphereOn = isSphereEnabled();
  const themeEnabled = isGraphThemeEnabled();
  const [graphTheme, setGraphTheme] = useState(() => readGraphTheme());
  const toggleGraphTheme = useCallback(() => {
    const next = nextTheme(graphTheme);
    setGraphTheme(writeGraphTheme(next, { readOnly: isReadOnlySession() }));
    track('graph_theme', { stage: next });
  }, [graphTheme]);
  const sphereLayout = useMemo(() => {
    if (!sphereOn) return null;
    return computeSphereLayout(nodes, edges, {
      width: GRAPH_CONFIG.CANVAS.width,
      height: GRAPH_CONFIG.CANVAS.height,
      centerId: model?.centerId ?? null,
      selectedId,
      mode: selectedId ? 'focus' : 'overview',
      includeOrphans: true,
    });
  }, [model, nodes, edges, sphereOn, selectedId]);

  const positioned = useMemo(() => {
    if (!sphereOn) return computeLayout(nodes, edges);
    const cx = GRAPH_CONFIG.CANVAS.width / 2;
    const cy = GRAPH_CONFIG.CANVAS.height / 2;
    return (sphereLayout?.nodes ?? []).map((node) => {
      const plane = projectSphereToPlane(node, GRAPH_CONFIG.CANVAS);
      return {
        ...node,
        x: cx + plane.x,
        y: cy + plane.y,
        ring: node.tier === 'core' ? 0 : node.tier === 'inner' ? 1 : 2,
      };
    });
  }, [model, nodes, edges, sphereOn, sphereLayout]);
  const content = useMemo(() => buildContentBounds(positioned), [positioned]);
  const neighbors = useMemo(
    () => (activeId ? neighborIds(edges, activeId) : new Set()),
    [edges, activeId]
  );

  const supports3d = useMemo(() => supports3D(), []);

  const enc3dEnabled = import.meta.env?.VITE_ENC_3D !== 'off';

  const resolvedKind = useMemo(() => {
    if (!enc3dEnabled) return '2d';
    if (mode === 'list') return 'list';
    if (sceneFailed || degradeLevel >= 3) return '2d';
    if (sphereOn) {
      if (viewport === 'minimal') return 'list';
      if (viewKind) return viewKind;
      return resolveSphereForm(viewport, {
        supports3d,
        reducedMotion: reducedMotion || degradeLevel >= 2,
      });
    }
    const form = viewKind || GRAPH_3D_CONFIG.FORM[viewport] || '2d';
    if (form === 'list') return 'list';
    if (reducedMotion || degradeLevel >= 2) return '25d';
    if (!supports3d) return '2d';
    return form;
  }, [
    enc3dEnabled,
    mode,
    viewKind,
    viewport,
    sceneFailed,
    degradeLevel,
    reducedMotion,
    supports3d,
    sphereOn,
  ]);

  useEffect(() => {
    if (resolvedKind !== 'full3d' || reducedMotion || !autoRotate) return undefined;
    let frames = 0;
    let windowStart = null;
    let lowWindows = 0;
    let raf = null;
    const tick = (timestamp) => {
      if (windowStart === null) windowStart = timestamp;
      frames += 1;
      const elapsed = timestamp - windowStart;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = timestamp;
        lowWindows = fps < (sphereOn ? SPHERE_CONFIG.FALLBACK_FPS : GRAPH_3D_CONFIG.FALLBACK_FPS) ? lowWindows + 1 : 0;
        if (lowWindows >= 3) {
          lowWindows = 0;
          setAutoRotate(false);
          setDegradeLevel((level) => (level >= 2 ? 3 : level + 1));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [resolvedKind, reducedMotion, autoRotate]);

  useEffect(() => {
    if (sceneFailed) {
      track('graph_fallback', { reason: 'render_error', stage: 'render_error' });
    }
  }, [sceneFailed]);

  useEffect(() => {
    const media = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    setReducedMotion(Boolean(media?.matches));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    if (coarse?.matches) setAutoRotate(false);
  }, []);

  useEffect(() => {
    if (!loading && !failed) {
      track('graph_view', {
        stage: mode === 'overview' ? 'overview' : 'detail',
        result_count: stats.shownNodes ?? 0,
      });
    }
  }, [loading, failed, mode, stats.shownNodes]);

  useEffect(() => {
    if (failed) {
      track('graph_fallback', { reason: 'data_missing', stage: 'render_error' });
    }
  }, [failed]);

  const zoom = useCallback(
    (factor) => {
      setViewBox((current) => {
        const nextW = current.w / factor;
        const nextH = current.h / factor;
        return clampViewBox(
          {
            x: current.x + (current.w - nextW) / 2,
            y: current.y + (current.h - nextH) / 2,
            w: nextW,
            h: nextH,
          },
          INITIAL_VIEWBOX,
          content
        );
      });
    },
    [content]
  );

  const resetView = useCallback(() => {
    setViewBox(INITIAL_VIEWBOX);
  }, []);

  const selectNode = useCallback(
    (node) => {
      track('graph_node_click', {
        entity_type: node.type,
        entity_id: node.ref,
        stage: 'detail',
      });
      if (node.type === 'term') onSelectTerm?.(node.ref);
      else if (node.type === 'building') onOpenBuilding?.(node.ref);
      else if (node.type === 'category') onApplyFilter?.({ category: node.ref });
      else if (node.type === 'dynasty') onApplyFilter?.({ dynasty: node.ref });
      else if (node.type === 'region') onApplyFilter?.({ region: node.ref });
    },
    [onSelectTerm, onOpenBuilding, onApplyFilter]
  );

  const toggleCollapsed = () => {
    track('graph_expand', { stage: collapsed ? 'expand' : 'collapse' });
    onToggleCollapsed?.();
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      dragging: false,
      startX: event.clientX,
      startY: event.clientY,
      x: viewBox.x,
      y: viewBox.y,
      pointerId: event.pointerId,
      target: event.currentTarget,
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) < GRAPH_CONFIG.DRAG_CLICK_THRESHOLD) return;
      drag.dragging = true;
      drag.target?.setPointerCapture?.(drag.pointerId);
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = drag.x - (dx / Math.max(rect.width, 1)) * viewBox.w;
    const nextY = drag.y - (dy / Math.max(rect.height, 1)) * viewBox.h;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setViewBox((current) => clampViewBox({ ...current, x: nextX, y: nextY }, INITIAL_VIEWBOX, content));
    });
  };

  const onPointerUp = (event) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (dragRef.current.dragging) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragRef.current.active = false;
    dragRef.current.dragging = false;
  };

  const onWheel = (event) => {
    if (!(event.ctrlKey || event.metaKey || event.currentTarget.matches(':focus-within'))) {
      return;
    }
    event.preventDefault();
    zoom(event.deltaY > 0 ? 0.9 : 1.1);
  };

  const onKeyDown = (event) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom(1.2);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoom(1 / 1.2);
    } else if (event.key === '0') {
      event.preventDefault();
      resetView();
    } else if (event.key === 'Escape') {
      setActiveId(null);
    }
  };

  const panelClass = [
    'enc-graph-panel',
    mode === 'collapsed' ? 'enc-graph-panel--rail' : '',
    mode === 'list' ? 'enc-graph-panel--list' : '',
    reducedMotion ? 'enc-graph-panel--reduced' : 'enc-graph-panel--animated',
    resolvedKind === '25d' ? 'enc-graph-panel--25d' : '',
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <aside className={`${panelClass} enc-graph-panel--loading`} aria-busy="true">
        <div className="enc-graph-skeleton" aria-hidden="true" />
        <p className="enc-graph-scale">{t('encyclopedia.graph.loading', '知识图谱加载中')}</p>
      </aside>
    );
  }

  if (mode === 'collapsed') {
    return (
      <aside className={panelClass}>
        <button type="button" className="enc-graph-toggle enc-graph-toggle--rail" onClick={toggleCollapsed}>
          <span>{t('encyclopedia.graph.expand', '展开图谱')}</span>
          <span className="enc-graph-toggle-icon" aria-hidden="true">▸</span>
        </button>
      </aside>
    );
  }

  if (failed) {
    return (
      <aside className={panelClass} data-graph-ready="false">
        <div className="enc-graph-fallback">
          <p>{t('encyclopedia.graph.fallback', '图谱暂不可用，已切换为关联列表')}</p>
          <ul className="enc-graph-list">
            {nodes.slice(0, 20).map((node) => (
              <li key={node.id}>
                <button type="button" onClick={() => selectNode(node)}>{node.label}</button>
              </li>
            ))}
          </ul>
          <button type="button" className="enc-graph-tool" onClick={onClearFilters}>
            {t('encyclopedia.filter.reset', '清除筛选')}
          </button>
        </div>
      </aside>
    );
  }

  if (nodes.length === 0) {
    return (
      <aside className={panelClass} data-graph-ready="true">
        <div className="enc-graph-empty">
          <p>{t('encyclopedia.graph.empty', '当前筛选下暂无可展示的关联')}</p>
          <button type="button" className="enc-graph-tool" onClick={onClearFilters}>
            {t('encyclopedia.filter.reset', '清除筛选')}
          </button>
        </div>
      </aside>
    );
  }

  if (mode === 'list' || listView || resolvedKind === 'list') {
    return (
      <aside className={panelClass} data-graph-ready="true">
        <header className="enc-graph-head">
          <h3 className="enc-graph-title">{t('encyclopedia.graph.title', '知识图谱')}</h3>
        </header>
        <ul className="enc-graph-list">
          {nodes.slice(0, 40).map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => selectNode(node)}>{node.label}</button>
            </li>
          ))}
        </ul>
        {mode !== 'list' && (
          <button type="button" className="enc-graph-tool" onClick={() => setListView(false)}>
            {t('encyclopedia.graph.title', '知识图谱')}
          </button>
        )}
      </aside>
    );
  }

  if (resolvedKind === 'full3d') {
    return (
      <aside
        className={`${panelClass} enc-graph-panel--3d`}
        data-graph-ready="true"
        data-graph-theme={themeEnabled ? graphTheme : undefined}
        aria-label={t('encyclopedia.graph.title', '知识图谱')}
      >
        <a className="enc-graph-skip" href={`#${skipTargetId}`}>
          {t('encyclopedia.graph.skip', '跳至正文')}
        </a>

        <header className="enc-graph-head">
          <h3 className="enc-graph-title">{t('encyclopedia.graph.title', '知识图谱')}</h3>
          <p className="enc-graph-hint">
            {t('encyclopedia.graph.hint', '从一座建筑或一个构件出发，沿连线继续阅读')}
          </p>
          <button type="button" className="enc-graph-toggle" onClick={toggleCollapsed}>
            {t('encyclopedia.graph.collapse', '收起图谱')}
          </button>
        </header>

        {themeEnabled && (
          <p className="enc-graph-scale" aria-live="polite" data-graph-theme-live="true">
            {t('encyclopedia.graph3d.themeCurrent', '当前主题：{theme}', {
              theme: graphTheme === 'light' ? '浅色' : '深色',
            })}
          </p>
        )}

        <Scene3DBoundary onError={() => setSceneFailed(true)}>
          <Graph3DScene
            nodes={positioned}
            edges={edges}
            centerId={model.centerId}
            selectedId={selectedId}
            activeId={activeId}
            neighbors={neighbors}
            view={graphView}
            autoRotate={autoRotate}
            reducedMotion={reducedMotion}
            onViewChange={(next) => setGraphView(next)}
            onNodeActivate={selectNode}
            onNodeFocus={setActiveId}
            onRotateToggle={(next) => setAutoRotate(next)}
            onReset={() => setGraphView(clampView(SPHERE_CONFIG.RESET_VIEW))}
            sphereEnabled={sphereOn}
            graphTheme={themeEnabled ? graphTheme : 'dark'}
            themeToggle={themeEnabled}
            onToggleTheme={toggleGraphTheme}
            t={t}
          />
        </Scene3DBoundary>

        {stats.truncated && (
          <p className="enc-graph-scale" aria-live="polite">
            {t('encyclopedia.graph.scale', '已展示 {shown} / 共 {total} 个节点', {
              shown: stats.shownNodes,
              total: stats.totalNodes,
            })}
          </p>
        )}

        {sphereLayout?.orphanIds?.length > 0 && (
          <p className="enc-graph-scale" data-graph-orphans="true">
            {t('encyclopedia.graph.orphans', '另有 {count} 个孤立节点仅在列表中展示', {
              count: sphereLayout.orphanIds.length,
            })}
          </p>
        )}

        <div className="enc-graph-tools">
          <button type="button" className="enc-graph-tool" onClick={() => setListView(true)}>
            {t('encyclopedia.graph.listView', '列表视图')}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={panelClass}
      data-graph-ready="true"
      onKeyDown={onKeyDown}
      aria-label={t('encyclopedia.graph.title', '知识图谱')}
    >
      <a className="enc-graph-skip" href={`#${skipTargetId}`}>
        {t('encyclopedia.graph.skip', '跳至正文')}
      </a>

      <header className="enc-graph-head">
        <h3 className="enc-graph-title">{t('encyclopedia.graph.title', '知识图谱')}</h3>
        <p className="enc-graph-hint">
          {t('encyclopedia.graph.hint', '从一座建筑或一个构件出发，沿连线继续阅读')}
        </p>
        <button type="button" className="enc-graph-toggle" onClick={toggleCollapsed}>
          {t('encyclopedia.graph.collapse', '收起图谱')}
        </button>
      </header>

      {sphereOn && resolvedKind === '2d' && (
        <p className="enc-graph-scale" aria-live="polite" data-graph-plane="true">
          {t('encyclopedia.graph.planeMode', '已切换为平面视图，功能不变')}
        </p>
      )}

      {sphereLayout?.orphanIds?.length > 0 && (
        <p className="enc-graph-scale" data-graph-orphans="true">
          {t('encyclopedia.graph.orphans', '另有 {count} 个孤立节点仅在列表中展示', {
            count: sphereLayout.orphanIds.length,
          })}
        </p>
      )}

      <div className="enc-graph-legend" aria-hidden="true">
        <div className="enc-graph-legend-group">
          {LEGEND_NODES.map(([type, key, fallback]) => (
            <span key={type} className="enc-graph-legend-item">
              <span className={`enc-graph-legend-shape enc-graph-legend-shape--${type}`} />
              {t(key, fallback)}
            </span>
          ))}
        </div>
        <div className="enc-graph-legend-group">
          {LEGEND_EDGES.map(([kind, key, fallback]) => (
            <span key={kind} className="enc-graph-legend-item">
              <span
                className={`enc-graph-legend-line enc-graph-legend-line--${kind}`}
                style={{ strokeDasharray: EDGE_DASH[kind] }}
              />
              {t(key, fallback)}
            </span>
          ))}
        </div>
      </div>

      <div className="enc-graph-canvas">
        <svg
          className="enc-graph-svg"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          role="group"
          aria-label={t('encyclopedia.graph.title', '知识图谱')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <g className="enc-graph-edges" aria-hidden="true">
            {edges.map((edge) => {
              const from = positioned.find((node) => node.id === edge.from);
              const to = positioned.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={edge.id}
                  className={`enc-graph-edge enc-graph-edge--${edge.kind}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeDasharray={EDGE_DASH[edge.kind]}
                />
              );
            })}
          </g>
          <g className="enc-graph-nodes">
            {positioned.map((node) => {
              const isActive = activeId === node.id;
              const isNeighbor = neighbors.has(node.id);
              const isDimmed = Boolean(activeId) && !isActive && !isNeighbor;
              const isSelected = selectedId === node.id;
              const isCenter = model.centerId === node.id;
              const typeLabel = nodeTextType(node, t);
              const aria = t('encyclopedia.graph.nodeLabel', '{type}：{label}', {
                type: typeLabel,
                label: node.label,
              });
              return (
                <g
                  key={node.id}
                  className={`enc-graph-node${isCenter ? ' is-center' : ''}`}
                  data-node-type={node.type}
                  role="button"
                  tabIndex={0}
                  aria-label={aria}
                  onClick={() => selectNode(node)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectNode(node);
                    }
                  }}
                  onMouseEnter={() => setActiveId(node.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(node.id)}
                  onBlur={() => setActiveId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{node.label}</title>
                  <NodeShape node={node} />
                  <text
                    className="enc-graph-node-label"
                    x={node.x}
                    y={node.y + GRAPH_CONFIG.LABEL_OFFSET}
                    textAnchor="middle"
                  >
                    {node.labelLines?.map((line, index) => (
                      <tspan key={index} x={node.x} dy={index === 0 ? 0 : 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  {(isActive || isNeighbor || isDimmed || isSelected) && (
                    <circle
                      className="enc-graph-node-hit"
                      cx={node.x}
                      cy={node.y}
                      r={(node.nodeRadius ?? 14) + 6}
                      fill="none"
                      aria-hidden="true"
                    />
                  )}
                  <circle
                    className={[
                      'enc-graph-node-state',
                      isActive ? 'is-active' : '',
                      isNeighbor ? 'is-neighbor' : '',
                      isDimmed ? 'is-dimmed' : '',
                      isSelected ? 'is-selected' : '',
                    ].filter(Boolean).join(' ')}
                    cx={node.x}
                    cy={node.y}
                    r={0}
                    aria-hidden="true"
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {stats.truncated && (
        <p className="enc-graph-scale" aria-live="polite">
          {t('encyclopedia.graph.scale', '已展示 {shown} / 共 {total} 个节点', {
            shown: stats.shownNodes,
            total: stats.totalNodes,
          })}
        </p>
      )}

      <div className="enc-graph-tools">
        <button type="button" className="enc-graph-tool" onClick={() => zoom(1.2)}>
          {t('encyclopedia.graph.zoomIn', '放大')}
        </button>
        <button type="button" className="enc-graph-tool" onClick={() => zoom(1 / 1.2)}>
          {t('encyclopedia.graph.zoomOut', '缩小')}
        </button>
        <button type="button" className="enc-graph-tool" onClick={resetView}>
          {t('encyclopedia.graph.reset', '复位视图')}
        </button>
        <button type="button" className="enc-graph-tool" onClick={() => setListView(true)}>
          {t('encyclopedia.graph.listView', '列表视图')}
        </button>
      </div>
    </aside>
  );
}

class Scene3DBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (typeof this.props.onError === 'function') this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

class GraphErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // 渲染错误的降级展示由本边界负责；埋点统一由 GraphPanel 的 failed 分支上报
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function EncyclopediaKnowledgeGraph(props) {
  if (!props?.model) {
    return null;
  }
  const fallback = (
    <aside className="enc-graph-panel" data-graph-ready="false">
      <div className="enc-graph-fallback">
        <p>{props.t?.('encyclopedia.graph.fallback', '图谱暂不可用，已切换为关联列表')}</p>
        <button type="button" className="enc-graph-tool" onClick={props.onClearFilters}>
          {props.t?.('encyclopedia.filter.reset', '清除筛选')}
        </button>
      </div>
    </aside>
  );
  return (
    <GraphErrorBoundary fallback={fallback}>
      <GraphPanel {...props} />
    </GraphErrorBoundary>
  );
}