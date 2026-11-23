import { test, expect } from 'playwright/test';

const PALACE_PATH = '/exhibition/taihedian';
const VIDEO_URL = '/videos/sample.mp4';
const POSTER = '/images/posters/gugong.webp';

async function openExpanded(page) {
  await page.goto(PALACE_PATH, { waitUntil: 'domcontentloaded' });
  const position = page.getByText(/#\d+\s*\/\s*\d+/).first();
  await expect(position).toBeVisible();
  await position.dispatchEvent('click');
  await expect(page.getByText(/又称"金銮宝殿"/).first()).toBeVisible();
}

async function mockDeclaredVideo(page, { delayMs = 0, status = 200 } = {}) {
  await page.route('**/api/palaces/taihedian', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data = {
      ...body.data,
      video: { declared: true, url: VIDEO_URL, poster: POSTER },
    };
    await route.fulfill({ response, json: body });
  });

  await page.route(`**${VIDEO_URL}`, async (route) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (status !== 200) {
      await route.fulfill({ status });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' },
    });
  });
}

test.describe('视频区呈现与失败收敛', () => {

  test('无视频声明时不渲染视频区', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await openExpanded(page);
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="video-section"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="video-section"] video')).toHaveCount(0);
  });

  test('探测成功后渲染原生控件且不自动播放', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await mockDeclaredVideo(page);
    await openExpanded(page);

    const video = page.locator('[data-testid="video-section"] video');
    await expect(video).toBeVisible();
    await expect(video).not.toHaveAttribute('autoplay');

    const aspectRatio = await video.evaluate((el) => getComputedStyle(el).aspectRatio);
    expect(aspectRatio.replace(/\s+/g, '')).toBe('16/9');

    const poster = await video.getAttribute('poster');
    expect(poster).toBeTruthy();
    expect(poster).not.toMatch(/og-default/);
  });

  test('资源 404 时仍不渲染视频节点', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await mockDeclaredVideo(page, { status: 404 });
    await openExpanded(page);
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="video-section"]')).toHaveCount(0);
  });

  test('视频区保持 16:9 且页面高度稳定', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await mockDeclaredVideo(page);
    await openExpanded(page);

    const video = page.locator('[data-testid="video-section"] video');
    await expect(video).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);

    const ratio = await video.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.width / box.height;
    });
    expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.05);
  });

  test('原生视频控件可被键盘聚焦', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await mockDeclaredVideo(page);
    await openExpanded(page);

    const video = page.locator('[data-testid="video-section"] video');
    await expect(video).toBeVisible();
    await video.focus();

    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeTag).toBe('VIDEO');
  });
});