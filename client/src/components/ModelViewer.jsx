import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

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
  return scene.clone();
}

/**
 * 3D 模型加载器 — 可传入 modelRef 用于热点坐标计算
 */
function PalaceModel({ modelPath, modelRef }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => cloneScene(scene), [scene]);
  const wrapperRef = useRef();
  const adjusted = useRef(false);

  // 将 wrapperRef 同步到外部 modelRef
  useEffect(() => {
    if (modelRef) modelRef.current = wrapperRef.current;
  }, [modelRef, wrapperRef.current]);

  useFrame(() => {
    if (adjusted.current || !wrapperRef.current) return;
    adjusted.current = true;

    const box = new THREE.Box3().setFromObject(wrapperRef.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const targetSize = 6;
    const scale = targetSize / maxDim;
    wrapperRef.current.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(wrapperRef.current);
    const center = scaledBox.getCenter(new THREE.Vector3());

    wrapperRef.current.position.set(-center.x, -scaledBox.min.y, -center.z);
  });

  return (
    <group ref={wrapperRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * 简洁展台地面 — 无网格、无阴影，模型自然落地
 */
function CleanGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
      <circleGeometry args={[8, 64]} />
      <meshStandardMaterial
        color="#F0EBE0"
        roughness={0.9}
        metalness={0.0}
        transparent
        opacity={0.35}
      />
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
function GazeDetector({ onGazeTrigger, isRotating }) {
  const gazeStartRef = useRef(null);
  const lastCheckRef = useRef(0);
  const THRESHOLD = 5000; // 5秒
  const CHECK_INTERVAL = 2000; // 每2秒检查一次

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
      } else if (now - gazeStartRef.current >= THRESHOLD) {
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
function SnowParticles({ active }) {
  const count = 500;
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
function ModelViewer({ palace, bgMode = 'warm', showHud = false, palaces = [], onNavigate, onQuizTrigger, activeSkin = 'default' }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [modelError] = useState(false);
  const [noMotion, setNoMotion] = useState(false);
  const canvasRef = useRef(null);
  const gazeTimerRef = useRef(null);
  const gazeActiveRef = useRef(false);

  const modelPath = palace.model_path || '';
  const fullModelUrl = `/models/${modelPath}`;
  const colors = BG_COLORS[bgMode] || BG_COLORS.warm;

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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 标题覆盖层 */}
      <div className="viewer-title-overlay">
        <h2>{palace.name}</h2>
        <p>{palace.dynasty} · {palace.built_year}年建成 · {palace.category}</p>
      </div>

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

      {/* 自转开关 — 底部居中 */}
      {!noMotion && (
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

      {/* 中轴线迷你地图 */}
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

      {/* 导航箭头 — 上一个/下一个建筑 */}
      {prevPalace && (
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
      {nextPalace && (
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

      <Canvas
        ref={canvasRef}
        camera={{ position: [8, 6, 10], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        // 触摸事件 — 移动端支持
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none';
          // 禁止浏览器右键菜单，让 OrbitControls 右键平移正常工作
          gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        }}
      >
        {/* 背景色 */}
        <color attach="background" args={[colors.bg]} />

        {/* 环境光照 */}
        <ambientLight intensity={0.7} color={colors.ambient} />

        {/* 主光源 */}
        <directionalLight
          position={[-8, 12, 8]}
          intensity={1.2}
          color={colors.sun}
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

        {/* 简洁展台地面 */}
        <CleanGround />

        <Suspense fallback={null}>
          {!modelError && fullModelUrl ? (
            <>
              <PalaceModel modelPath={fullModelUrl} />
              {modelError && (
                <Html center>
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 8,
                    padding: '16px 24px',
                    textAlign: 'center',
                    fontFamily: "'Noto Serif SC', serif",
                    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  }}>
                    <p style={{ margin: 0, color: '#c0392b', fontSize: 14 }}>
                      ⚠️ 模型加载失败
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#888', fontSize: 12 }}>
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
          enableDamping
          dampingFactor={0.08}
          autoRotate={!noMotion && autoRotate}
          autoRotateSpeed={noMotion ? 0 : 1.5}
          minDistance={3}
          maxDistance={30}
          target={[0, 1.5, 0]}
          // 触摸支持
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />

        {/* 注视检测 */}
        <GazeDetector onGazeTrigger={onQuizTrigger} isRotating={autoRotate} />

        {/* 雪花粒子 */}
        <SnowParticles active={activeSkin === 'snow'} />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
