import { useRef, Suspense, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  sharedGLTFLoader,
  normalizeAndGround,
  fitCameraToBox,
  MODEL_TARGET_SIZE,
  resolveModelUrl,
  getCanvasSettings,
} from '../lib/modelLoader';
import { ProceduralStage } from './procedural';
import PosterFallback from './PosterFallback';
import { useSkin } from '../context/SkinContext';
import { useTier } from '../context/TierContext';
import { useSkinMaterials, applySkinToObject } from '../lib/skinMaterials';

/* ============================================
 *  沉浸式展览查看器 v7
 *  精确过滤模型内部地面/底座，模型贴地
 * ============================================ */

/** 需要隐藏的 mesh 名称（仅过滤模型内部的网格地面，保留台明底座） */
const HIDDEN_MESH_NAMES = new Set([
  'Cube',
]);

function shouldHideMesh(name) {
  if (!name) return false;
  if (HIDDEN_MESH_NAMES.has(name)) return true;
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

function ExhibitionModel({ modelPath, controlsRef, skinMode = 'default' }) {
  const { camera } = useThree();
  const { scene } = useLoader(sharedGLTFLoader, modelPath);
  const filteredScene = useMemo(() => cloneAndFilter(scene), [scene]);
  const ref = useRef();
  const done = useRef(false);

  useEffect(
    () => applySkinToObject(filteredScene, skinMode),
    [filteredScene, skinMode]
  );

  // 离开当前建筑时释放该模型的 GLTF 缓存，避免多建筑浏览累积显存
  useEffect(() => {
    return () => {
      useLoader.clear(sharedGLTFLoader, modelPath);
    };
  }, [modelPath]);

  useFrame(() => {
    if (!ref.current || done.current) return;
    if (!normalizeAndGround(ref.current, MODEL_TARGET_SIZE)) return;
    done.current = true;
    const box = new THREE.Box3().setFromObject(ref.current);
    if (!box.isEmpty()) fitCameraToBox(camera, controlsRef?.current, box);
  });

  return (
    <group ref={ref}>
      <primitive object={filteredScene} />
    </group>
  );
}

export default function ExhibitionViewer({
  autoRotate = true,
  proceduralKey = null,
  activeSkin = null,
  palace = null,
  assetManifest = null,
  onRetry,
}) {
  const { skin: contextSkin } = useSkin();
  const { tier, supports3D } = useTier();
  const effectiveSkin = activeSkin || contextSkin || 'default';
  const skinVisual = useSkinMaterials(effectiveSkin, tier, !!proceduralKey);
  const canvasSettings = getCanvasSettings(tier);

  const controlsRef = useRef();
  const [contextLost, setContextLost] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const resolvedPath = proceduralKey
    ? ''
    : resolveModelUrl(palace, tier, assetManifest);
  // 模型路径必须由当前 palace 派生：切换建筑时随 props 变化重新挂载，
  // 不能再读全局变量（effect 写入不触发重渲染，会导致「名字变了模型没变」）。
  const modelPath = proceduralKey
    ? ''
    : resolvedPath || (palace?.model_path ? `/models/${palace.model_path}` : '');

  if (!supports3D) {
    return <PosterFallback palace={palace} reason="no-webgl" onRetry={onRetry} />;
  }

  if (!proceduralKey && !modelPath) {
    return (
      <PosterFallback palace={palace} reason="missing-lite" onRetry={onRetry} />
    );
  }

  return (
    <>
      <Canvas
        key={retryToken}
        shadows={canvasSettings.shadows}
        dpr={canvasSettings.dpr}
        camera={{ position: [8, 5, 10], fov: 40 }}
        gl={{
          antialias: canvasSettings.antialias,
          alpha: false,
          powerPreference: canvasSettings.powerPreference,
        }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none';
          gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setContextLost(true);
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            // 直接沿用恢复后的上下文，避免重建新上下文造成二次丢失
            setContextLost(false);
          });
        }}
      >
        <color attach="background" args={[skinVisual.background || '#EDE7DA']} />

        <ambientLight intensity={0.8} color="#FFF8F0" />
        <directionalLight position={[-6, 12, 5]} intensity={0.9} color="#FFFAF5" />
        <directionalLight position={[6, 4, -3]} intensity={0.4} color="#F0E8D8" />

        <Suspense fallback={null}>
          {proceduralKey ? (
            <ProceduralStage
              key={proceduralKey}
              type={proceduralKey}
              controlsRef={controlsRef}
              fitOptions={{ phi: 1.02, margin: 1.12 }}
            />
          ) : (
            modelPath && (
              <ExhibitionModel
                key={modelPath}
                modelPath={modelPath}
                controlsRef={controlsRef}
                skinMode={skinVisual.mode}
              />
            )
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping dampingFactor={0.08}
          autoRotate={autoRotate} autoRotateSpeed={0.5}
          minDistance={2} maxDistance={60}
          enablePan enableZoom enableRotate
        />
      </Canvas>

      {contextLost && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(237, 231, 218, 0.92)',
          }}
        >
          <PosterFallback
            palace={palace}
            reason="context-lost"
            onRetry={() => {
              setContextLost(false);
              setRetryToken((value) => value + 1);
            }}
          />
        </div>
      )}

      {(skinVisual.simplified || skinVisual.fallbackReason) && (
        <div className="viewer-skin-notice">
          {skinVisual.fallbackReason === 'procedural_unsupported'
            ? '该建筑暂不支持此皮肤，已回退为默认模式'
            : '皮肤已简化'}
        </div>
      )}
    </>
  );
}