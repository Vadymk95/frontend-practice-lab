import { expect, test } from '@playwright/test';

// Source of truth: the manifest served by the app itself.
// If a category is missing or has a wrong displayName — this test fails.
async function fetchManifest(baseURL: string) {
    const res = await fetch(`${baseURL}/data/manifest.json`);
    return res.json() as Promise<
        { slug: string; displayName: string; counts: { total: number; quiz: number } }[]
    >;
}

// UI renders category display names through i18n (default locale: ru).
// Resolve the same way as useCategoryDisplay: locale key wins, manifest.displayName is fallback.
async function fetchCategoryDisplayMap(baseURL: string): Promise<Record<string, string>> {
    const res = await fetch(`${baseURL}/locales/ru/home.json`);
    const home = (await res.json()) as { categories?: Record<string, { display?: string }> };
    const map: Record<string, string> = {};
    for (const [slug, v] of Object.entries(home.categories ?? {})) {
        if (v?.display) map[slug] = v.display;
    }
    return map;
}

test.describe('Categories — display names', () => {
    test('all categories from manifest are rendered with correct display names', async ({
        page,
        baseURL
    }) => {
        const manifest = await fetchManifest(baseURL!);
        const displayMap = await fetchCategoryDisplayMap(baseURL!);
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        for (const { slug, displayName } of manifest) {
            const name = displayMap[slug] ?? displayName;
            await expect(
                page.locator('[role="checkbox"]').filter({ hasText: name }),
                `Category "${name}" (slug: ${slug}) should be visible`
            ).toBeVisible();
        }
    });

    test('category count in grid matches manifest length', async ({ page, baseURL }) => {
        const manifest = await fetchManifest(baseURL!);
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        const rendered = page.locator('[role="checkbox"]');
        await expect(rendered).toHaveCount(manifest.length);
    });
});

test.describe('Categories — select all', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });
    });

    test('"Select all" button checks all categories', async ({ page, baseURL }) => {
        const manifest = await fetchManifest(baseURL!);
        await page.getByRole('button', { name: /Select all|Выбрать все/i }).click();

        const checked = page.locator('[role="checkbox"][aria-checked="true"]');
        await expect(checked).toHaveCount(manifest.length);
    });

    test('"Deselect all" unchecks all after select all', async ({ page }) => {
        // Select all
        await page.getByRole('button', { name: /Select all|Выбрать все/i }).click();
        // Button label should now be "Deselect all"
        await page.getByRole('button', { name: /Deselect all|Снять все/i }).click();

        const checked = page.locator('[role="checkbox"][aria-checked="true"]');
        await expect(checked).toHaveCount(0);
    });

    test('available question count is shown after select all', async ({ page, baseURL }) => {
        const manifest = await fetchManifest(baseURL!);
        const totalQuestions = manifest.reduce((sum, c) => sum + c.counts.total, 0);

        await page.getByRole('button', { name: /Select all|Выбрать все/i }).click();

        // Count is now reflected in the number input (synced to maxCount, not aria-live)
        await expect(page.locator('input[type="number"]')).toHaveValue(String(totalQuestions));
    });

    test('Start button enables after select all', async ({ page }) => {
        await page.getByRole('button', { name: /Select all|Выбрать все/i }).click();

        const startBtn = page.getByRole('button', { name: /Начать|Start/i }).last();
        await expect(startBtn).toBeEnabled();
    });
});

test.describe('Categories — question access', () => {
    test('each category is individually selectable and enables Start', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        const checkboxes = page.locator('[role="checkbox"]');
        const count = await checkboxes.count();

        // Spot-check first, middle, last category
        const indices = [0, Math.floor(count / 2), count - 1];

        for (const i of indices) {
            const checkbox = checkboxes.nth(i);
            await checkbox.click();
            const startBtn = page.getByRole('button', { name: /Начать|Start/i }).last();
            await expect(
                startBtn,
                `Start should be enabled after selecting category #${i}`
            ).toBeEnabled();
            // Uncheck before next iteration
            await checkbox.click();
        }
    });

    test('session starts and serves questions from selected category', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        // Pick TypeScript (highest question count — reliable)
        const tsCheckbox = page.locator('[role="checkbox"]').filter({ hasText: 'TypeScript' });
        await tsCheckbox.click();

        await page.locator('input[type="number"]').fill('1');
        await page
            .getByRole('button', { name: /Начать|Start/i })
            .last()
            .click();
        await page.waitForURL('**/session/play', { timeout: 8000 });

        // A question card must render
        await expect(page.locator('article h2')).toBeVisible({ timeout: 8000 });
        // Progress indicator: "1 / 1"
        await expect(page.locator('text=/1 \\/ 1/')).toBeVisible();
    });

    test('full flow: select all → start (quiz mode) → answer → summary', async ({
        page,
        baseURL
    }) => {
        const manifest = await fetchManifest(baseURL!);
        const quizTotal = manifest.reduce((sum, c) => sum + c.counts.quiz, 0);

        await page.goto('/');
        await page.waitForSelector('[role="checkbox"]', { timeout: 10000 });

        await page.getByRole('button', { name: /Select all|Выбрать все/i }).click();

        // Force quiz mode so we always get radio buttons (predictable interaction)
        await page.getByRole('radio', { name: /Тест|Quiz/i }).click();

        // Verify input auto-updated to quiz total (synced to maxCount)
        await expect(page.locator('input[type="number"]')).toHaveValue(String(quizTotal));

        // Set count to 1 so test stays fast
        await page.locator('input[type="number"]').fill('1');

        await page
            .getByRole('button', { name: /Начать|Start/i })
            .last()
            .click();
        await page.waitForURL('**/session/play', { timeout: 8000 });

        // Answer the 1 question. Quiz mode mixes single-choice (radio) and
        // multi-choice (checkbox) — manifest's `quiz` count covers both — so
        // the test handles either control.
        await page.waitForSelector('article h2', { timeout: 8000 });
        const checkbox = page.locator('article [role="checkbox"]').first();
        if (await checkbox.isVisible()) {
            await checkbox.click();
            await page.getByRole('button', { name: /Проверить|Check/i }).click();
        } else {
            await page.locator('article [role="radio"]').first().click();
        }
        await page.getByRole('button', { name: /Далее|Next/i }).click();

        await page.waitForURL('**/session/summary', { timeout: 5000 });
        await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeVisible();
    });
});
