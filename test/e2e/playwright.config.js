import { defineConfig, devices } from 'playwright/test';

/**
 * E2E 配置
 * - 复用根已安装的 playwright（playwright/test 入口）
 * - --list 只做用例发现，不启动 webServer
 */
export default defineConfig({
  testDir: '.',
  timeout: 90000,
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    navigationTimeout: 60000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      timeout: 60000,
      env: {
        DB_NAME: process.env.E2E_DB_NAME || 'ac4_test',
        NODE_ENV: 'production',
      },
    },
  ],
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-320',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'no-webgl',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--disable-webgl'] },
      },
    },
  ],
});