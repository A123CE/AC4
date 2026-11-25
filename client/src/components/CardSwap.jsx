/**
 * 百科 3D 卡片组（T-CARD-07）
 *
 * 契约：
 * - default `CardSwap`：`items` 与 `<Card>` 两种用法在归一后共用同一渲染与交互路径
 * - 具名 `Card`：仅接受 `children` / `className`，作为 `<Card>` 用法的卡面包装
 * - 具名 `CardDeckErrorBoundary`：卡片区故障隔离，不影响正文/图谱/筛选
 * - 组件不写 URL、不读写 storage、不做卡片级埋点（埋点由 T-CARD-17 接管）
 * - 动效只用 transform / opacity；同屏最多挂载 `visibleCards`（≤5）张
 */
import {
  Children,
  Component,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CARDS_CONFIG,
  clampDeckOptions,
  clampDragOffset,
  deckPresetFor,
  resolveCardAsset,
  resolveDrop,
} from '../lib/encyclopediaCards';
import { isHorizontalIntent } from '../lib/encyclopediaGestures';
import { GRAPH_CONFIG } from '../lib/encyclopediaGraph';
import { createRafLoop } from '../lib/raf';
import { createThrottle, impressionSeen } from '../lib/trackThrottle';
import { track } from '../lib/analytics';
import { supports3D } from '../lib/graphCapability';
import I18nContext from '../context/I18nContext';
import CardIcon from './CardIcon';
import CardPreviewOverlay from './CardPreviewOverlay';
import zhCN from '../i18n/zh-CN.json';

const LIST_PAGE = 30;
const LIST_MAX = 200;
const SHIFT_MAX = 120;
const HOVER_LIFT = 4;


const THEMES = {
  light: {
    '--swap-tile': 'var(--enc-surface)',
    '--swap-tile-edge': 'var(--enc-line)',
    '--swap-tile-highlight': '#ffffff',
    '--swap-ink': 'var(--ink)',
    '--swap-muted': 'var(--enc-muted)',
    '--swap-badge': 'var(--enc-sunken)',
    '--swap-shadow': '0 2px 8px rgba(44, 44, 44, 0.06)',
  },
  dark: {
    '--swap-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--swap-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--swap-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--swap-ink': '#f4f4f5',
    '--swap-muted': 'rgba(244, 244, 245, 0.72)',
    '--swap-badge': 'rgba(255, 255, 255, 0.08)',
    '--swap-shadow':
      '0 30px 60px -24px rgba(0, 0, 0, 0.8), 0 10px 24px -12px rgba(0, 0, 0, 0.55)',
  },
};

function lookupPath(dict, key) {
  return String(key)
    .split('.')
    .reduce((current, part) => (current == null ? current : current[part]), dict);
}

function fillTemplate(template, vars) {
  if (typeof template !== 'string' || !vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}

function fallbackT(key, fallback, vars) {
  const value = lookupPath(zhCN, key) ?? fallback ?? key;
  if (typeof value !== 'string') return value;
  return fillTemplate(value, vars);
}


function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function mediaMatches(query) {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return Boolean(window.matchMedia(query).matches);
  } catch {
    return false;
  }
}

function detectSupports3d() {
  return supports3D();
}

function tierFromWidth(width) {
  const breakpoints = GRAPH_CONFIG.BREAKPOINTS;
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.medium) return 'medium';
  if (width >= breakpoints.compact) return 'compact';
  if (width >= breakpoints.stacked) return 'stacked';
  if (width >= breakpoints.narrow) return 'narrow';
  return 'minimal';
}

function readEnvironment() {
  const width = typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280;
  return {
    tier: tierFromWidth(width),
    reducedMotion: mediaMatches('(prefers-reduced-motion: reduce)'),
    coarsePointer: mediaMatches('(hover: none) and (pointer: coarse)'),
    supports3d: detectSupports3d(),
  };
}

function useDeckEnvironment() {
  const [environment, setEnvironment] = useState(readEnvironment);

  useEffect(() => {
    const update = () => setEnvironment(readEnvironment());
    if (typeof window === 'undefined') return undefined;

    window.addEventListener('resize', update);
    let reduced = null;
    let coarse = null;
    if (typeof window.matchMedia === 'function') {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
      reduced?.addEventListener?.('change', update);
      coarse?.addEventListener?.('change', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      reduced?.removeEventListener?.('change', update);
      coarse?.removeEventListener?.('change', update);
    };
  }, []);

  return environment;
}

function entryFromItem(item, index, unnamed, uncategorized) {
  const source = item && typeof item === 'object' ? item : {};
  const entryType = source.entryType || source.entry_type || 'craft';
  return {
    id: source.id === undefined || source.id === null ? `card-${index}` : String(source.id),
    position: Number.isFinite(Number(source.index)) && Number(source.index) > 0
      ? Number(source.index)
      : index + 1,
    title: text(source.title) || text(source.term) || unnamed,
    synopsis: text(source.synopsis),
    category: text(source.category) || uncategorized,
    entryType: entryType === 'building' ? 'building' : 'craft',
    badgeBuilding: source.badgeBuilding === undefined
      ? entryType === 'building'
      : Boolean(source.badgeBuilding),
    badge3D: Boolean(source.badge3D ?? source.has_3d),
    dynasty: text(source.dynasty),
    region: text(source.region),
    imagePath: text(source.imagePath) || text(source.asset) || resolveCardAsset(source) || '',
    render: null,
  };
}

function entryFromNode(node, index, unnamed, uncategorized) {
  const isCardElement = isValidElement(node) && node.type === Card;
  const cardProps = isCardElement ? node.props : {};
  const key = isValidElement(node) ? node.key : null;
  return {
    id: key === null || key === undefined ? `card-${index}` : String(key),
    position: index + 1,
    title: unnamed,
    synopsis: '',
    category: uncategorized,
    entryType: 'craft',
    badgeBuilding: false,
    badge3D: false,
    dynasty: '',
    region: '',
    imagePath: '',
    render: isCardElement ? cardProps.children : node,
  };
}

function normalizeEntries(items, children, unnamed, uncategorized) {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item, index) => entryFromItem(item, index, unnamed, uncategorized));
  }
  return Children.toArray(children).map((node, index) =>
    entryFromNode(node, index, unnamed, uncategorized)
  );
}

function buildRingView(
  count,
  activeIndex,
  cardWidth,
  halfCount,
  stageWidth,
  stageHeight,
  blur,
  falloff
) {
  const depth = Math.max(48, stageHeight * 0.16);
  const half = Math.max(stageWidth, stageHeight * 1.9) / 2;
  const radius = (half * half + depth * depth) / (2 * depth);
  const spacing = Math.max(160, cardWidth * 1.18);
  const view = [];
  const seen = new Set();
  for (let d = -halfCount; d <= halfCount; d += 1) {
    const index = (((activeIndex + d) % count) + count) % count;
    if (seen.has(index)) continue;
    seen.add(index);
    const x = d * spacing;
    const reach = Math.min(Math.abs(x), Math.max(1, half), radius * 0.999);
    const arc = radius - Math.sqrt(radius * radius - reach * reach);
    const angle = Math.sign(x) * Math.asin(reach / radius);
    view.push({
      index,
      d,
      x,
      y: -arc,
      rotate: (-angle * 180) / Math.PI,
      opacity: d === 0 ? 1 : Math.max(0.32, 1 - Math.abs(d) * 0.2),
      scale: d === 0 ? 1.06 : Math.max(0.72, 1 - Math.abs(d) * 0.05),
      brightness: Math.max(0.2, 1 - Math.abs(d) * falloff * 1.2),
      blur: blur > 0 ? Math.min(blur, Math.abs(d) * blur * 0.45) : 0,
      zIndex: 1000 - Math.abs(d),
      tint: Math.abs(d) === 0 ? 0 : Math.min(0.5, Math.abs(d) * 0.16),
    });
  }
  return view.sort((a, b) => a.index - b.index);
}

/**
 * `<Card>` 用法：只负责卡面内容包裹；外层的 article（选中态、焦点、手势）由 CardSwap 注入。
 */
export function Card({ children, className = '' }) {
  return <div className={className ? `enc-card-body ${className}` : 'enc-card-body'}>{children}</div>;
}

export class CardDeckErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (typeof this.props.onError === 'function') this.props.onError(error);
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return fallback(this.state.error);
      if (fallback) return fallback;
      return (
        <p className="enc-deck-error" role="status">
          卡片暂不可用，已切换为列表
        </p>
      );
    }
    return this.props.children;
  }
}

function DeckFallback({ t, items, onSelect }) {
  const list = Array.isArray(items) ? items.slice(0, LIST_MAX) : [];
  return (
    <div className="enc-deck-error" role="status">
      <p>{t('encyclopedia.card.error', '卡片暂不可用，已切换为列表')}</p>
      <ul className="enc-deck-list">
        {list.map((item, index) => (
          <li key={item?.id === undefined ? `fallback-${index}` : String(item.id)}>
            <button type="button" onClick={() => onSelect?.(item?.id)}>
              {text(item?.title) || text(item?.term) || t('encyclopedia.card.unnamed', '未命名词条')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DefaultCardFace({ entry, total, t }) {
  const meta = [entry.dynasty, entry.region].filter(Boolean).join(' · ');
  return (
    <>
      {entry.badgeBuilding ? (
        <span className="enc-card-badge--building">
          {t('encyclopedia.card.badge.building', '建筑')}
        </span>
      ) : null}
      {entry.badge3D ? (
        <span className="enc-card-badge--3d" aria-label={t('encyclopedia.card.badge.threeDLabel', '可查看三维模型')}>
          {t('encyclopedia.card.badge.threeD', '3D')}
        </span>
      ) : null}
      <span className="enc-card-art" aria-hidden="true">
        {entry.imagePath ? (
          <img src={entry.imagePath} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="enc-card-art-mark">{entry.category.slice(0, 1)}</span>
        )}
      </span>
      <div className="enc-card-head">
        <span className="enc-card-head-icon" aria-hidden="true">
          <CardIcon
            name={entry.entryType === 'building' ? 'building' : 'cube'}
            size={CARDS_CONFIG.ICON.size}
          />
        </span>
        <h3 className="enc-card-title" title={entry.title}>
          {entry.title}
        </h3>
      </div>
      <p className="enc-card-synopsis">{entry.synopsis || entry.category}</p>
      {meta ? <span className="enc-card-meta">{meta}</span> : null}
      <span className="enc-card-index">
        {entry.position} / {total}
      </span>
    </>
  );
}

function DeckCore({
  t: tProp,
  items,
  children,
  delay,
  cardDistance,
  verticalDistance,
  depth,
  skewAmount,
  visibleCards,
  cardRadius,
  speed,
  bounce,
  parallax,
  dim,
  autoplay,
  pauseOnHover,
  draggable,
  width,
  height,
  selectedId,
  onSelect,
  onSwap,
  onDragEnd,
  onAutoplayChange,
  onImpression,
  onClearFilters,
  skipHref = '#enc-article',
  focusCardId,
  labels,
  selectMode = 'runtime',
  onRequestArticle,
  onPreviewClose,
  theme = 'light',
  intro = true,
  deckRef,
  blur = 6,
  falloff = 0.2,
  perspective = 1400,
  duration = 700,
}) {
  const context = useContext(I18nContext);
  const t = tProp || context?.t || fallbackT;
  const tRef = useRef(t);
  tRef.current = t;

  const environment = useDeckEnvironment();
  const hintId = useId();
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const dragRef = useRef(null);
  const dragIndexRef = useRef(null);
  const stepRef = useRef(null);
  const shiftRef = useRef(0);
  const settleRef = useRef(null);
  const swapFrameRef = useRef(null);

  const autoFocusRef = useRef(false);
  const localSelectRef = useRef(false);
  const elapsedRef = useRef(0);
  const advanceRef = useRef(null);
  const impressionRef = useRef(null);
  const autoplayNotifyRef = useRef(null);
  const focusRequestRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const swapThrottleRef = useRef(createThrottle(500));
  const dragThrottleRef = useRef(createThrottle(500));
  const longPressRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  const unnamed = t('encyclopedia.card.unnamed', '未命名词条');
  const uncategorized = t('encyclopedia.card.uncategorized', '未分类');

  const entries = useMemo(
    () => normalizeEntries(items, children, unnamed, uncategorized),
    [items, children, unnamed, uncategorized]
  );

  const preset = deckPresetFor(environment.tier);
  const requestedVisible =
    visibleCards === undefined || visibleCards === null ? preset.visibleCards : visibleCards;

  const optionsResult = useMemo(
    () =>
      clampDeckOptions(
        {
          delay,
          cardDistance,
          verticalDistance,
          depth,
          skewAmount,
          visibleCards: requestedVisible,
          cardRadius,
          speed,
          bounce,
          parallax,

          dim,
          autoplay,
          pauseOnHover,
          draggable,
        },
        {
          itemsLength: entries.length,
          reducedMotion: environment.reducedMotion,
          isTouch: environment.coarsePointer,
        }
      ),
    [
      delay,
      cardDistance,
      verticalDistance,
      depth,
      skewAmount,
      requestedVisible,
      cardRadius,
      speed,
      bounce,
      parallax,

      dim,
      autoplay,
      pauseOnHover,
      draggable,
      entries.length,
      environment.reducedMotion,
      environment.coarsePointer,
    ]
  );
  const options = optionsResult.options;
  const strength = preset.strength;

  const isList = environment.tier === 'minimal';
  const isFlat = strength === 0 || environment.reducedMotion || !environment.supports3d;
  const isDegraded = isFlat && strength > 0;

  const prefilledIndex = useMemo(() => {
    if (!selectedId || entries.length === 0) return -1;
    return entries.findIndex((entry) => entry.id === String(selectedId));
  }, [entries, selectedId]);

  const [selectedCardId, setSelectedCardId] = useState(() =>
    selectedId ? String(selectedId) : entries[0]?.id ?? null
  );
  const [previewId, setPreviewId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(() => (prefilledIndex >= 0 ? prefilledIndex : 0));
  const [focusIndex, setFocusIndex] = useState(() => (prefilledIndex >= 0 ? prefilledIndex : 0));
  const [hovering, setHovering] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );
  const [inView, setInView] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [listLimit, setListLimit] = useState(LIST_PAGE);
  const [stageBox, setStageBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      const width = stage.clientWidth || 0;
      const height = stage.clientHeight || 0;
      setStageBox((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [entries.length, isList]);

  const measuredCard = cardRefs.current[activeIndex];
  const measuredWidth = measuredCard?.offsetWidth || 0;


  const count = entries.length;
  const safeActive = count === 0 ? 0 : Math.min(activeIndex, count - 1);
  const safeFocus = count === 0 ? 0 : Math.min(focusIndex, count - 1);
  const activeIndexRef = useRef(safeActive);
  activeIndexRef.current = safeActive;

  const autoplayOn =
    !isList && !environment.reducedMotion && count > 1 && options.autoplay;

  const paused =
    !documentVisible ||
    !inView ||
    focusWithin ||
    dragging ||
    Boolean(previewId) ||
    (options.pauseOnHover && hovering);

  useEffect(() => {
    if (!selectedId) return;
    const index = entries.findIndex((entry) => entry.id === String(selectedId));
    if (index < 0) return;
    setActiveIndex(index);
    setFocusIndex(index);
    if (!localSelectRef.current) {
      const node = cardRefs.current[index];
      node?.scrollIntoView?.({ block: 'nearest' });
    }
    localSelectRef.current = false;
  }, [selectedId, entries]);

  useEffect(() => {
    if (!focusCardId) return;
    const request = String(focusCardId);
    if (focusRequestRef.current === request) return;
    const index = entries.findIndex((entry) => entry.id === request);
    if (index < 0) return;
    focusRequestRef.current = request;
    pendingFocusRef.current = index;
    setFocusIndex(index);
    setActiveIndex(index);
  }, [focusCardId, entries]);

  useEffect(() => {
    const onVisibility = () => setDocumentVisible(!document.hidden);
    if (typeof document === 'undefined') return undefined;
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (isList || typeof IntersectionObserver === 'undefined') return undefined;
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (records) => {
        const record = records[records.length - 1];
        if (!record) return;
        setInView(record.intersectionRatio >= CARDS_CONFIG.AUTOPLAY.minVisibleRatio);
      },
      { threshold: [0, 0.2, 0.4, 0.6, 1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isList]);

  useEffect(() => {
    if (pendingFocusRef.current !== null && pendingFocusRef.current === safeFocus) {
      const target = pendingFocusRef.current;
      pendingFocusRef.current = null;
      cardRefs.current[target]?.focus?.();
      return;
    }
    if (!autoFocusRef.current) return;
    autoFocusRef.current = false;
    cardRefs.current[safeFocus]?.focus?.();
  }, [safeFocus]);

  useEffect(() => {
    if (autoplayNotifyRef.current === autoplayOn) return;
    autoplayNotifyRef.current = autoplayOn;
    onAutoplayChange?.(autoplayOn);
  }, [autoplayOn, onAutoplayChange]);

  useEffect(() => {
    if (isList || count === 0) return;
    const entry = entries[safeActive];
    if (!entry || !impressionSeen(entry.id)) return;
    impressionRef.current = entry.id;
    onImpression?.(entry.id);
    track('card_view', {
      entity_type: 'term',
      entity_id: entry.id,
      stage: 'deck_impression',
      result_count: count,
    });
  }, [isList, count, entries, safeActive, onImpression]);

  useEffect(() => {
    if (!autoplayOn || paused || isList || count < 2) return undefined;
    elapsedRef.current = 0;
    let last = null;
    const loop = createRafLoop((timestamp) => {
      if (last === null) {
        last = timestamp;
        return;
      }
      const delta = timestamp - last;
      last = timestamp;
      if (!Number.isFinite(delta) || delta <= 0) return;
      elapsedRef.current += delta;
      if (elapsedRef.current >= options.delay) {
        elapsedRef.current = 0;
        advanceRef.current?.();
      }
    });
    loop.start();
    return () => loop.stop();
  }, [autoplayOn, paused, isList, count, options.delay]);

  useEffect(() => {
    return () => {
      if (settleRef.current) cancelAnimationFrame(settleRef.current);
      if (swapFrameRef.current) cancelAnimationFrame(swapFrameRef.current);
      if (typeof document !== 'undefined') document.body.classList.remove('enc-no-select');
    };
  }, []);

  const describeCard = (entry, index) => {
    if (!entry) return '';
    const typeLabel =
      entry.entryType === 'building'
        ? t('encyclopedia.card.type.building', '建筑专属')
        : t('encyclopedia.card.type.craft', '通用术语');
    return t(
      'encyclopedia.card.cardLabel',
      '{title}，{category}，{type}，第 {index}/{total} 张',
      {
        title: entry.title,
        category: entry.category,
        type: typeLabel,
        index: index + 1,
        total: count,
      }
    );
  };

  const markSwapping = () => {
    setSwapping(true);
    if (swapFrameRef.current) cancelAnimationFrame(swapFrameRef.current);
    swapFrameRef.current = requestAnimationFrame(() => {
      swapFrameRef.current = null;
      setSwapping(false);
    });
  };

  const applyShift = (value) => {
    shiftRef.current = value;
    if (stageRef.current) {
      stageRef.current.style.setProperty('--deck-shift', `${value.toFixed(2)}px`);
    }
  };

  const writeDragOffset = (x, y) => {
    const index = dragIndexRef.current ?? activeIndexRef.current;
    const card = cardRefs.current[index];
    if (!card) return;
    card.style.setProperty('--deck-card-dx', `${Number(x || 0).toFixed(2)}px`);
    card.style.setProperty('--deck-card-dy', `${Number(y || 0).toFixed(2)}px`);
  };

  const settleBack = () => {
    if (settleRef.current) cancelAnimationFrame(settleRef.current);
    const card = cardRefs.current[dragIndexRef.current ?? activeIndexRef.current];
    const startX = parseFloat(card?.style.getPropertyValue('--deck-card-dx')) || 0;
    const startY = parseFloat(card?.style.getPropertyValue('--deck-card-dy')) || 0;
    const startShift = shiftRef.current;
    if (!startX && !startY && !startShift) {
      applyShift(0);
      writeDragOffset(0, 0);
      return;
    }
    const duration = environment.reducedMotion
      ? 0
      : Math.max(1, CARDS_CONFIG.MOTION.settleMs);
    if (duration === 0) {
      applyShift(0);
      writeDragOffset(0, 0);
      return;
    }
    const startedAt = Date.now();
    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      applyShift(startShift * (1 - eased));
      writeDragOffset(startX * (1 - eased), startY * (1 - eased));
      if (progress < 1) {
        settleRef.current = requestAnimationFrame(step);
      } else {
        settleRef.current = null;
        applyShift(0);
        writeDragOffset(0, 0);
      }
    };
    settleRef.current = requestAnimationFrame(step);
  };

  const advanceBy = (steps, trigger) => {
    if (count < 2 || !steps) return;
    const from = activeIndexRef.current;
    const next = (((from + steps) % count) + count) % count;
    setActiveIndex(next);
    setFocusIndex(next);
    markSwapping();
    const entry = entries[next];
    if (entry) {
      onSwap?.({ id: entry.id, trigger });
      setStatusText(describeCard(entry, next));
      if (swapThrottleRef.current()) {
        track('card_swap', {
          entity_type: 'term',
          entity_id: entry.id,
          stage: trigger,
          result_count: count,
        });
      }
    }
  };
  const swapBy = (direction, trigger) => advanceBy(direction, trigger);
  advanceRef.current = () => swapBy(1, 'autoplay');
  stepRef.current = swapBy;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || isList || count < 2) return undefined;
    let accumulated = 0;
    let lastNav = 0;
    const onWheel = (event) => {
      const raw = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!raw) return;
      event.preventDefault();
      accumulated += raw;
      const now = Date.now();
      if (Math.abs(accumulated) < 60 || now - lastNav < 360) return;
      stepRef.current?.(accumulated > 0 ? 1 : -1, 'wheel');
      accumulated = 0;
      lastNav = now;
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [isList, count]);

  useImperativeHandle(deckRef, () => ({
    next: () => swapBy(1, 'api'),
    prev: () => swapBy(-1, 'api'),
  }));

  const focusTo = (target) => {
    if (count === 0) return;
    const next = ((target % count) + count) % count;
    if (next === safeFocus) {
      setActiveIndex(next);
      cardRefs.current[next]?.focus?.();
      return;
    }
    autoFocusRef.current = true;
    setFocusIndex(next);
    setActiveIndex(next);
  };

  const selectCard = (index) => {
    const entry = entries[index];
    if (!entry) return;
    setSelectedCardId(entry.id);
    localSelectRef.current = true;
    setFocusIndex(index);
    onSelect?.(entry.id);
  };

  const openPreview = (index) => {
    const entry = entries[index];
    if (!entry) return;
    setPreviewId(entry.id);
  };

  const closePreview = (reason) => {
    setPreviewId(null);
    onPreviewClose?.(reason);
    const idx = entries.findIndex((item) => item.id === selectedCardId);
    requestAnimationFrame(() => {
      cardRefs.current[idx >= 0 ? idx : 0]?.focus?.({ preventScroll: true });
    });
  };

  const previewStep = (direction) => {
    if (!entries.length || !previewId) return;
    const current = entries.findIndex((item) => item.id === previewId);
    const next = (((current + direction) % entries.length) + entries.length) % entries.length;
    setPreviewId(entries[next].id);
    setStatusText(describeCard(entries[next], next));
  };

  const handleCardClick = (index) => {
    const entry = entries[index];
    if (!entry) return;
    if (selectMode === 'legacy') {
      selectCard(index);
      return;
    }
    if (selectedCardId === entry.id) {
      openPreview(index);
      return;
    }
    selectCard(index);
  };

  const handleCardKeyDown = (event, index) => {
    if (count === 0) return;
    const key = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      focusTo(index + (key === 'ArrowLeft' ? -1 : 1));
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      focusTo(0);
      return;
    }
    if (key === 'End') {
      event.preventDefault();
      focusTo(count - 1);
      return;
    }
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      const entry = entries[index];
      if (selectMode !== 'legacy' && selectedCardId && entry && selectedCardId === entry.id) {
        openPreview(index);
      } else {
        selectCard(index);
      }
    }
  };

  const handlePointerDown = (event) => {
    if (!options.draggable || isList) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const cardTarget = event.target?.closest?.('[data-deck-card]');
    if (!cardTarget) return;
    if (Number(cardTarget.getAttribute('data-index')) !== safeActive) return;
    if (settleRef.current) {
      cancelAnimationFrame(settleRef.current);
      settleRef.current = null;
    }
    dragIndexRef.current = safeActive;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: Date.now(),
      dx: 0,
      dy: 0,
      active: false,
      longPress: false,
      pointerType: event.pointerType,
    };
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (event.pointerType === 'touch') {
      longPressRef.current = setTimeout(() => {
        longPressRef.current = null;
        if (dragRef.current) dragRef.current.longPress = true;
      }, 350);
    }
  };

  const writeParallax = (event) => {
    if (
      options.parallax <= 0 ||
      environment.coarsePointer ||
      environment.reducedMotion ||
      dragRef.current
    ) {
      return;
    }
    const node = stageRef.current;
    const rect = node?.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return;
    const ratioX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ratioY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const max = CARDS_CONFIG.MOTION.parallaxMaxPx * Math.min(1, options.parallax);
    node.style.setProperty('--deck-px', `${(ratioX * max).toFixed(2)}px`);
    node.style.setProperty('--deck-py', `${(ratioY * max).toFixed(2)}px`);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      writeParallax(event);
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < CARDS_CONFIG.DRAG.threshold) return;
      const isTouch = (drag.pointerType || event.pointerType) === 'touch';
      if (isTouch && !drag.longPress && !isHorizontalIntent(dx, dy)) {
        dragRef.current = null;
        return;
      }
      drag.active = true;
      setDragging(true);
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
      try {
        stageRef.current?.setPointerCapture?.(drag.pointerId);
      } catch {
        /* jsdom / 旧浏览器无指针捕获 */
      }
      if (typeof document !== 'undefined') document.body.classList.add('enc-no-select');
    }
    event.preventDefault?.();
    const rect = stageRef.current?.getBoundingClientRect?.();
    const clamped =
      rect && rect.width > 0
        ? clampDragOffset(dx, dy, { width: rect.width, height: rect.height })
        : { x: dx, y: dy };
    drag.dx = clamped.x;
    drag.dy = clamped.y;
    drag.lastX = event.clientX;
    drag.lastT = Date.now();
    writeDragOffset(clamped.x, clamped.y);
  };

  const releaseDrag = (drag) => {
    dragRef.current = null;
    setDragging(false);
    if (typeof document !== 'undefined') document.body.classList.remove('enc-no-select');
    try {
      stageRef.current?.releasePointerCapture?.(drag.pointerId);
    } catch {
      /* 指针捕获可能已被系统释放 */
    }
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    releaseDrag(drag);
    if (!drag.active) return;

    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }


    const dx = Number.isFinite(drag.dx) ? drag.dx : event.clientX - drag.startX;
    const dy = Number.isFinite(drag.dy) ? drag.dy : event.clientY - drag.startY;
    const elapsed = Math.max(1, Date.now() - drag.lastT);
    const velocity = (event.clientX - drag.lastX) / elapsed;
    const rect = stageRef.current?.getBoundingClientRect?.();
    const drop = resolveDrop(dx, dy, rect?.width ?? 0, velocity);
    const current = entries[safeActive];

    if (drop.commit && drop.steps !== 0) {
      suppressClickUntilRef.current = Date.now() + 350;
      writeDragOffset(0, 0);
      advanceBy(-drop.steps, 'drag');
      onDragEnd?.({ id: current?.id ?? '', direction: -Math.sign(drop.steps) });
    } else {
      settleBack();
      onDragEnd?.({ id: current?.id ?? '', direction: 0 });
    }

    if (dragThrottleRef.current()) {
      track('card_drag', {
        entity_type: 'term',
        entity_id: current?.id ?? '',
        stage: drop.commit ? 'commit' : 'revert',
        result_count: count,
      });
    }
  };

  const handlePointerCancel = () => {
    const drag = dragRef.current;
    if (!drag) return;
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    releaseDrag(drag);
    if (drag.active) {
      suppressClickUntilRef.current = Date.now() + 350;
      settleBack();
      onDragEnd?.({ id: entries[safeActive]?.id ?? '', direction: 0 });
    }
  };

  const handleClickCapture = (event) => {
    const target = event.target;
    if (target?.closest?.('.enc-card-badge--building, .enc-card-badge--3d')) {
      event.stopPropagation();
      return;
    }
    if (Date.now() > suppressClickUntilRef.current) return;
    suppressClickUntilRef.current = 0;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleStageBlur = (event) => {
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next)) return;
    setFocusWithin(false);
  };


  const hint = t('encyclopedia.card.hint', '左右方向键移动，Enter 选择，Esc 返回');
  const groupLabel =
    labels?.group ??
    t('encyclopedia.card.deckLabel', '建筑知识卡片，共 {count} 张', { count });
  const skipLabel = labels?.skip ?? t('encyclopedia.card.skip', '跳过卡片，直接到正文');

  if (count === 0) {
    return (
      <section
        ref={sectionRef}
        className="enc-deck is-empty"
        role="group"
        aria-label={groupLabel}
      >
        <p className="enc-deck-empty-text">
          {t('encyclopedia.card.empty', '当前筛选下没有匹配的词条')}
        </p>
        {onClearFilters ? (
          <button type="button" className="enc-deck-empty-action" onClick={onClearFilters}>
            {t('encyclopedia.card.emptyAction', '清除筛选')}
          </button>
        ) : null}
      </section>
    );
  }

  if (isList) {
    const remainder = Math.max(0, count - listLimit);
    return (
      <section
        ref={sectionRef}
        className="enc-deck is-list is-flat"
        role="group"
        aria-label={groupLabel}
        aria-describedby={hintId}
      >
        <a className="enc-card-skip" href={skipHref}>
          {skipLabel}
        </a>
        <p id={hintId} className="enc-deck-hint">
          {hint}
        </p>
        <ul className="enc-deck-list">
          {entries.slice(0, listLimit).map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                className="enc-deck-list-item"
                aria-current={entry.id === selectedId ? 'true' : undefined}
                onClick={() => selectCard(index)}
              >
                <span className="enc-card-title">{entry.title}</span>
                <span className="enc-card-meta">{entry.category}</span>
              </button>
            </li>
          ))}
        </ul>
        {remainder > 0 ? (
          <button
            type="button"
            className="enc-deck-more"
            onClick={() => setListLimit((current) => Math.min(LIST_MAX, current + LIST_PAGE))}
          >
            {t('encyclopedia.card.more', '加载更多（余 {rest} 条）', { rest: remainder })}
          </button>
        ) : null}
        <p className="enc-deck-status" aria-live="polite" aria-atomic="true">
          {statusText}
        </p>
      </section>
    );
  }

  const ringViews = buildRingView(
    count,
    safeActive,
    measuredWidth || 520,
    2,
    stageBox.width,
    stageBox.height,
    blur,
    falloff
  );

  const sectionStyle = { ...(THEMES[theme] ?? THEMES.light) };
  if (Number.isFinite(Number(width)) && Number(width) > 0) {
    sectionStyle['--enc-deck-w'] = `${Number(width)}px`;
  }
  if (Number.isFinite(Number(height)) && Number(height) > 0) {
    sectionStyle['--enc-deck-h'] = `${Number(height)}px`;
  }

  const stageStyle = {
    '--deck-perspective': `${perspective}px`,
    '--deck-radius': `${options.cardRadius}px`,
    '--deck-dim': String(options.dim),
    '--deck-shift': '0px',
    '--deck-px': '0px',
    '--deck-py': '0px',
    '--deck-move-ms': `${Math.round(duration / Math.max(options.speed, 0.1))}ms`,
    '--deck-ease': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  };

  const deckClasses = [
    'enc-deck',
    isFlat ? 'is-flat' : '',
    isDegraded ? 'is-degraded' : '',
    dragging ? 'is-dragging' : '',
    intro ? '' : 'no-intro',
  ]
    .filter(Boolean)
    .join(' ');
  const stageClasses = [
    'enc-deck-stage',
    swapping ? 'is-swapping' : '',
    dragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');


  return (
    <section
      ref={sectionRef}
      className={deckClasses}
      role="group"
      aria-label={groupLabel}
      aria-describedby={hintId}
      data-card-theme={theme}
      style={sectionStyle}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => {
        setHovering(false);
        setHoverIndex(null);
      }}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={handleStageBlur}
    >
      <a className="enc-card-skip" href={skipHref}>
        {skipLabel}
      </a>
      <p id={hintId} className="enc-deck-hint">
        {hint}
      </p>

      <div
        ref={stageRef}
        className={stageClasses}
        style={stageStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
        {ringViews.map((item) => {
          const entry = entries[item.index];
          const isActive = item.index === safeActive;
          const lift = hoverIndex === item.index ? HOVER_LIFT : 0;
          return (
            <article
              key={entry.id}
              ref={(node) => {
                if (node) cardRefs.current[item.index] = node;
                else delete cardRefs.current[item.index];
              }}
              className={isActive ? 'enc-deck-card is-active' : 'enc-deck-card'}
              data-deck-card=""
              data-index={item.index}
              data-rel={item.d}
              tabIndex={item.index === safeFocus ? 0 : -1}
              aria-current={selectedCardId === entry.id ? 'true' : undefined}
              aria-label={describeCard(entry, item.index)}
              style={{
                transform: `translate(-50%, -50%) translate3d(calc(${item.x.toFixed(2)}px + var(--deck-card-dx, 0px)), calc(${(item.y - lift).toFixed(2)}px + var(--deck-card-dy, 0px)), 0px) rotate(${item.rotate.toFixed(2)}deg) scale(${item.scale.toFixed(3)})`,
                opacity: item.opacity.toFixed(3),
                filter: `brightness(${item.brightness.toFixed(3)}) blur(${item.blur.toFixed(2)}px)`,
                zIndex: item.zIndex,
                pointerEvents: item.opacity > 0.05 ? 'auto' : 'none',
              }}
              onClick={() => handleCardClick(item.index)}
              onKeyDown={(event) => handleCardKeyDown(event, item.index)}
              onPointerEnter={() => setHoverIndex(item.index)}
              onPointerLeave={() => setHoverIndex(null)}
            >
              {entry.render ?? <DefaultCardFace entry={entry} total={count} t={t} />}
              <span className="enc-deck-card-shade" aria-hidden="true" style={{ opacity: item.tint }} />
            </article>
          );
        })}
      </div>

      <p className="enc-deck-status" aria-live="polite" aria-atomic="true">
        {statusText}
      </p>
      <CardPreviewOverlay
        open={Boolean(previewId)}
        entries={entries}
        index={entries.findIndex((item) => item.id === previewId)}
        onStep={previewStep}
        onClose={closePreview}
        onRequestArticle={onRequestArticle}
        reducedMotion={environment.reducedMotion}
        t={t}
      />
    </section>
  );
}

const CardSwap = forwardRef(function CardSwap(props, ref) {
  const context = useContext(I18nContext);
  const t = props.t || context?.t || fallbackT;
  return (
    <CardDeckErrorBoundary
      fallback={<DeckFallback t={t} items={props.items} onSelect={props.onSelect} />}
    >
      <DeckCore {...props} t={t} deckRef={ref} />
    </CardDeckErrorBoundary>
  );
});

CardSwap.displayName = 'CardSwap';

export default CardSwap;