/**
 * 闪光文字 — 金属光泽掠过文字效果
 * 适配自 ReactBits ShinyText，故宫金色光感
 *
 * @param {Object} props
 * @param {string} props.text - 显示文本
 * @param {string} props.color - 基础文字色 (hex)
 * @param {string} props.shineColor - 闪光色 (hex)
 * @param {number} props.speed - 动画速度 (秒)
 * @param {number} props.spread - 光泽扩散角度
 * @param {string} props.className - 额外类名
 */
export default function ShinyText({
  text,
  color = '#8C8580',
  shineColor = '#C8960C',
  speed = 3,
  spread = 100,
  className = '',
  direction = 'left',
  disabled = false,
}) {
  if (disabled) {
    return <span className={className} style={{ color }}>{text}</span>;
  }

  const gradientStyle = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: `shiny-text-slide ${speed}s linear infinite`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
  };

  return (
    <>
      <style>{`
        @keyframes shiny-text-slide {
          0% { background-position: 150% center; }
          100% { background-position: -50% center; }
        }
      `}</style>
      <span className={className} style={gradientStyle}>{text}</span>
    </>
  );
}
