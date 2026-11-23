import { test, expect } from 'playwright/test';
import path from 'path';
import { createRequire } from 'module';
import { registerUser, authenticate, authHeaders } from './helpers/seed.js';

const require = createRequire(path.resolve(process.cwd(), 'server', 'package.json'));
const mysql = require('mysql2/promise');

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

async function enableClassroom(request, token, font = 'large') {
  const res = await request.put('/api/auth/preferences', {
    headers: authHeaders(token),
    data: { classroom_mode: true, classroom_font_scale: font },
  });
  expect(res.status()).toBe(200);
}

async function createStudent(request, prefix = 'classroom') {
  const user = await registerUser(request, prefix);
  expect(user.token).toBeTruthy();
  return user;
}

test.describe('课堂模式', () => {
  test('开启后隐藏推荐与分享入口并展示固定入口条', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const user = await createStudent(request);
    await enableClassroom(request, user.token);
    await authenticate(page, user.token);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-classroom', 'on');
    await expect(page.locator('.classroom-entry-bar')).toBeVisible();
    await expect(page.getByRole('button', { name: '主题路线' })).toBeVisible();
    await expect(page.getByRole('button', { name: '随堂练习' })).toBeVisible();
    await expect(page.locator('.recommendation-rail')).toHaveCount(0);

    await page.goto('/exhibition/taihedian', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /分享此建筑/ })).toHaveCount(0);
  });

  test('固定入口条在滚动后仍可见', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const user = await createStudent(request, 'classroom-scroll');
    await enableClassroom(request, user.token);
    await authenticate(page, user.token);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const bar = page.locator('.classroom-entry-bar');
    await expect(bar).toBeVisible();

    await page.evaluate(() => {
      const shell = document.querySelector('.overview-page');
      if (shell) shell.scrollTop = 600;
      window.scrollTo(0, 600);
    });
    await page.waitForTimeout(200);

    await expect(bar).toBeInViewport();
  });

  test('刷新后课堂态保持', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const user = await createStudent(request, 'classroom-reload');
    await enableClassroom(request, user.token);
    await authenticate(page, user.token);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-classroom', 'on');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-classroom', 'on');
    await expect(page.locator('.classroom-entry-bar')).toBeVisible();
  });

  test('只读链接不修改接收者存储与服务端偏好', async ({ browser, request, page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const user = await createStudent(request, 'classroom-readonly');
    const before = await request.get('/api/auth/preferences', {
      headers: authHeaders(user.token),
    });

    const context = await browser.newContext();
    const guestPage = await context.newPage();
    await guestPage.goto('http://localhost:3001/?view=classroom&font=xlarge&readonly=1', { waitUntil: 'domcontentloaded' });

    const root = guestPage.locator('html');
    await expect(root).toHaveAttribute('data-classroom', 'on');
    await expect(root).toHaveAttribute('data-font', 'xlarge');
    expect(await guestPage.evaluate(() => localStorage.getItem('ac4_classroom_v1'))).toBeNull();

    const after = await request.get('/api/auth/preferences', {
      headers: authHeaders(user.token),
    });
    expect((await after.json()).data).toEqual((await before.json()).data);

    await context.close();
  });

  test('随堂练习零写入且只加载题库分类', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const user = await createStudent(request, 'classroom-practice');
    const question = await withDb(async (connection) => {
      const [rows] = await connection.query(
        'SELECT id, correct_answer FROM quiz_questions ORDER BY id LIMIT 1'
      );
      return rows[0];
    });
    expect(question).toBeTruthy();

    const before = await withDb(async (connection) => {
      const counts = {};
      for (const table of ['quiz_records', 'quiz_answer_facts', 'user_points_log', 'user_badges']) {
        const [[row]] = await connection.query(
          `SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ?`,
          [user.userId]
        );
        counts[table] = Number(row.total);
      }
      return counts;
    });

    for (let i = 0; i < 20; i += 1) {
      const res = await request.post('/api/quiz/practice/answer', {
        headers: authHeaders(user.token),
        data: { question_id: question.id, answer: question.correct_answer },
      });
      expect(res.status()).toBe(200);
    }

    const after = await withDb(async (connection) => {
      const counts = {};
      for (const table of ['quiz_records', 'quiz_answer_facts', 'user_points_log', 'user_badges']) {
        const [[row]] = await connection.query(
          `SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ?`,
          [user.userId]
        );
        counts[table] = Number(row.total);
      }
      return counts;
    });
    expect(after).toEqual(before);

    const requested = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/quiz/')) requested.push(req.url());
    });

    await authenticate(page, user.token);
    await page.goto('/quiz?mode=practice&view=classroom', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/随堂练习 · 不计分/)).toBeVisible();
    await page.waitForTimeout(500);

    expect(requested.some((url) => url.includes('/api/quiz/stats'))).toBe(false);
    expect(requested.some((url) => url.includes('/api/quiz/records'))).toBe(false);
    expect(requested.some((url) => url.includes('/api/quiz/leaderboard'))).toBe(false);
    expect(requested.some((url) => url.includes('/api/quiz/achievements'))).toBe(false);
  });

  test('三档字号生效且投屏宽度无横向滚动', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');

    const expected = [
      ['standard', 18],
      ['large', 20],
      ['xlarge', 22.4],
    ];

    for (const [font, size] of expected) {
      await page.goto(`/search?view=classroom&font=${font}&readonly=1`, {
        waitUntil: 'domcontentloaded',
      });
      const actual = await page.evaluate(() =>
        Number.parseFloat(getComputedStyle(document.body).fontSize)
      );
      expect(Math.abs(actual - size)).toBeLessThanOrEqual(0.5);
    }

    for (const width of [320, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/search?view=classroom&font=xlarge&readonly=1', { waitUntil: 'domcontentloaded' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflow).toBe(false);
    }
  });
});