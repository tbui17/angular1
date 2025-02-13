import { devices, PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'Google Chrome',
      use: {
        channel: 'chrome',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // {
    //   name: 'Safari',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },
  ],
};

export default config;
