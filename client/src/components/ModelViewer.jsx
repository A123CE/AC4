import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 占位建筑模型 — 当真实GLTF模型不存在时显示
 */
function PlaceholderBuilding() {
  return (
    <group>
      {/* 台基 */}
      <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.3, 2.8]} />
        <meshStandardMaterial color="#D4C5A9" roughness={0.8} />
      </mesh>

      {/* 主体 */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[3.2, 2.2, 2]} />
        <meshStandardMaterial color="#B5655D" roughness={0.6} />
      </mesh>

      {/* 屋顶 - 庑殿顶简化 */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[2.8, 1.3, 4]} />
        <meshStandardMaterial color="#DAA520" roughness={0.5} />
      </mesh>

      {/* 柱子 */}
      {[[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.6, 8]} />
          <meshStandardMaterial color="#C23B22" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Three.js 3D 查看器
 */
function ModelViewer({ palace }) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #f0e8d8 0%, #e8dcc8 100%)' }}>
      {/* 标题覆盖层 */}
      <div style={{
        position: 'absolute', top: 16, left: 20, zIndex: 10,
        pointerEvents: 'none',
      }}>
        <h2 style={{
          fontSize: 28, fontWeight: 'normal', color: '#3a3a3a',
          letterSpacing: 4, margin: 0, fontFamily: "'宋体', serif",
        }}>
          {palace.name}
        </h2>
        <p style={{
          fontSize: 13, color: '#888', margin: 0, letterSpacing: 1,
          fontFamily: "'宋体', serif",
        }}>
          {palace.dynasty} · {palace.built_year}年建成 · {palace.category}
        </p>
      </div>

      {/* 操作提示 */}
      <div style={{
        position: 'absolute', top: 16, right: 20, zIndex: 10,
        fontSize: 12, color: '#999', letterSpacing: 1,
        fontFamily: "'宋体', serif",
      }}>
        拖拽旋转 · 滚轮缩放
      </div>

      {/* 自转开关 */}
      <label style={{
        position: 'absolute', top: 16, right: 160, zIndex: 10,
        fontSize: 13, color: '#5a4a3a', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'宋体', serif",
      }}>
        <input
          type="checkbox"
          checked={autoRotate}
          onChange={(e) => setAutoRotate(e.target.checked)}
          style={{ accentColor: '#C23B22' }}
        />
        自转
      </label>

      <Canvas
        shadows
        camera={{ position: [8, 6, 10], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        <ambientLight intensity={0.6} color="#FFF5E6" />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-8, 5, -5]} intensity={0.4} color="#C8B898" />

        {/* 地面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#E8DCC8" roughness={0.95} />
        </mesh>

        <Suspense fallback={null}>
          <PlaceholderBuilding />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          minDistance={3}
          maxDistance={30}
        />

        <ContactShadows
          position={[0, -0.49, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={4}
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
