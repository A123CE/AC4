import { useState, useEffect } from 'react';
import SpotlightCard from './SpotlightCard';

/**
 * 热点详情卡片 — 点击3D模型热点后弹出的信息卡
 * 包含百科术语链接，可跳转到营造法式页面查看完整讲解
 */
export default function HotspotInfoCard({
  hotspot,
  onClose,
  onNavigateToTerm,
  position = 'right',
}) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (hotspot) {
      setAnimating(true);
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [hotspot]);

  if (!hotspot && !animating) return null;

  const posClass = position === 'left'
    ? { left: 16, right: 'auto' }
    : { right: 16, left: 'auto' };

  return (
    <div
      className="hotspot-info-wrapper"
      style={{
        position: 'absolute',
        bottom: 80,
        ...posClass,
        zIndex: 20,
        maxWidth: 320,
        width: 'calc(100% - 32px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <SpotlightCard
        light
        spotlightColor="rgba(200, 150, 12, 0.18)"
        className="hotspot-info-card"
      >
        <div style={{ padding: '14px 16px', position: 'relative' }}>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: 4,
              lineHeight: 1,
            }}
          >
            <i className="fas fa-times" />
          </button>

          {/* 图标 + 标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(200,150,12,0.15), rgba(184,58,42,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vermillion)',
              fontSize: '0.85rem',
            }}>
              <i className={`fas ${hotspot?.icon || 'fa-circle-info'}`} />
            </span>
            <h4 style={{
              margin: 0,
              fontFamily: "'Noto Serif SC', serif",
              fontSize: '0.95rem',
              color: 'var(--ink)',
              fontWeight: 700,
            }}>
              {hotspot?.label || '建筑构件'}
            </h4>
          </div>

          {/* 描述 */}
          <p style={{
            margin: '6px 0 10px',
            fontSize: '0.8rem',
            color: 'var(--ink-light)',
            lineHeight: 1.6,
          }}>
            {hotspot?.description || '暂无描述'}
          </p>

          {/* 了解更多按钮 */}
          {hotspot?.termId && (
            <button
              onClick={() => onNavigateToTerm?.(hotspot)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, rgba(184,58,42,0.08), rgba(200,150,12,0.08))',
                border: '1px solid var(--border-warm)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: '0.75rem',
                color: 'var(--vermillion)',
                cursor: 'pointer',
                fontFamily: "'Noto Serif SC', serif",
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(184,58,42,0.15), rgba(200,150,12,0.15))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(184,58,42,0.08), rgba(200,150,12,0.08))';
              }}
            >
              <i className="fas fa-book-open" />
              营造法式 · 了解更多
            </button>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}
