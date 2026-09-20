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

/** Wait for question to fully render (progress text + answer options).
 *  The play page is lazy-loaded: with six parallel workers against one Vite dev server the first
 *  transform of that chunk can take well over 8 s, which made 3 of 80 runs flake locally. */
async function waitForQuestion(page: import('@playwright/test').Page) {
    await page.waitForSelector('article h2', { timeout: 20000 });
    // Wait for radio options — guaranteed by startMinSession using easy+quiz mode
    await page.locator('[role="radiogroup"]').waitFor({ timeout: 10000 });
}

/** The advance control. On the last question it names the results rather than the next question. */
function advanceButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: /Далее|Next|К результатам|Show results/i });
}

/** Answer the current single-choice question and return after advancing */
async function answerAndNext(page: import('@playwright/test').Page) {
    await waitForQuestion(page);
    await page.locator('[role="radio"]').first().click();
    await advanceButton(page).click();
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

    test('advance control names the results on the last question', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);

        await page.locator('[role="radio"]').first().click();

        await expect(page.getByRole('button', { name: /К результатам|Show results/i })).toBeVisible(
            { timeout: 3000 }
        );
        await expect(page.getByRole('button', { name: /^Далее$|^Next$/i })).toHaveCount(0);
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

test.describe('Leaving a live session', () => {
    test('ending an answered session lands on the results', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);
        await page.locator('[role="radio"]').first().click();

        await page.getByRole('button', { name: /Завершить|End session/i }).click();
        await page
            .getByRole('dialog')
            .getByRole('button', { name: /Завершить|End session/i })
            .click();

        await page.waitForURL('**/session/summary', { timeout: 5000 });
        await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeVisible();
    });

    test('browser Back asks before abandoning a live session', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);
        await page.locator('[role="radio"]').first().click();

        await page.goBack();

        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        expect(page.url()).toContain('/session/play');
    });

    test('dismissing that confirmation keeps the user on the question', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);
        await page.locator('[role="radio"]').first().click();

        await page.goBack();
        await page
            .getByRole('dialog')
            .getByRole('button', { name: /Продолжить|Continue session/i })
            .click();

        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(page.url()).toContain('/session/play');
    });
});

test.describe('Phone tap targets', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    /** Laid-out height of a control, in CSS px. offsetHeight ignores the dialog's
     *  open animation, which scales its content and made a settled 44px measure as 41.8. */
    function tapHeight(control: import('@playwright/test').Locator) {
        return control.evaluate((el: HTMLElement) => el.offsetHeight);
    }

    function button(page: import('@playwright/test').Page, name: RegExp) {
        return page.getByRole('button', { name });
    }

    test('session controls clear the 44px minimum', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);

        expect(await tapHeight(button(page, /Завершить|End session/i))).toBeGreaterThanOrEqual(44);

        await page.locator('[role="radio"]').first().click();
        expect(await tapHeight(button(page, /К результатам|Show results/i))).toBeGreaterThanOrEqual(
            44
        );
    });

    test('end-session dialog buttons clear the 44px minimum', async ({ page }) => {
        await startMinSession(page);
        await waitForQuestion(page);
        await page.getByRole('button', { name: /Завершить|End session/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const confirm = dialog.getByRole('button', { name: /Завершить|End session/i });
        const cancel = dialog.getByRole('button', { name: /Продолжить|Continue session/i });

        expect(await tapHeight(confirm)).toBeGreaterThanOrEqual(44);
        expect(await tapHeight(cancel)).toBeGreaterThanOrEqual(44);
    });

    test('summary actions clear the 44px minimum', async ({ page }) => {
        await startMinSession(page);
        await answerAndNext(page);
        await page.waitForURL('**/session/summary', { timeout: 5000 });

        expect(await tapHeight(button(page, /Домой|Home/i))).toBeGreaterThanOrEqual(44);
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
