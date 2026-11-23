import { test, expect } from 'playwright/test';
import { registerUser, authenticate, authHeaders } from './helpers/seed.js';

test('收藏链路：收藏 → 写笔记 → 珍宝阁可见', async ({ page, request }) => {
  const user = await registerUser(request, 'collection');
  await authenticate(page, user.token);

  await request.post('/api/auth/collections', {
    headers: authHeaders(user.token),
    data: {
      palace_id: 'taihedian',
      category: '教学素材',
      note: 'E2E 收藏笔记',
    },
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: /珍宝阁/ }).click();

  await expect(page.getByText('E2E 收藏笔记')).toBeVisible();
});