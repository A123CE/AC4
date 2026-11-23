import { test, expect } from 'playwright/test';

test('主题路线顺序游览与进度记忆', async ({ page }) => {
  await page.goto('/routes/axis-day', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('中轴线一日')).toBeVisible();
  await expect(page.getByText(/1\/8 站/)).toBeVisible();
  await expect(page.getByText(/240 分钟/)).toBeVisible();

  await page.getByRole('button', { name: '下一站' }).click();
  await expect(page.getByText(/2\/8 站/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/2\/8 站/)).toBeVisible();
});