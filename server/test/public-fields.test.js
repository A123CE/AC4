const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  toPublicPalace,
  toPublicTerm,
  toPublicCollection,
} = require('../src/services/publicSerializer');

const PALACE_ROW = {
  id: 'taihedian',
  name: '太和殿',
  name_en: 'Hall of Supreme Harmony',
  category: '宫殿',
  dynasty: '明清',
  description: '简介',
  tags: '屋顶,彩画',
  stats: '[["38 米","殿高"]]',
  views_data: '[{"src":"views/a.png","zh":"正视"}]',
  camera_preset: '{"theta":1}',
  audio_guide: '讲解词',
  poster_path: 'posters/forbidden-city/taihedian.png',
  model_path: 'forbidden-city/taihedian.glb',
  email: 'secret@example.com',
  password_hash: '$2a$10$hash',
  user_id: 99,
  points: 100,
  interest_tag: 'student',
};

describe('公开字段白名单', () => {
  it('列表视图剔除隐私字段并解析 JSON', () => {
    const output = toPublicPalace(PALACE_ROW);
    const text = JSON.stringify(output);

    assert.equal(Object.prototype.hasOwnProperty.call(output, 'email'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(output, 'password_hash'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(output, 'user_id'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(output, 'points'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(output, 'interest_tag'), false);
    assert.equal(text.includes('secret@example.com'), false);
    assert.equal(text.includes('$2a$10$hash'), false);

    assert.deepEqual(output.tags, ['屋顶', '彩画']);
    assert.deepEqual(output.stats, [['38 米', '殿高']]);
    assert.deepEqual(output.views, [{ src: 'views/a.png', zh: '正视' }]);
    assert.deepEqual(output.camera, { theta: 1 });
  });

  it('详情视图追加 images/timeline/funFacts/audio/coverage', () => {
    const output = toPublicPalace(PALACE_ROW, {
      detail: true,
      extras: {
        images: ['posters/a.png'],
        timeline: [{ year: '1420', event: '建成' }],
        funFacts: ['趣闻'],
      },
    });

    assert.deepEqual(output.images, ['posters/a.png']);
    assert.deepEqual(output.timeline, [{ year: '1420', event: '建成' }]);
    assert.deepEqual(output.funFacts, ['趣闻']);
    assert.equal(output.audio, '讲解词');
    assert.equal(output.coverage, null);
  });

  it('百科术语与收藏同样只输出白名单', () => {
    const term = toPublicTerm({
      id: 'dougong',
      category: '斗拱',
      term: '斗拱',
      content: '正文',
      related_palaces: '["taihedian"]',
      related_terms: '["queti"]',
      image_paths: '["images/a.png"]',
      password_hash: 'leak',
    });
    assert.equal(Object.prototype.hasOwnProperty.call(term, 'password_hash'), false);
    assert.deepEqual(term.related_palaces, ['taihedian']);

    const collection = toPublicCollection({
      id: 1,
      palace_id: 'taihedian',
      palace_name: '太和殿',
      note: '笔记',
      user_id: 9,
      points: 3,
    });
    assert.equal(Object.prototype.hasOwnProperty.call(collection, 'user_id'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(collection, 'points'), false);
    assert.equal(collection.palace_id, 'taihedian');
  });

  it('空行返回 null，不抛错', () => {
    assert.equal(toPublicPalace(null), null);
    assert.equal(toPublicTerm(undefined), null);
    assert.equal(toPublicCollection(null), null);
  });
});