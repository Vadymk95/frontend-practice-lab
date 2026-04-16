import type { Page } from '@playwright/test';

/** Select a category by its button text or aria-checked toggle */
export async function selectCategory(page: Page, categoryName: string) {
    const btn = page.locator(`[role="checkbox"]`).filter({ hasText: categoryName });
    await btn.click();
}

/** Click the Start session button (desktop inline or mobile sticky) */
export async function clickStart(page: Page) {
    // Try desktop button first, fallback to mobile
    const desktopStart = page.locator('.hidden.lg\\:flex button:not([disabled])').last();
    const mobileStart = page.locator('.fixed.bottom-0 button:not([disabled])').last();

    const desktop = await desktopStart.count();
    if (desktop > 0) {
        await desktopStart.click();
    } else {
        await mobileStart.click();
    }
}

/** Answer current single-choice question (click "Понял" / "Не угадал") */
export async function revealAndNext(page: Page) {
    // For single-choice: click any option to reveal
    const option = page.locator('[role="radio"]').first();
    if (await option.count()) {
        await option.click();
    }
    // Click "Далее" (Next)
    const nextBtn = page.getByRole('button', { name: /Далее|Next/i });
    await nextBtn.click();
}
