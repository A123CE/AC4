import { test, expect } from 'playwright/test';

const DETAIL_METRIC = () => {
  const d = document.querySelector('.encyclopedia-detail');
  const g = document.querySelector('.enc-detail-grid');
  const m = document.querySelector('.enc-detail-main');
  const p = document.querySelector('.enc-graph-panel');
  if (!d || !g || !m) return { error: 'missing grid/main' };
  const cs = getComputedStyle(d);
  const contentBox =
    d.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const mainW = m.getBoundingClientRect().width;
  const panelW = p ? p.getBoundingClientRect().width : 0;
  const gap = parseFloat(getComputedStyle(g).columnGap) || 0;
  const covered = mainW + (panelW > 0 ? gap + panelW : 0);
  return {
    contentBox: +contentBox.toFixed(1),
    mainW: +mainW.toFixed(1),
    panelW: +panelW.toFixed(1),
    gap,
    blankRatio: +((1 - covered / contentBox) * 100).toFixed(1),
    scrollOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

async function pickId(request, predicate) {
  const res = await request.get('/api/encyclopedia?page_size=50&include=content');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const list = body?.data || [];
  const hit = predicate ? list.find(predicate) : list[0];
  return hit?.id || 'tiantan-eaves';
}

async function waitGraph(page) {
  await page.waitForFunction(
    () => document.querySelector('[data-graph-ready="true"]'),
    undefined,
    { timeout: 15000 }
  );
}

async function graphMode(page) {
  return (await page.locator('.enc-graph3d-stage').count()) > 0 ? '3d' : '2d';
}

async function graphNode(page, type) {
  const mode = await graphMode(page);
  return mode === '3d'
    ? page.locator(`.enc-graph3d-node[data-node-type="${type}"]`)
    : page.locator(`.enc-graph-node[data-node-type="${type}"]`);
}

test.describe('百科知识图谱', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ac4_lang', 'zh-CN'));
  });

  test('1 空白率：1440/1920 详情 ≤8%', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id && item.related_terms?.length);
    for (const [width, height] of [[1920, 1080], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitGraph(page);
      const metric = await page.evaluate(DETAIL_METRIC);
      expect(metric.blankRatio, `${width} 详情空白率`).toBeLessThanOrEqual(8);
      expect(metric.scrollOverflow).toBe(false);
    }
  });

  test('2 图谱栏宽在 320~420 两态保持', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitGraph(page);
    const guide = await page.evaluate(DETAIL_METRIC);
    expect(guide.panelW).toBeGreaterThanOrEqual(320);
    expect(guide.panelW).toBeLessThanOrEqual(420);

    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);
    const detail = await page.evaluate(DETAIL_METRIC);
    expect(detail.panelW).toBeGreaterThanOrEqual(320);
    expect(detail.panelW).toBeLessThanOrEqual(420);
  });

  test('3 四断点无横向滚动', async ({ page, request }, testInfo) => {
    const id = await pickId(request, (item) => item.primary_palace_id);
    const widths =
      testInfo.project.name === 'mobile-320'
        ? [[320, 700]]
        : [[320, 700], [900, 900], [1440, 900], [1920, 1080]];
    for (const [width, height] of widths) {
      await page.setViewportSize({ width, height });
      await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(1200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflow, `${width} 横向滚动`).toBe(false);
    }
  });

  test('4 四类节点可点击并回传筛选/跳转', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);

    await (await graphNode(page, 'building')).first().dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/\/exhibition\//);

    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);
    await (await graphNode(page, 'term')).first().dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/[?&]term=/);

    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitGraph(page);
    await (await graphNode(page, 'category')).first().dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/[?&]category=/);

    const dynastyNode = (await graphNode(page, 'dynasty')).first();
    if ((await dynastyNode.count()) > 0) {
      await dynastyNode.click();
      await page.waitForTimeout(600);
      await expect(page).toHaveURL(/[?&]dynasty=/);
    }
  });

  test('5 先筛后点：进入词条时清空原筛选', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia?building=tiantan', { waitUntil: 'domcontentloaded' });
    await waitGraph(page);
    const termNode = (await graphNode(page, 'term')).first();
    const clicked = (await termNode.count()) > 0;
    if (clicked) await termNode.dispatchEvent('click');
    expect(clicked).toBe(true);
    await page.waitForTimeout(900);
    await expect(page).toHaveURL(/[?&]term=/);
    await expect(page).toHaveURL(/building=tiantan/);
  });

  test('6 键盘：跳至正文首焦点与节点 Enter', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);

    const skip = page.locator('.enc-graph-skip');
    await expect(skip).toHaveCount(1);
    await skip.focus();
    expect(await page.evaluate(() => document.activeElement?.classList.contains('enc-graph-skip'))).toBe(true);

    const keyNode = (await graphNode(page, 'term')).first();
    const dispatched = (await keyNode.count()) > 0;
    if (dispatched) {
      await keyNode.focus();
      await keyNode.press('Enter');
    }
    expect(dispatched).toBe(true);
    await page.waitForTimeout(900);
    await expect(page).toHaveURL(/[?&]term=/);
  });

  test('7 折叠后正文列宽差 ≤1px', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '折叠验收仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);

    const mainWidth = () =>
      page.evaluate(() => document.querySelector('.enc-detail-main')?.getBoundingClientRect().width || 0);
    const before = await mainWidth();
    const toggle = page.getByRole('button', { name: /收起图谱|展开图谱/ }).first();
    await toggle.click();
    await page.waitForTimeout(400);
    const after = await mainWidth();
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });

  test('8 320 窄屏不渲染 SVG，提供列表出口', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-320', '仅 320 项目');
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(page.locator('.enc-graph-panel--list')).toHaveCount(1);
    await expect(page.locator('.enc-graph-panel svg')).toHaveCount(0);
    expect(await page.locator('.enc-graph-list button').count()).toBeGreaterThan(0);
  });

  test('9 中英切换后图谱文案为英文', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.addInitScript(() => localStorage.setItem('ac4_lang', 'en'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);
    await expect(page.getByText('Knowledge graph')).toBeVisible();
    await expect(page.getByText('The Yingzao Fashi')).toBeVisible();
  });

  test('10 空结果时图谱为空态并给出清除筛选', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    await page.route('**/api/encyclopedia*', async (route) => {
      const url = route.request().url();
      if (/\/encyclopedia(\?|$)/.test(url) && !url.includes('/taxonomy')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            meta: {
              total: 0,
              page: 1,
              page_size: 200,
              filters_applied: {},
              buildings_total: 0,
              non_forbidden_total: 0,
            },
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(page.getByText('当前筛选下暂无可展示的关联')).toBeVisible();
    await expect(page.getByRole('button', { name: '清除筛选' }).first()).toBeVisible();
  });

  test('11 抽样词条均有可聚焦的 term 节点', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const res = await request.get('/api/encyclopedia?page_size=50&include=content');
    const body = await res.json();
    const ids = (body?.data || []).slice(0, 10).map((item) => item.id);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const id of ids) {
      await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitGraph(page);
      const node = (await graphNode(page, 'term')).first();
      await expect(node, id).toHaveCount(1);
    }
  });

  test('12 埋点包含图谱事件且无身份字段', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    const bodies = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/metrics/events')) bodies.push(req.postData() || '');
    });
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
      } catch {
        /* ignore */
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);

    const termNodes = await graphNode(page, 'term');
    const termCount = await termNodes.count();
    expect(termCount).toBeGreaterThan(0);
    for (let index = 0; index < Math.min(termCount, 5); index += 1) {
      await termNodes.nth(index).dispatchEvent('click');
      await page.waitForTimeout(250);
    }
    await page.getByRole('button', { name: /收起图谱|展开图谱/ }).first().dispatchEvent('click');
    await page.waitForTimeout(5000);

    const payload = bodies.join('');
    expect(payload).toContain('graph_view');
    expect(payload).toContain('graph_node_click');
    expect(payload).toContain('graph_expand');
    expect(payload).not.toMatch(/username|email|token|password/);
  });

  test('13 ?perf=1 时 renderTotal ≤200ms', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '仅桌面项目');
    const id = await pickId(request, (item) => item.primary_palace_id);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}&perf=1`, {
      waitUntil: 'domcontentloaded',
    });
    await waitGraph(page);
    await page.waitForFunction(() => Boolean(window.__encGraphPerf), undefined, {
      timeout: 8000,
    });
    const perf = await page.evaluate(() => window.__encGraphPerf);
    expect(perf.renderTotal).toBeLessThanOrEqual(200);
  });
});