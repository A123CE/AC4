import { test, expect } from 'playwright/test';

test('英文首访与刷新保持', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ac4_lang', 'en');
  });

  await page.goto('/');
  await expect(
    page.getByText('Ancient Chinese Architecture, Visualized').first()
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText('Ancient Chinese Architecture, Visualized').first()
  ).toBeVisible();
});

test('英文搜索 Temple of Heaven 命中天坛', async ({ request }) => {
  const res = await request.get('/api/search?q=Temple%20of%20Heaven');
  expect(res.ok()).toBe(true);

  const body = await res.json();
  const palaceGroup = body.data.groups.find((group) => group.type === 'palace');
  expect(palaceGroup.total).toBeGreaterThan(0);
});