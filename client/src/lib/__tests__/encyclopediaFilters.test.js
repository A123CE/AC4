import { describe, it, expect } from 'vitest';
import {
  normalizeFilters,
  toSearchParams,
  filterTerms,
  groupTerms,
  countByType,
  highlightSegments,
  pickAlternatives,
  normalizeText,
} from '../encyclopediaFilters';

const taxonomy = {
  buildings: [
    { id: 'tiantan', name: '天坛' },
    { id: 'mogao', name: '莫高窟' },
  ],
  dynasties: ['明', '唐'],
  regions: ['北京', '甘肃'],
  categories: [
    { category: '名筑档案' },
    { category: '屋顶' },
    { category: '脊兽' },
  ],
};

const terms = [
  {
    id: 'tiantan-eaves',
    term: '天坛·三重攒尖',
    synopsis: '圆形平面与蓝色琉璃瓦',
    entry_type: 'building',
    primary_palace_id: 'tiantan',
    related_palaces: ['tiantan'],
    category: '名筑档案',
    dynasty: '明',
    region: '北京',
    sort_order: 106,
    level_value: null,
  },
  {
    id: 'roof-ranking',
    term: '屋顶等级制度',
    synopsis: '庑殿顶为最高等级',
    entry_type: 'craft',
    primary_palace_id: null,
    related_palaces: ['tiantan', 'mogao'],
    category: '屋顶',
    dynasty: null,
    region: null,
    sort_order: 1,
    level_value: 1,
  },
  {
    id: 'jishou-xianren',
    term: '脊兽与仙人走兽',
    synopsis: '屋顶脊上的装饰',
    entry_type: 'craft',
    primary_palace_id: null,
    related_palaces: ['mogao'],
    category: '脊兽',
    sort_order: 2,
  },
];

describe('encyclopediaFilters', () => {
  it('非法 entry_type 被剔除并记录 dropped', () => {
    const { filters, dropped } = normalizeFilters(new URLSearchParams('entry_type=x'), taxonomy);
    expect(filters.entry_type).toBe('all');
    expect(dropped.some((item) => item.key === 'entry_type')).toBe(true);
  });

  it('失效建筑被剔除但 term 保留', () => {
    const { filters, dropped } = normalizeFilters(
      new URLSearchParams('building=unknown&term=dougong'),
      taxonomy
    );
    expect(filters.building).toBe('');
    expect(filters.term).toBe('dougong');
    expect(dropped.some((item) => item.key === 'building')).toBe(true);
  });

  it('taxonomy 未加载时保留合法筛选', () => {
    const { filters, dropped } = normalizeFilters(new URLSearchParams('building=tiantan&category=屋顶'), null);
    expect(filters.building).toBe('tiantan');
    expect(filters.category).toBe('屋顶');
    expect(dropped).toHaveLength(0);
  });

  it('超长筛选值被剔除', () => {
    const { filters, dropped } = normalizeFilters(
      new URLSearchParams(`q=${'a'.repeat(60)}`),
      taxonomy
    );
    expect(filters.q).toBe('');
    expect(dropped[0].key).toBe('q');
  });

  it('toSearchParams 顺序稳定且 term 最后', () => {
    const params = toSearchParams({
      building: 'tiantan',
      entry_type: 'building',
      category: '名筑档案',
      q: '塔',
      term: 'dougong',
    });
    expect(params.toString()).toBe(
      'building=tiantan&entry_type=building&category=%E5%90%8D%E7%AD%91%E6%A1%A3%E6%A1%88&q=%E5%A1%94&term=dougong'
    );
  });

  it('building 命中主关联建筑', () => {
    const result = filterTerms(terms, { building: 'tiantan' });
    expect(result.map((item) => item.id)).toEqual(['tiantan-eaves', 'roof-ranking']);
  });

  it('building 命中 JSON 关联建筑', () => {
    const result = filterTerms(terms, { building: 'mogao' });
    expect(result.map((item) => item.id)).toContain('jishou-xianren');
    expect(result.map((item) => item.id)).toContain('roof-ranking');
  });

  it('q 命中 term 与 synopsis，并支持繁简归一', () => {
    expect(filterTerms(terms, { q: '攒尖' }).map((item) => item.id)).toEqual(['tiantan-eaves']);
    expect(filterTerms(terms, { q: '庑殿' }).map((item) => item.id)).toEqual(['roof-ranking']);
    expect(normalizeText('屋頂')).toBe('屋顶');
  });

  it('highlightSegments 无命中返回单片段且不生成 HTML', () => {
    const segments = highlightSegments('斗拱', '不存在');
    expect(segments).toEqual([{ text: '斗拱', hit: false }]);
    expect(segments.every((item) => !item.text.includes('<'))).toBe(true);
  });

  it('highlightSegments 标记命中片段', () => {
    const segments = highlightSegments('天坛三重攒尖', '三重');
    expect(segments.filter((item) => item.hit).map((item) => item.text)).toEqual(['三重']);
    expect(segments.map((item) => item.text).join('')).toBe('天坛三重攒尖');
  });

  it('groupTerms 建筑组在前', () => {
    const groups = groupTerms(terms);
    expect(groups[0].type).toBe('building');
    expect(groups[1].type).toBe('craft');
    expect(groups[0].items.map((item) => item.id)).toEqual(['tiantan-eaves']);
  });

  it('countByType 统计两类条目', () => {
    expect(countByType(terms)).toEqual({ total: 3, building: 1, craft: 2 });
  });

  it('pickAlternatives 返回 ≤2 条且不含当前筛选建筑', () => {
    const alternatives = pickAlternatives(terms, { building: 'tiantan' }, taxonomy);
    expect(alternatives.length).toBeLessThanOrEqual(2);
    expect(alternatives.some((item) => item.primary_palace_id === 'tiantan')).toBe(false);
    expect(alternatives[0].id).toBe('roof-ranking');
  });
});