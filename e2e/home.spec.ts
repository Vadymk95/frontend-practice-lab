import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('renders app brand and header controls', async ({ page }) => {
        await expect(page.getByText('InterviewOS')).toBeVisible();
        await expect(
            page.getByRole('button', { name: /Toggle language|Переключить язык/i })
        ).toBeVisible();
        await expect(page.getByRole('button', { name: /Switch to|Переключить на/i })).toBeVisible();
    });

    test('shows SessionConfigurator with category buttons', async ({ page }) => {
        // Categories section heading
        await expect(page.getByText(/Категории|Categories/i).first()).toBeVisible();
        // At least one category checkbox exists
        const categories = page.locator('[role="checkbox"]');
        await expect(categories.first()).toBeVisible();
    });

    test('Start button is disabled when no category selected', async ({ page }) => {
        // Desktop start button
        const startBtn = page.getByRole('button', { name: /Начать|Start/i }).last();
        await expect(startBtn).toBeDisabled();
    });

    test('Start button enables after selecting a category', async ({ page }) => {
        const firstCategory = page.locator('[role="checkbox"]').first();
        await firstCategory.click();

        const startBtn = page.getByRole('button', { name: /Начать|Start/i }).last();
        await expect(startBtn).toBeEnabled();
    });

    test('shows available question count after selecting category', async ({ page }) => {
        const firstCategory = page.locator('[role="checkbox"]').first();
        await firstCategory.click();

        const hint = page.locator('[aria-live="polite"]');
        await expect(hint).toContainText(/вопрос|questions?/i);
    });
});
