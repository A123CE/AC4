import { chromium } from 'playwright';
import fs from 'node:fs';

const auth = JSON.parse(fs.readFileSync('.tmp-auth.json', 'utf8')).data;
const dir = '.tmp-shots';
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`error: ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

await page.addInitScript((a) => {
  localStorage.setItem('palace_auth', JSON.stringify(a));
}, auth);

await page.goto('http://localhost:5173/encyclopedia', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.enc-guide-card', { timeout: 30000 });
await page.waitForTimeout(1200);

const state1 = await page.evaluate(() => ({
  cards: document.querySelectorAll('.enc-guide-card').length,
  titles: [...document.querySelectorAll('.enc-guide-title')].map((n) => n.textContent),
  hint: document.querySelector('.enc-guide-hint')?.textContent,
  terms: document.querySelectorAll('.encyclopedia-term-item').length,
  headerSub: document.querySelector('.profile-title-sub')?.textContent,
}));
await page.screenshot({ path: `${dir}/enc-guide.png` });

// 卡片 hover 态
await page.locator('.enc-guide-card').nth(2).hover();
await page.waitForTimeout(500);
await page.screenshot({ path: `${dir}/enc-guide-hover.png`, clip: { x: 330, y: 90, width: 1130, height: 420 } });

// 点击「彩画纹样」→ 分类筛选 + 展开首条
await page.locator('.enc-guide-card').nth(2).click();
await page.waitForSelector('.enc-head-title', { timeout: 20000 });
await page.waitForTimeout(1500);

const state2 = await page.evaluate(() => ({
  title: document.querySelector('.enc-head-title')?.textContent,
  activeCat: document.querySelector('.encyclopedia-cat-chip.active')?.textContent?.trim(),
  sections: [...document.querySelectorAll('.enc-section-head h3')].map((n) =>
    n.textContent.replace(/\s+/g, '')
  ),
  hotspots: document.querySelectorAll('.enc-hotspot').length,
  has3d: !!document.querySelector('.enc-3d-btn'),
  related: document.querySelectorAll('.enc-related-tag').length,
}));
await page.screenshot({ path: `${dir}/enc-detail-top.png` });

// 切到「纹样装饰」分类下的「龙纹」
await page.locator('.encyclopedia-cat-chip', { hasText: '纹样装饰' }).click();
await page.waitForTimeout(500);
const longwen = page
  .locator('.encyclopedia-term-item', {
    has: page.locator('.encyclopedia-term-item-name', { hasText: /^龙纹$/ }),
  })
  .first();
if (await longwen.count()) {
  await longwen.click();
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: `${dir}/enc-detail-longwen.png` });

// 热点悬停
const hotspot = page.locator('.enc-hotspot').nth(1);
await hotspot.hover();
await page.waitForTimeout(400);
const hotspotText = await page.evaluate(
  () => document.querySelector('.enc-hotspot.is-active .enc-hotspot-label')?.innerText
);
await page.locator('.enc-diagram').screenshot({ path: `${dir}/enc-diagram-hotspot.png` });

// 中部（图解 + 三维联动）
await page.locator('.enc-diagram').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: `${dir}/enc-detail-mid.png` });

const link = await page.evaluate(() => {
  const btn = document.querySelector('.enc-3d-btn');
  const card = document.querySelector('.enc-3d-card');
  return { text: btn?.textContent.trim(), desc: card?.querySelector('p')?.textContent };
});

// 跳转 3D
await page.locator('.enc-3d-btn').click();
await page.waitForURL('**/models', { timeout: 30000 });
await page.waitForSelector('.hall-stage canvas', { timeout: 30000 });
await page.waitForTimeout(22000);

const state3 = await page.evaluate(() => ({
  banner: document.querySelector('.hall-highlight-banner')?.innerText?.replace(/\s+/g, ' '),
  activeName: document.querySelector('.hall-node.is-active .hall-node-name')?.textContent,
  title: document.querySelector('.viewer-title-overlay h2')?.textContent,
}));
await page.screenshot({ path: `${dir}/enc-jump-3d.png` });

// 回到百科，验证「三朝五门制度」中轴布局图解
await page.goto('http://localhost:5173/encyclopedia', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.enc-guide-card', { timeout: 30000 });
await page.locator('.encyclopedia-cat-chip', { hasText: '建筑规制' }).click();
await page.waitForTimeout(500);
await page.locator('.encyclopedia-term-item-name', { hasText: '三朝五门' }).first().click();
await page.waitForTimeout(2500);
await page.locator('.enc-diagram').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.locator('.enc-diagram').screenshot({ path: `${dir}/enc-diagram-plan.png` });

const plan = await page.evaluate(() => ({
  title: document.querySelector('.enc-diagram-titles strong')?.textContent,
  legend: [...document.querySelectorAll('.enc-diagram-legend button')].map((b) => b.textContent),
  threeD: document.querySelector('.enc-3d-text p')?.textContent?.trim(),
  related: [...document.querySelectorAll('.enc-related-name')].map((n) => n.textContent),
}));

// 斗拱三维拆解
await page.locator('.encyclopedia-cat-chip', { hasText: '斗拱结构' }).click();
await page.waitForTimeout(500);
await page.locator('.encyclopedia-term-item-name', { hasText: '斗拱等级' }).first().click();
await page.waitForTimeout(2500);
await page.locator('.enc-diagram').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.locator('.dougong3d-legend button', { hasText: '下昂' }).click();
await page.waitForTimeout(800);
await page.locator('.dougong3d').screenshot({ path: `${dir}/enc-dougong3d.png` });

const dougong = await page.evaluate(() => ({
  canvas: !!document.querySelector('.dougong3d-stage canvas'),
  legend: [...document.querySelectorAll('.dougong3d-legend button')].map((b) => b.textContent),
  caption: document.querySelector('.dougong3d-info')?.innerText?.replace(/\s+/g, ' ').slice(0, 60),
  hint: document.querySelector('.enc-section-hint')?.textContent,
}));

await page.close();

// 移动端
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.addInitScript((a) => {
  localStorage.setItem('palace_auth', JSON.stringify(a));
}, auth);
await mobile.goto('http://localhost:5173/encyclopedia', { waitUntil: 'networkidle', timeout: 60000 });
await mobile.waitForSelector('.enc-guide-card', { timeout: 30000 });
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: `${dir}/enc-guide-mobile.png`, fullPage: true });

await mobile.locator('.enc-guide-card').first().click();
await mobile.waitForSelector('.enc-head-title', { timeout: 20000 });
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: `${dir}/enc-detail-mobile.png` });

const mobileOverflow = await mobile.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));

console.log(
  JSON.stringify(
    { state1, state2, hotspotText, link, state3, plan, dougong, mobileOverflow, logs: logs.slice(0, 8) },
    null,
    2
  )
);
await browser.close();
