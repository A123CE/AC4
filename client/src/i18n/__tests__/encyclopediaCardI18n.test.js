import { describe, it, expect } from 'vitest';
import zh from '../zh-CN.json';
import en from '../en.json';

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const placeholders = (value) =>
  [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

const getByPath = (obj, path) => path.split('.').reduce((acc, key) => acc && acc[key], obj);

describe('百科卡片与 3D 图谱 i18n', () => {
  it('card 22 键与 graph3d 12 键中英完全一致', () => {
    const zhCard = flat(zh.encyclopedia.card);
    const enCard = flat(en.encyclopedia.card);
    const zhGraph = flat(zh.encyclopedia.graph3d);
    const enGraph = flat(en.encyclopedia.graph3d);

    expect(zhCard).toHaveLength(22);
    expect(zhGraph).toHaveLength(12);
    expect(zhCard.filter((key) => !enCard.includes(key))).toEqual([]);
    expect(enCard.filter((key) => !zhCard.includes(key))).toEqual([]);
    expect(zhGraph.filter((key) => !enGraph.includes(key))).toEqual([]);
    expect(enGraph.filter((key) => !zhGraph.includes(key))).toEqual([]);
  });

  it('既有 page/guide/graph 键集合未被改动', () => {
    for (const group of ['page', 'guide', 'graph']) {
      const zhKeys = flat(zh.encyclopedia[group]);
      const enKeys = flat(en.encyclopedia[group]);
      expect(zhKeys.length, group).toBeGreaterThan(0);
      expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
      expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
    }
    expect(zh.encyclopedia.page.title).toBe('营造法式');
    expect(zh.encyclopedia.guide.heading).toBe('营造导引');
    expect(zh.encyclopedia.graph.title).toBe('知识图谱');
  });

  it('新增键无双花括号且占位符一致', () => {
    const sources = [zh.encyclopedia.card, en.encyclopedia.card, zh.encyclopedia.graph3d, en.encyclopedia.graph3d];
    for (const source of sources) {
      expect(JSON.stringify(source)).not.toMatch(/\{\{/);
    }

    for (const key of flat(zh.encyclopedia.card)) {
      const zhValue = getByPath(zh.encyclopedia.card, key);
      const enValue = getByPath(en.encyclopedia.card, key);
      expect(JSON.stringify(placeholders(zhValue))).toBe(JSON.stringify(placeholders(enValue)));
    }
    for (const key of flat(zh.encyclopedia.graph3d)) {
      const zhValue = getByPath(zh.encyclopedia.graph3d, key);
      const enValue = getByPath(en.encyclopedia.graph3d, key);
      expect(JSON.stringify(placeholders(zhValue))).toBe(JSON.stringify(placeholders(enValue)));
    }
  });
});