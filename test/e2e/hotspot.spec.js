import { test, expect } from 'playwright/test';
import { registerUser, authenticate, authHeaders } from './helpers/seed.js';

test('热点标记已读后个人中心可见学习记录', async ({ page, request }) => {
  const user = await registerUser(request, 'hotspot');
  await authenticate(page, user.token);

  await request.post('/api/hotspots/read', {
    headers: authHeaders(user.token),
    data: { palace_id: 'taihedian', hotspot_id: 'dougong' },
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: /学习记录/ }).click();

  await expect(page.getByText('太和殿')).toBeVisible();
});