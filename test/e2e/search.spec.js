import { test, expect } from 'playwright/test';

test('搜索链路：关键词命中 → 零结果兜底 → URL 直达', async ({ page }) => {
  await page.goto('/search?q=%E6%96%97%E6%8B%B1');
  await expect(page.getByText(/找到 .* 条/)).toBeVisible();

  await page.goto('/search?q=xyz123');
  await expect(page.getByText('热门搜索')).toBeVisible();

  await page.goto('/search');
  await expect(page.locator('.search-page-input')).toBeVisible();
});