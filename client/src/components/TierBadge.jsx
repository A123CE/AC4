import { useState } from 'react';
import { useTier } from '../context/TierContext';

const LABELS = {
  auto: '自动',
  high: '高清',
  standard: '标准',
  smooth: '流畅',
};

const REASON_TEXT = {
  'save-data': '浏览器开启了省流量模式',
  'no-webgl2': '当前设备不支持 WebGL2',
  'low-memory': '设备内存或 CPU 核数较低',
  'slow-network': '当前网络较慢',
  'small-viewport': '移动端小屏优先保证流畅',
};

export default function TierBadge() {
  const { tier, override, setOverride, supports3D, reason } = useTier();
  const [open, setOpen] = useState(false);

  const current = override || 'auto';
  const label = !supports3D
    ? '图文模式'
    : `${LABELS[tier] || '标准'}${override ? ' · 手动' : ''}`;

  return (
    <div className="tier-badge">
      <button
        type="button"
        className="tier-badge-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`画质档位：${label}`}
      >
        <i className="fas fa-gauge-high" />
        <span>{label}</span>
        {tier === 'smooth' && <em>已简化</em>}
      </button>

      {open && (
        <div className="tier-badge-menu" role="menu">
          {!supports3D && (
            <p className="tier-badge-note">当前设备以图文模式浏览</p>
          )}

          {['auto', 'high', 'standard', 'smooth'].map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={current === value}
              className={`tier-badge-item${current === value ? ' active' : ''}`}
              onClick={() => {
                setOverride(value === 'auto' ? null : value);
                setOpen(false);
              }}
            >
              <span>{LABELS[value]}</span>
              {value === 'auto' && <em>{LABELS[tier]}</em>}
            </button>
          ))}

          {tier === 'smooth' && reason && (
            <p className="tier-badge-note">
              已简化：{REASON_TEXT[reason] || '设备性能有限'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}