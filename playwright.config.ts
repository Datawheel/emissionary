import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3210',
    browserName: 'chromium',
    viewport: { width: 375, height: 667 }, // spec §14 reference viewport
    hasTouch: true,
    isMobile: true,
  },
  webServer: {
    command: 'npx next start -p 3210',
    url: 'http://localhost:3210',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
