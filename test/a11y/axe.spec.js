import { test, expect } from 'playwright/test';

/**
 * 无障碍基线检查
 * 完整 axe 扫描需安装 @axe-core/playwright；此处先覆盖跳转链接、主内容区与 Ctrl+K。
 */
test('页面提供跳过链接与主内容区', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a.skip-link')).toHaveCount(1);
  await expect(page.locator('#main')).toHaveCount(1);
});

test('Ctrl+K 可打开全站搜索', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('heading', { name: '全站搜索' })).toBeVisible();
});