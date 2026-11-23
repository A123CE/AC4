import { Children } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * ScrollReveal — 滚动进入视口时逐项显现
 *
 * 与 Masonry 的 revealOnScroll 部分等价：不改动原有网格布局，
 * 只给每个子元素包一层动画外壳，滚动到视口时依次入场。
 *
 *   <ScrollReveal
 *     className="ov-grid-list"
 *     animateFrom="bottom"   // bottom | top | left | right | scale
 *     stagger={0.05}         // 相邻项延迟（秒）
 *     duration={0.6}
 *     bounce={0.15}
 *     blurToFocus            // 从模糊到清晰
 *     revealOnScroll         // false 则挂载即播放
 *     focusOnHover={false}
 *   >
 *     {cards}
 *   </ScrollReveal>
 */

const AXIS = {
  bottom: { x: 0, y: 1 },
  top: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  scale: { x: 0, y: 0 },
};

export default function ScrollReveal({
  children,
  className = '',
  itemClassName = '',
  animateFrom = 'bottom',
  distance = 36,
  stagger = 0.05,
  duration = 0.6,
  bounce = 0.15,
  blurToFocus = true,
  revealOnScroll = true,
  focusOnHover = false,
  once = true,
  amount = 0.2,
  maxDelay = 0.45,
  as: Tag = 'div',
}) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);
  const axis = AXIS[animateFrom] || AXIS.bottom;

  const hidden = {
    opacity: 0,
    x: axis.x * distance,
    y: axis.y * distance,
    scale: animateFrom === 'scale' ? 0.92 : 1,
    filter: blurToFocus ? 'blur(8px)' : 'blur(0px)',
  };

  const shown = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  };

  return (
    <Tag className={`scroll-reveal ${className}`.trim()}>
      {items.map((child, index) => {
        const motionProps = revealOnScroll
          ? { whileInView: shown, viewport: { once, amount, margin: '0px 0px -6% 0px' } }
          : { animate: shown };

        return (
          <motion.div
            key={child.key ?? index}
            className={`scroll-reveal__item${itemClassName ? ` ${itemClassName}` : ''}${
              focusOnHover ? ' is-focusable' : ''
            }`}
            initial={reduceMotion ? false : hidden}
            {...motionProps}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                  delay: Math.min(index * stagger, maxDelay),
                  duration,
                  type: 'spring',
                  bounce,
                }
            }
          >
            {child}
          </motion.div>
        );
      })}
    </Tag>
  );
}
