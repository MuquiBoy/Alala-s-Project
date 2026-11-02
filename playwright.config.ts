import { defineConfig } from '@playwright/test';

const publicServer = process.env.ALALAS_TEST_URL;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 12000 },
  reporter: [['list']],
  use: {
    channel: 'chrome',
    headless: true,
    baseURL: publicServer ?? 'http://127.0.0.1:4179',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: publicServer ? undefined : {
    command: 'node server-dist/server.mjs',
    url: 'http://127.0.0.1:4179/__alalas/status',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
