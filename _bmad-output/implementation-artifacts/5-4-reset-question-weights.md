# Story 5.4: Reset Question Weights

Status: ready-for-dev

## Story

As an **admin**,
I want to reset adaptive question weights per category or for the entire pool,
so that I can recalibrate the algorithm when the question set changes significantly or I want a fresh start.

## Acceptance Criteria

1. **Given** the user accesses the weight reset option (accessible from home screen settings or summary page)
   **When** "Reset weights for [category]" is selected
   **Then** all question weights for that category are reset to `DEFAULT_WEIGHT: 1.0` via `StorageService.setWeights()`
   **And** error rates for that category are reset to 0
   **And** a confirmation is shown: "Weights reset for [category]"

2. **Given** the user selects "Reset all weights"
   **When** the action is confirmed via a Dialog
   **Then** all question weights and error rates across all categories are reset to defaults
   **And** session records are preserved (not affected by weight reset)

3. **Given** weights are reset
   **When** the next session starts
   **Then** sampling uses default weights (uniform random) for the reset categories

## Tasks / Subtasks

- [ ] Task 1: Create `ResetWeightsDialog` component + hook (AC: #1, #2)
  - [ ] Create `src/components/features/ResetWeightsDialog/ResetWeightsDialog.tsx` — UI only
  - [ ] Create `src/components/features/ResetWeightsDialog/useResetWeightsDialog.ts` — all logic
  - [ ] Create `src/components/features/ResetWeightsDialog/index.ts` — re-export

- [ ] Task 2: Implement `useResetWeightsDialog` logic (AC: #1, #2, #3)
  - [ ] Read `weights` from `useProgressStore.use.weights()`
  - [ ] Read `errorRates` from `useProgressStore.use.errorRates()`
  - [ ] Read `categories` from `useCategories()` for the category list in the dialog
  - [ ] `resetAll()`: call `progressStore.setWeights({})` and `progressStore.setErrorRates({})`
  - [ ] `resetCategory(slug)`: fetch `/data/${slug}.json` to get question IDs, filter weights to remove that category's IDs, call `setWeights(filtered)`, remove `errorRates[slug]`, call `setErrorRates(filtered)`
  - [ ] Expose: `isOpen`, `open()`, `close()`, `resetAll()`, `resetCategory(slug)`, `categories`, `successMessage: string | null`
  - [ ] After any reset: set `successMessage` for 2 seconds, then clear (auto-close dialog)
  - [ ] Write `useResetWeightsDialog.test.ts` (strict TDD — test before implement)

- [ ] Task 3: Build `ResetWeightsDialog` UI (AC: #1, #2)
  - [ ] Use `shadcn/ui Dialog` (`src/components/ui/dialog.tsx`)
  - [ ] "Reset all weights" button → confirm via Dialog → calls `resetAll()`
  - [ ] Category list: each row has "Reset [CategoryName]" button → calls `resetCategory(slug)`
  - [ ] Show `successMessage` inline in dialog after reset (before auto-close)
  - [ ] i18n all strings via `t()` from `common` namespace

- [ ] Task 4: Wire `ResetWeightsDialog` into `AppHeader` (AC: #1)
  - [ ] Add a settings icon button (`SettingsIcon` from `lucide-react`) to `AppHeader.tsx`
  - [ ] Update `useAppHeader.ts` to manage `isResetDialogOpen` state + open/close handlers
  - [ ] Render `<ResetWeightsDialog />` in `AppHeader.tsx` (or just render it in `AppShell`/root and control via store)
  - [ ] Alternative: render `ResetWeightsDialog` in `HomePage` below `SessionConfigurator` as a plain button (simpler, no AppHeader change)

- [ ] Task 5: Add i18n keys (AC: #1, #2)
  - [ ] `public/locales/en/common.json` — add `resetWeights.*` keys
  - [ ] `public/locales/ru/common.json` — same keys in Russian

- [ ] Task 6: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

## Dev Notes

### TDD Required for `useResetWeightsDialog`

Hook has >10 lines of logic → strict TDD applies. Write `useResetWeightsDialog.test.ts` first:

```typescript
// src/components/features/ResetWeightsDialog/useResetWeightsDialog.test.ts
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useResetWeightsDialog', () => {
    it('resetAll clears all weights and errorRates in store', () => { ... });
    it('resetCategory clears only weights for that slug and removes its errorRate', () => { ... });
    it('sets successMessage for 2 seconds after reset, then clears', async () => { ... });
    it('does not affect session records on resetAll', () => { ... });
});
```

Mock `progressStore` via `vi.mock('@/store/progress/progressStore')`. Use `renderWithProviders` from `src/test/test-utils` for QueryClient.

### Existing Store API — DO NOT REINVENT

Both actions are already in `progressStore.ts`. Read the source before implementing:

```typescript
// src/store/progress/progressStore.ts

// setWeights: replaces entire weights record in store + localStorage
progressStore.setWeights(weights: Record<string, number>): void

// setErrorRates: replaces entire errorRates record in store + localStorage
progressStore.setErrorRates(rates: Record<string, number>): void

// records (session records) — NOT affected by weight reset, stored separately
// STORAGE_KEYS: WEIGHTS='ios_weights', ERROR_RATES='ios_error_rates', RECORDS='ios_records'
```

`DEFAULT_WEIGHT = 1.0` from `ALGORITHM_CONFIG` in `src/lib/algorithm/config.ts`. Setting `setWeights({})` = all questions revert to default (the algorithm uses `weights[questionId] ?? DEFAULT_WEIGHT` as fallback).

### Per-Category Weight Reset Strategy

`weights` in the store is `Record<questionId, number>`. To reset weights for a specific category, we need the question IDs that belong to that category. The simplest approach: fetch `public/data/{slug}.json` and extract question IDs.

```typescript
// In useResetWeightsDialog.ts
const resetCategory = async (slug: string) => {
    const res = await fetch(`/data/${slug}.json`);
    const questions: Question[] = CategoryFileSchema.parse(await res.json());
    const questionIds = new Set(questions.map((q) => q.id));

    const newWeights = Object.fromEntries(
        Object.entries(weights).filter(([id]) => !questionIds.has(id))
    );
    const newErrorRates = Object.fromEntries(
        Object.entries(errorRates).filter(([key]) => key !== slug)
    );

    progressStore.setWeights(newWeights);
    progressStore.setErrorRates(newErrorRates);
};
```

The `useCategoryQuestions` hook (`src/hooks/data/useCategoryQuestions.ts`) already does a similar fetch pattern — follow the same `fetch('/data/${slug}.json')` approach.

### No Toast Library — Use Inline Success State

The project has no toast/sonner library. Do NOT install one for this story. Show the confirmation message **inside the Dialog itself** before auto-closing:

```
[Dialog open]
→ user taps "Reset all"
→ dialog body shows: "✓ All weights reset" for 1.5s
→ dialog auto-closes
```

Implement via `successMessage: string | null` state and `setTimeout` in the hook.

### Placement Decision: AppHeader vs HomePage

The AC says "accessible from home screen settings or summary page." Recommended approach: **Add a gear/settings button to `AppHeader`** because it's accessible from any page. `AppHeader.tsx` already has theme toggle + language toggle buttons.

Steps:
1. Import `Settings` from `lucide-react`
2. Add `<button>` with `<Settings size={16} />` to the header button row
3. Add `isResetOpen` state to `useAppHeader.ts` (or use local state in `AppHeader.tsx` since it doesn't cross components)
4. Render `<ResetWeightsDialog open={isResetOpen} onOpenChange={setIsResetOpen} />` in `AppHeader.tsx`

### shadcn/ui Dialog Already Installed

`src/components/ui/dialog.tsx` is available. Import from `@/components/ui/dialog`:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
```

### i18n Keys to Add

**`public/locales/en/common.json`** — add under a new `resetWeights` key:
```json
"resetWeights": {
  "title": "Reset Question Weights",
  "description": "This recalibrates the adaptive algorithm. Session records are not affected.",
  "resetAll": "Reset all weights",
  "resetAllConfirm": "This will reset weights and error rates for ALL categories.",
  "resetCategory": "Reset {{category}}",
  "successAll": "All weights reset",
  "successCategory": "Weights reset for {{category}}",
  "cancel": "Cancel"
}
```

**`public/locales/ru/common.json`** — same keys in Russian.

### Component Folder Structure

```
src/components/features/ResetWeightsDialog/
  ResetWeightsDialog.tsx        ← UI only, uses useResetWeightsDialog
  useResetWeightsDialog.ts      ← all logic, async resetCategory
  useResetWeightsDialog.test.ts ← TDD tests (write first)
  index.ts                      ← named re-export
```

### Architecture Compliance Checklist

- React 19: no `forwardRef`, pass `ref` as regular prop if needed
- Tailwind v4: no `tailwind.config.ts`, utility classes only
- `@/` alias for all imports
- Hook: arrow function. Component: named function declaration
- `useProgressStore.use.weights()` / `useProgressStore.use.errorRates()` selector pattern
- No logic >10 lines in JSX
- All user-visible strings through `t()` — namespace `'common'`

### References

- `src/store/progress/progressStore.ts` — `setWeights`, `setErrorRates` actions
- `src/lib/algorithm/config.ts` — `ALGORITHM_CONFIG.DEFAULT_WEIGHT = 1.0`
- `src/lib/storage/LocalStorageService.ts` — storage keys: `ios_weights`, `ios_error_rates`
- `src/hooks/data/useCategoryQuestions.ts` — pattern for fetching category JSON
- `src/hooks/data/useCategories.ts` — returns `ManifestEntry[]` for category list in dialog
- `src/components/ui/dialog.tsx` — shadcn Dialog (already installed)
- `src/components/layout/AppHeader/AppHeader.tsx` — integration point
- Story 4.6 (`4-6-algorithm-transparency-widget.md`) — established `useProgressStore.use.errorRates()` pattern
- `src/test/test-utils.tsx` — `renderWithProviders` for hook/component tests

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
