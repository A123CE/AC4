import { Children, cloneElement } from 'react';
import '../styles/flex-carousel.css';

/**
 * 无限滚动影像带 + 边缘液体玻璃效果
 * (复刻 reactbits Flex Carousel, 自包含实现, 不依赖 Tailwind/shadcn)
 *
 * 原理:
 *   - 内容复制两份, CSS translateX(-50%) 无限循环滚动
 *   - SVG feTurbulence(动画) + feDisplacementMap 产生"液体玻璃"折射
 *   - 边缘 mask 渐变, 让图片在两端"融化"进背景
 *
 * @param duration 单圈时长(秒)
 * @param gap      图片间距(px)
 */
export default function FlexCarousel({ children, duration = 45, gap = 20, className = '' }) {
  const style = {
    '--fc-duration': `${duration}s`,
    '--fc-gap': `${gap}px`,
  };

  // 复制两份并保证 key 唯一, 用于无缝循环
  const renderGroup = (prefix) =>
    Children.map(children, (child, i) => cloneElement(child, { key: `${prefix}-${i}` }));

  return (
    <div className={`flex-carousel ${className}`.trim()} style={style}>
      {/* 隐藏的 SVG 滤镜 — 液体玻璃边缘 */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="fc-liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.09"
              numOctaves="3"
              seed="5"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.012 0.09;0.02 0.14;0.012 0.09"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="34"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="flex-carousel__track">
        {renderGroup('a')}
        {renderGroup('b')}
      </div>
    </div>
  );
}
