import { test, expect } from 'playwright/test';

test('答题链路：游客可开始一轮答题且不跳登录', async ({ page }) => {
  await page.goto('/quiz');
  await expect(page).not.toHaveURL(/\/login/);

  const start = page.getByRole('button', { name: /开始答题/ }).first();
  await expect(start).toBeVisible();
  await start.click();

  await expect(page.locator('body')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});