import { useRef, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* ============================================
   清式十八斗 · 独立单体3D展示组件（重构版）
   - 移除底座石板与背景浮空模型
   - 支持逐步拆解/组装动画
   - 左侧交互区专用
   ============================================ */

const OAK = '#C4873E';
const OAK_DARK = '#A0682E';
const OAK_LINE = '#6B4226';
const GROOVE = '#3D2B1F';
const MORTISE = '#5A3A20';

// ── 缓动函数 ──
const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

/**
 * 单个斗体
 */
function SingleDou({ scale = 1, position = [0, 0, 0], rotationY = 0 }) {
  return (
    <group scale={[scale, scale, scale]} position={position} rotation={[0, rotationY, 0]}>
      {/* 斗体主体 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.16, 0.38]} />
        <meshStandardMaterial color={OAK} roughness={0.72} metalness={0.02} />
      </mesh>

      {/* 单边V形槽 */}
      <mesh position={[0, 0.085, 0.16]}>
        <boxGeometry args={[0.12, 0.008, 0.22]} />
        <meshStandardMaterial color={GROOVE} roughness={1} />
      </mesh>

      {/* 槽口两侧挡板 */}
      <mesh position={[-0.065, 0.09, 0.15]} castShadow>
        <boxGeometry args={[0.015, 0.012, 0.24]} />
        <meshStandardMaterial color={OAK} roughness={0.75} />
      </mesh>
      <mesh position={[0.065, 0.09, 0.15]} castShadow>
        <boxGeometry args={[0.015, 0.012, 0.24]} />
        <meshStandardMaterial color={OAK} roughness={0.75} />
      </mesh>

      {/* 底部榫头 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.22, 0.07, 0.22]} />
        <meshStandardMaterial color={OAK} roughness={0.72} />
      </mesh>

      {/* 榫头收分过渡 */}
      <mesh position={[0, -0.035, 0]} castShadow>
        <boxGeometry args={[0.24, 0.04, 0.24]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.78} />
      </mesh>

      {/* 顶部卯眼凹口 */}
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[0.18, 0.025, 0.18]} />
        <meshStandardMaterial color={MORTISE} roughness={0.95} />
      </mesh>

      {/* 侧面木纹刻线 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={'line-' + i} position={[-0.18 + i * 0.09, 0.08, 0.192]}>
          <boxGeometry args={[0.003, 0.155, 0.003]} />
          <meshStandardMaterial color={OAK_LINE} roughness={0.9} />
        </mesh>
      ))}

      {/* 槽口边缘手工切削痕迹 */}
      {[0, 1, 2].map((i) => (
        <mesh key={'tooth-' + i} position={[-0.03 + i * 0.03, 0.093, 0.04]}>
          <boxGeometry args={[0.008, 0.015, 0.008]} />
          <meshStandardMaterial color={OAK} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 拱构件（带端部圆头）
 */
function ArchPiece({ length = 0.32, width = 0.055, height = 0.045, position, rotation }) {
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(width, height, length), [width, height, length]);
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.022, 0.022, width, 6), [width]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: OAK_DARK, roughness: 0.78, metalness: 0.01 }), []);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bodyGeo} material={mat} castShadow />
      <mesh geometry={capGeo} material={mat} castShadow rotation={[0, 0, Math.PI / 2]} position={[0, 0, length / 2]} />
      <mesh geometry={capGeo} material={mat} castShadow rotation={[0, 0, Math.PI / 2]} position={[0, 0, -length / 2]} />
    </group>
  );
}

/**
 * 主模型 — 十八斗组装体（无底座，可拆解）
 */
function EighteenDouModel({ explodeProgress = 0 }) {
  const wrapperRef = useRef();
  const lowerGroup = useRef();
  const upperGroup = useRef();
  const frontArchGroup = useRef();
  const sideArchGroup = useRef();
  const initialized = useRef(false);

  // 首次渲染后存储拱件原始位置
  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    [frontArchGroup, sideArchGroup].forEach((groupRef) => {
      if (!groupRef.current) return;
      groupRef.current.children.forEach((child) => {
        child.userData.origZ = child.position.z;
        child.userData.origY = child.position.y;
        child.userData.origX = child.position.x;
      });
    });
  }, []);

  // 自动缩放 + 居中
  useFrame(() => {
    if (!wrapperRef.current) return;
    const box = new THREE.Box3().setFromObject(wrapperRef.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim < 0.01) return;

    const targetSize = 3.2;
    const s = targetSize / maxDim;
    wrapperRef.current.scale.setScalar(s);

    const scaledBox = new THREE.Box3().setFromObject(wrapperRef.current);
    const center = scaledBox.getCenter(new THREE.Vector3());
    wrapperRef.current.position.set(-center.x, -scaledBox.min.y + 0.1, -center.z);
  });

  // 拆解动画
  useFrame(() => {
    const p = easeOutExpo(explodeProgress);

    if (lowerGroup.current) {
      lowerGroup.current.position.y = -p * 0.8;
      lowerGroup.current.rotation.y = p * 0.15;
    }
    if (upperGroup.current) {
      upperGroup.current.position.y = 0.19 + p * 1.0;
      upperGroup.current.rotation.y = Math.PI / 4 + p * 0.2;
    }
    if (frontArchGroup.current) {
      frontArchGroup.current.children.forEach((child) => {
        child.position.z = (child.userData.origZ ?? child.position.z) + p * 0.6;
        child.position.y = (child.userData.origY ?? child.position.y) + p * 0.3;
      });
    }
    if (sideArchGroup.current) {
      sideArchGroup.current.children.forEach((child, idx) => {
        child.position.x = (child.userData.origX ?? child.position.x) + p * 0.6 * (idx % 2 === 0 ? 1 : -1);
        child.position.y = (child.userData.origY ?? child.position.y) + p * 0.3;
      });
    }
  });

  return (
    <group ref={wrapperRef}>
      {/* 下层坐斗 */}
      <group ref={lowerGroup} position={[0, 0, 0]}>
        <SingleDou scale={1} position={[0, 0, 0]} />
      </group>

      {/* 上层撒斗 */}
      <group ref={upperGroup} position={[0, 0.19, 0]}>
        <SingleDou scale={0.65} position={[0, 0, 0]} rotationY={Math.PI / 4} />
      </group>

      {/* 前后方向短拱 */}
      <group ref={frontArchGroup} position={[0, 0.18, 0.28]}>
        <ArchPiece
          length={0.32}
          position={[0, 0, 0]}
          rotation={[-0.08, 0, 0]}
        />
      </group>

      {/* 左右方向十字交拱 */}
      <group ref={sideArchGroup} position={[0.28, 0.18, 0]}>
        <ArchPiece
          length={0.32}
          position={[0, 0, 0]}
          rotation={[0, 0.08, 0]}
        />
      </group>
    </group>
  );
}

/**
 * 主查看器组件
 */
export default function EighteenDouViewer({ autoRotate = true, explodeProgress = 0 }) {
  const [noMotion, setNoMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const handler = (e) => setNoMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const doRotate = !noMotion && autoRotate;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [2.5, 2, 2.5], fov: 38 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none';
          gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <color attach="background" args={['#FFFFFF']} />

        <ambientLight intensity={0.55} color="#FFF8F0" />
        <directionalLight
          position={[-4, 6, 4]}
          intensity={1.0}
          color="#FFFDF8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[4, 3, -2]} intensity={0.35} color="#F5EDE0" />
        <directionalLight position={[0, -2, 2]} intensity={0.18} color="#FFF5E8" />
        <directionalLight position={[0, 4, -5]} intensity={0.2} color="#F0E8D8" />

        <EighteenDouModel explodeProgress={explodeProgress} />

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          autoRotate={doRotate}
          autoRotateSpeed={0.8}
          minDistance={1.5}
          maxDistance={6}
          target={[0, 0.12, 0]}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY,
          }}
        />
      </Canvas>
    </div>
  );
}
