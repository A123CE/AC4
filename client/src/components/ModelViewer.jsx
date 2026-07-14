import { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 克隆 GLTF 场景并设置阴影属性
 */
function cloneWithShadows(scene) {
  const cloned = scene.clone();
  cloned.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return cloned;
}

/**
 * 3D 模型加载器 — 读取后端 /models 路径下的 .glb 文件
 * 使用 primitive 挂载 GLTF 场景，wrapper group 处理缩放和居中
 */
function PalaceModel({ modelPath, onLoadStart, onProgress, onError }) {
  const { scene } = useGLTF(modelPath);

  // 克隆场景并设置阴影属性（在渲染前执行，避免每次重渲染重复克隆）
  const clonedScene = useMemo(() => cloneWithShadows(scene), [scene]);

  const wrapperRef = useRef();
  const adjusted = useRef(false);

  // 首次帧时：计算包围盒，应用缩放和居中变换
  useFrame(() => {
    if (adjusted.current || !wrapperRef.current) return;
    adjusted.current = true;

    // 计算包含所有子对象的包围盒
    const box = new THREE.Box3().setFromObject(wrapperRef.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // 缩放到目标尺寸（6 单位）
    const targetSize = 6;
    const scale = targetSize / maxDim;
    wrapperRef.current.scale.setScalar(scale);

    // 重新计算缩放后的包围盒
    const scaledBox = new THREE.Box3().setFromObject(wrapperRef.current);
    const center = scaledBox.getCenter(new THREE.Vector3());

    // 居中：X/Z 居中，Y 底部对齐 0
    wrapperRef.current.position.set(-center.x, -scaledBox.min.y, -center.z);
  });

  return (
    <group ref={wrapperRef}>
      {/* primitive 将克隆的场景挂载到 R3F 中 */}
      <primitive object={clonedScene} />
    </group>
  );
}

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
 * 加载状态指示器 — 显示进度和错误信息
 */
function LoadingIndicator({ modelPath }) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  return (
    <>
      {/* 使用 drei 的 LoadProgress 显示加载进度 */}
      <Html center>
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 8,
          padding: '16px 24px',
          textAlign: 'center',
          fontFamily: "'宋体', serif",
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}>
          <p style={{ margin: 0, color: '#5a4a3a', fontSize: 14, marginBottom: 8 }}>
            正在加载模型...
          </p>
          <div style={{
            width: 200, height: 4, background: '#e0d5c0', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%', background: '#C23B22',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ margin: '4px 0 0', color: '#999', fontSize: 12 }}>
            {modelPath ? modelPath.split('/').pop() : ''}
          </p>
          {error && (
            <p style={{ color: '#c0392b', fontSize: 12, marginTop: 8 }}>
              加载失败: {error}
            </p>
          )}
        </div>
      </Html>
    </>
  );
}

/**
 * Three.js 3D 查看器 — 加载真实宫殿模型
 */
function ModelViewer({ palace }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [modelError, setModelError] = useState(false);

  // 从宫殿数据中获取模型路径
  const modelPath = palace.model_path || '';
  const fullModelUrl = `/models/${modelPath}`;

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
        {/* 暖米色渐变背景 */}
        <color attach="background" args={['#F0E8D8']} />

        {/* 温暖环境光 */}
        <ambientLight intensity={0.7} color="#FFF5E6" />

        {/* 主光源 — 模拟自然日光从左上方照射 */}
        <directionalLight
          position={[-8, 12, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          color="#FFF8F0"
        />

        {/* 右侧补光 — 模拟反射光，减少暗部 */}
        <directionalLight position={[6, 4, -4]} intensity={0.3} color="#FFE8D0" />

        {/* 白色展示台 — 从中心向两侧延伸 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} metalness={0.0} />
        </mesh>

        <Suspense fallback={<LoadingIndicator modelPath={fullModelUrl} />}>
          {!modelError && fullModelUrl ? (
            <>
              {/* useGLTF 错误处理 */}
              <PalaceModel
                modelPath={fullModelUrl}
                onError={(err) => {
                  console.error('模型加载失败:', err);
                  setModelError(true);
                }}
              />
              {/* 加载失败时显示提示 */}
              {modelError && (
                <Html center>
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 8,
                    padding: '16px 24px',
                    textAlign: 'center',
                    fontFamily: "'宋体', serif",
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
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          minDistance={3}
          maxDistance={30}
        />

        <ContactShadows
          position={[0, -0.48, 0]}
          opacity={0.3}
          scale={15}
          blur={3}
          far={4}
          color="#000000"
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
