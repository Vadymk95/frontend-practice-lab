import { expect, test } from '@playwright/test';

/** Dispatch a synthetic beforeinstallprompt event into the page after React mounts */
async function dispatchInstallPrompt(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
        const event = new Event('beforeinstallprompt', { bubbles: true }) as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
        };
        event.preventDefault = () => {};
        event.prompt = async () => {};
        event.userChoice = Promise.resolve({ outcome: 'dismissed' });
        window.dispatchEvent(event);
    });
}

/** Complete a 1-question session and arrive at /session/summary.
 *  PWA tests care only about the toast on /session/summary, not the answer
 *  flow. We force mode = "Quiz" so the random first question is single- or
 *  multi-choice — those types show "Next" immediately after Skip. Without
 *  this constraint the helper flaked whenever the random seed produced a
 *  bug-finding question, whose post-skip flow currently leaves the user
 *  with no visible Next/self-assess button (separate product issue, see
 *  isBugFindingPendingSelfAssess in useSessionPlayPage).
 */
async function completeMiniSession(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });
    await page.locator('[role="checkbox"]').first().click();
    // Pin mode to Quiz so Skip → Next works deterministically across types
    await page.getByRole('radio', { name: /^Тест$|^Quiz$/i }).click();
    await page.locator('input[type="number"]').fill('1');
    await page
        .getByRole('button', { name: /Начать|Start/i })
        .last()
        .click();
    await page.waitForURL('**/session/play');
    await page.waitForSelector('article h2', { timeout: 8000 });
    await page.getByRole('button', { name: /Пропустить|Skip/i }).click();
    const nextBtn = page.getByRole('button', { name: /Далее|Next/i });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await nextBtn.click();
    await page.waitForURL('**/session/summary', { timeout: 5000 });
}

test.describe('PWA — install toast', () => {
    test('toast is not visible on home page without beforeinstallprompt', async ({ page }) => {
        await page.goto('/');
        // beforeinstallprompt not fired — toast must be absent
        const toast = page.locator('[role="dialog"]');
        await expect(toast).toHaveCount(0);
    });

    test('toast does not show on session/play page even with prompt event', async ({ page }) => {
        await page.goto('/');
        await page.locator('[role="checkbox"]').first().click();
        await page.locator('input[type="number"]').fill('1');
        await page
            .getByRole('button', { name: /Начать|Start/i })
            .last()
            .click();
        await page.waitForURL('**/session/play');

        await dispatchInstallPrompt(page);

        // Still on /session/play — toast must NOT appear here
        const toast = page.locator('[role="dialog"]');
        await expect(toast).toHaveCount(0);
    });

    test('toast appears on /session/summary after beforeinstallprompt fires', async ({ page }) => {
        await completeMiniSession(page);

        // Dispatch the prompt AFTER arriving on summary
        await dispatchInstallPrompt(page);

        const toast = page.locator('[role="dialog"]');
        await expect(toast).toBeVisible({ timeout: 2000 });
        await expect(toast).toContainText(/InterviewOS/i);
    });

    test('Dismiss button hides the toast', async ({ page }) => {
        await completeMiniSession(page);
        await dispatchInstallPrompt(page);

        const toast = page.locator('[role="dialog"]');
        await expect(toast).toBeVisible({ timeout: 2000 });

        await page.getByRole('button', { name: /Закрыть|Dismiss/i }).click();
        await expect(toast).toHaveCount(0);
    });

    test('toast does not reappear after dismiss (sessionStorage flag)', async ({ page }) => {
        await completeMiniSession(page);
        await dispatchInstallPrompt(page);

        const toast = page.locator('[role="dialog"]');
        await expect(toast).toBeVisible({ timeout: 2000 });
        await page.getByRole('button', { name: /Закрыть|Dismiss/i }).click();
        await expect(toast).toHaveCount(0);

        // Dispatch prompt again — should not reappear
        await dispatchInstallPrompt(page);
        await page.waitForTimeout(300);
        await expect(toast).toHaveCount(0);
    });
});
