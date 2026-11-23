import { useEffect, useRef } from 'react';

/**
 * 3D 视差卡片 — 适配自 Aceternity UI 3d-card
 * 去除 Tailwind 依赖, 使用项目 CSS 变量; 支持 prefers-reduced-motion
 *
 * 用法:
 *   <CardContainer className="旋转层类名" containerClassName="外层类名">
 *     <CardBody className="主体类名">
 *       <CardItem translateZ={50}>…</CardItem>
 *     </CardBody>
 *   </CardContainer>
 *
 * 结构链: 外层(perspective) → 旋转层(preserve-3d) → 主体(preserve-3d)
 *         → 中间层(preserve-3d) → CardItem(translateZ 视差)
 * 注意: 链上任何元素设置 overflow:hidden 都会压平 3D 效果
 */

const MAX_TILT = 13; // 最大倾斜角度(度)

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * 3D 透视容器 — 鼠标移动时轻微旋转, 产生视差
 * @param className      应用到内部旋转层
 * @param containerClassName 应用到外部透视容器
 */
export function CardContainer({ children, className = '', containerClassName = '', ...rest }) {
  const rotatorRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = rotatorRef.current;
    if (!el || reducedMotion()) return;
    // 用外层容器(未变换)的矩形计算, 避免旋转导致的坐标抖动
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${(x * MAX_TILT).toFixed(2)}deg) rotateX(${(-y * MAX_TILT).toFixed(2)}deg)`;
  };

  const handleMouseLeave = () => {
    const el = rotatorRef.current;
    if (!el) return;
    el.style.transform = 'rotateY(0deg) rotateX(0deg)';
  };

  return (
    <div
      className={`ov-card3d ${containerClassName}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      <div ref={rotatorRef} className={className}>
        {children}
      </div>
    </div>
  );
}

/**
 * 3D 主体 — preserve-3d 容器
 * @param as 渲染的标签, 默认 div
 */
export function CardBody({ as: Tag = 'div', children, className = '', ...rest }) {
  return (
    <Tag className={`ov-card3d-body ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * 3D 图层 — 携带 translate/rotate 的元素, 随容器旋转产生景深
 * @param as        渲染的标签, 默认 div
 * @param translateX/Y/Z 平移(像素)
 * @param rotateX/Y/Z    旋转(度)
 */
export function CardItem({
  as: Tag = 'div',
  children,
  className = '',
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.transform =
      `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px)` +
      ` rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
  }, [translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  return (
    <Tag ref={ref} className={`ov-card3d-item ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
