import { test, expect } from 'playwright/test';

const SEARCH_PATH = '/search?q=%E6%96%97%E6%8B%B1';

async function openPanel(page) {
  await page.goto(SEARCH_PATH, { waitUntil: 'domcontentloaded' });
  const panel = page.locator('.glass-panel').first();
  await expect(panel).toBeVisible({ timeout: 15000 });
  return panel;
}

function skipNonDesktop(testInfo) {
  test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
}

test.describe('玻璃面板回退与稳定布局', () => {
  test('平滑档禁用模糊并回退为不透明底', async ({ page }, testInfo) => {
    skipNonDesktop(testInfo);
    await openPanel(page);

    const style = await page.evaluate(() => {
      const el = document.querySelector('.glass-panel');
      el.style.transition = 'none';
      document.documentElement.dataset.tier = 'smooth';
      const computed = getComputedStyle(el);
      return {
        filter: computed.backdropFilter || computed.webkitBackdropFilter,
        background: computed.backgroundColor,
      };
    });

    expect(style.filter === 'none' || style.filter === '').toBe(true);
    expect(style.background).not.toMatch(/rgba\(/);
  });

  test('减少透明度开关回退为不透明底', async ({ page }, testInfo) => {
    skipNonDesktop(testInfo);
    await openPanel(page);

    const style = await page.evaluate(() => {
      const el = document.querySelector('.glass-panel');
      el.style.transition = 'none';
      document.documentElement.dataset.glass = 'off';
      const computed = getComputedStyle(el);
      return {
        filter: computed.backdropFilter || computed.webkitBackdropFilter,
        background: computed.backgroundColor,
      };
    });

    expect(style.filter === 'none' || style.filter === '').toBe(true);
    expect(style.background).not.toMatch(/rgba\(/);
  });

  test('减少动效时取消过渡与动画', async ({ page }, testInfo) => {
    skipNonDesktop(testInfo);
    await openPanel(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const motion = await page.evaluate(() => {
      const el = document.querySelector('.glass-panel');
      const computed = getComputedStyle(el);
      return {
        duration: computed.transitionDuration,
        animation: computed.animationName,
      };
    });

    expect(Number.parseFloat(motion.duration)).toBeLessThanOrEqual(0.001);
    expect(motion.animation).toBe('none');
  });

  test('玻璃类切换不产生布局位移', async ({ page }, testInfo) => {
    skipNonDesktop(testInfo);
    await openPanel(page);

    const delta = await page.evaluate(() => {
      const el = document.querySelector('.glass-panel');
      const withGlass = el.getBoundingClientRect();
      el.classList.remove('glass-panel');
      const withoutGlass = el.getBoundingClientRect();
      el.classList.add('glass-panel');
      return {
        dy: Math.abs(withGlass.y - withoutGlass.y),
        dh: Math.abs(withGlass.height - withoutGlass.height),
      };
    });

    expect(delta.dy).toBeLessThanOrEqual(1);
    expect(delta.dh).toBeLessThanOrEqual(1);
  });
});