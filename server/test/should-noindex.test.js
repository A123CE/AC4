const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const { shouldNoindex } = require('../src/app');

describe('shouldNoindex 纯函数', () => {
  it('百科无筛选参数可收录', () => {
    assert.equal(shouldNoindex('/encyclopedia', ''), false);
    assert.equal(shouldNoindex('/encyclopedia', '/encyclopedia'), false);
  });

  it('百科带建筑筛选不可收录', () => {
    assert.equal(shouldNoindex('/encyclopedia', '/encyclopedia?building=tiantan'), true);
    assert.equal(shouldNoindex('/encyclopedia', 'building=tiantan'), true);
  });

  it('百科带关键词/类目/朝代/地区均不可收录', () => {
    for (const query of ['?q=塔', '?category=屋顶', '?dynasty=明', '?region=北京', '?entry_type=building']) {
      assert.equal(shouldNoindex('/encyclopedia', `/encyclopedia${query}`), true, query);
    }
  });

  it('term 深链可收录', () => {
    assert.equal(shouldNoindex('/encyclopedia', '/encyclopedia?term=tiantan-eaves'), false);
  });

  it('既有私有页仍不可收录', () => {
    for (const path of ['/search', '/profile', '/curator']) {
      assert.equal(shouldNoindex(path, path), true, path);
    }
  });

  it('公开页与建筑详情不误伤', () => {
    assert.equal(shouldNoindex('/exhibition/taihedian', ''), false);
    assert.equal(shouldNoindex('/routes', ''), false);
    assert.equal(shouldNoindex('/', ''), false);
  });
});