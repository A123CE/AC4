const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mysql = require('mysql2/promise');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const db = require('./helpers/db');
const {
  buildCanonical,
  buildJsonLd,
  buildAlternates,
  renderShareHtml,
} = require('../src/services/shareCard');

function extractJsonLd(html) {
  const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  return match ? JSON.parse(match[1]) : null;
}

function extractCanonical(html) {
  return /rel="canonical" href="([^"]+)"/.exec(html)?.[1] || null;
}

function extractHreflangs(html) {
  return html.match(/hreflang="[^"]+"/g) || [];
}

describe('分享页 JSON-LD / canonical / hreflang', () => {
  beforeEach(async () => {
    if (!(await db.canConnect())) return;
  });

  it('buildCanonical 生成去参内容地址', () => {
    const origin = 'https://example.com';
    assert.equal(
      buildCanonical(origin, 'palace', 'taihedian'),
      'https://example.com/exhibition/taihedian'
    );
    assert.equal(
      buildCanonical(origin, 'term', 'dougong'),
      'https://example.com/encyclopedia?term=dougong'
    );
    assert.equal(
      buildCanonical(origin, 'route', 'forbidden-city'),
      'https://example.com/routes/forbidden-city'
    );
  });

  it('palace 分享页输出 TouristAttraction 且不含评分/评论/个人邮箱', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/share/palace/taihedian?ch=copy&from=share');
    assert.equal(res.status, 200);

    const canonical = extractCanonical(res.text);
    assert.ok(canonical.endsWith('/exhibition/taihedian'));
    assert.equal(canonical.includes('ch='), false);
    assert.equal(canonical.includes('from='), false);

    const jsonLd = extractJsonLd(res.text);
    assert.ok(jsonLd, '缺少 application/ld+json');
    assert.equal(jsonLd['@type'], 'TouristAttraction');
    assert.equal(jsonLd.url, extractCanonical(res.text));
    assert.ok(jsonLd.image);
    assert.equal('aggregateRating' in jsonLd, false);
    assert.equal('review' in jsonLd, false);
    assert.equal(jsonLd.author?.email, undefined);
  });

  it('双语建筑输出 3 组 hreflang，单语建筑仅 x-default', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const bilingual = await request(app).get('/share/palace/taihedian');
    const bilingualTags = extractHreflangs(bilingual.text);
    assert.ok(bilingualTags.includes('hreflang="zh-CN"'));
    assert.ok(bilingualTags.includes('hreflang="en"'));
    assert.ok(bilingualTags.includes('hreflang="x-default"'));

    const single = await request(app).get('/share/palace/wumen');
    const singleTags = extractHreflangs(single.text);
    assert.deepEqual(singleTags, ['hreflang="x-default"']);
  });

  it('下线内容返回 noindex 且不输出 JSON-LD', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const res = await request(app).get('/share/palace/not-exists');
    assert.equal(res.status, 200);
    assert.match(res.text, /name="robots" content="noindex,follow"/);
    assert.equal(res.text.includes('application/ld+json'), false);
    assert.ok(extractCanonical(res.text).includes('/exhibition/not-exists'));
  });

  it('术语分享页输出 Article 且作者为组织', async (t) => {
    if (!(await db.canConnect())) return t.skip('ac4_test 数据库不可用');

    const connection = await mysql.createConnection(db.getConfig());
    const [rows] = await connection.query('SELECT id FROM encyclopedia_terms ORDER BY id LIMIT 1');
    await connection.end();

    if (!rows[0]) return t.skip('缺少术语样本');

    const res = await request(app).get(`/share/term/${rows[0].id}`);
    const jsonLd = extractJsonLd(res.text);
    assert.equal(jsonLd['@type'], 'Article');
    assert.equal(jsonLd.author['@type'], 'Organization');
    assert.equal(jsonLd.publisher['@type'], 'Organization');
  });

  it('JSON-LD 内联时转义尖括号', () => {
    const html = renderShareHtml({
      content: { title: '测试', description: '说明', image: '/images/posters/gugong.webp', redirect: '/exhibition/x' },
      type: 'palace',
      id: 'x',
      channel: 'copy',
      origin: 'https://example.com',
      canonicalUrl: 'https://example.com/exhibition/x',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: '包含 </script> 的标题',
      },
      alternates: buildAlternates({ coverage: {}, canonicalUrl: 'https://example.com/x' }),
    });

    assert.ok(html.includes('\\u003c/script'));
    assert.equal(html.includes('</script> 的标题'), false);
  });

  it('buildJsonLd 仅在存在城市信息时输出 address', () => {
    const base = {
      name: '太和殿',
      title: '太和殿 · 华夏古建',
      description: '说明',
    };
    const withoutAddress = buildJsonLd({
      type: 'palace',
      content: base,
      canonical: 'https://example.com/exhibition/taihedian',
      imageUrl: 'https://example.com/a.png',
    });
    assert.equal('address' in withoutAddress, false);

    const withAddress = buildJsonLd({
      type: 'palace',
      content: { ...base, city: '北京市', region: '北京' },
      canonical: 'https://example.com/exhibition/taihedian',
      imageUrl: 'https://example.com/a.png',
    });
    assert.equal(withAddress.address['@type'], 'PostalAddress');
    assert.equal(withAddress.address.addressLocality, '北京市');
    assert.equal(withAddress.address.addressRegion, '北京');
  });
});