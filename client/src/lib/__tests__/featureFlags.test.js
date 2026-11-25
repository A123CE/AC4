import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isSphereEnabled,
  isDeckV2Enabled,
  isGraphChipV2Enabled,
  isGraphThemeEnabled,
} from '../featureFlags';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('featureFlags 特性开关', () => {
  it('未设置时两条开关默认开启', () => {
    expect(isSphereEnabled()).toBe(true);
    expect(isDeckV2Enabled()).toBe(true);
  });

  it('显式 on 或任意非 off 值时开启', () => {
    vi.stubEnv('VITE_ENC_SPHERE', 'on');
    vi.stubEnv('VITE_ENC_DECK_V2', '1');
    expect(isSphereEnabled()).toBe(true);
    expect(isDeckV2Enabled()).toBe(true);
  });

  it('显式 off 时关闭', () => {
    vi.stubEnv('VITE_ENC_SPHERE', 'off');
    vi.stubEnv('VITE_ENC_DECK_V2', 'off');
    expect(isSphereEnabled()).toBe(false);
    expect(isDeckV2Enabled()).toBe(false);
  });

  it('两开关互不影响', () => {
    vi.stubEnv('VITE_ENC_SPHERE', 'off');
    expect(isSphereEnabled()).toBe(false);
    expect(isDeckV2Enabled()).toBe(true);
  });

  it('读取发生在调用时而非模块加载时', () => {
    vi.stubEnv('VITE_ENC_SPHERE', 'off');
    expect(isSphereEnabled()).toBe(false);
    vi.stubEnv('VITE_ENC_SPHERE', 'on');
    expect(isSphereEnabled()).toBe(true);
  });

  it('图谱卡片与主题开关默认开启、off 关闭', () => {
    expect(isGraphChipV2Enabled()).toBe(true);
    expect(isGraphThemeEnabled()).toBe(true);
    vi.stubEnv('VITE_ENC_GRAPH_CHIP_V2', 'off');
    vi.stubEnv('VITE_ENC_GRAPH_THEME', 'off');
    expect(isGraphChipV2Enabled()).toBe(false);
    expect(isGraphThemeEnabled()).toBe(false);
  });
});