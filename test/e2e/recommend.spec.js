import { test, expect } from 'playwright/test';
import { registerUser, authenticate, authHeaders } from './helpers/seed.js';

test('新用户推荐位非空，个性化关闭后回退热门', async ({ page, request }) => {
  const user = await registerUser(request, 'recommend');

  await authenticate(page, user.token);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('为你推荐')).toBeVisible();
  await expect(page.locator('.ov-rec-card').first()).toBeVisible();

  const detail = await request.get(
    '/api/recommend?scene=detail&palace_id=taihedian',
    { headers: authHeaders(user.token) }
  );
  const detailBody = await detail.json();
  expect(detailBody.data.items.length).toBeGreaterThan(0);
  expect(detailBody.data.items[0].reason_code).toBeTruthy();
  expect(detailBody.data.items[0].reason_text).toBeTruthy();

  await request.put('/api/auth/preferences', {
    headers: authHeaders(user.token),
    data: { personalization_enabled: false },
  });

  const home = await request.get('/api/recommend?scene=home', {
    headers: authHeaders(user.token),
  });
  const homeBody = await home.json();
  expect(homeBody.data.strategy).toBe('popular');
  expect(homeBody.data.items.length).toBeGreaterThan(0);
});