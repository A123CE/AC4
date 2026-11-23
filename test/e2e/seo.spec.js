import { test, expect } from 'playwright/test';

test.describe('SEO 抓取入口', () => {
  test('/robots.txt 返回纯文本规则而非 SPA 页面', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');

    const body = await res.text();
    expect(body.trimStart().startsWith('User-agent:')).toBe(true);
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Disallow: /search');
    expect(body).toMatch(/Sitemap:\s*\S+\/sitemap\.xml/);
  });

  test('/sitemap.xml 返回 XML 且仅含公开地址', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const body = await res.text();
    expect(body.startsWith('<?xml')).toBe(true);
    expect(body).toContain('<urlset');
    expect(body).toContain('/exhibition/');
    expect(body).not.toContain('/profile');
    expect(body).not.toContain('/search');
    expect(body).not.toContain('/api/');
  });

  test('/search 与私有页返回 noindex 响应头', async ({ request }) => {
    for (const path of ['/search', '/profile', '/curator']) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()['x-robots-tag'] || '').toContain('noindex');
    }
  });
});