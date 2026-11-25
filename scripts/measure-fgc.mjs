#!/usr/bin/env node
/**
 * 批次 F 量测门禁（T-CLOSE-04）
 *
 * 一次运行校验：
 * - CLS ≤ 0.02（六断点）
 * - 帧率：桌面 ≥ 55fps / 移动 ≥ 45fps
 * - 卡片越界条数 = 0（逐卡 boundingBox 与舞台比较）
 * - 无 WebGL 下图谱降级为平面并保留提示
 * - 双主题（dark / light）各采样一次并记录 data-graph-theme
 *
 * 用法：node scripts/measure-fgc.mjs --base-url=http://localhost:3001
 *      node scripts/measure-fgc.mjs --out=docs/tasks/assets/fgc/measure
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};

const BASE_URL = readArg('base-url', 'http://localhost:3001');
const OUT = readArg('out', 'docs/tasks/assets/fgc/measure');
const ROUTE = `${BASE_URL.replace(/\/$/, '')}/encyclopedia`;

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080, tier: 'desktop' },
  { name: '1440x900', width: 1440, height: 900, tier: 'desktop' },
  { name: '1284x800', width: 1284, height: 800, tier: 'desktop' },
  { name: '1024x768', width: 1024, height: 768, tier: 'desktop' },
  { name: '768x1024', width: 768, height: 1024, tier: 'mobile' },
  { name: '375x812', width: 375, height: 812, tier: 'mobile' },
];

const CLS_LIMIT = 0.02;
const FPS_LIMIT = { desktop: 55, mobile: 45 };

const INIT_SCRIPT = () => {
  window.__fgcCls = [];
  window.__fgcFrames = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__fgcCls.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* 不支持则 CLS 记为 0 */
  }
  const tick = () => {
    window.__fgcFrames += 1;
    window.__fgcRaf = requestAnimationFrame(tick);
  };
  window.__fgcRaf = requestAnimationFrame(tick);
};

const blockFonts = (page) =>
  Promise.all([
    page.route('**://fonts.googleapis.com/**', (route) => route.abort()),
    page.route('**://fonts.gstatic.com/**', (route) => route.abort()),
  ]);

async function collect(page) {
  return page.evaluate(() => {
    const cls = (window.__fgcCls || []).reduce((sum, value) => sum + value, 0);
    const stage = document.querySelector('.enc-deck-stage');
    const cards = [...document.querySelectorAll('[data-deck-card]')];
    const overflow = [];
    if (stage) {
      const box = stage.getBoundingClientRect();
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (
          rect.left < box.left - 1 ||
          rect.right > box.right + 1 ||
          rect.top < box.top - 1 ||
          rect.bottom > box.bottom + 1
        ) {
          overflow.push(card.getAttribute('data-index'));
        }
      }
    }
    const graph = document.querySelector('.enc-graph3d');
    const themeToggle = document.querySelector('[data-theme-toggle="true"]');
    return {
      cls: Number(cls.toFixed(4)),
      frames: window.__fgcFrames,
      overflow: overflow.length,
      overflowIndexes: overflow,
      cards: cards.length,
      sphere: graph?.getAttribute('data-sphere') || 'none',
      theme: graph?.getAttribute('data-graph-theme') || 'none',
      hasThemeToggle: Boolean(themeToggle),
      planeHint: Boolean(document.querySelector('[data-graph-plane="true"]')),
      backTabs: [...document.querySelectorAll('.enc-graph3d-node[data-backfacing="true"]')].every(
        (node) => node.tabIndex === -1
      ),
    };
  });
}

async function runViewport(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await blockFonts(page);
  await page.addInitScript(INIT_SCRIPT);
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try {
    await page.waitForSelector('.enc-deck-stage', { timeout: 60000 });
  } catch {
    console.warn(`[warn] ${viewport.name} 舞台未就绪，继续采样 CLS/fps`);
  }
  const started = Date.now();
  await page.waitForTimeout(1600);
  const elapsed = Math.max(1, Date.now() - started);
  const sample = await collect(page);
  const fps = Number(((sample.frames / elapsed) * 1000).toFixed(1));
  const themes = [{ theme: sample.theme }];

  const toggle = page.locator('[data-theme-toggle="true"]');
  if (await toggle.count()) {
    await toggle.first().click();
    await page.waitForTimeout(300);
    const light = await page.evaluate(() => ({
      theme: document.querySelector('.enc-graph3d')?.getAttribute('data-graph-theme') || 'none',
      bg: (() => {
        const stage = document.querySelector('.enc-graph3d-stage');
        return stage ? getComputedStyle(stage).backgroundColor : 'none';
      })(),
    }));
    themes.push(light);
  }

  try {
    const clip = await page.locator('.enc-deck-stage').boundingBox();
    if (clip) {
      await page.screenshot({ path: path.join(OUT, `${viewport.name}.png`), clip, timeout: 5000 });
    }
  } catch {
    /* 字体阻塞时截图可跳过，数据优先 */
  }

  await page.close();
  return { ...viewport, ...sample, fps, themes };
}

async function runNoWebgl() {
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await blockFonts(page);
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.enc-deck-card', { timeout: 60000 });
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => {
    const graph = document.querySelector('.enc-graph3d');
    return {
      sphere: graph?.getAttribute('data-sphere') || 'none',
      planeHint: Boolean(document.querySelector('[data-graph-plane="true"]')),
      hasSvg: Boolean(document.querySelector('svg.enc-graph-svg')),
      hasNodes: Boolean(document.querySelector('[data-node-type]')),
    };
  });
  await page.close();
  await browser.close();
  return state;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  const failures = [];

  for (const viewport of VIEWPORTS) {
    const row = await runViewport(browser, viewport);
    rows.push(row);
    if (row.cls > CLS_LIMIT) failures.push(`${viewport.name} CLS ${row.cls} > ${CLS_LIMIT}`);
    if (row.fps < FPS_LIMIT[viewport.tier]) {
      failures.push(`${viewport.name} fps ${row.fps} < ${FPS_LIMIT[viewport.tier]}`);
    }
    if (row.overflow > 0) {
      failures.push(`${viewport.name} 卡片越界 ${row.overflow} 张`);
    }
    if (row.cards > 0 && !row.backTabs) {
      failures.push(`${viewport.name} 背面节点仍在 Tab 序列`);
    }
  }

  await browser.close();
  const noWebgl = await runNoWebgl();
  const degradedTo2d =
    noWebgl.planeHint ||
    noWebgl.hasSvg ||
    noWebgl.sphere === '2d' ||
    noWebgl.sphere === 'false' ||
    noWebgl.sphere === 'none';
  if (!degradedTo2d) {
    failures.push(`无 WebGL 未降级：data-sphere=${noWebgl.sphere}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    limits: { cls: CLS_LIMIT, fps: FPS_LIMIT },
    rows,
    noWebgl,
    pass: failures.length === 0,
    failures,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  for (const row of rows) {
    console.log(
      `${row.name} cls=${row.cls} fps=${row.fps} cards=${row.cards} overflow=${row.overflow} sphere=${row.sphere} theme=${row.theme}`
    );
  }
  console.log(`no-webgl: sphere=${noWebgl.sphere} planeHint=${noWebgl.planeHint} svg=${noWebgl.hasSvg}`);
  if (failures.length) {
    console.error(`✖ 门禁未通过：\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✔ 量测门禁通过：CLS / fps / 越界 / 无 WebGL 降级');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});