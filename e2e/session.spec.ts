import { expect, test } from '@playwright/test';

/** Start a 1-question session: React category, difficulty=easy, mode=quiz, count=1.
 *  React has no easy multi-choice questions — combined with easy+quiz this
 *  guarantees a single-choice question, so [role="radio"] assertions are stable. */
async function startMinSession(page: import('@playwright/test').Page) {
    await page.goto('/');
    // Wait for categories to load before clicking
    await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });
    await page.getByRole('checkbox', { name: 'React' }).click();
    // Set difficulty to easy (guarantees only easy questions)
    await page.getByRole('radio', { name: /Лёгкий|Easy/i }).click();
    // Set mode to quiz (filters to single-choice + multi-choice; React has 0 easy multi-choice → single-choice only)
    await page.getByRole('radio', { name: /Тест|Quiz/i }).click();
    await page.locator('input[type="number"]').fill('1');
    await page
        .getByRole('button', { name: /Начать|Start/i })
        .last()
        .click();
    await page.waitForURL('**/session/play');
}

/** Wait for question to fully render (progress text + answer options) */
async function waitForQuestion(page: import('@playwright/test').Page) {
    // Wait for the question heading inside the question card article
    await page.waitForSelector('article h2', { timeout: 8000 });
    // Wait for radio options — guaranteed by startMinSession using easy+quiz mode
    await page.locator('[role="radiogroup"]').waitFor({ timeout: 5000 });
}

/** Answer the current single-choice question and return after clicking Next */
async function answerAndNext(page: import('@playwright/test').Page) {
    await waitForQuestion(page);
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: /Далее|Next/i }).click();
}

test.describe('Session flow', () => {
    test('navigates to /session/play after starting a session', async ({ page }) => {
        await page.goto('/');
        await page.locator('[role="checkbox"]').first().click();
        await page
            .getByRole('button', { name: /Начать|Start/i })
            .last()
            .click();

        await page.waitForURL('**/session/play');
        expect(page.url()).toContain('/session/play');
    });

    test('session play page renders a question card with progress and options', async ({
        page
    }) => {
        await startMinSession(page);
        await waitForQuestion(page);

        // Question progress indicator: "N / N"
        await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeVisible();
        // At least 2 answer option buttons
        const options = page.locator('[role="radio"]');
        await expect(options).toHaveCount(4); // javascript questions have 4 options
    });

    test('Next button appears after selecting a single-choice answer', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);

        await page.locator('[role="radio"]').first().click();

        const nextBtn = page.getByRole('button', { name: /Далее|Next/i });
        await expect(nextBtn).toBeVisible({ timeout: 3000 });
    });

    test('Back button appears after answering a question', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);

        await page.locator('[role="radio"]').first().click();

        const backBtn = page.getByRole('button', { name: /Назад|Back/i });
        await expect(backBtn).toBeVisible({ timeout: 3000 });
    });

    test('completing 1-question session navigates to /session/summary', async ({ page }) => {
        await startMinSession(page);
        await answerAndNext(page);

        await page.waitForURL('**/session/summary', { timeout: 5000 });
        expect(page.url()).toContain('/session/summary');
    });

    test('summary page shows score display after completing session', async ({ page }) => {
        await startMinSession(page);
        await answerAndNext(page);

        await page.waitForURL('**/session/summary', { timeout: 5000 });

        // Score: "N / N" pattern
        await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeVisible();
    });

    test('Home button on summary navigates back to /', async ({ page }) => {
        await startMinSession(page);
        await answerAndNext(page);

        await page.waitForURL('**/session/summary', { timeout: 5000 });

        await page.getByRole('button', { name: /Домой|Home/i }).click();
        await page.waitForURL('http://localhost:3000/');
        expect(page.url()).toBe('http://localhost:3000/');
    });
});

test.describe('Summary page guard', () => {
    test('direct navigation to /session/summary without session redirects home', async ({
        page
    }) => {
        await page.goto('/session/summary');
        await page.waitForURL('http://localhost:3000/', { timeout: 3000 });
        expect(page.url()).toBe('http://localhost:3000/');
    });
});
