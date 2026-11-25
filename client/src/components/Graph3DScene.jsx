/**
 * 3D 知识图谱场景（球面版 · 批次 D / T-G3D-05~10）
 *
 * 关键约束：
 * - 分层 DOM：stage（透视）/ pan（平移）/ world（缩放 + 旋转）/ edges + nodes
 * - 纯 CSS 3D：无位图画布、无绘图上下文、无三维渲染库（选型 A′）
 * - 旋转/平移只写 CSS 变量，不逐帧 setState
 * - VITE_ENC_SPHERE=off 时回退到旧环状投影（与改造前一致）
 * - 邻接高亮只切类名，不改变节点 DOM 顺序
 */
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GRAPH_CONFIG,
  GRAPH_3D_CONFIG,
  clampView,
  isBackFacing,
  ringNavigationTarget,
  segmentTransform,
  projectToScreen,
} from '../lib/encyclopediaGraph';
import {
  SPHERE_CONFIG,
  clampPan,
  computeSphereLayout,
  lerpView,
  projectSphere,
  resolveCoreAnchor,
} from '../lib/encyclopediaSphere';
import { isSphereEnabled } from '../lib/featureFlags';
import { createRafLoop } from '../lib/raf';
import { createThrottle } from '../lib/trackThrottle';
import { track } from '../lib/analytics';
import I18nContext from '../context/I18nContext';
import Graph3DControls from './Graph3DControls';
import SphereResetButton from './SphereResetButton';
import zhCN from '../i18n/zh-CN.json';

const NODE_TYPE_META = {
  term: ['encyclopedia.graph.legend.node.term', '词条'],
  building: ['encyclopedia.graph.legend.node.building', '建筑'],
  category: ['encyclopedia.graph.legend.node.category', '类目'],
  dynasty: ['encyclopedia.graph.legend.node.dynasty', '朝代'],
  region: ['encyclopedia.graph.legend.node.region', '地区'],
};

const DEFAULT_VIEW = {
  azimuth: GRAPH_3D_CONFIG.DEFAULT_AZIMUTH,
  pitch: GRAPH_3D_CONFIG.DEFAULT_PITCH,
  scale: 1,
};

const VERTICAL_RATIO = 1.732;
const WHEEL_PAUSE_MS = 300;
const CLICK_SUPPRESS_MS = 120;
const KEY_AZ_STEP = 6;
const KEY_PITCH_STEP = 4;
const KEY_PAN_STEP = 12;

function lookupPath(dict, key) {
  return String(key)
    .split('.')
    .reduce((current, part) => (current == null ? current : current[part]), dict);
}

function fallbackT(key, fallback, vars) {
  const value = lookupPath(zhCN, key) ?? fallback ?? key;
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function readSize(canvas) {
  return {
    width: Number(canvas?.width) || GRAPH_CONFIG.CANVAS.width,
    height: Number(canvas?.height) || GRAPH_CONFIG.CANVAS.height,
  };
}

function shortestDelta(from, to) {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

export default function Graph3DScene({
  nodes = [],
  edges = [],
  centerId = null,
  selectedId = null,
  activeId = null,
  neighbors,
  view,
  autoRotate = false,
  reducedMotion = false,
  canvas,
  onViewChange,
  onNodeActivate,
  onNodeFocus,
  onRotateToggle,
  onReset,
  panMode: panModeProp,
  onPanModeChange,
  sphereEnabled,
  graphTheme = 'dark',
  themeToggle = false,
  onToggleTheme,
  t: tProp,
}) {
  const context = useContext(I18nContext);
  const t = tProp || context?.t || fallbackT;
  const hintId = useId();

  const sphereOn = sphereEnabled ?? isSphereEnabled();
  const clampLive = useCallback((next) => clampView(next, { sphere: sphereOn }), [sphereOn]);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const panRef = useRef(null);
  const worldRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const dragRef = useRef(null);
  const inertiaRef = useRef(null);
  const wheelTimerRef = useRef(null);
  const clickTimerRef = useRef(null);
  const resetRafRef = useRef(null);
  const resetTokenRef = useRef(0);
  const depthRef = useRef({ azimuth: Number.NaN, pitch: Number.NaN, frame: 0 });
  const dragThrottleRef = useRef(createThrottle(500));
  const panRefValue = useRef({ x: 0, y: 0 });
  const liveViewRef = useRef(
    clampLive({
      azimuth: view?.azimuth ?? DEFAULT_VIEW.azimuth,
      pitch: view?.pitch ?? DEFAULT_VIEW.pitch,
      scale: view?.scale ?? DEFAULT_VIEW.scale,
    })
  );

  const [size, setSize] = useState(() => readSize(canvas));
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );
  const [inView, setInView] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [wheelPaused, setWheelPaused] = useState(false);
  const [panModeInternal, setPanModeInternal] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(() => (activeId ? String(activeId) : null));
  const [pickedId, setPickedId] = useState(() =>
    selectedId ? String(selectedId) : activeId ? String(activeId) : null
  );
  const [tabStopId, setTabStopId] = useState(
    () => String(activeId || selectedId || centerId || nodes[0]?.id || '')
  );
  const tabStopRef = useRef(tabStopId);

  const panMode = panModeProp ?? panModeInternal;

  const initial = liveViewRef.current;
  const stageLabel = t('encyclopedia.graph3d.stageLabel', '三维知识图谱');
  const hint = sphereOn
    ? t(
        'encyclopedia.graph3d.hintSphere',
        '拖动旋转，Shift/平移模式拖动可移动球体，滚轮缩放，Enter 选中节点'
      )
    : t('encyclopedia.graph3d.hint', '拖动旋转，滚轮缩放，点节点继续阅读');

  const layout = useMemo(() => {
    if (!sphereOn) return null;
    return computeSphereLayout(nodes, edges, {
      width: size.width,
      height: size.height,
      centerId,
      selectedId: pickedId || selectedId,
      mode: pickedId || selectedId ? 'focus' : 'overview',
    });
  }, [sphereOn, nodes, edges, size.width, size.height, centerId, pickedId, selectedId]);

  const renderNodes = layout?.nodes ?? nodes;
  const sphereRadius = layout?.sphereRadius ?? 1;
  const coreAnchor = useMemo(
    () =>
      resolveCoreAnchor({
        selectedId: pickedId,
        centerId,
        modelMode: pickedId ? 'focus' : 'overview',
      }),
    [pickedId, centerId]
  );

  const projected = useMemo(() => {
    const map = new Map();
    for (const node of renderNodes) {
      map.set(
        node.id,
        sphereOn
          ? { x: round(node.x), y: round(node.y), z: round(node.z) }
          : projectToScreen(node, {}, size)
      );
    }
    return map;
  }, [renderNodes, size, sphereOn]);

  const edgeItems = useMemo(
    () =>
      edges.map((edge, index) => {
        const from = projected.get(edge.from) ?? { x: 0, y: 0, z: 0 };
        const to = projected.get(edge.to) ?? { x: 0, y: 0, z: 0 };
        return {
          key: `${edge.kind || 'edge'}-${index}`,
          kind: edge.kind || 'term',
          transform: segmentTransform(from, to).transform,
        };
      }),
    [edges, projected]
  );

  const writeVars = useCallback((next) => {
    const world = worldRef.current;
    const pan = panRef.current;
    for (const node of [world, pan]) {
      if (!node) continue;
      node.style.setProperty('--g3d-az', `${round(next.azimuth)}deg`);
      node.style.setProperty('--g3d-pitch', `${round(next.pitch)}deg`);
      node.style.setProperty('--g3d-scale', `${round(next.scale)}`);
      node.style.setProperty('--g3d-inv-scale', `${round(1 / Math.max(next.scale, 0.9))}`);
      node.style.setProperty('--g3d-chip-inv-scale', `${round(1 / Math.max(next.scale, 0.01))}`);
      node.style.setProperty('--g3d-px', `${round(panRefValue.current.x)}px`);
      node.style.setProperty('--g3d-py', `${round(panRefValue.current.y)}px`);
    }
  }, []);

  const writeWorld = useCallback(
    (next, azimuthOnly = false) => {
      const world = worldRef.current;
      if (!world) return;
      world.style.setProperty('--g3d-az', `${round(next.azimuth)}deg`);
      if (azimuthOnly) return;
      world.style.setProperty('--g3d-pitch', `${round(next.pitch)}deg`);
      world.style.setProperty('--g3d-scale', `${round(next.scale)}`);
      world.style.setProperty('--g3d-inv-scale', `${round(1 / Math.max(next.scale, 0.9))}`);
      world.style.setProperty('--g3d-chip-inv-scale', `${round(1 / Math.max(next.scale, 0.01))}`);
      if (panRef.current) {
        panRef.current.style.setProperty('--g3d-az', `${round(next.azimuth)}deg`);
        panRef.current.style.setProperty('--g3d-pitch', `${round(next.pitch)}deg`);
        panRef.current.style.setProperty('--g3d-scale', `${round(next.scale)}`);
        panRef.current.style.setProperty('--g3d-px', `${round(panRefValue.current.x)}px`);
        panRef.current.style.setProperty('--g3d-py', `${round(panRefValue.current.y)}px`);
      }
    },
    []
  );

  const writeAzPitch = useCallback((next) => {
    const world = worldRef.current;
    if (!world) return;
    world.style.setProperty('--g3d-az', `${round(next.azimuth)}deg`);
    world.style.setProperty('--g3d-pitch', `${round(next.pitch)}deg`);
    if (panRef.current) {
      panRef.current.style.setProperty('--g3d-az', `${round(next.azimuth)}deg`);
      panRef.current.style.setProperty('--g3d-pitch', `${round(next.pitch)}deg`);
    }
  }, []);

  const writePan = useCallback(() => {
    const pan = panRef.current;
    if (!pan) return;
    pan.style.setProperty('--g3d-px', `${round(panRefValue.current.x)}px`);
    pan.style.setProperty('--g3d-py', `${round(panRefValue.current.y)}px`);
  }, []);

  const refreshBackfacing = useCallback(
    (azimuth, pitch = liveViewRef.current.pitch, force = false) => {
      if (sphereOn && !force) {
        const last = depthRef.current;
        const delta =
          Math.abs(shortestDelta(last.azimuth, azimuth)) + Math.abs((last.pitch || 0) - pitch);
        if (Number.isFinite(last.azimuth) && delta < SPHERE_CONFIG.DEPTH_REFRESH_DEG) return;
        depthRef.current = { azimuth, pitch, frame: 0 };
      }
      for (const node of renderNodes) {
        const element = nodeRefs.current.get(node.id);
        if (!element) continue;
        const back = sphereOn
          ? projectSphere(node, { azimuth, pitch }, sphereRadius).facing === 'back'
          : isBackFacing(node, { azimuth });
        const next = String(back);
        if (element.dataset.backfacing !== next) element.dataset.backfacing = next;
        if (sphereOn) {
          const isStop = !back && node.id === tabStopRef.current;
          const nextTab = isStop ? 0 : -1;
          if (element.tabIndex !== nextTab) element.tabIndex = nextTab;
          if (back && node.id === tabStopRef.current) {
            const candidate =
              renderNodes.find(
                (item) =>
                  item.id !== node.id &&
                  nodeRefs.current.get(item.id)?.dataset.backfacing !== 'true'
              ) || renderNodes.find((item) => item.id !== node.id);
            if (candidate && candidate.id !== tabStopRef.current) {
              tabStopRef.current = candidate.id;
              setTabStopId(candidate.id);
            }
          }
        }
      }
    },
    [renderNodes, sphereOn, sphereRadius]
  );

  useEffect(() => {
    setSize(readSize(canvas));
  }, [canvas]);

  useEffect(() => {
    if (!view) return;
    const next = clampLive(view);
    liveViewRef.current = next;
    writeWorld(next);
    refreshBackfacing(next.azimuth, next.pitch, true);
  }, [view, writeWorld, refreshBackfacing]);

  useEffect(() => {
    refreshBackfacing(liveViewRef.current.azimuth, liveViewRef.current.pitch, true);
  }, [refreshBackfacing]);

  useEffect(() => {
    if (activeId === undefined) return;
    setActiveNodeId(activeId ? String(activeId) : null);
    if (activeId) setTabStopId(String(activeId));
  }, [activeId]);

  useEffect(() => {
    tabStopRef.current = tabStopId;
  }, [tabStopId]);

  useEffect(() => {
    if (!selectedId) return;
    setPickedId(String(selectedId));
  }, [selectedId]);

  useEffect(() => {
    const onVisibility = () => setDocumentVisible(!document.hidden);
    if (typeof document === 'undefined') return undefined;
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const node = sectionRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (records) => {
        const record = records[records.length - 1];
        if (!record) return;
        setInView(record.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25, 0.5, 1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !stageRef.current) return undefined;
    const observer = new ResizeObserver((records) => {
      const record = records[records.length - 1];
      const box = record?.contentRect;
      if (!box || !box.width || !box.height) return;
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      if (resetRafRef.current) cancelAnimationFrame(resetRafRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (typeof document !== 'undefined') document.body.classList.remove('enc-no-select');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const perfEnabled =
      Boolean(import.meta.env?.DEV) ||
      (typeof window.location?.search === 'string' && window.location.search.includes('perf=1'));
    if (!perfEnabled) return undefined;
    window.__encGraph3dPerf = {
      nodes: nodes.length,
      edges: edges.length,
      frames: 0,
      view: { ...liveViewRef.current },
    };
    return () => {
      delete window.__encGraph3dPerf;
    };
  }, [nodes.length, edges.length]);

  const paused =
    !autoRotate ||
    reducedMotion ||
    hovering ||
    focusWithin ||
    !documentVisible ||
    !inView ||
    dragging ||
    wheelPaused;

  useEffect(() => {
    if (paused) return undefined;
    let last = null;
    const loop = createRafLoop((timestamp) => {
      if (last === null) {
        last = timestamp;
        return;
      }
      const delta = Math.min(100, Math.max(0, timestamp - last));
      last = timestamp;
      const current = liveViewRef.current;
      const next = clampLive({
        azimuth: current.azimuth + GRAPH_3D_CONFIG.AUTO_DEG_PER_SEC * (delta / 1000),
        pitch: current.pitch,
        scale: current.scale,
      });
      liveViewRef.current = next;
      writeWorld(next, true);
      refreshBackfacing(next.azimuth, next.pitch);
    });
    loop.start();
    return () => loop.stop();
  }, [paused, writeWorld, refreshBackfacing]);

  const applyView = useCallback(
    (next, source, notify = true) => {
      const clamped = clampLive(next);
      liveViewRef.current = clamped;
      writeWorld(clamped);
      refreshBackfacing(clamped.azimuth, clamped.pitch, true);
      if (notify) onViewChange?.(clamped, source);
    },
    [writeWorld, refreshBackfacing, onViewChange]
  );

  useEffect(() => {
    if (!sphereOn) return;
    const clamped = clampPan(panRefValue.current, {
      width: size.width,
      height: size.height,
      sphereScreenRadius: sphereRadius * liveViewRef.current.scale,
    });
    panRefValue.current = clamped;
    writePan();
  }, [size.width, size.height, sphereRadius, sphereOn, writePan]);

  const focusNode = useCallback(
    (id) => {
      if (!id) return;
      setTabStopId(id);
      setActiveNodeId(id);
      onNodeFocus?.(id);
      nodeRefs.current.get(id)?.focus?.();
    },
    [onNodeFocus]
  );

  const navigate = useCallback(
    (direction) => {
      if (!activeNodeId) {
        const fallback = tabStopId || nodes[0]?.id;
        if (fallback) focusNode(fallback);
        return;
      }
      const target = ringNavigationTarget(nodes, activeNodeId, direction);
      if (target) focusNode(target);
    },
    [activeNodeId, tabStopId, nodes, focusNode]
  );

  const selectNode = useCallback(
    (id) => {
      setPickedId(id ? String(id) : null);
      const node = nodes.find((item) => String(item.id) === String(id));
      if (node) {
        setActiveNodeId(node.id);
        setTabStopId(node.id);
        onNodeActivate?.(node);
      }
    },
    [nodes, onNodeActivate]
  );

  const resetSphere = useCallback(
    (source = 'toolbar') => {
      const stage = source === 'keyboard' ? 'keyboard' : source === 'screen' ? 'toolbar' : source;
      const from = {
        ...liveViewRef.current,
        panX: panRefValue.current.x,
        panY: panRefValue.current.y,
      };
      const to = SPHERE_CONFIG.RESET_VIEW;
      const token = ++resetTokenRef.current;
      if (resetRafRef.current) cancelAnimationFrame(resetRafRef.current);
      if (reducedMotion || !sphereOn) {
        liveViewRef.current = clampLive({ azimuth: to.azimuth, pitch: to.pitch, scale: to.scale });
        panRefValue.current = { x: to.panX, y: to.panY };
        writeWorld(liveViewRef.current);
        writePan();
        refreshBackfacing(to.azimuth, to.pitch, true);
        onViewChange?.(liveViewRef.current, 'reset');
      } else {
        const startedAt = Date.now();
        const step = () => {
          if (token !== resetTokenRef.current) return;
          const progress = Math.min(1, (Date.now() - startedAt) / SPHERE_CONFIG.RESET_MS);
          const eased = 1 - (1 - progress) ** 3;
          const next = lerpView(from, to, eased);
          liveViewRef.current = clampLive({
            azimuth: next.azimuth,
            pitch: next.pitch,
            scale: next.scale,
          });
          panRefValue.current = { x: next.panX, y: next.panY };
          writeWorld(liveViewRef.current);
          writePan();
          refreshBackfacing(next.azimuth, next.pitch, true);
          if (progress < 1) {
            resetRafRef.current = requestAnimationFrame(step);
          } else {
            resetRafRef.current = null;
            liveViewRef.current = clampLive({
              azimuth: to.azimuth,
              pitch: to.pitch,
              scale: to.scale,
            });
            panRefValue.current = { x: to.panX, y: to.panY };
            writeWorld(liveViewRef.current);
            writePan();
            onViewChange?.(liveViewRef.current, 'reset');
          }
        };
        resetRafRef.current = requestAnimationFrame(step);
      }
      track('graph_reset', {
        entity_type: 'graph',
        entity_id: 'encyclopedia',
        stage,
      });
      onReset?.();
    },
    [reducedMotion, sphereOn, writeWorld, writePan, refreshBackfacing, onViewChange, onReset]
  );

  const handleKeyDown = (event) => {
    const key = event.key;
    const alt = event.altKey;
    if (alt && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
      event.preventDefault();
      navigate(
        key === 'ArrowLeft' ? 'ccw' : key === 'ArrowRight' ? 'cw' : key === 'ArrowUp' ? 'in' : 'out'
      );
      return;
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const step =
        key === 'ArrowLeft' ? -KEY_AZ_STEP : KEY_AZ_STEP;
      if (event.shiftKey && sphereOn) {
        panRefValue.current = clampPan(
          { x: panRefValue.current.x + (key === 'ArrowLeft' ? -KEY_PAN_STEP : KEY_PAN_STEP), y: panRefValue.current.y },
          { width: size.width, height: size.height, sphereScreenRadius: sphereRadius * liveViewRef.current.scale }
        );
        writePan();
        track('graph_drag', { entity_type: 'graph', entity_id: 'encyclopedia', stage: 'keyboard_pan' });
        return;
      }
      applyView(
        { ...liveViewRef.current, azimuth: liveViewRef.current.azimuth + step },
        'keyboard'
      );
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      if (event.shiftKey && sphereOn) {
        panRefValue.current = clampPan(
          { x: panRefValue.current.x, y: panRefValue.current.y + (key === 'ArrowUp' ? -KEY_PAN_STEP : KEY_PAN_STEP) },
          { width: size.width, height: size.height, sphereScreenRadius: sphereRadius * liveViewRef.current.scale }
        );
        writePan();
        track('graph_drag', { entity_type: 'graph', entity_id: 'encyclopedia', stage: 'keyboard_pan' });
        return;
      }
      applyView(
        {
          ...liveViewRef.current,
          pitch: liveViewRef.current.pitch + (key === 'ArrowUp' ? KEY_PITCH_STEP : -KEY_PITCH_STEP),
        },
        'keyboard'
      );
      return;
    }
    if (key === 'Home' || key === 'End' || key === '0') {
      event.preventDefault();
      resetSphere('keyboard');
      return;
    }
    if (key === 'Enter' || key === ' ') {
      if (activeNodeId) {
        event.preventDefault();
        selectNode(activeNodeId);
      }
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      setPickedId(null);
      setActiveNodeId(null);
      onNodeFocus?.(null);
      return;
    }
    if (key === '+' || key === '=') {
      event.preventDefault();
      applyView({ ...liveViewRef.current, scale: liveViewRef.current.scale * 1.2 }, 'button');
      return;
    }
    if (key === '-') {
      event.preventDefault();
      applyView({ ...liveViewRef.current, scale: liveViewRef.current.scale / 1.2 }, 'button');
    }
  };

  const handleNodeActivate = (node) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    selectNode(node.id);
  };

  const handleNodeClick = (event, node) => {
    event.stopPropagation();
    handleNodeActivate(node);
  };

  const handleStageClickCapture = (event) => {
    if (!clickTimerRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
    if (resetRafRef.current) {
      cancelAnimationFrame(resetRafRef.current);
      resetRafRef.current = null;
      resetTokenRef.current += 1;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: Date.now(),
      baseView: { ...liveViewRef.current },
      basePan: { ...panRefValue.current },
      mode: panMode || event.shiftKey ? 'pan' : 'rotate',
      active: false,
      vx: 0,
      vy: 0,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.active) {
      if (Math.hypot(dx, dy) < GRAPH_CONFIG.DRAG_CLICK_THRESHOLD) return;
      if (drag.mode === 'rotate' && Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO) {
        dragRef.current = null;
        return;
      }
      drag.active = true;
      setDragging(true);
      try {
        stageRef.current?.setPointerCapture?.(drag.pointerId);
      } catch {
        /* 旧浏览器无指针捕获 */
      }
      if (typeof document !== 'undefined') document.body.classList.add('enc-no-select');
    }

    const now = Date.now();
    const delta = Math.max(1, now - drag.lastT);
    drag.vx = (event.clientX - drag.lastX) / delta;
    drag.vy = (event.clientY - drag.lastY) / delta;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastT = now;

    if (drag.mode === 'pan' && sphereOn) {
      panRefValue.current = clampPan(
        {
          x: drag.basePan.x + dx * SPHERE_CONFIG.DRAG_PAN_PER_PX,
          y: drag.basePan.y + dy * SPHERE_CONFIG.DRAG_PAN_PER_PX,
        },
        {
          width: size.width,
          height: size.height,
          sphereScreenRadius: sphereRadius * liveViewRef.current.scale,
        }
      );
      writePan();
      refreshBackfacing(liveViewRef.current.azimuth, liveViewRef.current.pitch);
      return;
    }

    const next = clampLive({
      azimuth: drag.baseView.azimuth + dx * GRAPH_3D_CONFIG.DRAG_AZ_PER_PX,
      pitch: drag.baseView.pitch - dy * GRAPH_3D_CONFIG.DRAG_PITCH_PER_PX,
      scale: drag.baseView.scale,
    });
    liveViewRef.current = next;
    writeAzPitch(next);
    refreshBackfacing(next.azimuth, next.pitch);
  };

  const startInertia = (vx, vy) => {
    let velocityAz = vx * GRAPH_3D_CONFIG.DRAG_AZ_PER_PX;
    let velocityPitch = -vy * GRAPH_3D_CONFIG.DRAG_PITCH_PER_PX;
    let last = null;
    let startedAt = null;
    const step = (timestamp) => {
      if (startedAt === null) startedAt = timestamp;
      if (timestamp - startedAt >= GRAPH_3D_CONFIG.SETTLE_MS) {
        inertiaRef.current = null;
        return;
      }
      if (last === null) {
        last = timestamp;
        inertiaRef.current = requestAnimationFrame(step);
        return;
      }
      const delta = Math.min(32, Math.max(0, timestamp - last));
      last = timestamp;
      velocityAz *= 0.94;
      velocityPitch *= 0.94;
      if (Math.abs(velocityAz) < 0.0005 && Math.abs(velocityPitch) < 0.0005) {
        inertiaRef.current = null;
        return;
      }
      const current = liveViewRef.current;
      const next = clampLive({
        azimuth: current.azimuth + velocityAz * delta,
        pitch: current.pitch + velocityPitch * delta,
        scale: current.scale,
      });
      liveViewRef.current = next;
      writeAzPitch(next);
      refreshBackfacing(next.azimuth, next.pitch);
      inertiaRef.current = requestAnimationFrame(step);
    };
    inertiaRef.current = requestAnimationFrame(step);
  };

  const finishDrag = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.active) return;

    setDragging(false);
    if (typeof document !== 'undefined') document.body.classList.remove('enc-no-select');
    try {
      stageRef.current?.releasePointerCapture?.(drag.pointerId);
    } catch {
      /* 指针捕获可能已被系统释放 */
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
    }, CLICK_SUPPRESS_MS);

    const current = liveViewRef.current;
    onViewChange?.(current, 'drag');

    const dragX = Math.abs(drag.lastX - drag.startX);
    const dragY = Math.abs(drag.lastY - drag.startY);
    const stage =
      drag.mode === 'pan'
        ? 'pan'
        : dragX > dragY * 1.2
          ? 'axis_x'
          : dragY > dragX * 1.2
            ? 'axis_y'
            : 'both';
    if (dragThrottleRef.current()) {
      track('graph_drag', {
        entity_type: 'graph',
        entity_id: 'encyclopedia',
        stage,
      });
    }

    if (
      !cancelled &&
      !reducedMotion &&
      drag.mode === 'rotate' &&
      Math.hypot(drag.vx, drag.vy) > 0.25
    ) {
      startInertia(drag.vx, drag.vy);
    }
    void event;
  };

  const handlePointerUp = (event) => finishDrag(event);
  const handlePointerCancel = (event) => finishDrag(event, true);

  const handleWheel = (event) => {
    const focusedInside = stageRef.current?.contains(document.activeElement);
    if (!event.ctrlKey && !event.metaKey && !focusedInside) return;
    const factor = event.deltaY > 0 ? 1 / 1.1 : 1.1;
    applyView({ ...liveViewRef.current, scale: liveViewRef.current.scale * factor }, 'wheel');
    setWheelPaused(true);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      wheelTimerRef.current = null;
      setWheelPaused(false);
    }, WHEEL_PAUSE_MS);
  };

  const handleBlur = (event) => {
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next)) return;
    setFocusWithin(false);
  };

  const handleToggleRotate = () => {
    const next = !autoRotate;
    track('graph_rotate', {
      entity_type: 'graph',
      entity_id: 'encyclopedia',
      stage: next ? 'on' : 'pause',
    });
    onRotateToggle?.(next);
  };

  const handleTogglePan = () => {
    const next = !panMode;
    setPanModeInternal(next);
    onPanModeChange?.(next);
  };

  const handleZoomIn = () =>
    applyView({ ...liveViewRef.current, scale: liveViewRef.current.scale * 1.2 }, 'button');
  const handleZoomOut = () =>
    applyView({ ...liveViewRef.current, scale: liveViewRef.current.scale / 1.2 }, 'button');
  const handleReset = (source = 'toolbar') => resetSphere(source);

  return (
    <section
      ref={sectionRef}
      className={`enc-graph3d${sphereOn ? ' enc-graph3d--sphere' : ''}`}
      data-sphere={sphereOn ? 'true' : 'false'}
      data-graph-theme={sphereOn ? graphTheme : undefined}
      role="group"
      aria-label={stageLabel}
      aria-describedby={hintId}
    >
      <p id={hintId} className="enc-graph3d-hint">
        {hint}
      </p>
      <div
        ref={stageRef}
        className="enc-graph3d-stage"
        style={{ '--g3d-perspective': `${GRAPH_3D_CONFIG.PERSPECTIVE}px` }}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={handleBlur}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleStageClickCapture}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <div ref={panRef} className="enc-graph3d-pan">
          <div
            ref={worldRef}
            className="enc-graph3d-world"
            style={{
              '--g3d-az': `${round(initial.azimuth)}deg`,
              '--g3d-pitch': `${round(initial.pitch)}deg`,
              '--g3d-scale': `${round(initial.scale)}`,
              '--g3d-inv-scale': `${round(1 / Math.max(initial.scale, 0.9))}`,
              '--g3d-chip-inv-scale': `${round(1 / Math.max(initial.scale, 0.01))}`,
              '--g3d-px': '0px',
              '--g3d-py': '0px',
            }}
          >
            <div className="enc-graph3d-edges" aria-hidden="true">
              {edgeItems.map((edge) => (
                <span
                  key={edge.key}
                  className="enc-graph3d-edge"
                  data-edge-kind={edge.kind}
                  style={{ transform: edge.transform }}
                />
              ))}
            </div>
            <div className="enc-graph3d-nodes">
              {renderNodes.map((node) => {
                const point = projected.get(node.id) ?? { x: 0, y: 0, z: 0 };
                const meta = NODE_TYPE_META[node.type] || NODE_TYPE_META.term;
                const typeLabel = t(meta[0], meta[1]);
                const isActive = activeNodeId === node.id;
                const isNeighbor = Boolean(neighbors?.has(node.id));
                const isDimmed = Boolean(activeNodeId) && !isActive && !isNeighbor;
                const isPicked = pickedId === node.id;
                const classes = [
                  'enc-graph3d-node',
                  sphereOn ? 'is-sphere-node' : '',
                  isActive ? 'is-active' : '',
                  isNeighbor ? 'is-neighbor' : '',
                  isDimmed ? 'is-dimmed' : '',
                  selectedId === node.id || isPicked ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const lines = node.labelLines?.length ? node.labelLines : [node.label];

                return (
                  <button
                    key={node.id}
                    ref={(element) => {
                      if (element) nodeRefs.current.set(node.id, element);
                      else nodeRefs.current.delete(node.id);
                    }}
                    type="button"
                    className={classes}
                    data-node-id={node.id}
                    data-node-type={node.type}
                    data-node-tier={node.tier || undefined}
                    data-backfacing="false"
                    data-picked={isPicked ? 'true' : 'false'}
                    tabIndex={node.id === tabStopId ? 0 : -1}
                    aria-label={`${typeLabel}：${node.label}${
                      isNeighbor ? '（邻接）' : ''
                    }`}
                    aria-current={isPicked ? 'true' : undefined}
                    style={{
                      transform: sphereOn
                        ? `translate3d(${point.x}px, ${point.y}px, ${point.z}px) rotateY(calc(-1 * var(--g3d-az))) rotateX(calc(-1 * var(--g3d-pitch)))`
                        : `translate3d(${point.x}px, ${point.y}px, ${point.z}px)`,
                    }}
                    onFocus={() => {
                      setActiveNodeId(node.id);
                      setTabStopId(node.id);
                      onNodeFocus?.(node.id);
                    }}
                    onClick={(event) => handleNodeClick(event, node)}
                  >
                    {sphereOn ? (
                      <span
                        className="enc-graph3d-chip"
                        data-lines={
                          String(node.label ?? '').length > SPHERE_CONFIG.NODE_CHARS_SINGLE
                            ? '2'
                            : '1'
                        }
                        style={{ inlineSize: node.labelWidthPx ? `${node.labelWidthPx}px` : undefined }}
                      >
                        <span className="enc-graph3d-chip-bar" data-node-type={node.type} />
                        <span className="enc-graph3d-chip-text">{node.label}</span>
                      </span>
                    ) : (
                      <span className="enc-graph3d-shape" data-node-type={node.type} />
                    )}
                    {!sphereOn && (
                      <span
                        className="enc-graph3d-label"
                        style={{
                          transform:
                            'rotateY(calc(-1 * var(--g3d-az))) rotateX(calc(-1 * var(--g3d-pitch)))',
                        }}
                      >
                        {lines.map((line, index) => (
                          <span
                            key={`${node.id}-line-${index}`}
                            className="enc-graph3d-label-line"
                          >
                            {line}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {sphereOn && (
            <div
              className="enc-graph3d-core"
              data-core-mode={coreAnchor.tone}
              aria-hidden="true"
            >
              <span className="enc-graph3d-core-dot" />
              <span className="enc-graph3d-core-text">
                {coreAnchor.tone === 'focus'
                  ? t('encyclopedia.graph3d.coreFocus', '当前关注：{label}', {
                      label: nodes.find((n) => n.id === pickedId)?.label ?? '',
                    })
                  : t('encyclopedia.graph3d.coreOverview', '全局概览')}
              </span>
            </div>
          )}
        </div>
        {sphereOn && <SphereResetButton onReset={() => handleReset('screen')} t={t} />}
      </div>
      <Graph3DControls
        autoRotate={autoRotate}
        reducedMotion={reducedMotion}
        panMode={panMode}
        sphereEnabled={sphereOn}
        graphTheme={graphTheme}
        themeToggle={themeToggle}
        onToggleTheme={onToggleTheme}
        onToggleRotate={handleToggleRotate}
        onTogglePan={handleTogglePan}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        t={t}
      />
    </section>
  );
}