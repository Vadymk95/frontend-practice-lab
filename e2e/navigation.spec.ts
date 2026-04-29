import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
    test('unknown route shows 404 page', async ({ page }) => {
        await page.goto('/this-route-does-not-exist');
        await expect(page.locator('main')).not.toBeEmpty();
        expect(page.url()).toContain('/this-route-does-not-exist');
    });

    test('skip-to-content link exists in the DOM', async ({ page }) => {
        await page.goto('/');
        const skipLink = page.locator('a[href="#main-content"]');
        await expect(skipLink).toHaveCount(1);
        await expect(skipLink).toBeAttached();
    });

    test('main content area has id="main-content" for skip link', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#main-content')).toBeVisible();
    });

    test('skip-to-content link is visible when focused', async ({ page }) => {
        await page.goto('/');
        const skipLink = page.locator('a[href="#main-content"]');
        // Focus the link directly. Tab-key simulation is unreliable across
        // mobile emulations (iPhone 14 has no hardware keyboard concept of
        // "next focusable"), so we trigger focus via the locator instead.
        await skipLink.focus();
        // When focused it becomes visible (focus:not-sr-only).
        await expect(skipLink).toBeInViewport();
    });
});
