import { test, expect } from 'playwright/test';
import { registerUser } from './helpers/seed.js';

test('登录链路：注册 → 登录 → 刷新保持 → 登出', async ({ page, request }) => {
  const user = await registerUser(request, 'login');

  await page.goto('/login');
  await page.locator('input').first().fill(user.username);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /验明正身/ }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.reload();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/profile');
  const logoutButton = page.getByRole('button', { name: /退出|登出/ }).first();
  if (await logoutButton.count()) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login|\/$/);
  }
});