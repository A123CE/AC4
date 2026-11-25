#!/usr/bin/env node
/**
 * 百科 3D 卡片 / 图谱量测（T-CARD-21）
 *
 * 用法：
 *   node scripts/measure-enc-3d.mjs [--base-url=http://localhost:3001]
 *     [--out=docs/tasks/assets/enc3d] [--viewports=2560x1440,...]
 *
 * 产出：<out>/report.json
 * 判定：六断点无横向滚动、CLS ≤0.02、desktop 中位 fps ≥50、移动 ≥45。
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const found = args.find((item) => item.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
};

const BASE_URL = (getArg('--base-url', 'http://localhost:3001') || '').replace(/\/+$/, '');
const OUT_DIR = getArg('--out', 'docs/tasks/assets/enc3d');
const VIEWPORTS = getArg(
  '--viewports',
  '2560x1440,1920x1080,1440x900,1284x900,1025x900,721x900,375x812'
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [width, height] = item.split('x').map(Number);
    return { width, height };
  });

const LIMITS = { cls: 0.02, desktopFps: 50, mobileFps: 45 };

const INIT_SCRIPT = () => {
  localStorage.setItem('ac4_lang', 'zh-CN');
  window.__shifts = [];
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__shifts.push({ t: entry.startTime, v: entry.value });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* 浏览器不支持 layout-shift */
  }
};

async function measureViewport(browser, viewport) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(INIT_SCRIPT);
  await page.goto(`${BASE_URL}/encyclopedia`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.enc-deck', { timeout: 20000 });
  await page.waitForTimeout(800);
  const metrics = await page.evaluate(() => {
    const deck = document.querySelector('.enc-deck');
    const graph = document.querySelector('.enc-graph-panel');
    const deckRect = deck?.getBoundingClientRect();
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const cls = (window.__shifts || [])
      .filter((item) => item.t >= fcp)
      .reduce((sum, item) => sum + item.v, 0);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      deckH: deckRect ? Math.round(deckRect.height) : 0,
      viewportH: innerHeight,
      deckRatio: deckRect ? +(deckRect.height / innerHeight).toFixed(3) : 0,
      cards: document.querySelectorAll('[data-deck-card]').length,
      list: Boolean(document.querySelector('.enc-deck.is-list')),
      flat: Boolean(deck?.classList.contains('is-flat')),
      graphW: graph ? Math.round(graph.getBoundingClientRect().width) : 0,
      graphKind: document.querySelector('.enc-graph3d-stage')
        ? 'full3d'
        : document.querySelector('.enc-graph-panel--25d')
          ? '25d'
          : document.querySelector('.enc-graph-panel--list')
            ? 'list'
            : '2d',
      cls: +cls.toFixed(4),
      fcpMs: +fcp.toFixed(1),
    };
  });
  await page.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    ...metrics,
    overflow: metrics.scrollWidth > metrics.clientWidth + 1,
  };
}

async function measureFirstPaint(browser, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(INIT_SCRIPT);
  const started = Date.now();
  await page.goto(`${BASE_URL}/encyclopedia?perf=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.enc-deck', { timeout: 20000 });
  await page
    .waitForFunction(() => Boolean(window.__encGraphPerf), undefined, { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const marks = performance.getEntriesByType('mark').map((item) => item.name);
    return {
      graphRenderMs: window.__encGraphPerf?.renderTotal ?? null,
      fcpMs: fcp ? +fcp.startTime.toFixed(1) : null,
      domContentLoadedMs: nav ? +nav.domContentLoadedEventEnd.toFixed(1) : null,
      marks,
    };
  });
  await page.close();
  return { label, wallMs: Date.now() - started, ...data };
}

async function measureFps(browser, viewport, cpuThrottle, selector = '.enc-graph3d-stage') {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(INIT_SCRIPT);
  if (cpuThrottle > 1) {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  }
  await page.goto(`${BASE_URL}/encyclopedia`, { waitUntil: 'networkidle' });
  await page.waitForSelector(selector, { timeout: 20000 });
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let last = performance.now();
        const end = last + 3000;
        const tick = (timestamp) => {
          samples.push(timestamp - last);
          last = timestamp;
          if (timestamp >= end) {
            const sorted = samples.slice(1).sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] || 16.7;
            resolve(+(1000 / median).toFixed(1));
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
  await page.close();
  return fps;
}

function bundleSize() {
  const dir = path.resolve('client/dist/assets');
  if (!fs.existsSync(dir)) return { available: false, jsGzip: 0, cssGzip: 0, files: 0 };
  let jsGzip = 0;
  let cssGzip = 0;
  let files = 0;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (!name.endsWith('.js') && !name.endsWith('.css')) continue;
    const size = zlib.gzipSync(fs.readFileSync(file)).length;
    files += 1;
    if (name.endsWith('.js')) jsGzip += size;
    else cssGzip += size;
  }
  return { available: true, jsGzip, cssGzip, files };
}

const browser = await chromium.launch();
const viewports = [];
for (const viewport of VIEWPORTS) {
  viewports.push(await measureViewport(browser, viewport));
}

const firstPaint = {
  cold: await measureFirstPaint(browser, 'cold'),
  warm: await measureFirstPaint(browser, 'warm'),
};

const fps = {
  desktop: await measureFps(browser, { width: 1440, height: 900 }, 1),
  mobile: await measureFps(browser, { width: 384, height: 854 }, 4, '.enc-deck'),
};

await browser.close();

const bundle = bundleSize();
const maxCls = Math.max(...viewports.map((item) => item.cls));
const overflow = viewports.filter((item) => item.overflow).map((item) => item.viewport);
const failures = [];
if (overflow.length > 0) failures.push(`horizontal-scroll:${overflow.join(',')}`);
if (maxCls > LIMITS.cls) failures.push(`cls:${maxCls}`);
if (fps.desktop < LIMITS.desktopFps) failures.push(`desktop-fps:${fps.desktop}`);
if (fps.mobile < LIMITS.mobileFps) failures.push(`mobile-fps:${fps.mobile}`);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  viewports,
  firstPaint: {
    limitMs: 200,
    cold: firstPaint.cold,
    warm: firstPaint.warm,
    worstRenderMs: Math.max(
      firstPaint.cold.graphRenderMs ?? 0,
      firstPaint.warm.graphRenderMs ?? 0
    ),
  },
  fps: { ...fps, desktopLimit: LIMITS.desktopFps, mobileLimit: LIMITS.mobileFps },
  cls: { max: maxCls, limit: LIMITS.cls },
  bundle,
  edgeDownsample: false,
  pass: failures.length === 0,
  failures,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'report.json');
fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`报告：${outFile}`);
for (const item of viewports) {
  console.log(
    `${item.viewport} cards=${item.cards} list=${item.list} flat=${item.flat} graph=${item.graphKind} ` +
      `deck=${item.deckRatio} cls=${item.cls} overflow=${item.overflow}`
  );
}
console.log(`fps desktop=${fps.desktop} mobile=${fps.mobile}`);
console.log(
  `firstPaint cold=${firstPaint.cold.graphRenderMs}ms warm=${firstPaint.warm.graphRenderMs}ms ` +
    `fcp=${firstPaint.cold.fcpMs}ms`
);
console.log(`bundle js=${bundle.jsGzip}B css=${bundle.cssGzip}B files=${bundle.files}`);
console.log(report.pass ? 'PASS' : `FAIL ${failures.join(' | ')}`);
if (!report.pass) process.exit(1);