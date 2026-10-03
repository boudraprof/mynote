import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/main-app-global-setup.ts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'main-app-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        storageState: 'e2e/.auth/main-user.json',
      },
    },
    {
      name: 'main-app-firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:3000',
        storageState: 'e2e/.auth/main-user.json',
      },
    },
    {
      name: 'main-app-webkit',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:3000',
        storageState: 'e2e/.auth/main-user.json',
      },
    },
    {
      name: 'main-app-mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:3000',
        storageState: 'e2e/.auth/main-user.json',
      },
    },
    {
      name: 'main-app-mobile-safari',
      use: {
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:3000',
        storageState: 'e2e/.auth/main-user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: '.',
  },
})
