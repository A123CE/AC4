import { useMemo } from 'react';
import * as THREE from 'three';

const SEPIA_TINT = new THREE.Color('#D8C4A0');

/**
 * 皮肤视觉参数
 * 程序化建筑不支持非默认皮肤，回退 default 并给出原因。
 */
export function useSkinMaterials(skin = 'default', tier = 'standard', isProcedural = false) {
  return useMemo(() => {
    if (isProcedural && skin !== 'default') {
      return {
        mode: 'default',
        simplified: false,
        fallbackReason: 'procedural_unsupported',
        background: null,
        snowCount: 0,
      };
    }

    const simplified = tier === 'smooth';

    return {
      mode: skin || 'default',
      simplified,
      fallbackReason: null,
      background:
        skin === 'snow' ? '#DCE7EE' : skin === 'sepia' ? '#E8D9BA' : null,
      snowCount: skin === 'snow' ? (simplified ? 250 : 500) : 0,
    };
  }, [skin, tier, isProcedural]);
}

/**
 * 将皮肤应用到 Three.js 对象
 * 返回 cleanup：恢复原始材质与颜色，并释放线稿材质。
 */
export function applySkinToObject(root, mode) {
  if (!root || typeof root.traverse !== 'function') return () => {};

  const meshes = [];
  root.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });

  for (const mesh of meshes) {
    if (!mesh.userData.__ac4OriginalMaterial) {
      mesh.userData.__ac4OriginalMaterial = mesh.material;
    }
    const original = mesh.userData.__ac4OriginalMaterial;

    if (!mesh.userData.__ac4OriginalColor && original?.color?.clone) {
      mesh.userData.__ac4OriginalColor = original.color.clone();
    }

    if (mode === 'wireframe') {
      if (!mesh.userData.__ac4WireMaterial) {
        mesh.userData.__ac4WireMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: '#5A5252',
        });
      }
      mesh.material = mesh.userData.__ac4WireMaterial;
      mesh.castShadow = false;
    } else if (mode === 'sepia') {
      mesh.material = original;
      if (original?.color && mesh.userData.__ac4OriginalColor) {
        original.color
          .copy(mesh.userData.__ac4OriginalColor)
          .multiply(SEPIA_TINT);
      }
      mesh.castShadow = true;
    } else {
      mesh.material = original;
      if (original?.color && mesh.userData.__ac4OriginalColor) {
        original.color.copy(mesh.userData.__ac4OriginalColor);
      }
      mesh.castShadow = true;
    }
  }

  return () => {
    for (const mesh of meshes) {
      const original = mesh.userData.__ac4OriginalMaterial;
      if (original) mesh.material = original;
      if (original?.color && mesh.userData.__ac4OriginalColor) {
        original.color.copy(mesh.userData.__ac4OriginalColor);
      }
      if (mesh.userData.__ac4WireMaterial) {
        mesh.userData.__ac4WireMaterial.dispose();
        mesh.userData.__ac4WireMaterial = null;
      }
      mesh.castShadow = true;
    }
  };
}