import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 8799);
const baseUrl = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: baseUrl,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: `bash -lc "source venv/bin/activate && mkdir -p test-results && ANTHROPIC_API_KEY=e2e OPENAI_API_KEY=e2e XAI_API_KEY=e2e GEMINI_API_KEY=e2e SUPABASE_URL=https://e2e.supabase.local SUPABASE_ANON_KEY=e2e-anon SUPABASE_SERVICE_ROLE_KEY=e2e-service DOMAIN=example.com DATABASE_URL=sqlite:///test-results/confab-e2e.db uvicorn confab.server:app --host 127.0.0.1 --port ${port}"`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
