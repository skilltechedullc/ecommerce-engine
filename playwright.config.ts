import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: 'list',
})
