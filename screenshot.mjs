import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  await page.goto('http://localhost:5173/douba-eighteen', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  // Screenshot 1: assembled state
  await page.screenshot({ path: './screenshot-assembled.png', fullPage: false });
  console.log('Screenshot 1 (assembled): saved');
} catch (e) {
  console.log('Navigation error:', e.message);
  await page.screenshot({ path: './screenshot-fallback.png', fullPage: false });
}

await browser.close();
console.log('Done');
