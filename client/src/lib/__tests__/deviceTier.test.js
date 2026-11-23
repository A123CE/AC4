import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectTier,
  detectTierInfo,
  resolveTier,
  readTierOverride,
  writeTierOverride,
  probeWebGL2,
  clearWebGL2Cache,
  TIER_KEY,
} from '../deviceTier';

beforeEach(() => {
  localStorage.clear();
  clearWebGL2Cache();
  vi.restoreAllMocks();
});

describe('deviceTier 判定矩阵', () => {
  it('桌面高分环境返回 high', () => {
    expect(
      detectTier({
        width: 1440,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: true,
        effectiveType: '4g',
        saveData: false,
      })
    ).toBe('high');
  });

  it('中等桌面返回 standard', () => {
    expect(
      detectTier({
        width: 900,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: true,
        effectiveType: '4g',
      })
    ).toBe('standard');
  });

  it('低内存安卓返回 smooth', () => {
    expect(
      detectTier({
        width: 390,
        deviceMemory: 2,
        hardwareConcurrency: 4,
        webgl2: true,
        effectiveType: '4g',
      })
    ).toBe('smooth');
  });

  it('省流量模式优先返回 smooth', () => {
    expect(
      detectTier({
        width: 1440,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: true,
        saveData: true,
      })
    ).toBe('smooth');
  });

  it('无 WebGL2 返回 smooth', () => {
    expect(
      detectTier({
        width: 1440,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: false,
      })
    ).toBe('smooth');
    expect(detectTierInfo({ webgl2: false, saveData: false }).reason).toBe(
      'no-webgl2'
    );
  });

  it('慢网络返回 smooth', () => {
    expect(
      detectTier({
        width: 1200,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: true,
        effectiveType: '3g',
      })
    ).toBe('smooth');
  });

  it('小视口返回 smooth', () => {
    expect(
      detectTierInfo({
        width: 390,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        webgl2: true,
        effectiveType: '4g',
      })
    ).toEqual({ tier: 'smooth', reason: 'small-viewport' });
  });

  it('用户覆盖优先于自动判定', () => {
    expect(resolveTier('high', 'smooth')).toBe('high');
    expect(resolveTier('smooth', 'high')).toBe('smooth');
    expect(resolveTier(null, 'standard')).toBe('standard');
  });

  it('覆盖值可读写', () => {
    writeTierOverride('high');
    expect(localStorage.getItem(TIER_KEY)).toBe('high');
    expect(readTierOverride()).toBe('high');

    writeTierOverride(null);
    expect(localStorage.getItem(TIER_KEY)).toBeNull();
    expect(readTierOverride()).toBeNull();
  });

  it('WebGL2 只探测一次', () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({});

    probeWebGL2();
    probeWebGL2();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});