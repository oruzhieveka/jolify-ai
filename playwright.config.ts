import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against a production build in DEMO MODE (in-memory data, rules planner,
 * demo sign-in). They need no Supabase or Anthropic credentials.
 * Set E2E_BASE_URL to test an already running/deployed instance instead.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? 'http:' + '//localhost:' + PORT;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // flows share one in-memory demo store
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'en-US' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run build && npx next start -p ' + PORT,
    url: baseURL + '/api/health',
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { DEMO_MODE: 'true', NEXT_PUBLIC_SUPABASE_URL: '', ANTHROPIC_API_KEY: '', NEXT_PUBLIC_SITE_URL: baseURL },
  },
});
