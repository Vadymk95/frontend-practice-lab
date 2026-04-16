import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        // App defaults to Russian — keep it consistent in tests
        locale: 'ru-RU'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'iPhone 14',
            use: { ...devices['iPhone 14'] }
        }
    ],
    webServer: {
        command: 'npm run dev:nolint',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30000
    }
});
