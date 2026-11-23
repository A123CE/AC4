import { test, expect } from 'playwright/test';
import path from 'path';
import { createRequire } from 'module';
import { registerUser, authenticate, authHeaders } from './helpers/seed.js';

const require = createRequire(path.resolve(process.cwd(), 'server', 'package.json'));
const mysql = require('mysql2/promise');

const FORBIDDEN_FIELDS = ['username', 'avatar_url', 'email', 'points', 'user_id', 'interest_tag', 'last_login_at'];

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zsf/20050827',
    database: process.env.E2E_DB_NAME || process.env.DB_NAME || 'ac4_test',
    connectTimeout: 3000,
  };
}

async function withDb(fn) {
  const connection = await mysql.createConnection(dbConfig());
  try {
    return await fn(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

async function getFirstQuestion() {
  return withDb(async (connection) => {
    const [rows] = await connection.query(
      'SELECT id, correct_answer FROM quiz_questions ORDER BY id LIMIT 1'
    );
    return rows[0] || null;
  });
}

async function markMinor(userId) {
  await withDb((connection) =>
    connection.execute(
      "UPDATE users SET minor_mode = 'minor', leaderboard_opt_out = 1 WHERE id = ?",
      [userId]
    )
  );
}

async function fetchLeaderboard(request, token, query = '') {
  const res = await request.get(`/api/quiz/leaderboard${query}`, {
    headers: authHeaders(token),
  });
  expect(res.status()).toBe(200);
  return res.json();
}

function collectKeys(value, output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, output));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      output.add(key.toLowerCase());
      collectKeys(item, output);
    });
  }
  return output;
}

test('同一题重复提交后榜单去重正确数保持不变', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '去重口径仅在桌面项目执行');

  const user = await registerUser(request, 'board');
  expect(user.token).toBeTruthy();

  const question = await getFirstQuestion();
  expect(question).toBeTruthy();

  const first = await request.post('/api/quiz/answer', {
    headers: authHeaders(user.token),
    data: { question_id: question.id, answer: question.correct_answer },
  });
  expect(first.status()).toBe(200);
  expect((await first.json()).data.is_correct).toBe(true);

  const afterFirst = await fetchLeaderboard(request, user.token);
  expect(afterFirst.data?.me?.correct_answers).toBe(1);

  for (let i = 0; i < 3; i += 1) {
    const res = await request.post('/api/quiz/answer', {
      headers: authHeaders(user.token),
      data: { question_id: question.id, answer: question.correct_answer },
    });
    expect(res.status()).toBe(200);
  }

  const afterRepeat = await fetchLeaderboard(request, user.token);
  expect(afterRepeat.data?.me?.correct_answers).toBe(1);
  expect(afterRepeat.data?.me?.rank_no).not.toBeNull();
});

test('未成年人模式下榜单不返回精确名次与身份字段', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '隐私展示仅在桌面项目执行');

  const user = await registerUser(request, 'board-minor');
  expect(user.token).toBeTruthy();
  await markMinor(user.userId);

  const question = await getFirstQuestion();
  await request.post('/api/quiz/answer', {
    headers: authHeaders(user.token),
    data: { question_id: question.id, answer: question.correct_answer },
  });

  const board = await fetchLeaderboard(request, user.token);
  expect(board.data?.me).toBeTruthy();
  expect(board.data.me.rank_no).toBeNull();
  expect(board.data.me.display_name).toBe('营造学徒');
  expect(board.data.me.in_public_board).toBe(false);
  expect(board.data.privacy_mode).toBe('minor');

  const keys = collectKeys(board);
  for (const field of FORBIDDEN_FIELDS) {
    expect(keys.has(field)).toBe(false);
  }

  await authenticate(page, user.token);
  await page.goto('/quiz');
  await page.getByRole('button', { name: /筑识榜/ }).click();

  await expect(page.getByText('名次已隐藏').first()).toBeVisible();
  await expect(page.locator('.quiz-rank-avatar img')).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain(user.username);
  expect(await page.locator('body').innerText()).not.toContain('#null');
});

test('空分类榜单返回空态且不回显报错', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '空态契约仅在桌面项目执行');

  const user = await registerUser(request, 'board-empty');
  const board = await fetchLeaderboard(
    request,
    user.token,
    `?category=${encodeURIComponent('不存在的题库分类')}`
  );

  expect(board.data.list).toEqual([]);
  expect(board.data.empty_reason).toBe('no_data');
  expect(JSON.stringify(board)).not.toContain('query_failed');
});

test('高频提交触发限流且浏览不受影响', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '限流脚本仅在桌面项目执行');

  const user = await registerUser(request, 'board-limit');
  const question = await getFirstQuestion();

  let limited = null;
  for (let i = 0; i < 31; i += 1) {
    const res = await request.post('/api/quiz/answer', {
      headers: authHeaders(user.token),
      data: { question_id: question.id, answer: 'A' },
    });
    if (res.status() === 429) {
      limited = res;
      break;
    }
  }

  expect(limited).toBeTruthy();
  const body = await limited.json();
  expect(body.code || body.error).toBeTruthy();
  expect(limited.headers()['retry-after']).toBeTruthy();

  const browse = await request.get('/api/palaces?limit=1');
  expect(browse.status()).toBe(200);
});