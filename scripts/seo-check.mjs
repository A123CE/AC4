#!/usr/bin/env node
/**
 * SEO 抓取自检：robots / sitemap / 分享页 / 搜索页头 / 图片可访问
 * 用法：node scripts/seo-check.mjs [--base=http://localhost:3001]
 * 只读，不写库，不依赖浏览器。
 */

const args = process.argv.slice(2);
const baseArg = args.find((item) => item.startsWith('--base='));
const BASE = (baseArg ? baseArg.slice('--base='.length) : 'http://localhost:3001').replace(/\/+$/, '');

const results = [];

function report(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}

function extraction(html, pattern) {
  return pattern.exec(html)?.[1] || null;
}

async function inspectImage(label, url) {
  if (!url) {
    report(`${label} 图片地址存在`, false, '未找到图片 URL');
    return;
  }
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const type = res.headers.get('content-type') || '';
    report(`${label} 图片可访问`, res.status === 200 && type.startsWith('image/'), `${res.status} ${type} ${url}`);
  } catch (err) {
    report(`${label} 图片可访问`, false, `${err.message} ${url}`);
  }
}

async function run() {
  try {
    const health = await fetch(`${BASE}/api/health`);
    report('服务可访问', health.status === 200, `GET /api/health -> ${health.status}`);
    if (health.status !== 200) return;
  } catch (err) {
    report('服务可访问', false, err.message);
    return;
  }

  try {
    const res = await fetch(`${BASE}/robots.txt`);
    const text = await res.text();
    const type = res.headers.get('content-type') || '';
    const disallowList = ['/api/', '/profile', '/curator', '/search', '/quiz'];
    const hasDisallows = disallowList.every((item) => text.includes(`Disallow: ${item}`));

    report('robots.txt 状态与类型', res.status === 200 && type.includes('text/plain'), `${res.status} ${type}`);
    report(
      'robots.txt 内容',
      text.trimStart().startsWith('User-agent:') && hasDisallows && /Sitemap:\s*\S+\/sitemap\.xml/.test(text),
      '缺少规则或 Sitemap'
    );
  } catch (err) {
    report('robots.txt', false, err.message);
  }

  try {
    const res = await fetch(`${BASE}/sitemap.xml`);
    const text = await res.text();
    const type = res.headers.get('content-type') || '';
    report('sitemap.xml 状态与类型', res.status === 200 && type.includes('xml'), `${res.status} ${type}`);
    report('sitemap.xml 结构', text.startsWith('<?xml') && text.includes('<urlset'), '非 XML urlset');
    report('sitemap.xml 收录公开页', text.includes('/exhibition/'), '缺少 /exhibition/');
    report(
      'sitemap.xml 排除私有页',
      !text.includes('/profile') && !text.includes('/search') && !text.includes('/api/'),
      '包含私有路径'
    );
  } catch (err) {
    report('sitemap.xml', false, err.message);
  }

  let kanonical = null;

  try {
    const res = await fetch(`${BASE}/share/palace/taihedian?ch=copy&from=share`);
    const text = await res.text();
    const canonical = extraction(text, /rel="canonical" href="([^"]+)"/);
    kanonical = canonical;
    const ldText = extraction(text, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let jsonLd = null;
    try {
      jsonLd = ldText ? JSON.parse(ldText) : null;
    } catch {
      jsonLd = null;
    }
    const hreflangTags = text.match(/hreflang="[^"]+"/g) || [];

    report('分享页 200', res.status === 200, `${res.status}`);
    report('canonical 去参', Boolean(canonical) && !canonical.includes('ch=') && !canonical.includes('from='), canonical || '缺失');
    report('JSON-LD 可解析', Boolean(jsonLd), '缺失或解析失败');
    report('双语 hreflang 三组', hreflangTags.length === 3, hreflangTags.join(','));

    if (jsonLd) {
      const ogImage = extraction(text, /property="og:image" content="([^"]+)"/);
      await inspectImage('og:image', ogImage);
      await inspectImage('JSON-LD image', jsonLd.image);
    }
  } catch (err) {
    report('分享页', false, err.message);
  }

  try {
    const res = await fetch(`${BASE}/share/palace/wumen`);
    const text = await res.text();
    const tags = text.match(/hreflang="[^"]+"/g) || [];
    report('单语分享页仅 x-default', tags.length === 1 && tags[0] === 'hreflang="x-default"', tags.join(','));
  } catch (err) {
    report('单语分享页', false, err.message);
  }

  try {
    const res = await fetch(`${BASE}/share/palace/not-exists`);
    const text = await res.text();
    report('下线页 200', res.status === 200, `${res.status}`);
    report('下线页 noindex', /name="robots" content="noindex,follow"/.test(text), '缺少 noindex');
    report('下线页无 JSON-LD', !text.includes('application/ld+json'), '存在结构化数据');
  } catch (err) {
    report('下线页', false, err.message);
  }

  try {
    const res = await fetch(`${BASE}/search`);
    const robotsHeader = res.headers.get('x-robots-tag') || '';
    report('搜索页 noindex 响应头', robotsHeader.includes('noindex'), robotsHeader || '缺失');
  } catch (err) {
    report('搜索页头', false, err.message);
  }

  if (kanonical) {
    console.log(`\ncanonical: ${kanonical}`);
  }

  const failed = results.filter((item) => !item.ok);
  console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('seo-check 异常:', err);
  process.exit(1);
});