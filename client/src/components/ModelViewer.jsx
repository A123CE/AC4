import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import {
  sharedGLTFLoader,
  normalizeAndGround,
  fitCameraToBox,
  MODEL_TARGET_SIZE,
  MODEL_LOAD_TIMEOUT_MS,
  resolveModelUrl,
  getCanvasSettings,
} from '../lib/modelLoader';
import HotspotSystem from './HotspotSystem';
import PosterFallback from './PosterFallback';
import { ProceduralStage, PROCEDURAL_LAYERS, isProceduralPath, proceduralKeyOf } from './procedural';
import { useSkin } from '../context/SkinContext';
import { useTier } from '../context/TierContext';
import { useReducedMotion } from '../lib/motion';
import { useSkinMaterials, applySkinToObject } from '../lib/skinMaterials';

/* ============================================
   背景颜色映射
   ============================================ */
const BG_COLORS = {
  warm: { bg: '#F0E8D8', ground: '#FFFFFF', ambient: '#FFF5E6', sun: '#FFF8F0', fill: '#FFE8D0' },
  sky: { bg: '#B8D4E8', ground: '#E8E0D0', ambient: '#F0F5FF', sun: '#FFFAF5', fill: '#D0E0F0' },
};

/**
 * 克隆 GLTF 场景
 */
function cloneScene(scene) {
  const cloned = scene.clone();
  cloned.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return cloned;
}

/**
 * 3D 模型加载器 — 可传入 modelRef 用于热点坐标计算
 * 使用共享 GLTFLoader (Draco / Meshopt 双解码器),
 * 兼容故宫 meshopt 压缩模型与华夏名筑 draco 压缩模型,
 * 并统一归一化到 MODEL_TARGET_SIZE。
 */
function PalaceModel({
  modelPath,
  modelRef,
  groupRef,
  controlsRef,
  resetToken = 0,
  onReady,
  skinMode = 'default',
}) {
  const { camera } = useThree();
  const { scene } = useLoader(sharedGLTFLoader, modelPath);
  const clonedScene = useMemo(() => cloneScene(scene), [scene]);

  useEffect(() => applySkinToObject(clonedScene, skinMode), [clonedScene, skinMode]);

  // 切换建筑时释放上一座模型的 GLTF 缓存：
  // 否则每浏览一座建筑都会在显存中常驻一份，累积后触发 WebGL 上下文丢失。
  useEffect(() => {
    return () => {
      useLoader.clear(sharedGLTFLoader, modelPath);
    };
  }, [modelPath]);
  const wrapperRef = useRef();
  const done = useRef(false);
  // 记录自动构图后的相机位姿, 供"重置视角"还原
  const poseRef = useRef(null);

  // 将 wrapperRef 同步到外部 ref（热点定位需要真实模型分组）
  useEffect(() => {
    if (modelRef) modelRef.current = wrapperRef.current;
    if (groupRef) groupRef.current = wrapperRef.current;
  }, [modelRef, groupRef, wrapperRef.current]);

  // 归一化完成后立即自动构图, 保证模型完整适配画面
  useFrame(() => {
    if (!wrapperRef.current || done.current) return;
    if (!normalizeAndGround(wrapperRef.current, MODEL_TARGET_SIZE)) return;
    done.current = true;
    const box = new THREE.Box3().setFromObject(wrapperRef.current);
    if (!box.isEmpty()) {
      // 略高的 3/4 俯视 + 更满的构图, 突出大画幅
      fitCameraToBox(camera, controlsRef?.current, box, { phi: 0.98, margin: 1.04 });
      poseRef.current = {
        position: camera.position.clone(),
        target: controlsRef?.current?.target?.clone?.() || new THREE.Vector3(),
      };
    }
    onReady?.();
  });

  // 重置视角
  useEffect(() => {
    if (!resetToken || !poseRef.current) return;
    const { position, target } = poseRef.current;
    camera.position.copy(position);
    if (controlsRef?.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [resetToken, camera, controlsRef]);

  return (
    <group ref={wrapperRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * 展台地面 — 只接收柔和阴影, 保留庭院底色
 */
function CleanGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[20, 64]} />
      <shadowMaterial transparent opacity={0.24} color="#3d2a18" />
    </mesh>
  );
}

/**
 * 占位建筑模型
 */
function PlaceholderBuilding() {
  return (
    <group>
      {/* 台基 */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[4, 0.3, 2.8]} />
        <meshStandardMaterial color="#D4C5A9" roughness={0.8} />
      </mesh>
      {/* 主体 */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[3.2, 2.2, 2]} />
        <meshStandardMaterial color="#B5655D" roughness={0.6} />
      </mesh>
      {/* 屋顶 */}
      <mesh position={[0, 2.4, 0]}>
        <coneGeometry args={[2.8, 1.3, 4]} />
        <meshStandardMaterial color="#DAA520" roughness={0.5} />
      </mesh>
      {/* 柱子 */}
      {[[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]}>
          <cylinderGeometry args={[0.08, 0.08, 1.6, 8]} />
          <meshStandardMaterial color="#C23B22" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 注视检测组件 — 当用户持续注视模型超过5秒时触发答题
 */
function GazeDetector({ onGazeTrigger, isRotating, resetKey }) {
  const gazeStartRef = useRef(null);
  const lastCheckRef = useRef(0);
  const firedRef = useRef(false);
  const THRESHOLD = 5000; // 5秒
  const CHECK_INTERVAL = 2000; // 每2秒检查一次

  // 每座建筑只触发一次, 防止答题面板弹出后又被重新随机
  useEffect(() => {
    firedRef.current = false;
    gazeStartRef.current = null;
  }, [resetKey]);

  useFrame(({ camera }) => {
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) return;
    lastCheckRef.current = now;

    if (isRotating) {
      gazeStartRef.current = null;
      return;
    }

    // 相机朝向是否大致对着模型
    const target = new THREE.Vector3(0, 1.5, 0);
    const cameraDir = camera.getWorldDirection(new THREE.Vector3());
    const toTarget = target.clone().sub(camera.position).normalize();
    const dot = cameraDir.dot(toTarget);

    if (dot > 0.7) {
      if (!gazeStartRef.current) {
        gazeStartRef.current = now;
      } else if (now - gazeStartRef.current >= THRESHOLD && !firedRef.current) {
        firedRef.current = true;
        onGazeTrigger?.();
        gazeStartRef.current = null;
      }
    } else {
      gazeStartRef.current = null;
    }
  });

  return null;
}

/**
 * 雪花粒子系统 — 雪景模式
 */
function SnowParticles({ active, count = 500 }) {
  const pointsRef = useRef();
  const velocitiesRef = useRef([]);

  useEffect(() => {
    if (!active || !pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    velocitiesRef.current = Array.from({ length: count }, () => ({
      vy: -(0.3 + Math.random() * 0.7),
      vx: (Math.random() - 0.5) * 0.3,
    }));
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const vels = velocitiesRef.current;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += (vels[i]?.vy || -0.5) * delta;
      positions[i * 3] += (vels[i]?.vx || 0) * delta;
      if (positions[i * 3 + 1] < -1) {
        positions[i * 3 + 1] = 8;
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#FFFFFF"
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * 模型查看器主组件 — 沉浸式博物馆舞台 v3
 * 新增：触摸交互、光标反馈、减少动画兼容、3D 悬停检测、
 *       皮肤支持、3D热点标注、点击模型构件展示讲解
 */
function ModelViewer({
  palace,
  bgMode = 'warm',
  showHud = false,
  palaces = [],
  onNavigate,
  onQuizTrigger,
  activeSkin = 'default',
  /* 以下为展厅新版可选控制 */
  autoRotate: autoRotateProp,
  onAutoRotateChange,
  resetToken = 0,
  minimal = false,
  /* 由百科「三维联动」传入：需要高亮的热点ID */
  activeHotspotId = null,
  onHotspotClick,
  assetManifest = null,
  onOpenDetail,
  onLogin,
  showHotspots = true,
}) {
  const { skin: contextSkin } = useSkin();
  const { tier, supports3D } = useTier();
  const reduceMotion = useReducedMotion();
  const [autoRotateLocal, setAutoRotateLocal] = useState(true);
  const autoRotate = autoRotateProp === undefined ? autoRotateLocal : autoRotateProp;
  const setAutoRotate = useCallback(
    (v) => {
      setAutoRotateLocal(v);
      onAutoRotateChange?.(v);
    },
    [onAutoRotateChange]
  );
  const [modelError] = useState(false);
  const [noMotion, setNoMotion] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [internalResetToken, setInternalResetToken] = useState(0);
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const gazeTimerRef = useRef(null);
  const gazeActiveRef = useRef(false);

  const modelPath = palace.model_path || '';
  const isProcedural = isProceduralPath(modelPath);
  const proceduralKey = isProcedural ? proceduralKeyOf(modelPath) : null;
  const resolvedModelUrl = isProcedural
    ? ''
    : resolveModelUrl(palace, tier, assetManifest);
  const fullModelUrl = resolvedModelUrl || '';
  const colors = BG_COLORS[bgMode] || BG_COLORS.warm;
  const effectiveSkin = activeSkin || contextSkin || 'default';
  const skinVisual = useSkinMaterials(effectiveSkin, tier, isProcedural);
  const canvasSettings = getCanvasSettings(tier);

  const needsPosterFallback =
    !isProcedural && (!supports3D || (tier === 'smooth' && !resolvedModelUrl));
  const useFallback = needsPosterFallback || loadTimeout;
  const fallbackReason = !supports3D
    ? 'no-webgl'
    : contextLost
      ? 'context-lost'
      : loadTimeout
        ? 'load-timeout'
        : 'missing-lite';

  // 程序化模型的分层显隐与拆解状态
  const [layerState, setLayerState] = useState({});
  const [exploded, setExploded] = useState(false);
  useEffect(() => {
    setLayerState({});
    setExploded(false);
  }, [proceduralKey]);

  // 模型首帧就绪后才允许定位热点（热点需要真实包围盒）
  const [modelReady, setModelReady] = useState(false);
  useEffect(() => {
    setModelReady(false);
  }, [fullModelUrl, proceduralKey]);

  // 模型体量较大(单件 9~33MB)，加载与切换期间给出明确反馈，避免舞台看起来"空白"
  const { active: modelActive, progress: modelProgress } = useProgress();
  const modelLoading = !!modelPath && !isProcedural && modelActive && modelProgress < 100;

  useEffect(() => {
    if (!fullModelUrl || isProcedural || modelReady) {
      setLoadTimeout(false);
      return undefined;
    }
    const timer = window.setTimeout(
      () => setLoadTimeout(true),
      MODEL_LOAD_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [fullModelUrl, isProcedural, modelReady, retryToken]);

  // 检测用户减少动画偏好
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const handler = (e) => setNoMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 当减少动画时关闭自转
  useEffect(() => {
    if (noMotion) setAutoRotate(false);
  }, [noMotion]);

  // 中轴线位置索引
  const axisIndex = palace.axis_position || 0;
  const totalBuildings = 10;

  // 获取相邻建筑（用于推荐）
  const currentIndex = palaces.findIndex(p => p.id === palace.id);
  const prevPalace = currentIndex > 0 ? palaces[currentIndex - 1] : null;
  const nextPalace = currentIndex < palaces.length - 1 ? palaces[currentIndex + 1] : null;

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onDoubleClick={() => setInternalResetToken((value) => value + 1)}
    >
      {/* 标题覆盖层 */}
      <div className="viewer-title-overlay">
        <h2>{palace.name}</h2>
        <p>{palace.tagline || `${palace.dynasty} · ${palace.built_year}年建成 · ${palace.category}`}</p>
        {isProcedural && (
          <span className="viewer-procedural-badge">
            <i className="fas fa-cubes"></i>
            程序化重建 · 可拆解
          </span>
        )}
      </div>

      {/* 营造拆解面板 — 仅程序化重建建筑 */}
      {isProcedural && (
        <div className="procedural-layer-panel">
          <div className="procedural-layer-head">
            <i className="fas fa-cubes"></i>
            <span>营造拆解</span>
          </div>
          <div className="procedural-layer-chips">
            {PROCEDURAL_LAYERS.map(({ key, label, icon }) => {
              const active = layerState[key] !== false;
              return (
                <button
                  key={key}
                  type="button"
                  className={`procedural-chip${active ? ' active' : ''}`}
                  aria-pressed={active}
                  onClick={() =>
                    setLayerState((prev) => ({
                      ...prev,
                      [key]: prev[key] === false ? true : false,
                    }))
                  }
                >
                  <i className={`fas ${icon}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`procedural-explode${exploded ? ' active' : ''}`}
            onClick={() => setExploded((v) => !v)}
          >
            <i className="fas fa-arrows-up-down"></i>
            {exploded ? '合拢归位' : '拆解层叠'}
          </button>
        </div>
      )}

      {(skinVisual.simplified || skinVisual.fallbackReason) && (
        <div className="viewer-skin-notice">
          {skinVisual.fallbackReason === 'procedural_unsupported'
            ? '该建筑暂不支持此皮肤，已回退为默认模式'
            : '皮肤已简化'}
        </div>
      )}

      {/* 模型加载反馈 — 大模型(9~33MB)载入时舞台不再是空白 */}
      {modelLoading && (
        <div className="viewer-model-loading">
          <span className="viewer-model-loading-ring" />
          <span className="viewer-model-loading-text">
            模型载入中 {Math.round(modelProgress)}%
          </span>
        </div>
      )}

      {/* 操作HUD — 鼠标静止3秒后浮现 */}
      <div className={`viewer-hud${showHud ? ' visible' : ''}`}>
        <div className="viewer-hud-item">
          <i className="fas fa-hand-pointer"></i>
          <span>拖拽旋转</span>
        </div>
        <div className="viewer-hud-item">
          <i className="fas fa-magnifying-glass-plus"></i>
          <span>滚轮缩放</span>
        </div>
        <div className="viewer-hud-item">
          <i className="fas fa-hand"></i>
          <span>右键平移</span>
        </div>
      </div>

      {/* 自转开关 — 底部居中(新版展厅由右侧工具栏接管) */}
      {!minimal && !noMotion && (
        <div
          className={`auto-rotate-toggle${autoRotate ? ' active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          role="switch"
          aria-checked={autoRotate}
          aria-label={autoRotate ? '暂停自动旋转' : '开启自动旋转'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setAutoRotate(!autoRotate);
            }
          }}
        >
          <div className="toggle-dot" />
          <span>{autoRotate ? '自转中' : '已暂停'}</span>
        </div>
      )}

      {/* 中轴线迷你地图 — 仅故宫中轴线建筑显示 */}
      {!minimal && palace.order_num && palace.order_num <= 10 && (
        <div className="axis-minimap">
          <div className="axis-minimap-label">中轴位置</div>
          <div className="axis-minimap-line">
            {Array.from({ length: totalBuildings }, (_, i) => (
              <div
                key={i}
                className={`axis-minimap-dot${i === axisIndex ? ' highlight' : ''}`}
                title={palaces[i]?.name || `建筑${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 导航箭头 — 上一个/下一个建筑(新版由工具栏/建筑轴接管) */}
      {!minimal && prevPalace && (
        <button
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: 'var(--surface-glass-heavy)',
            backdropFilter: 'blur(8px)', border: '1px solid var(--border-warm)',
            borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--ink-light)', fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          }}
          onClick={() => onNavigate(prevPalace)}
          title={prevPalace.name}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
      )}
      {!minimal && nextPalace && (
        <button
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: 'var(--surface-glass-heavy)',
            backdropFilter: 'blur(8px)', border: '1px solid var(--border-warm)',
            borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--ink-light)', fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          }}
          onClick={() => onNavigate(nextPalace)}
          title={nextPalace.name}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      )}

      {useFallback ? (
        <PosterFallback
          palace={palace}
          reason={fallbackReason}
          onRetry={() => {
            setContextLost(false);
            setLoadTimeout(false);
            setRetryToken((value) => value + 1);
          }}
          onOpenDetail={onOpenDetail}
          onLogin={onLogin}
        />
      ) : (
      <>
      <Canvas
        key={retryToken}
        ref={canvasRef}
        shadows={canvasSettings.shadows}
        dpr={canvasSettings.dpr}
        camera={{ position: [8, 6, 10], fov: 45 }}
        gl={{
          antialias: canvasSettings.antialias,
          alpha: false,
          powerPreference: canvasSettings.powerPreference,
        }}
        // 触摸事件 — 移动端支持
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none';
          // 禁止浏览器右键菜单，让 OrbitControls 右键平移正常工作
          gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setContextLost(true);
          });
          // 浏览器恢复上下文后直接沿用，不再重建新上下文（重建会瞬时叠加显存压力）
          gl.domElement.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        {/* 背景色 */}
        <color attach="background" args={[skinVisual.background || colors.bg]} />

        {/* 环境光照 */}
        <ambientLight intensity={0.7} color={colors.ambient} />

        {/* 天光/地面反射 — 增强庭院环境感 */}
        <hemisphereLight args={[colors.ambient, '#c9b492', 0.5]} />

        {/* 主光源 — 投影 */}
        <directionalLight
          position={[-8, 12, 8]}
          intensity={1.2}
          color={colors.sun}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0004}
        />

        {/* 补光 */}
        <directionalLight
          position={[6, 4, -4]}
          intensity={0.3}
          color={colors.fill}
        />

        {/* 底部补光 — 减少建筑底部的厚重阴影 */}
        <directionalLight
          position={[0, 2, 0]}
          intensity={0.2}
          color={colors.ambient}
        />

        {/* 简洁展台地面 — 接收模型落地阴影 */}
        <CleanGround />

        <Suspense fallback={null}>
          {isProcedural ? (
            <ProceduralStage
              key={proceduralKey}
              type={proceduralKey}
              layers={layerState}
              exploded={exploded}
              groupRef={modelGroupRef}
              controlsRef={controlsRef}
              resetToken={resetToken + internalResetToken}
              onReady={() => setModelReady(true)}
            />
          ) : !modelError && fullModelUrl ? (
            <>
              <PalaceModel
                key={fullModelUrl}
                modelPath={fullModelUrl}
                groupRef={modelGroupRef}
                controlsRef={controlsRef}
                resetToken={resetToken + internalResetToken}
                onReady={() => setModelReady(true)}
                skinMode={skinVisual.mode}
              />
              {modelError && (
                <Html center>
                  <div className="t-body" style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 8,
                    padding: '16px 24px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  }}>
                    <p style={{ margin: 0, color: '#c0392b', fontSize: 'var(--fs-body)' }}>
                      ⚠️ 模型加载失败
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#888', fontSize: 'var(--fs-meta)' }}>
                      请检查网络连接或稍后重试
                    </p>
                  </div>
                </Html>
              )}
            </>
          ) : (
            <PlaceholderBuilding />
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!noMotion && autoRotate}
          autoRotateSpeed={noMotion ? 0 : 1.5}
          minDistance={2}
          maxDistance={60}
          // 触摸支持
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />

        {/* 构件热点 — 百科「三维联动」跳转后高亮对应构件 */}
        {!isProcedural &&
          modelReady &&
          (showHotspots || activeHotspotId) && (
            <HotspotSystem
              palaceId={palace.id}
              modelGroupRef={modelGroupRef}
              activeHotspotId={activeHotspotId}
              onHotspotClick={onHotspotClick}
              onlyActive={!showHotspots}
              reduceMotion={reduceMotion}
            />
          )}

        {/* 注视检测 */}
        <GazeDetector
          onGazeTrigger={onQuizTrigger}
          isRotating={autoRotate}
          resetKey={fullModelUrl || proceduralKey}
        />

        {/* 雪花粒子 */}
        <SnowParticles
          active={skinVisual.mode === 'snow'}
          count={skinVisual.snowCount || 500}
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
            onOpenDetail={onOpenDetail}
            onLogin={onLogin}
          />
        </div>
      )}
      </>)}
    </div>
  );
}

export default ModelViewer;
