import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ============================================
 *  沉浸式展览查看器 v7
 *  精确过滤模型内部地面/底座，模型贴地
 * ============================================ */

/** 需要隐藏的 mesh 名称（仅过滤模型内部的网格地面，保留台明底座） */
const HIDDEN_MESH_NAMES = new Set([
  'Cube',        // 灰色网格地面
]);

function shouldHideMesh(name) {
  if (!name) return false;
  // 精确匹配
  if (HIDDEN_MESH_NAMES.has(name)) return true;
  // 前缀匹配
  for (const pattern of HIDDEN_MESH_NAMES) {
    if (name.startsWith(pattern)) return true;
  }
  return false;
}

function cloneAndFilter(scene) {
  const cloned = scene.clone();
  const hidden = [];
  cloned.traverse((child) => {
    if (child.isMesh && child.name && shouldHideMesh(child.name)) {
      hidden.push(child.name);
      child.visible = false;
    }
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  return cloned;
}

function ExhibitionModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  const filteredScene = useMemo(() => cloneAndFilter(scene), [scene]);
  const ref = useRef();
  const done = useRef(false);

  useFrame(() => {
    if (done.current || !ref.current) return;
    done.current = true;

    const box = new THREE.Box3().setFromObject(ref.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim < 0.01) return;

    const targetSize = 7;
    ref.current.scale.setScalar(targetSize / maxDim);

    ref.current.updateMatrixWorld();
    const b2 = new THREE.Box3().setFromObject(ref.current);
    const c = b2.getCenter(new THREE.Vector3());
    ref.current.position.set(-c.x, -b2.min.y, -c.z);
  });

  return (
    <group ref={ref}>
      <primitive object={filteredScene} />
    </group>
  );
}

export default function ExhibitionViewer({ autoRotate = true }) {
  const modelPath = typeof window !== 'undefined'
    ? (window.__EXHIBITION_MODEL_PATH || '')
    : '';

  return (
    <Canvas
      camera={{ position: [8, 5, 10], fov: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.domElement.style.touchAction = 'none';
        gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        scene.background = new THREE.Color(0xEDE7DA);
      }}
    >
      <ambientLight intensity={0.8} color="#FFF8F0" />
      <directionalLight position={[-6, 12, 5]} intensity={0.9} color="#FFFAF5" />
      <directionalLight position={[6, 4, -3]} intensity={0.4} color="#F0E8D8" />

      <Suspense fallback={null}>
        {modelPath && <ExhibitionModel modelPath={modelPath} />}
      </Suspense>

      <OrbitControls
        enableDamping dampingFactor={0.08}
        autoRotate={autoRotate} autoRotateSpeed={0.5}
        minDistance={3} maxDistance={25}
        target={[0, 2, 0]}
        enablePan enableZoom enableRotate
      />
    </Canvas>
  );
}
