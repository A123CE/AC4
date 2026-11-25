import { describe, it, expect } from 'vitest';
import zh from '../i18n/zh-CN.json';
import en from '../i18n/en.json';

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const graphScope = (obj) =>
  flat(obj.encyclopedia).filter((key) => /^(page|guide|graph)\./.test(key)).sort();

const placeholders = (text) =>
  [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

const getByPath = (obj, path) => path.split('.').reduce((acc, key) => acc && acc[key], obj);

describe('百科图谱 i18n 键', () => {
  it('中英 page/guide/graph 键集合完全一致且共 36 个', () => {
    const zhKeys = graphScope(zh);
    const enKeys = graphScope(en);
    expect(zhKeys).toHaveLength(36);
    expect(enKeys).toHaveLength(36);
    expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
  });

  it('同键占位符集合一致', () => {
    const mismatches = [];
    for (const key of graphScope(zh)) {
      const path = key.split('.').slice(1).join('.');
      const zhValue = getByPath(zh.encyclopedia, path);
      const enValue = getByPath(en.encyclopedia, path);
      if (JSON.stringify(placeholders(zhValue)) !== JSON.stringify(placeholders(enValue))) {
        mismatches.push(key);
      }
    }
    expect(mismatches).toEqual([]);
    expect(placeholders(zh.encyclopedia.graph.scale)).toEqual(['shown', 'total']);
  });

  it('既有键保留且 group.count 未被修改', () => {
    for (const obj of [zh, en]) {
      expect(obj.encyclopedia.filter.all).toBeTruthy();
      expect(obj.encyclopedia.group.building).toBeTruthy();
      expect(obj.encyclopedia.empty.title).toBeTruthy();
      expect(obj.encyclopedia.coverage.label).toBeTruthy();
      expect(obj.encyclopedia.knowledge.title).toBeTruthy();
      expect(obj.encyclopedia.englishComingSoon).toBeTruthy();
      expect(obj.encyclopedia.summaryInChinese).toBeTruthy();
    }
    expect(zh.encyclopedia.group.count).toBe('{{count}} 条');
    expect(en.encyclopedia.group.count).toBe('{{count}} items');
  });
});