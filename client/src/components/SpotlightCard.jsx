import { useRef, useState } from 'react';

/**
 * 光晕卡片 — 鼠标跟随辉光效果
 * 适配自 ReactBits SpotlightCard，故宫色系
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 卡片内容
 * @param {string} props.className - 额外CSS类名
 * @param {string} props.spotlightColor - 辉光颜色 rgba 格式
 * @param {string} props.bgColor - 卡片背景色
 * @param {boolean} props.light - 浅色模式（宣纸色系）
 * @param {Function} props.onClick - 点击回调
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(200, 150, 12, 0.25)',
  bgColor,
  light = false,
  onClick,
}) {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(0.6); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => { setOpacity(0.6); };
  const handleMouseLeave = () => { setOpacity(0); };

  const baseBg = bgColor || (light ? 'rgba(247, 243, 235, 0.95)' : 'rgba(44, 44, 44, 0.95)');
  const baseBorder = light ? 'rgba(212, 201, 184, 0.6)' : 'rgba(200, 150, 12, 0.2)';

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`spotlight-card ${className}`}
      style={{
        position: 'relative',
        borderRadius: 12,
        border: `1px solid ${baseBorder}`,
        background: baseBg,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.3s ease',
      }}
    >
      <div
        className="spotlight-card-glow"
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          opacity,
          transition: 'opacity 0.5s ease-in-out',
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
