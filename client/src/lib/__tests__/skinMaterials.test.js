import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { useSkinMaterials, applySkinToObject } from '../skinMaterials';

describe('skinMaterials', () => {
  it('程序化建筑回退默认皮肤并给出原因', () => {
    const { result } = renderHook(() =>
      useSkinMaterials('wireframe', 'standard', true)
    );
    expect(result.current.mode).toBe('default');
    expect(result.current.fallbackReason).toBe('procedural_unsupported');
  });

  it('smooth 档简化雪景粒子并保留色调', () => {
    const { result } = renderHook(() =>
      useSkinMaterials('snow', 'smooth', false)
    );
    expect(result.current.mode).toBe('snow');
    expect(result.current.simplified).toBe(true);
    expect(result.current.snowCount).toBe(250);
    expect(result.current.background).toBeTruthy();
  });

  it('wireframe 应用线与清理后恢复原材质', () => {
    const group = new THREE.Group();
    const original = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original);
    group.add(mesh);

    const cleanup = applySkinToObject(group, 'wireframe');
    expect(mesh.material.wireframe).toBe(true);
    expect(mesh.castShadow).toBe(false);

    cleanup();
    expect(mesh.material).toBe(original);
    expect(mesh.castShadow).toBe(true);
  });

  it('sepia 会着色并在清理后恢复原色', () => {
    const group = new THREE.Group();
    const original = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original);
    group.add(mesh);

    const cleanup = applySkinToObject(group, 'sepia');
    expect(original.color.getHex()).not.toBe(0xffffff);

    cleanup();
    expect(original.color.getHex()).toBe(0xffffff);
  });
});