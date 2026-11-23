import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 斗拱三维拆解 — 以真实构件几何体搭建的"一朵斗拱"
 * 层级自下而上：檐柱 → 栌斗 → 泥道拱/华拱 → 散斗 → 下昂 → 罗汉枋
 * 支持拆解/合拢、自转、点选构件查看名称与作用。
 */

const WOOD = '#a87a4f';
const WOOD_DARK = '#8a5f3c';
const ACCENT = '#b83a2a';
const EDGE = '#4a3625';

const PARTS = [
  {
    id: 'zhu',
    name: '檐柱',
    note: '承托整朵斗拱的立柱，柱头上方即为栌斗。',
    type: 'cylinder',
    size: [0.36, 0.36, 1.9, 28],
    position: [0, 0.95, 0],
    explode: [0, -0.3, 0],
  },
  {
    id: 'ludou',
    name: '栌斗',
    note: '柱头大斗，斗口承托横拱与昂，是整朵斗拱的受力中枢。',
    type: 'box',
    size: [1.1, 0.5, 1.1],
    position: [0, 2.15, 0],
    explode: [0, 0.04, 0],
    dark: true,
  },
  {
    id: 'nidao',
    name: '泥道拱',
    note: '与华拱十字相交的横拱，沿进深方向出跳。',
    type: 'box',
    size: [0.44, 0.28, 1.95],
    position: [0, 2.54, 0],
    explode: [0, 0.3, 0],
  },
  {
    id: 'huagong',
    name: '华拱',
    note: '沿面阔方向出跳的弓形构件，逐层出挑把屋檐向外送出。',
    type: 'box',
    size: [2.4, 0.28, 0.44],
    position: [0, 2.54, 0],
    explode: [0, 0.58, 0],
  },
  {
    id: 'sheng-l',
    group: 'sheng',
    name: '散斗',
    note: '拱端小斗，承托上一层拱枋，把荷载逐层传递上去。',
    type: 'box',
    size: [0.4, 0.26, 0.4],
    position: [1.02, 2.82, 0],
    explode: [0, 0.82, 0],
    dark: true,
  },
  {
    id: 'sheng-r',
    group: 'sheng',
    hidden: true,
    name: '散斗',
    note: '拱端小斗，承托上一层拱枋，把荷载逐层传递上去。',
    type: 'box',
    size: [0.4, 0.26, 0.4],
    position: [-1.02, 2.82, 0],
    explode: [0, 0.82, 0],
    dark: true,
  },
  {
    id: 'ang',
    name: '下昂',
    note: '斜向下伸的昂嘴，形成杠杆式挑檐，是宋代斗拱的标志构件。',
    type: 'box',
    size: [0.4, 0.24, 2.0],
    position: [0, 3.02, 0.05],
    rotation: [-0.26, 0, 0],
    explode: [0, 1.06, 0.16],
  },
  {
    id: 'fang',
    name: '罗汉枋',
    note: '压在整朵斗拱之上的横枋，与屋架相连并稳定出跳。',
    type: 'box',
    size: [3.0, 0.28, 0.44],
    position: [0, 3.42, 0],
    explode: [0, 1.34, 0],
  },
];

function PartMesh({ part, groupRef, active, onHover, onSelect }) {
  const geometry = useMemo(() => {
    if (part.type === 'cylinder') return new THREE.CylinderGeometry(...part.size);
    return new THREE.BoxGeometry(...part.size);
  }, [part]);

  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 24), [geometry]);

  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
    },
    [geometry, edges]
  );

  return (
    <group ref={groupRef} position={part.position} rotation={part.rotation || [0, 0, 0]}>
      <mesh
        geometry={geometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(part.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(part.id);
        }}
      >
        <meshStandardMaterial
          color={active ? ACCENT : part.dark ? WOOD_DARK : WOOD}
          roughness={0.78}
          metalness={0.03}
          emissive={active ? '#3f0d05' : '#000000'}
          emissiveIntensity={active ? 0.35 : 0}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          color={active ? '#5d150a' : EDGE}
          transparent
          opacity={active ? 0.7 : 0.42}
        />
      </lineSegments>
    </group>
  );
}

function Assembly({ explode, activeId, onHover, onSelect, autoRotate }) {
  const groupRef = useRef();
  const partRefs = useRef([]);
  const factor = useRef(0);
  // 初始略微侧转, 让两个方向的拱同时可见
  const spin = useRef(-0.62);

  // 同一构件的多实例（如左右散斗）共享高亮状态
  const activeKey = PARTS.find((p) => p.id === activeId)?.group || activeId;

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    factor.current = THREE.MathUtils.damp(factor.current, explode ? 1 : 0, 5, d);

    PARTS.forEach((part, i) => {
      const node = partRefs.current[i];
      if (!node) return;
      const [bx, by, bz] = part.position;
      const [ox, oy, oz] = part.explode;
      node.position.set(
        bx + ox * factor.current,
        by + oy * factor.current,
        bz + oz * factor.current
      );
    });

    if (autoRotate && groupRef.current) {
      spin.current += d * 0.2;
      groupRef.current.rotation.y = spin.current;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, -0.62, 0]}>
      {/* 台座 */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[1.55, 1.62, 0.06, 56]} />
        <meshStandardMaterial color="#ded2ba" roughness={0.92} />
      </mesh>

      {PARTS.map((part, i) => (
        <PartMesh
          key={part.id}
          part={part}
          groupRef={(el) => {
            partRefs.current[i] = el;
          }}
          active={(part.group || part.id) === activeKey}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export default function DougongModel3D({ compact = false }) {
  // 首屏先给合拢的完整斗拱，再由用户拆解
  const [exploded, setExploded] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const [activeId, setActiveId] = useState('huagong');
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setSpinning(false);
    const onChange = (e) => e.matches && setSpinning(false);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const hover = useCallback((id) => setHoverId(id), []);
  const selectPart = useCallback((id) => setActiveId(String(id).replace(/-r$/, '-l')), []);

  const current = hoverId || activeId;
  const active =
    PARTS.find((p) => (p.group || p.id) === (PARTS.find((q) => q.id === current)?.group || current)) ||
    PARTS[0];

  return (
    <div className={`dougong3d${compact ? ' dougong3d--compact' : ''}`}>
      <div className="dougong3d-stage">
        <Canvas
          dpr={[1, 1.8]}
          camera={{ position: [6.8, 4.8, 8.1], fov: 32 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
        >
          <ambientLight intensity={0.46} />
          <directionalLight position={[6, 9, 7]} intensity={1.25} color="#fff4e0" />
          <directionalLight position={[-7, 4, -6]} intensity={0.26} color="#c8d6e4" />
          <Assembly
            explode={exploded}
            activeId={hoverId || activeId}
            onHover={hover}
            onSelect={selectPart}
            autoRotate={spinning && !hoverId}
          />
          <OrbitControls
            target={[0, 2.32, 0]}
            enablePan={false}
            minDistance={8}
            maxDistance={18}
            minPolarAngle={0.6}
            maxPolarAngle={1.62}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>

        <div className="dougong3d-tools">
          <button
            type="button"
            className={exploded ? 'is-on' : ''}
            onClick={() => setExploded((v) => !v)}
            aria-pressed={exploded}
          >
            <i className="fas fa-layer-group" />
            {exploded ? '合拢' : '拆解'}
          </button>
          <button
            type="button"
            className={spinning ? 'is-on' : ''}
            onClick={() => setSpinning((v) => !v)}
            aria-pressed={spinning}
          >
            <i className="fas fa-rotate" />
            自转
          </button>
        </div>

      </div>

      <aside className="dougong3d-info">
        <p className="dougong3d-info-eyebrow">当前构件</p>
        <h4 className="dougong3d-info-name">{active.name}</h4>
        <p className="dougong3d-info-note">{active.note}</p>

        <ul className="dougong3d-legend">
          {PARTS.filter((p) => !p.hidden).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={activeId === p.id ? 'is-active' : ''}
                onClick={() => selectPart(p.id)}
                onMouseEnter={() => setHoverId(p.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(p.id)}
                onBlur={() => setHoverId(null)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
