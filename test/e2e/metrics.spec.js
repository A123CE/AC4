import { test, expect } from 'playwright/test';

test('匿名埋点批量接收且漏斗需管理员', async ({ request }) => {
  const res = await request.post('/api/metrics/events', {
    data: {
      anon_hash: 'd'.repeat(64),
      session_hash: 'e'.repeat(64),
      locale: 'zh-CN',
      tier: 'standard',
      path: '/search',
      events: [
        { event_name: 'page_view' },
        {
          event_name: 'search',
          props: { q_hash: 'f'.repeat(64), q_length: 2, q: '斗拱' },
        },
        { event_name: 'search_zero' },
      ],
    },
  });

  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.data.accepted).toBe(3);

  const funnel = await request.get('/api/metrics/funnel');
  expect(funnel.status()).toBe(401);
});