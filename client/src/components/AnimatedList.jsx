import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedList — 带入场动画的可选择列表
 *
 * 用法：
 *   <AnimatedList items={items} onItemSelect={(item, i) => ...} animation="pop" />
 *
 * 常用 props：
 *   items               数据数组（默认按 { title, description, meta } 渲染）
 *   onItemSelect        选中回调 (item, index)
 *   animation           'pop' | 'fade' | 'slide'
 *   theme               'light' | 'dark'
 *   width / maxHeight   尺寸（maxHeight 数值按 px 处理）
 *   radius / gap        圆角与行间距
 *   stagger             每行入场延迟（秒）
 *   fadeSize            上下渐隐高度（px）
 *   frame               是否显示外框
 *   showGradients       滚动时上下渐隐
 *   displayScrollbar    是否显示滚动条
 *   selectOnHover       悬停即选中
 *   enableArrowNavigation / loop   方向键导航、首尾循环
 *   animateOnce         仅首次入场动画
 *   initialSelectedIndex / selectedKey  选中项（受控）
 *   staggerKey          该值变化时重新播放整段入场动画
 *   renderItem / getKey / itemAs / itemClassName / activeClassName
 *                       自定义行渲染与样式挂钩
 */

const EASE = [0.22, 1, 0.36, 1];

const ITEM_VARIANTS = {
  pop: {
    hidden: { opacity: 0, y: 10, scale: 0.94 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  },
};

export default function AnimatedList({
  items = [],
  onItemSelect,
  animation = 'pop',
  theme = 'light',
  width,
  maxHeight,
  radius = 14,
  gap = 8,
  stagger = 0.05,
  fadeSize = 56,
  frame = false,
  showGradients = true,
  displayScrollbar = true,
  selectOnHover = false,
  enableArrowNavigation = true,
  loop = false,
  animateOnce = true,
  initialSelectedIndex = -1,
  selectedKey,
  staggerKey,
  getKey = (item, index) => item?.id ?? index,
  renderItem,
  itemAs = 'div',
  itemClassName = '',
  activeClassName = 'is-active',
  className = '',
  scrollClassName = '',
  emptyNode = null,
}) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [internalIndex, setInternalIndex] = useState(initialSelectedIndex);
  const [edges, setEdges] = useState({ top: false, bottom: false, height: 0 });

  const controlled = selectedKey !== undefined;
  const selectedIndex = useMemo(() => {
    if (!controlled) return internalIndex;
    return items.findIndex((item, index) => getKey(item, index) === selectedKey);
  }, [controlled, internalIndex, items, selectedKey, getKey]);

  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) {
      setEdges({ top: false, bottom: false, height: 0 });
      return;
    }
    const scrollable = el.scrollHeight - el.clientHeight > 2;
    const top = scrollable && el.scrollTop > 4;
    const bottom = scrollable && el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    const height = el.clientHeight;
    setEdges((prev) =>
      prev.top === top && prev.bottom === bottom && prev.height === height
        ? prev
        : { top, bottom, height }
    );
  }, []);

  useEffect(() => {
    updateEdges();
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges, items, maxHeight]);

  const maskImage = useMemo(() => {
    if (!showGradients || (!edges.top && !edges.bottom)) return undefined;
    // 视口过矮时缩小渐隐高度，避免正文被吃掉
    const fade = Math.min(fadeSize, Math.max(10, Math.round(edges.height / 4)));
    const topStop = edges.top ? `${fade}px` : '0px';
    const bottomStop = edges.bottom ? `${fade}px` : '0px';
    return `linear-gradient(180deg, transparent 0px, #000 ${topStop}, #000 calc(100% - ${bottomStop}), transparent 100%)`;
  }, [showGradients, edges, fadeSize]);

  // staggerKey 变化或（未 animateOnce 且未指定 staggerKey）列表变化时重播入场
  const replayKey = useMemo(() => {
    if (animateOnce) return 'static';
    if (staggerKey !== undefined) return `k-${String(staggerKey)}`;
    return `s-${items.map((item, index) => getKey(item, index)).join('|')}`;
  }, [animateOnce, staggerKey, items, getKey]);

  const selectItem = useCallback(
    (item, index) => {
      if (!controlled) setInternalIndex(index);
      onItemSelect?.(item, index);
    },
    [controlled, onItemSelect]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!enableArrowNavigation) return;
      const total = items.length;
      if (!total) return;
      const forward = event.key === 'ArrowDown';
      const backward = event.key === 'ArrowUp';

      if (forward || backward) {
        event.preventDefault();
        const step = forward ? 1 : -1;
        const base = selectedIndex < 0 ? (forward ? -1 : total) : selectedIndex;
        let next = base + step;
        if (loop) next = (next + total) % total;
        next = Math.min(total - 1, Math.max(0, next));
        const item = items[next];
        if (!controlled) setInternalIndex(next);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        onItemSelect?.(item, next);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (selectedIndex < 0) return;
        event.preventDefault();
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    },
    [enableArrowNavigation, items, loop, selectedIndex, controlled, onItemSelect]
  );

  const MotionItem = motion[itemAs] || motion.div;
  const variants = ITEM_VARIANTS[animation] || ITEM_VARIANTS.pop;

  return (
    <div className={`animated-list animated-list--${theme}${frame ? ' is-framed' : ''} ${className}`.trim()}
      style={{ width }}
    >
      <motion.div
        key={replayKey}
        ref={listRef}
        className={`animated-list__list${displayScrollbar ? '' : ' is-hidden-scrollbar'} ${scrollClassName}`.trim()}
        style={{
          gap,
          borderRadius: radius,
          maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
          maskImage,
          WebkitMaskImage: maskImage,
        }}
        onScroll={updateEdges}
        onKeyDown={handleKeyDown}
        tabIndex={enableArrowNavigation ? 0 : undefined}
        role="listbox"
        aria-label="列表"
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: stagger } } }}
      >
        {items.length === 0
          ? emptyNode
          : items.map((item, index) => {
              const key = getKey(item, index);
              const selected = index === selectedIndex;
              const classes = [
                'animated-list__item',
                itemClassName || 'animated-list__item--default',
                selected ? activeClassName : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <MotionItem
                  key={key}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type={itemAs === 'button' ? 'button' : undefined}
                  role="option"
                  aria-selected={selected}
                  className={classes}
                  variants={reduceMotion ? undefined : variants}
                  transition={{ duration: 0.42, ease: EASE }}
                  onClick={() => selectItem(item, index)}
                  onMouseEnter={() => {
                    if (!selectOnHover) return;
                    selectItem(item, index);
                  }}
                >
                  {renderItem
                    ? renderItem(item, index, { selected })
                    : (
                      <>
                        <span className="animated-list__title">{item.title}</span>
                        {item.description ? (
                          <span className="animated-list__desc">{item.description}</span>
                        ) : null}
                        {item.meta ? <span className="animated-list__meta">{item.meta}</span> : null}
                      </>
                    )}
                </MotionItem>
              );
            })}
      </motion.div>
    </div>
  );
}
