import { useState, useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getHotspots } from '../data/buildingHotspots';

/* ============================================
 *  热点脉冲标记 — 3D场景中的可交互标注点
 * ============================================ */

/** 缩放脉冲环 */
function PulseRing({ color = '#C8960C', size = 0.18, active = false }) {
  const ringRef = useRef();
  const startRef = useRef(Date.now());

  useFrame(() => {
    if (!ringRef.current) return;
    const elapsed = (Date.now() - startRef.current) / 1000;
    const s = 1 + Math.sin(elapsed * 2.5) * 0.25;
    ringRef.current.scale.setScalar(active ? s * 1.2 : s);
    ringRef.current.material.opacity = active ? 0.9 : 0.5 + Math.sin(elapsed * 2.5) * 0.2;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 0.7, size, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
}

/** 中心发光点 */
function GlowDot({ color = '#C8960C', size = 0.04, active = false }) {
  const dotRef = useRef();

  useFrame(() => {
    if (!dotRef.current) return;
    const elapsed = (Date.now() - 1500) / 1000;
    const brightness = 0.7 + Math.sin(elapsed * 3) * 0.3;
    dotRef.current.material.opacity = active ? 1 : brightness;
  });

  return (
    <mesh ref={dotRef}>
      <sphereGeometry args={[active ? size * 1.4 : size, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.8}
        depthTest={false}
      />
    </mesh>
  );
}

/** 竖线指示器 */
function VerticalLine({ height = 0.3, color = '#C8960C', active = false }) {
  return (
    <mesh position={[0, -height / 2, 0]}>
      <cylinderGeometry args={[0.006, 0.006, height, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={active ? 0.8 : 0.4}
        depthTest={false}
      />
    </mesh>
  );
}

/* ============================================
 *  单个热点标记组件
 * ============================================ */
function HotspotMarker({
  hotspot,
  isActive,
  onActivate,
  onDeactivate,
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const active = isActive || hovered;
  const color = active ? '#F39C12' : '#C8960C';
  const size = active ? 0.2 : 0.16;

  return (
    <group
      position={hotspot.worldPosition}
      onClick={(e) => { e.stopPropagation(); onClick?.(hotspot); }}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <PulseRing color={color} size={size} active={active} />
      <GlowDot color={color} size={0.04} active={active} />
      <VerticalLine color={color} height={0.2} active={active} />

      {/* 悬停时显示标签 */}
      {(hovered || isActive) && (
        <Html
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            transform: 'translateY(-20px)',
          }}
        >
          <div style={{
            background: 'rgba(40, 24, 12, 0.92)',
            color: '#F5F0E5',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.7rem',
            fontFamily: "'Noto Serif SC', serif",
            whiteSpace: 'nowrap',
            border: '1px solid rgba(200, 150, 12, 0.3)',
            backdropFilter: 'blur(4px)',
          }}>
            <i className={`fas ${hotspot.icon}`} style={{ marginRight: 4, color: '#C8960C' }} />
            {hotspot.label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================
 *  热点系统主组件
 * ============================================ */
export default function HotspotSystem({
  palaceId,
  modelGroupRef,
  activeHotspotId,
  onHotspotClick,
}) {
  const { camera, size } = useThree();
  const [hotspots, setHotspots] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // 根据建筑ID获取热点并计算世界坐标
  useEffect(() => {
    const raw = getHotspots(palaceId);
    if (!raw.length) {
      setHotspots([]);
      return;
    }

    // 基于模型包围盒转换百分比坐标为世界坐标
    const computeWorld = () => {
      if (!modelGroupRef?.current) {
        // 默认估算
        return raw.map(h => ({
          ...h,
          worldPosition: [
            (h.position[0] - 0.5) * 6,
            (h.position[1] - 0.5) * 8,
            (h.position[2] - 0.5) * 5,
          ],
        }));
      }

      const box = new THREE.Box3().setFromObject(modelGroupRef.current);
      const worldPos = new THREE.Vector3();

      return raw.map(h => {
        worldPos.set(
          (h.position[0] - 0.5) * (box.max.x - box.min.x) + (box.max.x + box.min.x) / 2,
          (h.position[1] - 0.5) * (box.max.y - box.min.y) + box.max.y + 0.2,
          (h.position[2] - 0.5) * (box.max.z - box.min.z) + (box.max.z + box.min.z) / 2,
        );
        return { ...h, worldPosition: worldPos.toArray() };
      });
    };

    // 延迟计算以等待模型加载
    const timer = setTimeout(() => setHotspots(computeWorld()), 300);
    return () => clearTimeout(timer);
  }, [palaceId, modelGroupRef]);

  // 同步外部选中ID
  useEffect(() => {
    setActiveId(activeHotspotId);
  }, [activeHotspotId]);

  if (!hotspots.length) return null;

  return (
    <group>
      {hotspots.map(hotspot => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          isActive={activeId === hotspot.id}
          onClick={(h) => {
            setActiveId(h.id);
            onHotspotClick?.(h);
          }}
        />
      ))}
    </group>
  );
}

export { getHotspots };
