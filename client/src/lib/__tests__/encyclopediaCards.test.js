import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import {
  CARDS_CONFIG,
  clampDeckOptions,
  deckPresetFor,
  buildCardItems,
  cardAriaLabel,
  cardSelectIndex,
  resolveCardAsset,
  breakpointKeys,
} from '../encyclopediaCards';
import { GRAPH_CONFIG } from '../encyclopediaGraph';

const term = (overrides = {}) => ({
  id: overrides.id || 't1',
  term: overrides.term || '藻井',
  synopsis: overrides.synopsis || '顶棚凹入',
  category: overrides.category,
  entry_type: overrides.entry_type || 'craft',
  primary_palace_id: overrides.primary_palace_id ?? null,
  sort_order: overrides.sort_order ?? 0,
  level_value: overrides.level_value ?? null,
  image_paths: overrides.image_paths || [],
  ...overrides,
});

const taxonomy = {
  buildings: [
    { id: 'gugong', name: '故宫', dynasty: '明', region: '北京', has_3d: true },
    { id: 'tiantan', name: '天坛', dynasty: '明', region: '北京', has_3d: true },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('encyclopediaCards 纯函数', () => {
  it('CARDS_CONFIG.DEFAULTS 覆盖 15 个参数', () => {
    const keys = Object.keys(CARDS_CONFIG.DEFAULTS);
    expect(keys).toHaveLength(15);
    for (const key of ['delay', 'cardDistance', 'verticalDistance', 'depth', 'skewAmount', 'visibleCards', 'cardRadius', 'speed', 'bounce', 'parallax', 'hoverSpread', 'dim', 'autoplay', 'pauseOnHover', 'draggable']) {
      expect(keys).toContain(key);
    }
  });

  it('RANGES 每项为合法 [min,max]', () => {
    for (const [key, [min, max]] of Object.entries(CARDS_CONFIG.RANGES)) {
      expect(min, key).toBeLessThan(max);
    }
  });

  it('PRESET 键集合与 GRAPH_CONFIG.BREAKPOINTS 完全一致', () => {
    expect(Object.keys(CARDS_CONFIG.PRESET).sort()).toEqual(breakpointKeys().sort());
  });

  it('PRESET 不含三位以上像素数字', () => {
    const source = JSON.stringify(CARDS_CONFIG.PRESET);
    expect(source).not.toMatch(/\d{3,}/);
  });

  it('空输入回落默认值且无告警', () => {
    const { options, warnings } = clampDeckOptions({});
    expect(options.cardDistance).toBe(48);
    expect(options.verticalDistance).toBe(0);
    expect(options.visibleCards).toBe(4);
    expect(options.autoplay).toBe(true);
    expect(warnings).toHaveLength(0);
  });

  it('越界数值被夹紧并记录 warnings', () => {
    const { options, warnings } = clampDeckOptions({ depth: 999, cardDistance: -10 });
    expect(options.depth).toBe(240);
    expect(options.cardDistance).toBe(0);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('非数字回落默认并告警', () => {
    const { options, warnings } = clampDeckOptions({ depth: 'abc' });
    expect(options.depth).toBe(110);
    expect(warnings.some((item) => item.key === 'depth' && item.reason === 'invalid')).toBe(true);
  });

  it('字符串数字先 Number 再夹紧', () => {
    expect(clampDeckOptions({ cardDistance: '60' }).options.cardDistance).toBe(60);
  });

  it('visibleCards 收敛到 items.length', () => {
    expect(clampDeckOptions({ visibleCards: 5 }, { itemsLength: 2 }).options.visibleCards).toBe(2);
  });

  it('autoplay=auto 时减效关闭', () => {
    expect(clampDeckOptions({ autoplay: 'auto' }, { reducedMotion: true }).options.autoplay).toBe(false);
  });

  it('autoplay=auto 时触屏默认关闭', () => {
    expect(clampDeckOptions({ autoplay: 'auto' }, { isTouch: true }).options.autoplay).toBe(false);
    expect(clampDeckOptions({ autoplay: 'auto' }, { isTouch: false }).options.autoplay).toBe(true);
  });

  it('减效强制 bounce/parallax/hoverSpread=0', () => {
    const { options } = clampDeckOptions({ bounce: 1, parallax: 2, hoverSpread: 0.5 }, { reducedMotion: true });
    expect(options.bounce).toBe(0);
    expect(options.parallax).toBe(0);
    expect(options.hoverSpread).toBe(0);
  });

  it('布尔参数按 Boolean 处理', () => {
    const { options } = clampDeckOptions({ pauseOnHover: false, draggable: 0 });
    expect(options.pauseOnHover).toBe(false);
    expect(options.draggable).toBe(false);
  });

  it('deckPresetFor 按断点派生 visibleCards/strength', () => {
    expect(deckPresetFor('wide')).toEqual({ visibleCards: 4, strength: 1, listFallback: false });
    expect(deckPresetFor('compact')).toEqual({ visibleCards: 3, strength: 0.7, listFallback: false });
    expect(deckPresetFor('minimal')).toEqual({ visibleCards: 0, strength: 0, listFallback: true });
    expect(deckPresetFor('unknown')).toEqual({ visibleCards: 4, strength: 1, listFallback: false });
  });

  it('buildCardItems 建筑优先并按 sort/level/id 排序', () => {
    const items = buildCardItems({
      terms: [
        term({ id: 'b', sort_order: 2 }),
        term({ id: 'a', entry_type: 'building', sort_order: 9 }),
        term({ id: 'c', sort_order: 1 }),
      ],
      taxonomy,
    });
    expect(items.map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('buildCardItems 派生朝代/地区/3D 与缺省值', () => {
    const [withBuilding, withoutBuilding, noCategory] = buildCardItems({
      terms: [
        term({ id: 'x', primary_palace_id: 'gugong', category: '名筑档案' }),
        term({ id: 'y' }),
        term({ id: 'z', category: undefined }),
      ],
      taxonomy,
    });
    expect(withBuilding.dynasty).toBe('明');
    expect(withBuilding.region).toBe('北京');
    expect(withBuilding.badge3D).toBe(true);
    expect(withoutBuilding.dynasty).toBeUndefined();
    expect(withoutBuilding.region).toBeUndefined();
    expect(noCategory.category).toBe('未分类');
  });

  it('buildCardItems 确定性且空数组不抛错', () => {
    const input = { terms: [term({ id: 'a' }), term({ id: 'b' })], taxonomy };
    expect(buildCardItems(input)).toEqual(buildCardItems(input));
    expect(buildCardItems({ terms: [], taxonomy })).toEqual([]);
  });

  it('cardAriaLabel 使用 i18n 插值并回退中文', () => {
    const t = (key, fallback, vars) => String(fallback).replace(/\{(\w+)\}/g, (m, name) => String(vars[name]));
    expect(cardAriaLabel({ term: '藻井' }, 0, 3, t)).toBe('第 1 / 3 张：藻井');
    expect(cardAriaLabel({ term: '藻井' }, 1, 3)).toBe('第 2 / 3 张：藻井');
  });

  it('cardSelectIndex 命中与失效、resolveCardAsset 首图', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(cardSelectIndex(items, 'b')).toBe(1);
    expect(cardSelectIndex(items, 'missing')).toBe(-1);
    expect(resolveCardAsset(term({ image_paths: ['/a.png', '/b.png'] }))).toBe('/a.png');
    expect(resolveCardAsset(term({ image_paths: '["/c.png"]' }))).toBe('/c.png');
    expect(resolveCardAsset(term({ image_paths: [] }))).toBeNull();
  });

  it('模块不依赖 React/DOM', () => {
    const source = fs.readFileSync('src/lib/encyclopediaCards.js', 'utf8');
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/window\.|document\./);
  });
});