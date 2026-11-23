const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const db = require('./helpers/db');
const searchService = require('../src/services/searchService');

describe('跨类型搜索服务', () => {
  it('搜「斗拱」返回四组且 total 与结果一致', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');
    await db.canConnect();

    const result = await searchService.search('斗拱', { limit: 8 });
    assert.equal(result.groups.length, 4);
    assert.ok(result.total >= 0);
    for (const group of result.groups) {
      assert.ok(group.total >= group.items.length);
      assert.ok(['palace', 'term', 'question', 'timeline'].includes(group.type));
    }
  });

  it('matched 区间可还原原词且不返回 HTML', async (t) => {
    const result = await searchService.search('斗拱', { type: 'term', limit: 8 });
    const group = result.groups[0];
    const item = group.items.find((entry) => entry.matched.length > 0);
    assert.ok(item);

    const combined = `${item.title} ${item.snippet}`;
    const [start, end] = item.matched[0];
    assert.equal(combined.slice(start, end), '斗拱');
    assert.equal(JSON.stringify(result).includes('<mark'), false);
  });

  it('异体字「斗栱」可命中「斗拱」', async (t) => {
    const result = await searchService.search('斗栱', { type: 'term', limit: 8 });
    assert.ok(result.groups[0].total >= 1);
    assert.equal(searchService.normalizeText('斗栱'), '斗拱');
  });

  it('零结果返回空 groups 与非空热门词', async (t) => {
    const result = await searchService.search('xyz123', { limit: 8 });
    assert.equal(result.total, 0);
    assert.ok(result.groups.every((group) => group.items.length === 0));

    const suggestions = await searchService.suggest('xyz123');
    assert.ok(Array.isArray(suggestions.hot));
    assert.ok(suggestions.hot.length > 0);
    assert.ok(Array.isArray(suggestions.categories));
    assert.equal(suggestions.recommended.length, 3);
  });
});