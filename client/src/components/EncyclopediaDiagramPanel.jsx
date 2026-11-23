import { useState } from 'react';
import { getDiagramSpec } from './EncyclopediaArt';
import DougongModel3D from './DougongModel3D';

/**
 * 图解示意区
 * - 斗拱：真实三维构件拆解（可旋转、拆合、点选构件）
 * - 其余：线稿图 + 热点标注，底部图例与热点联动，保证触屏与键盘可用
 */
export default function EncyclopediaDiagramPanel({ term }) {
  const [activeId, setActiveId] = useState(null);
  const spec = getDiagramSpec(term);
  if (!spec) return null;

  const is3D = spec.kind === 'dougong3d';
  const Art = spec.art;

  return (
    <div className={`enc-diagram${is3D ? ' enc-diagram--3d' : ''}`}>
      <div className="enc-diagram-head">
        <div className="enc-diagram-titles">
          <strong>{spec.title}</strong>
          <span>{spec.caption}</span>
        </div>
      </div>

      {is3D ? (
        <DougongModel3D />
      ) : (
        <>
          <div className="enc-diagram-stage">
            {/* 画布保持 16:9, 热点百分比坐标才能与 SVG 坐标严格对齐 */}
            <div className="enc-diagram-canvas">
              <Art className="enc-diagram-art" />
              {spec.hotspots.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`enc-hotspot${activeId === h.id ? ' is-active' : ''}`}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  onMouseEnter={() => setActiveId(h.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(h.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => setActiveId((v) => (v === h.id ? null : h.id))}
                  aria-label={`${h.label}：${h.note}`}
                >
                  <span className="enc-hotspot-dot" />
                  <span className="enc-hotspot-label">
                    <strong>{h.label}</strong>
                    <em>{h.note}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <ul className="enc-diagram-legend">
            {spec.hotspots.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className={activeId === h.id ? 'is-active' : ''}
                  onMouseEnter={() => setActiveId(h.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(h.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => setActiveId((v) => (v === h.id ? null : h.id))}
                >
                  <span className="enc-diagram-legend-dot" />
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
