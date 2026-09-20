import { expect, test } from '@playwright/test';

test.describe('Header controls', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('theme toggle switches dark/light class on html element', async ({ page }) => {
        const html = page.locator('html');
        const initialClass = (await html.getAttribute('class')) ?? '';
        const isDark = initialClass.includes('dark');

        const themeBtn = page.getByRole('button', {
            name: /Switch to (light|dark) mode|Переключить на (светлую|тёмную) тему/i
        });
        await themeBtn.click();

        const newClass = (await html.getAttribute('class')) ?? '';
        if (isDark) {
            expect(newClass).not.toContain('dark');
        } else {
            expect(newClass).toContain('dark');
        }
    });

    test('theme toggle persists on reload', async ({ page }) => {
        const html = page.locator('html');
        const initialClass = (await html.getAttribute('class')) ?? '';
        const isDark = initialClass.includes('dark');

        await page
            .getByRole('button', {
                name: /Switch to (light|dark) mode|Переключить на (светлую|тёмную) тему/i
            })
            .click();

        await page.reload();
        const newClass = (await html.getAttribute('class')) ?? '';
        if (isDark) {
            expect(newClass).not.toContain('dark');
        } else {
            expect(newClass).toContain('dark');
        }
    });

    test('language toggle shows current code (EN/RU) and flips on click', async ({ page }) => {
        const langBtn = page.getByRole('button', {
            name: /Switch to (English|Russian)|Переключить на (английский|русский)/i
        });

        // Default is Russian — button shows RU (the current language)
        await expect(langBtn).toContainText(/EN|RU/);
        const initialText = (await langBtn.textContent())?.trim() ?? '';

        await langBtn.click();

        // The label follows i18next's languageChanged event, which fires after the new bundle
        // has loaded — a web-first assertion waits for it instead of reading the DOM at once.
        await expect(langBtn).not.toHaveText(initialText);
    });

    test('language toggle persists on reload', async ({ page }) => {
        const langBtn = page.getByRole('button', {
            name: /Switch to (English|Russian)|Переключить на (английский|русский)/i
        });
        const initialText = await langBtn.textContent();

        await langBtn.click();
        await page.reload();

        const newBtn = page.getByRole('button', {
            name: /Switch to (English|Russian)|Переключить на (английский|русский)/i
        });
        const persistedText = await newBtn.textContent();
        expect(persistedText).not.toBe(initialText);
    });
});
