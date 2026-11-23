/**
 * 程序化建筑 — 海报与四视图截图
 * 输出:
 *   images/posters/<id>.png        (16:10 卡片封面)
 *   images/views/<id>-*.png        (4:3 四视图)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONT = 'http://localhost:5175';
const API = 'http://localhost:3001';

const BUILDINGS = [
  { id: 'yingxian_muta', name: '应县木塔' },
  { id: 'foguangsi', name: '佛光寺东大殿' },
  { id: 'yueyanglou', name: '岳阳楼' },
];
const VIEW_KEYS = ['front', 'right', 'back', 'left'];
const VIEW_LABELS = ['正面', '右侧', '背面', '左侧'];

fs.mkdirSync('images/posters', { recursive: true });
fs.mkdirSync('images/views', { recursive: true });

const login = await (
  await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_national', password: 'test123456' }),
  })
).json();
const { token, user } = login.data;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.addInitScript((auth) => {
  localStorage.setItem('palace_auth', JSON.stringify(auth));
}, { token, user });

async function saveCropped(buf, outPath, w, h) {
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const cropped = await page.evaluate(
    async ({ dataUrl, w, h }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return c.toDataURL('image/png');
    },
    { dataUrl, w, h }
  );
  fs.writeFileSync(outPath, Buffer.from(cropped.split(',')[1], 'base64'));
}

async function drag(box, dx) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy, { steps: 20 });
  await page.mouse.up();
}

await page.goto(FRONT + '/gallery', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3500);

// 关闭自转, 保证四视图角度稳定
const pause = page.locator('.hall-tool[title="暂停自转"]').first();
if (await pause.count()) await pause.click();
await page.waitForTimeout(400);

for (const { id, name } of BUILDINGS) {
  await page.locator('.hall-node').filter({ hasText: name }).first().evaluate((el) => el.click());
  await page.waitForTimeout(2800);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    console.log(`${name}: 未找到 canvas`);
    continue;
  }

  // 海报 — 默认 3/4 视角
  const posterBuf = await canvas.screenshot();
  await saveCropped(posterBuf, path.join('images/posters', `${id}.png`), 960, 600);

  // 转到正面 (默认 theta≈0.6rad → 0), OrbitControls 每半屏高度 = 180°
  const radToPx = box.height / (2 * Math.PI);
  await drag(box, radToPx * 0.6);
  await page.waitForTimeout(700);

  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      await drag(box, box.height / 4); // 90°
      await page.waitForTimeout(800);
    }
    const buf = await canvas.screenshot();
    const file = path.join('images/views', `${id}-${VIEW_KEYS[i]}.png`);
    await saveCropped(buf, file, 800, 600);
  }

  console.log(`${name}: 海报 + 四视图已生成`);
}

await browser.close();
console.log('截图完成');
