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
            // The iPhone 14 descriptor (viewport, touch, UA) on Chromium rather than WebKit, so
            // the mobile layout runs locally and on CI with the one browser both install.
            // WebKit itself is not what these specs guard; the layout at 390px is.
            name: 'mobile-chromium',
            use: { ...devices['iPhone 14'], browserName: 'chromium' }
        }
    ],
    webServer: {
        command: 'npm run dev:nolint',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30000
    }
});
