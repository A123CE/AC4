import { test, expect } from 'playwright/test';

test('分享卡片页返回 OG 元信息', async ({ request }) => {
  const res = await request.get('/share/palace/taihedian?ch=copy', {
    headers: { 'User-Agent': 'Twitterbot/1.0' },
  });

  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain('property="og:image"');
  expect(html).toContain('twitter:card');
});

test('游客打开分享深链不跳登录', async ({ page }) => {
  await page.goto('/exhibition/taihedian?from=share&ch=copy');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});

test('内容下线展示「内容已调整」替代页', async ({ page }) => {
  await page.goto('/exhibition/not-exist-content');
  await expect(page.getByText('内容已调整')).toBeVisible();
  await expect(page.getByText('返回首页')).toBeVisible();
});