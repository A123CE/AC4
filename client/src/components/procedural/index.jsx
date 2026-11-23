import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitCameraToBox } from '../../lib/modelLoader';
import YingxianPagoda from './YingxianPagoda';
import FoguangHall from './FoguangHall';
import YueyangTower from './YueyangTower';

/* ============================================================
 *  程序化古建筑注册表
 *  model_path 以 `procedural:<key>` 开头时, 由本模块实时生成几何体,
 *  不依赖任何 GLB 资源, 可直接扩展建筑库。
 * ============================================================ */

export const PROCEDURAL_BUILDINGS = {
  yingxian_muta: {
    name: '应县木塔',
    description: '八角五层楼阁式木塔',
    Component: YingxianPagoda,
  },
  foguangsi: {
    name: '佛光寺东大殿',
    description: '唐代单檐庑殿顶木构殿堂',
    Component: FoguangHall,
  },
  yueyanglou: {
    name: '岳阳楼',
    description: '三层三檐四角盔顶名楼',
    Component: YueyangTower,
  },
};

/** 拆解图层定义 — 与各建筑组件的 layers 键一致 */
export const PROCEDURAL_LAYERS = [
  { key: 'platform', label: '台基', icon: 'fa-layer-group' },
  { key: 'structure', label: '柱网梁架', icon: 'fa-columns' },
  { key: 'brackets', label: '斗拱', icon: 'fa-cubes' },
  { key: 'roof', label: '屋顶', icon: 'fa-house' },
  { key: 'details', label: '装饰', icon: 'fa-gem' },
];

export const PROCEDURAL_PREFIX = 'procedural:';

export function isProceduralPath(modelPath) {
  return typeof modelPath === 'string' && modelPath.startsWith(PROCEDURAL_PREFIX);
}

export function proceduralKeyOf(modelPath) {
  return isProceduralPath(modelPath) ? modelPath.slice(PROCEDURAL_PREFIX.length) : null;
}

/**
 * 纯模型 — 供任意 Canvas 内嵌使用
 */
export function ProceduralModel({ type, layers, exploded = false }) {
  const entry = PROCEDURAL_BUILDINGS[type];
  if (!entry) return null;
  const Component = entry.Component;
  return <Component layers={layers} exploded={exploded} />;
}

/**
 * 模型舞台 — 自动构图 / 重置视角 / ref 同步, 与 GLB 查看器行为一致
 */
export function ProceduralStage({
  type,
  layers,
  exploded = false,
  groupRef,
  controlsRef,
  resetToken = 0,
  onReady,
  fitOptions,
}) {
  const { camera } = useThree();
  const wrapperRef = useRef();
  const done = useRef(false);
  const poseRef = useRef(null);

  useEffect(() => {
    if (groupRef) groupRef.current = wrapperRef.current;
  }, [groupRef]);

  useFrame(() => {
    if (!wrapperRef.current || done.current) return;
    done.current = true;
    const box = new THREE.Box3().setFromObject(wrapperRef.current);
    if (!box.isEmpty()) {
      fitCameraToBox(
        camera,
        controlsRef?.current,
        box,
        fitOptions || { phi: 1.04, margin: 1.05 }
      );
      poseRef.current = {
        position: camera.position.clone(),
        target:
          controlsRef?.current?.target?.clone?.() || new THREE.Vector3(),
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
      <ProceduralModel type={type} layers={layers} exploded={exploded} />
    </group>
  );
}
