import { test, expect } from 'playwright/test';

const PUBLIC_PATHS = [
  '/',
  '/gallery',
  '/map',
  '/timeline',
  '/encyclopedia',
  '/exhibition/taihedian',
  '/douba-eighteen',
  '/quiz',
];

for (const path of PUBLIC_PATHS) {
  test(`游客可访问 ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });
}

test('个人中心对游客重定向到登录页', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login/);
});

test('编修台对普通用户展示权限说明', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'palace_auth',
      JSON.stringify({ token: 'e2e-token', user: { id: 1, username: 'e2e', role: 'user' } })
    );
  });
  await page.goto('/curator');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});