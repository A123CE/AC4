import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const width of [2560, 1920, 1440, 1284, 1025, 721, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('ac4_lang', 'zh-CN'));
  await page.goto('http://localhost:3001/encyclopedia', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.profile-topbar', { timeout: 15000 });
  await page.waitForTimeout(1800);
  const h = await page.evaluate(() => {
    const top = document.querySelector('.profile-topbar');
    const sub = document.querySelector('.profile-title-sub');
    const lead = document.querySelector('.encyclopedia-page-lead');
    return {
      topH: Math.round(top.getBoundingClientRect().height),
      subH: Math.round(sub.getBoundingClientRect().height),
      leadH: Math.round(lead.getBoundingClientRect().height),
    };
  });
  console.log(width, JSON.stringify(h));
  await page.close();
}
await browser.close();
