import { chromium } from 'playwright';
import fs from 'node:fs';

const auth = JSON.parse(fs.readFileSync('.tmp-auth.json', 'utf8')).data;
const dir = '.tmp-shots';
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();

async function openHall(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript((a) => {
    localStorage.setItem('palace_auth', JSON.stringify(a));
    localStorage.setItem('ov-sidebar-collapsed', '0');
  }, auth);
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.ov-side-item', { timeout: 30000 });

  if (width <= 1180) {
    await page.click('.ov-sidebar-toggle');
    await page.waitForTimeout(500);
  }
  await page.locator('.ov-side-item', { hasText: '3D 模型展厅' }).click();
  await page.waitForSelector('.hall-node', { timeout: 30000 });
  // 无头环境为软件光栅(约 1fps), 模型体积 9~33MB, 需给足首帧时间
  await page.waitForTimeout(12000);
  await page
    .waitForFunction(() => !document.querySelector('.viewer-model-loading'), null, {
      timeout: 90000,
    })
    .catch(() => {});
  return page;
}

// 判断两个元素的矩形是否相交
const overlapOf = (page) =>
  page.evaluate(() => {
    const a = document.querySelector('.hall-archive-open')?.getBoundingClientRect();
    const b = document.querySelector('.viewer-title-overlay h2')?.getBoundingClientRect();
    if (!a || !b) return null;
    const overlap =
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0 &&
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0;
    return { overlap, btn: [a.left, a.top, a.bottom].map(Math.round), title: [b.left, b.top].map(Math.round) };
  });

const page = await openHall(1440, 900);
await page.screenshot({ path: `${dir}/hall-desktop.png` });

const info = await page.evaluate(() => ({
  archiveW: Math.round(document.querySelector('.hall-archive').getBoundingClientRect().width),
  stageW: Math.round(document.querySelector('.hall-stage').getBoundingClientRect().width),
  toolbarW: Math.round(document.querySelector('.hall-toolbar').getBoundingClientRect().width),
  axisNodes: document.querySelectorAll('.hall-node').length,
  canvas: !!document.querySelector('.hall-stage canvas'),
  activeName: document.querySelector('.hall-node.is-active .hall-node-name')?.textContent,
}));

await page.locator('.hall-node').nth(2).dispatchEvent('click');
await page.waitForTimeout(16000);
const afterClick = await page.evaluate(() => ({
  activeName: document.querySelector('.hall-node.is-active .hall-node-name')?.textContent,
  titleName: document.querySelector('.viewer-title-overlay h2')?.textContent,
  // 加载遮罩已消失 = 新模型首帧已就绪
  modelReady: !document.querySelector('.viewer-model-loading'),
}));
await page.screenshot({ path: `${dir}/hall-after-click.png` });

await page.locator('.hall-archive-close').dispatchEvent('click');
// 软件光栅下 CSS 过渡推进很慢, 轮询等待折叠真正落定
await page
  .waitForFunction(
    () => document.querySelector('.hall-archive').getBoundingClientRect().width < 8,
    null,
    { timeout: 30000 }
  )
  .catch(() => {});
// 等待 canvas 跟随舞台重新适配尺寸(ResizeObserver 异步)
await page
  .waitForFunction(
    () => {
      const c = document.querySelector('.hall-stage canvas');
      const s = document.querySelector('.hall-stage');
      return c && Math.abs(c.clientWidth - s.clientWidth) < 4;
    },
    null,
    { timeout: 20000 }
  )
  .catch(() => {});

const collapsed = await page.evaluate(() => {
  const c = document.querySelector('.hall-stage canvas');
  return {
    archiveW: Math.round(document.querySelector('.hall-archive').getBoundingClientRect().width),
    openBtn: !!document.querySelector('.hall-archive-open'),
    stageW: Math.round(document.querySelector('.hall-stage').getBoundingClientRect().width),
    canvasW: c ? Math.round(c.clientWidth) : 0,
  };
});
collapsed.titleOverlap = await overlapOf(page);
await page.screenshot({ path: `${dir}/hall-collapsed.png` });

await page.locator('.hall-toolbar .hall-tool').first().dispatchEvent('click');
await page.waitForTimeout(1500);
const paused = await page.evaluate(() =>
  document.querySelector('.hall-toolbar .hall-tool')?.classList.contains('is-active')
);

// 关闭桌面页, 避免两页争抢 CPU 影响移动端首帧
await page.close();

const mobile = await openHall(390, 844);
const mobileOverlap = await overlapOf(mobile);
const mobileState = await mobile.evaluate(() => ({
  modelReady: !document.querySelector('.viewer-model-loading'),
  titleName: document.querySelector('.viewer-title-overlay h2')?.textContent,
  stageW: Math.round(document.querySelector('.hall-stage').getBoundingClientRect().width),
}));
await mobile.screenshot({ path: `${dir}/hall-mobile.png` });

console.log(
  JSON.stringify(
    { info, afterClick, collapsed, paused, mobileOverlap, mobileState },
    null,
    2
  )
);
await browser.close();
