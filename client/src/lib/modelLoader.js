import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/* ============================================================
 * 统一的 3D 模型加载与归一化工具
 * - 故宫模型为 Meshopt 压缩, 华夏名筑模型为 Draco 压缩
 * - 所有模型统一归一化到同一目标尺寸, 保证大小一致
 * - 各查看器 (ModelViewer / ExhibitionViewer) 共用此模块
 * ============================================================ */

/** 统一的模型归一化目标尺寸(场景单位): 故宫与华夏名筑保持一致 */
export const MODEL_TARGET_SIZE = 6;

/** 模型加载超时（毫秒） */
export const MODEL_LOAD_TIMEOUT_MS = 8000;

/**
 * 按档位选择模型地址
 * - high：优先 high
 * - standard：优先 standard，其次 high
 * - smooth：优先 lite，缺失时回退 standard/high，再回退原始 model_path
 *   （不能因缺少 lite 就让低配设备整站只剩图文）
 * - 清单缺失时回退原始 model_path，保证旧环境可用
 */
export function getCanvasSettings(tier) {
  if (tier === 'smooth') {
    return {
      dpr: 1,
      shadows: false,
      antialias: false,
      powerPreference: 'low-power',
    };
  }
  if (tier === 'high') {
    return {
      dpr: [1, 2],
      shadows: true,
      antialias: true,
      powerPreference: 'high-performance',
    };
  }
  return {
    dpr: [1, 1.5],
    shadows: true,
    antialias: true,
    powerPreference: 'default',
  };
}

export function resolveModelUrl(palace, tier, manifest) {
  if (!palace?.model_path || palace.model_path.startsWith('procedural:')) {
    return null;
  }

  const entry = manifest?.palaces?.[palace.id];
  if (entry) {
    const preferred = tier === 'smooth'
      ? [entry.smooth, entry.standard, entry.high]
      : tier === 'standard'
        ? [entry.standard, entry.high, entry.smooth]
        : [entry.high, entry.standard, entry.smooth];

    const chosen = preferred.find(Boolean);
    if (chosen) return chosen;

    // 清单存在但无可用档位时，回退原始模型，避免低配设备整站图文
    return `/models/${palace.model_path}`;
  }

  return `/models/${palace.model_path}`;
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

/**
 * 全局共享 GLTFLoader — 同时配置 Draco 与 Meshopt 双解码器,
 * 兼容华夏名筑 (Draco) 与故宫 (Meshopt) 两类压缩模型。
 */
export const sharedGLTFLoader = new GLTFLoader();
sharedGLTFLoader.setDRACOLoader(dracoLoader);
sharedGLTFLoader.setMeshoptDecoder(MeshoptDecoder);

/**
 * 归一化模型尺寸并贴地:
 * - 将最大边长缩放到 targetSize
 * - x/z 居中, 底部对齐 y = 0
 * 返回是否成功归一化 (空模型返回 false)。
 */
export function normalizeAndGround(object, targetSize = MODEL_TARGET_SIZE) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim < 0.01) return false;

  object.scale.setScalar(targetSize / maxDim);
  object.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = scaledBox.getCenter(new THREE.Vector3());
  object.position.set(-center.x, -scaledBox.min.y, -center.z);
  return true;
}

/**
 * 根据模型包围盒自动构图:
 * - 依据包围球半径计算观察距离, 保证模型完整容纳在画面内
 * - 将 OrbitControls 的目标点对准包围盒中心
 * theta/phi 为球坐标观察方向(极角 phi 从 +Y 轴起算), 默认取舒适的 3/4 俯视角度。
 */
export function fitCameraToBox(camera, controls, box, { theta = 0.6, phi = 1.15, fov, margin = 1.15 } = {}) {
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const radius = Math.max(sphere.radius, 0.5);
  const vFov = THREE.MathUtils.degToRad(fov ?? camera.fov ?? 45);
  // 竖屏(aspect < 1)时水平视角更窄, 只按垂直 FOV 取距会让模型左右溢出, 取两者较小值
  const aspect = camera.aspect || 1;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const fitFov = Math.min(vFov, hFov);
  const dist = (radius / Math.sin(fitFov / 2)) * margin;

  const dirX = Math.sin(phi) * Math.sin(theta);
  const dirY = Math.cos(phi);
  const dirZ = Math.sin(phi) * Math.cos(theta);

  camera.position.set(
    center.x + dirX * dist,
    center.y + dirY * dist,
    center.z + dirZ * dist
  );
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}
