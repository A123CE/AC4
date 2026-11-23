import { test, expect } from 'playwright/test';
import { registerUser, authHeaders } from './helpers/seed.js';

test('集章链路：停留 6s 上报后集章进度 +1', async ({ request }) => {
  const user = await registerUser(request, 'stamps');

  const visit = await request.post('/api/auth/history', {
    headers: authHeaders(user.token),
    data: { palace_id: 'taihedian', dwell_seconds: 6 },
  });
  expect(visit.ok()).toBe(true);

  const achievements = await request.get('/api/achievements', {
    headers: authHeaders(user.token),
  });
  const body = await achievements.json();
  expect(body.data.stamps.earned).toBeGreaterThan(0);
  expect(body.data.stamps.total).toBe(20);
});