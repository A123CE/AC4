import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 721, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('ac4_lang', 'zh-CN');
  window.__s = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__s.push({
        v: +e.value.toFixed(4),
        t: Math.round(e.startTime),
        src: (e.sources || []).map((x) => `${x.node?.tagName}.${(x.node?.className || '').toString().split(' ')[0]}`),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
});
const read = () =>
  page.evaluate(() => ({
    topH: Math.round(document.querySelector('.profile-topbar')?.getBoundingClientRect().height ?? 0),
    layoutTop: Math.round(document.querySelector('.encyclopedia-layout')?.getBoundingClientRect().top ?? -1),
    scrollH: document.documentElement.scrollHeight,
    clientW: document.documentElement.clientWidth,
  }));
await page.goto('http://localhost:3001/encyclopedia', { waitUntil: 'domcontentloaded' });
console.log('early', JSON.stringify(await read()));
await page.waitForTimeout(2500);
console.log('late ', JSON.stringify(await read()));
console.log('shifts', JSON.stringify((await page.evaluate(() => window.__s)).filter((x) => x.v > 0.002)));
await browser.close();
