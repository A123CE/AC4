import { test, expect } from 'playwright/test';

test('分享链路：OG 卡片 → 游客深链不跳登录', async ({ page, request }) => {
  const res = await request.get('/share/palace/taihedian?ch=copy', {
    headers: { 'User-Agent': 'Twitterbot/1.0' },
  });
  expect(res.status()).toBe(200);

  const html = await res.text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain('name="twitter:card"');

  await page.goto('/exhibition/taihedian?from=share&ch=copy');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});