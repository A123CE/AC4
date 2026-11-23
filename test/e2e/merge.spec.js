import { test, expect } from 'playwright/test';
import { registerUser } from './helpers/seed.js';

test('游客收藏登录后可合并到账号', async ({ page, request }) => {
  const user = await registerUser(request, 'merge');

  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem('ac4_pending_guest_merge', '1');
    localStorage.setItem(
      'ac4_guest_v1',
      JSON.stringify({
        v: 1,
        gid: 'e2e_guest_merge',
        createdAt: now,
        updatedAt: now,
        preview: { date: now.slice(0, 10), palaces: [] },
        quizQuota: { date: now.slice(0, 10), count: 0 },
        quiz: { sessionId: null, answers: [] },
        stagedCollections: [
          {
            palace_id: 'taihedian',
            category: '教学素材',
            note: '游客本机笔记',
            stagedAt: now,
          },
        ],
        noteDrafts: [],
        lastVisited: [],
        dismissed: [],
        routeProgress: {},
        hotspotReads: [],
        prefs: { reducedMotion: 'auto', personalizationEnabled: true },
      })
    );
  });

await page.goto('/login');
  await page.locator('input').first().fill(user.username);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /验明正身/ }).click();

  await expect(page.getByText(/发现 1 条本机收藏/)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '合并到账号' }).click();

  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /珍宝阁/ }).click();
  await expect(page.getByText('游客本机笔记')).toBeVisible({ timeout: 15000 });
});