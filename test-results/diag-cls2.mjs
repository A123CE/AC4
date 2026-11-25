import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.addInitScript(() => localStorage.setItem('ac4_lang', 'zh-CN'));
await page.goto('http://localhost:3001/encyclopedia', { waitUntil: 'domcontentloaded' });
const read = () =>
  page.evaluate(() => {
    const top = document.querySelector('.profile-topbar');
    const layout = document.querySelector('.encyclopedia-layout');
    const main = document.querySelector('.enc-detail-main');
    const chip = document.querySelector('.encyclopedia-cat-chip');
    return {
      topH: top ? Math.round(top.getBoundingClientRect().height) : null,
      layoutTop: layout ? Math.round(layout.getBoundingClientRect().top) : null,
      mainH: main ? Math.round(main.getBoundingClientRect().height) : null,
      chipY: chip ? Math.round(chip.getBoundingClientRect().top) : null,
      loading: Boolean(document.querySelector('.enc-graph-panel--loading')),
      deckH: Math.round(document.querySelector('.enc-deck')?.getBoundingClientRect().height ?? 0),
    };
  });
console.log('early', JSON.stringify(await read()));
await page.waitForTimeout(2500);
console.log('late ', JSON.stringify(await read()));
await browser.close();
