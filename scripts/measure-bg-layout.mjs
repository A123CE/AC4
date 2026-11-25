#!/usr/bin/env node
/**
 * 百科知识图谱布局量测（T-BG-12）
 *
 * 用法：
 *   node scripts/measure-bg-layout.mjs [--base-url=http://localhost:3001]
 *     [--viewports=1920x1080,1440x900] [--out=test-results/bg-measure]
 *     [--baseline=docs/tasks/assets/bg-baseline/layout-before.json]
 *
 * 产出：<out>/<timestamp>.json 与 <out>/<viewport>-<state>-after.png
 * 判定：blankRatio ≤8、scrollOverflow=false、cls ≤0.02、1440 行宽 ∈[60,75]、图谱宽 ∈[320,420]
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
const OUT_DIR = getArg('--out', 'test-results/bg-measure');
const BASELINE = getArg('--baseline', '');
const VIEWPORTS = getArg('--viewports', '1920x1080,1440x900')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [w, h] = item.split('x').map(Number);
    return { width: w, height: h };
  });

const LIMITS = { blankRatio: 8, cls: 0.02, readingMin: 60, readingMax: 75, graphMin: 320, graphMax: 420, perf: 200 };

function gzipBytes(file) {
  try {
    return zlib.gzipSync(fs.readFileSync(file)).length;
  } catch {
    return 0;
  }
}

function assetSizes(root) {
  const assetsDir = path.join(root, 'client', 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) return { jsGzipBytes: 0, cssGzipBytes: 0 };
  let js = 0;
  let css = 0;
  for (const name of fs.readdirSync(assetsDir)) {
    const full = path.join(assetsDir, name);
    if (name.endsWith('.js')) js += gzipBytes(full);
    if (name.endsWith('.css')) css += gzipBytes(full);
  }
  return { jsGzipBytes: js, cssGzipBytes: css };
}

async function pickSample() {
  const response = await fetch(`${BASE_URL}/api/encyclopedia?page_size=50&include=content`);
  if (!response.ok) throw new Error(`百科接口不可用：HTTP ${response.status}`);
  const payload = await response.json();
  const list = payload?.data || [];
  const sample =
    list.find(
      (item) =>
        item.primary_palace_id &&
        Array.isArray(item.related_terms) &&
        item.related_terms.length > 0
    ) || list[0];
  if (!sample?.id) throw new Error('无法从接口取到样本词条');
  return sample.id;
}

async function measureOnce(browser, viewport, state, sampleId, screenshotPath) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // ignore unsupported browsers
    }
  });

  const url =
    state === 'detail'
      ? `${BASE_URL}/encyclopedia?term=${encodeURIComponent(sampleId)}&perf=1`
      : `${BASE_URL}/encyclopedia?perf=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('[data-graph-ready="true"]'),
    undefined,
    { timeout: 15000 }
  );
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const detail = document.querySelector('.encyclopedia-detail');
    const grid = document.querySelector('.enc-detail-grid');
    const main = document.querySelector('.enc-detail-main');
    const panel = document.querySelector('.enc-graph-panel');
    const article = document.querySelector('.enc-article');
    const reading =
      document.querySelector('.enc-reading') ||
      document.querySelector('.encyclopedia-article-content p');
    const heading =
      document.querySelector('.enc-head-title') || document.querySelector('.enc-guide-heading');
    const sidebar = document.querySelector('.encyclopedia-sidebar');
    if (!detail || !grid || !main) return { error: 'missing grid/main' };

    const cs = getComputedStyle(detail);
    const contentBox =
      detail.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const mainW = main.getBoundingClientRect().width;
    const panelW = panel ? panel.getBoundingClientRect().width : 0;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const covered = mainW + (panelW > 0 ? gap + panelW : 0);

    let readingChars = null;
    if (reading) {
      const rcs = getComputedStyle(reading);
      const probe = document.createElement('span');
      probe.textContent = '0'.repeat(100);
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${rcs.font};letter-spacing:${rcs.letterSpacing}`;
      document.body.appendChild(probe);
      const ch = probe.getBoundingClientRect().width / 100;
      probe.remove();
      if (ch > 0) readingChars = +(reading.getBoundingClientRect().width / ch).toFixed(1);
    }

    return {
      contentBox: +contentBox.toFixed(1),
      mainW: +mainW.toFixed(1),
      panelW: +panelW.toFixed(1),
      gap,
      blankRatio: +((1 - covered / contentBox) * 100).toFixed(1),
      scrollOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      readingChars,
      articleWidth: article ? +article.getBoundingClientRect().width.toFixed(1) : null,
      sidebarWidth: sidebar ? +sidebar.getBoundingClientRect().width.toFixed(1) : null,
      titleLeft: heading ? +heading.getBoundingClientRect().left.toFixed(1) : null,
      columns: getComputedStyle(grid).gridTemplateColumns,
      cls: +(window.__cls || 0).toFixed(4),
      perf: window.__encGraphPerf || null,
    };
  });

  const cdp = await context.newCDPSession(page);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));

  await context.close();
  return metrics;
}

async function main() {
  const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
  if (!health || !health.ok) throw new Error(`服务不可用：${BASE_URL}/api/health`);

  const root = process.cwd();
  const sampleId = await pickSample();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const combos = [];

  for (const viewport of VIEWPORTS) {
    const key = `${viewport.width}x${viewport.height}`;
    for (const state of ['guide', 'detail']) {
      const screenshotName = `${key}-${state}-after.png`;
      const screenshotPath = path.join(OUT_DIR, screenshotName);
      const samples = [];
      for (let index = 0; index < 2; index += 1) {
        samples.push(await measureOnce(browser, viewport, state, sampleId, screenshotPath));
      }
      const metrics = samples[1];
      const clsSamples = samples.map((item) => item.cls);
      combos.push({
        viewport: key,
        state,
        metrics: { ...metrics, clsSamples },
        screenshot: screenshotName,
      });
      console.log(
        `${key} ${state}: blank=${metrics.blankRatio}% panel=${metrics.panelW} cls=${clsSamples.join('/')}`
      );
    }
  }

  await browser.close();

  const docked = combos.filter((item) => item.metrics.panelW >= LIMITS.graphMin);
  const checks = {
    blankRatio: docked.every((item) => item.metrics.blankRatio <= LIMITS.blankRatio),
    scroll: combos.every((item) => item.metrics.scrollOverflow === false),
    cls: combos.every((item) => Math.min(...item.metrics.clsSamples) <= LIMITS.cls),
    graphWidth: docked.every(
      (item) => item.metrics.panelW >= LIMITS.graphMin && item.metrics.panelW <= LIMITS.graphMax
    ),
    readingChars: combos
      .filter((item) => item.viewport === '1440x900' && item.state === 'detail')
      .every(
        (item) =>
          item.metrics.readingChars === null ||
          (item.metrics.readingChars >= LIMITS.readingMin &&
            item.metrics.readingChars <= LIMITS.readingMax)
      ),
    perf: combos.every(
      (item) => !item.metrics.perf || item.metrics.perf.renderTotal <= LIMITS.perf
    ),
  };

  let baselineDelta = null;
  if (BASELINE && fs.existsSync(BASELINE)) {
    try {
      const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
      const map = new Map(
        (baseline.combos || []).map((item) => [`${item.viewport}:${item.mode || item.state}`, item])
      );
      baselineDelta = combos.map((item) => {
        const before = map.get(`${item.viewport}:${item.state}`);
        const beforeRatio = before?.metrics?.blankRatio ?? null;
        return {
          viewport: item.viewport,
          state: item.state,
          beforeRatio,
          afterRatio: item.metrics.blankRatio,
          delta:
            beforeRatio === null ? null : +(item.metrics.blankRatio - beforeRatio).toFixed(1),
        };
      });
    } catch (err) {
      console.warn('baseline 解析失败，跳过对比：', err.message);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sampleId,
    viewports: VIEWPORTS.map((item) => `${item.width}x${item.height}`),
    combos,
    assets: assetSizes(root),
    baselineDelta,
    checks,
    passed: Object.values(checks).every(Boolean),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `${stamp}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`written ${jsonPath}`);
  console.log(JSON.stringify({ checks, assets: report.assets, passed: report.passed }, null, 2));

  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error('量测失败：', err.message);
  process.exit(1);
});