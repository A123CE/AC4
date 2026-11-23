import { describe, it, expect } from 'vitest';
import { resolveModelUrl } from '../modelLoader';

const PALACE = { id: 'wumen', model_path: 'forbidden-city/wumen.glb' };

describe('resolveModelUrl 档位回退', () => {
  it('清单缺失时回退原始模型路径', () => {
    expect(resolveModelUrl(PALACE, 'standard', null)).toBe(
      '/models/forbidden-city/wumen.glb'
    );
  });

  it('清单缺少该建筑时回退原始模型路径', () => {
    expect(resolveModelUrl(PALACE, 'smooth', { palaces: {} })).toBe(
      '/models/forbidden-city/wumen.glb'
    );
  });

  it('smooth 有 lite 时优先 lite', () => {
    const manifest = {
      palaces: { wumen: { smooth: '/models/lite/wumen.glb' } },
    };
    expect(resolveModelUrl(PALACE, 'smooth', manifest)).toBe('/models/lite/wumen.glb');
  });

  it('smooth 无 lite 但有 high 时回退 high，避免整站图文', () => {
    const manifest = {
      palaces: { wumen: { high: '/models/forbidden-city/wumen.glb' } },
    };
    expect(resolveModelUrl(PALACE, 'smooth', manifest)).toBe(
      '/models/forbidden-city/wumen.glb'
    );
  });

  it('smooth 所有档位都缺失时仍回退 model_path', () => {
    const manifest = { palaces: { wumen: {} } };
    expect(resolveModelUrl(PALACE, 'smooth', manifest)).toBe(
      '/models/forbidden-city/wumen.glb'
    );
  });

  it('standard 优先 standard，其次 high', () => {
    const manifest = {
      palaces: { wumen: { standard: '/models/std/wumen.glb' } },
    };
    expect(resolveModelUrl(PALACE, 'standard', manifest)).toBe('/models/std/wumen.glb');

    const highOnly = { palaces: { wumen: { high: '/models/high/wumen.glb' } } };
    expect(resolveModelUrl(PALACE, 'standard', highOnly)).toBe('/models/high/wumen.glb');
  });

  it('high 优先 high', () => {
    const manifest = {
      palaces: {
        wumen: { high: '/models/high/wumen.glb', standard: '/models/std/wumen.glb' },
      },
    };
    expect(resolveModelUrl(PALACE, 'high', manifest)).toBe('/models/high/wumen.glb');
  });

  it('程序化建筑与空模型返回 null', () => {
    expect(
      resolveModelUrl({ id: 'foguangsi', model_path: 'procedural:foguangsi' }, 'high', null)
    ).toBeNull();
    expect(resolveModelUrl({ id: 'x', model_path: null }, 'high', null)).toBeNull();
  });
});