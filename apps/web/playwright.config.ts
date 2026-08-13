import {defineConfig, devices} from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      BOSS_SCHEMA: 'boss_e2e',
      LLM_PROVIDER: 'mock',
      TTS_PROVIDER: 'mock',
    },
  },
});
