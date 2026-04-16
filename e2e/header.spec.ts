import { expect, test } from '@playwright/test';

test.describe('Header controls', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('theme toggle switches dark/light class on html element', async ({ page }) => {
        const html = page.locator('html');
        const initialClass = await html.getAttribute('class');
        const isDark = initialClass?.includes('dark');

        const themeBtn = page.getByRole('button', {
            name: /Switch to|Переключить на/i
        });
        await themeBtn.click();

        const newClass = await html.getAttribute('class');
        if (isDark) {
            expect(newClass).not.toContain('dark');
        } else {
            expect(newClass).toContain('dark');
        }
    });

    test('theme toggle persists on reload', async ({ page }) => {
        const html = page.locator('html');
        const initialClass = await html.getAttribute('class');
        const isDark = initialClass?.includes('dark');

        await page.getByRole('button', { name: /Switch to|Переключить на/i }).click();

        await page.reload();
        const newClass = await html.getAttribute('class');
        if (isDark) {
            expect(newClass).not.toContain('dark');
        } else {
            expect(newClass).toContain('dark');
        }
    });

    test('language toggle switches button label between EN and RU', async ({ page }) => {
        const langBtn = page.getByRole('button', { name: /Toggle language|Переключить язык/i });

        // Default is Russian — button shows EN (to switch to English)
        await expect(langBtn).toContainText(/EN|RU/);
        const initialText = await langBtn.textContent();

        await langBtn.click();

        const newText = await langBtn.textContent();
        expect(newText).not.toBe(initialText);
    });

    test('language toggle persists on reload', async ({ page }) => {
        const langBtn = page.getByRole('button', { name: /Toggle language|Переключить язык/i });
        const initialText = await langBtn.textContent();

        await langBtn.click();
        await page.reload();

        const newBtn = page.getByRole('button', { name: /Toggle language|Переключить язык/i });
        const persistedText = await newBtn.textContent();
        expect(persistedText).not.toBe(initialText);
    });
});
