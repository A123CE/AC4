import { test, expect } from 'playwright/test';
import { registerUser, authenticate } from './helpers/seed.js';

const UGC_ENDPOINTS = [
  ['GET', '/api/ugc/public'],
  ['POST', '/api/ugc/reports'],
  ['GET', '/api/ugc/moderation/queue'],
];

test.describe('UGC 公开阻断', () => {
  test('UGC 接口全部 404 且不暴露存在性', async ({ request }) => {
    for (const [method, path] of UGC_ENDPOINTS) {
      const res = await request.fetch(path, { method });
      expect(res.status(), `${method} ${path}`).toBe(404);
    }
  });

  test('sitemap 与搜索均无笔记痕迹', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    const sitemapText = await sitemap.text();
    expect(sitemapText).not.toMatch(/user_collections|ugc/i);
    expect(sitemapText).not.toMatch(/\bnote\b/i);

    const search = await request.get('/api/search?q=%E7%AC%94%E8%AE%B0');
    const body = await search.json();
    const groups = body?.data?.groups || [];
    const types = groups.map((group) => group.type);
    expect(types).not.toContain('note');
    expect(types).not.toContain('ugc');
    expect(JSON.stringify(body)).not.toMatch(/user_collections|公开笔记|发布笔记/);
  });

  test('前端页面无公开/发布/审核/举报入口', async ({ page, request }) => {
    const user = await registerUser(request, 'ugc');
    await authenticate(page, user.token);

    for (const path of ['/profile', '/exhibition/taihedian']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid*="public"]')).toHaveCount(0);

      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(/公开笔记|发布笔记|审核队列|举报/);
    }
  });
});