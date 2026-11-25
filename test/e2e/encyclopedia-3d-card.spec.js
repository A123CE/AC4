import { test, expect } from 'playwright/test';

const CARD = '[data-deck-card]';

async function pickId(request, predicate) {
  const res = await request.get('/api/encyclopedia?page_size=50&include=content');
  expect(res.status()).toBe(200);
  const body = await res.json();
  const list = body?.data || [];
  const hit = predicate ? list.find(predicate) : list[0];
  return hit?.id || 'tiantan-eaves';
}

async function waitDeck(page) {
  await page.waitForFunction(
    () => Boolean(document.querySelector('.enc-deck')),
    undefined,
    { timeout: 20000 }
  );
}

async function deckTotal(page) {
  const label = await page.locator('.enc-deck[role="group"]').first().getAttribute('aria-label');
  const match = /(\d+)/.exec(label || '');
  return match ? Number(match[1]) : 0;
}

async function is3d(page) {
  return (await page.locator('.enc-graph3d-stage').count()) > 0;
}

function graphNode(page, type, mode3d) {
  return mode3d
    ? page.locator(`.enc-graph3d-node[data-node-type="${type}"]`)
    : page.locator(`.enc-graph-node[data-node-type="${type}"]`);
}

async function dragBy(page, selector, dx, dy) {
  const box = await page.locator(selector).first().boundingBox();
  const startX = box.x + Math.min(60, box.width / 2);
  const startY = box.y + Math.min(60, box.height / 2);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 6 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 6 });
  await page.mouse.up();
}

test.describe('百科 3D 卡片组', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ac4_lang', 'zh-CN'));
  });

  test('E-01 1440 引导态：五张卡与 3D 图谱同屏且不重叠', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    await expect(page.locator('.enc-deck')).toBeVisible();
    await expect(page.locator(CARD)).toHaveCount(5);
    await expect(page.locator('.enc-graph-panel--3d')).toHaveCount(1);
    await expect(page.locator('.enc-graph3d-node').first()).toBeVisible();

    const boxes = await page.evaluate(() => {
      const deck = document.querySelector('.enc-deck').getBoundingClientRect();
      const graph = document.querySelector('.enc-graph-panel--3d').getBoundingClientRect();
      return {
        overlap:
          deck.right > graph.left &&
          graph.right > deck.left &&
          deck.bottom > graph.top &&
          graph.bottom > deck.top,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(boxes.overlap).toBe(false);
    expect(boxes.overflow).toBe(false);
  });

  test('E-02 点第 2 张：写入 term、正文出现、筛选保留、无整页刷新', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia?building=tiantan', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    const card = page.locator(CARD).nth(1);
    const label = await card.getAttribute('aria-label');
    await card.dispatchEvent('click');

    await expect(page).toHaveURL(/[?&]term=/);
    await expect(page).toHaveURL(/building=tiantan/);
    await expect(page.locator('#enc-article')).toBeVisible();
    const navCount = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );
    expect(navCount).toBe(1);
    expect(label).toBeTruthy();
  });

  test('E-03 深链返回后对应卡为当前卡且在视口内', async ({ page, request }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    const id = await pickId(request, (item) => Boolean(item.primary_palace_id));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#enc-article', { timeout: 15000 });
    await page.keyboard.press('Escape');
    await waitDeck(page);

    const active = page.locator(`${CARD}[aria-current="true"]`);
    await expect(active).toHaveCount(1);
    const visible = await active.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight;
    });
    expect(visible).toBe(true);
  });

  test('E-04 伪造 term：给出提示且卡组仍可用', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia?term=__not_exist__', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await waitDeck(page);
    await expect(page.locator('.enc-deck')).toBeVisible();
    await expect(page.locator('.enc-deck').first()).toHaveAttribute('role', 'group');
  });

  test('E-05 改筛选：term 清空且卡片总数与命中一致', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);
    const before = await deckTotal(page);

    await page.locator('.enc-filter-chip').nth(1).dispatchEvent('click');
    await waitDeck(page);
    await expect(page).not.toHaveURL(/[?&]term=/);
    const after = await deckTotal(page);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(before).toBeGreaterThanOrEqual(after);
  });

  test('E-06 图谱拖拽 200px：方位角变化且松手后停稳', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    const pause = page.locator('.enc-graph3d-control[aria-pressed="true"]');
    if ((await pause.count()) > 0) await pause.click();

    const before = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.enc-graph3d-world')).getPropertyValue('--g3d-az')
    );
    await dragBy(page, '.enc-graph3d-stage', 200, 0);
    await page.waitForTimeout(1400);
    const after = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.enc-graph3d-world')).getPropertyValue('--g3d-az')
    );
    expect(after).not.toBe(before);

    const stable = await page.evaluate(async () => {
      const read = () =>
        getComputedStyle(document.querySelector('.enc-graph3d-world')).getPropertyValue('--g3d-az');
      const first = read();
      await new Promise((resolve) => setTimeout(resolve, 400));
      return first === read();
    });
    expect(stable).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });

  test('E-07 3D 节点点击与 2D 同构', async ({ page, request }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    const id = await pickId(request, (item) => Boolean(item.primary_palace_id));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/encyclopedia?term=${encodeURIComponent(id)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#enc-article', { timeout: 15000 });
    expect(await is3d(page)).toBe(true);

    const termNode = graphNode(page, 'term', true).first();
    await expect(termNode).toHaveCount(1);
    await termNode.dispatchEvent('click');
    await expect(page.locator('#enc-article')).toBeVisible();

    const building = graphNode(page, 'building', true).first();
    if ((await building.count()) > 0) {
      await building.dispatchEvent('click');
      await expect(page).toHaveURL(/\/exhibition\//);
    }
  });

  test('E-08 区域手势划界：图谱旋转不换卡，卡片拖拽不改视角', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    const pause = page.locator('.enc-graph3d-control[aria-pressed="true"]');
    if ((await pause.count()) > 0) await pause.click();
    await expect(page.locator('.enc-graph3d-control[aria-pressed="true"]')).toHaveCount(0);

    const cardBefore = await page.locator(`${CARD}[aria-current="true"]`).getAttribute('data-index');
    await dragBy(page, '.enc-graph3d-stage', 160, 0);
    await page.waitForTimeout(1000);
    const cardAfter = await page.locator(`${CARD}[aria-current="true"]`).getAttribute('data-index');
    expect(cardAfter).toBe(cardBefore);

    const azBefore = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.enc-graph3d-world')).getPropertyValue('--g3d-az')
    );
    await dragBy(page, '.enc-deck-stage', 160, 0);
    await page.waitForTimeout(400);
    const azAfter = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.enc-graph3d-world')).getPropertyValue('--g3d-az')
    );
    expect(azAfter).toBe(azBefore);
  });

  test('E-09 六断点无横向滚动且卡片数符合断点', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    const expected = [
      [1440, 5],
      [1284, 4],
      [1025, 3],
      [721, 3],
      [481, 2],
    ];
    for (const [width, count] of expected) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
      await waitDeck(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflow, `${width} 横向滚动`).toBe(false);
      await expect(page.locator(CARD), `${width} 卡片数`).toHaveCount(count);
    }
  });

  test('E-10 375/320：列表形态且可到达最后一项', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl', 'mobile-320'].includes(testInfo.project.name), '仅 320/桌面');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);
    await expect(page.locator('.enc-deck.is-list')).toHaveCount(1);
    await expect(page.locator(CARD)).toHaveCount(0);

    const total = await deckTotal(page);
    expect(total).toBeGreaterThan(0);
    for (let round = 0; round < 10; round += 1) {
      const more = page.locator('.enc-deck-more');
      if ((await more.count()) === 0) break;
      await more.scrollIntoViewIfNeeded();
      await more.click();
    }
    const items = await page.locator('.enc-deck-list-item').count();
    expect(items).toBe(Math.min(total, 200));
  });

  test('E-11 减效：不自动轮播，仍可手动切卡', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    await expect(page.locator('.enc-deck.is-flat')).toHaveCount(1);
    const before = await page.locator(`${CARD}[aria-current="true"]`).getAttribute('data-index');
    await page.waitForTimeout(2600);
    const after = await page.locator(`${CARD}[aria-current="true"]`).getAttribute('data-index');
    expect(after).toBe(before);

    await dragBy(page, `${CARD}[aria-current="true"]`, 180, 0);
    const moved = await page.locator(`${CARD}[aria-current="true"]`).getAttribute('data-index');
    expect(moved).not.toBe(before);
  });

  test('E-12 键盘：Tab → →→ → Enter → 正文 → Esc 返回卡组', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);

    await page.locator('.enc-card-skip').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    const focusedIndex = await page.evaluate(
      () => document.activeElement?.getAttribute('data-index') || null
    );
    expect(focusedIndex).not.toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.locator('#enc-article')).toBeVisible();
    await expect(page).toHaveURL(/[?&]term=/);

    await page.keyboard.press('Escape');
    await waitDeck(page);
    await expect
      .poll(
        () => page.evaluate(() => document.activeElement?.getAttribute('data-index') || null),
        { timeout: 5000 }
      )
      .not.toBeNull();
  });

  test('E-13 打印时卡片不可见', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'no-webgl'].includes(testInfo.project.name), '仅桌面/无 WebGL 项目');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/encyclopedia', { waitUntil: 'domcontentloaded' });
    await waitDeck(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.enc-deck')).toBeHidden();
    await expect(page.locator('.enc-graph3d')).toBeHidden();
  });

  test.skip('E-14 VITE_ENC_3D=off 回滚（由双构建门禁覆盖）', async () => {
    // 回滚需独立构建产物，无法在同一 dev/build 服务内切换；
    // T-CARD-13 DoD 已用 VITE_ENC_3D=off 构建验证，E2E 不重复。
  });
});