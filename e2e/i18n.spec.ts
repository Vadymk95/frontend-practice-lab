import { expect, test } from '@playwright/test';

/** Click the language toggle in the header */
async function toggleLanguage(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: /Toggle language|Переключить язык/i }).click();
}

test.describe('i18n — UI chrome switches between RU and EN', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for categories to load so i18n namespace is ready
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });
    });

    test('default locale is Russian — configurator shows RU labels', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Категории' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Выбрать все' })).toBeVisible();
        // Russian-only category display name (divergent from English)
        await expect(page.getByRole('checkbox', { name: /Архитектура/ })).toBeVisible();
    });

    test('toggling to EN swaps configurator labels and category display names', async ({
        page
    }) => {
        await toggleLanguage(page);

        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Select all' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: /Architecture/ })).toBeVisible();
        // RU-only name must be gone
        await expect(page.getByRole('checkbox', { name: 'Архитектура' })).toHaveCount(0);
    });

    test('toggling back to RU restores Russian labels', async ({ page }) => {
        await toggleLanguage(page);
        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();

        await toggleLanguage(page);
        await expect(page.getByRole('heading', { name: 'Категории' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: /Архитектура/ })).toBeVisible();
    });

    test('language choice persists across reload', async ({ page }) => {
        await toggleLanguage(page);
        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();

        await page.reload();
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: /Architecture/ })).toBeVisible();
    });
});

test.describe('i18n — question content switches between RU and EN', () => {
    test('question prompt changes alphabet when language is toggled mid-flow', async ({ page }) => {
        // Start a session in RU with the architecture category (has distinct RU/EN data)
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        // Ensure we're in RU (default, but be explicit — earlier specs may have left state)
        const langBtn = page.getByRole('button', { name: /Toggle language|Переключить язык/i });
        const langLabel = await langBtn.textContent();
        // Button shows the TARGET language (EN when currently RU, RU when currently EN)
        if (!langLabel?.toUpperCase().includes('EN')) {
            await langBtn.click();
        }

        await page.getByRole('checkbox', { name: /Архитектура/ }).click();
        await page.getByRole('radio', { name: /Лёгкий/i }).click();
        await page.getByRole('radio', { name: /Тест|Quiz/i }).click();
        await page.locator('input[type="number"]').fill('1');
        await page
            .getByRole('button', { name: /Начать/i })
            .last()
            .click();
        await page.waitForURL('**/session/play');

        // Capture Russian question text
        const questionHeading = page.locator('article h2');
        await expect(questionHeading).toBeVisible({ timeout: 8000 });
        const ruText = (await questionHeading.textContent()) ?? '';
        expect(ruText).toMatch(/[а-яА-ЯёЁ]/); // contains Cyrillic

        // Toggle to EN — same question, English text
        await toggleLanguage(page);
        await expect(questionHeading).toBeVisible();
        const enText = (await questionHeading.textContent()) ?? '';
        expect(enText).not.toBe(ruText);
        // English prompt should not contain Cyrillic
        expect(enText).not.toMatch(/[а-яА-ЯёЁ]/);
    });
});
