import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 721, height: 900 } });
await page.addInitScript(() => localStorage.setItem('ac4_lang', 'zh-CN'));
const read = () =>
  page.evaluate(() => ({
    topH: Math.round(document.querySelector('.profile-topbar')?.getBoundingClientRect().height ?? 0),
    subY: Math.round(document.querySelector('.profile-title-sub')?.getBoundingClientRect().top ?? -1),
    deckH: Math.round(document.querySelector('.enc-deck')?.getBoundingClientRect().height ?? -1),
    deckY: Math.round(document.querySelector('.enc-deck')?.getBoundingClientRect().top ?? -1),
    empty: Boolean(document.querySelector('.enc-deck.is-empty')),
    chipY: Math.round(document.querySelector('.encyclopedia-cat-chip')?.getBoundingClientRect().top ?? -1),
    mainH: Math.round(document.querySelector('.enc-detail-main')?.getBoundingClientRect().height ?? -1),
  }));
await page.goto('http://localhost:3001/encyclopedia', { waitUntil: 'domcontentloaded' });
console.log('early', JSON.stringify(await read()));
await page.waitForTimeout(1200);
console.log('mid  ', JSON.stringify(await read()));
await page.waitForTimeout(1600);
console.log('late ', JSON.stringify(await read()));
await browser.close();
