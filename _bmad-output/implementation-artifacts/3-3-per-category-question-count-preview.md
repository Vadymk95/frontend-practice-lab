# Story 3.3: Per-Category Question Count Preview

Status: done

## Story

As a **user**,
I want to see the available question count per category and difficulty breakdown before starting,
So that I can make informed filter choices without guessing how many questions I'll get.

## Acceptance Criteria

1. **Given** the user is on the SessionConfigurator
   **When** they view the category grid
   **Then** each category chip shows its total available question count
   **And** on interaction (hover/tap), a breakdown by difficulty is shown (easy N / medium N / hard N)
   **And** this data comes from `public/data/manifest.json` already loaded by `useCategories()` on the home screen — no additional fetch, no full JSON loading required

2. **Given** the user applies difficulty or mode filters
   **When** the live count updates
   **Then** the per-category breakdown also reflects the active filters
   **And** categories with 0 matching questions are visually dimmed but remain selectable

## Tasks / Subtasks

- [x] Task 1: Install shadcn/ui Tooltip component (AC: #1)
  - [x] Run `npx shadcn@latest add tooltip` from project root
  - [x] Verify `src/components/ui/tooltip.tsx` is created

- [x] Task 2: Compute per-category filtered counts in `useSessionConfigurator` (AC: #1, #2)
  - [x] Modify `src/components/features/SessionConfigurator/useSessionConfigurator.ts`
  - [x] Add `getFilteredCategoryCount(cat: ManifestEntry, difficulty: Difficulty, mode: Mode): number` — pure function (can be co-located or in utils)
  - [x] Expose `categoryCountMap: Record<string, number>` from the hook — maps `slug → filteredCount` for the current difficulty+mode selection
  - [x] `categoryCountMap` uses `useMemo` with `[categories, deferredDifficulty, deferredMode]` deps — non-blocking like existing `availableCount`

- [x] Task 3: Update category chip in `SessionConfigurator.tsx` to show count badge and tooltip (AC: #1, #2)
  - [x] Modify `src/components/features/SessionConfigurator/SessionConfigurator.tsx`
  - [x] Each category chip: add count badge (`categoryCountMap[cat.slug] ?? 0`) inside the chip
  - [x] Wrap each category chip with `<TooltipProvider><Tooltip>` to show difficulty breakdown on hover/tap
  - [x] Tooltip content: `easy: N / medium: N / hard: N` from `cat.counts` (always the raw unfiltered per-difficulty counts — same data, different view)
  - [x] When `categoryCountMap[cat.slug] === 0`: apply `opacity-50` class to the chip (remains selectable per AC)

- [x] Task 4: Add i18n keys (AC: #1)
  - [x] `public/locales/en/home.json` — add `categories.countBreakdown` with `easy`, `medium`, `hard` labels
  - [x] `public/locales/ru/home.json` — same keys in Russian

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `ManifestEntry` Already Has All Needed Data

`src/hooks/data/useCategories.ts` defines:
```typescript
export interface ManifestEntry {
  slug: string;
  displayName: string;
  counts: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    quiz: number;
    bugFinding: number;
    codeCompletion: number;
  };
}
```

No additional fetch needed — `useCategories()` is already called in `useSessionConfigurator` and the data is cached by TanStack Query (`staleTime: Infinity`).

### `getFilteredCategoryCount` Logic

Same proportional estimation already used in `computeAvailableCount()` (in `useSessionConfigurator.ts`):

```typescript
function getFilteredCategoryCount(
  cat: ManifestEntry,
  difficulty: Difficulty,
  mode: Mode
): number {
  let diffCount: number;
  if (difficulty === 'all') {
    diffCount = cat.counts.total;
  } else {
    diffCount = cat.counts[difficulty];
  }

  if (mode === 'all') return diffCount;

  const modeTotal =
    mode === 'quiz'
      ? cat.counts.quiz
      : mode === 'bug-finding'
        ? cat.counts.bugFinding
        : cat.counts.codeCompletion;

  if (cat.counts.total === 0) return 0;
  return Math.round(diffCount * (modeTotal / cat.counts.total));
}
```

This is the same pattern as `computeAvailableCount` — reuse or extract into a shared util to avoid duplication.

### Hook Change in `useSessionConfigurator`

Add `categoryCountMap` alongside existing `availableCount`:
```typescript
const categoryCountMap = useMemo(
  () =>
    Object.fromEntries(
      categories.map(cat => [
        cat.slug,
        getFilteredCategoryCount(cat, deferredDifficulty, deferredMode),
      ])
    ),
  [categories, deferredDifficulty, deferredMode]
);

// Return it:
return {
  ...existing,
  categoryCountMap,
};
```

### Tooltip Implementation

After installing `npx shadcn@latest add tooltip`, use:
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Wrap each category chip:
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        className={cn(
          'px-3 py-1.5 rounded-md border text-sm ...',
          categoryCountMap[cat.slug] === 0 && 'opacity-50'
        )}
        onClick={() => handleCategoryToggle(cat.slug)}
      >
        {cat.displayName}
        <span className="ml-1.5 text-xs text-muted-foreground">
          {categoryCountMap[cat.slug] ?? 0}
        </span>
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{t('categories.countBreakdown.easy', { count: cat.counts.easy })}</p>
      <p>{t('categories.countBreakdown.medium', { count: cat.counts.medium })}</p>
      <p>{t('categories.countBreakdown.hard', { count: cat.counts.hard })}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Note on `TooltipProvider`**: shadcn/ui recommends wrapping the entire app or a section in a single `TooltipProvider`. Consider wrapping the category grid in one provider rather than each chip separately.

### i18n Keys

**`public/locales/en/home.json`** — add to `configurator.categories`:
```json
"countBreakdown": {
  "easy": "Easy: {{count}}",
  "medium": "Medium: {{count}}",
  "hard": "Hard: {{count}}"
}
```

**`public/locales/ru/home.json`** — add same:
```json
"countBreakdown": {
  "easy": "Лёгких: {{count}}",
  "medium": "Средних: {{count}}",
  "hard": "Сложных: {{count}}"
}
```

### File Structure

```
src/components/ui/tooltip.tsx                  ← NEW (via shadcn add tooltip)
src/components/features/SessionConfigurator/useSessionConfigurator.ts ← MODIFY
src/components/features/SessionConfigurator/SessionConfigurator.tsx   ← MODIFY
public/locales/en/home.json                    ← MODIFY
public/locales/ru/home.json                    ← MODIFY
```

### Testing

`computeAvailableCount` already has tests (from Stories 1.x). Add tests for `getFilteredCategoryCount` if extracted as a named export.

---

## Previous Story Intelligence

### From Story 3.1–3.2

- `useCategories()` uses TanStack Query with `staleTime: Infinity` — data is loaded once and cached; no re-fetch overhead
- `computeAvailableCount` already in `useSessionConfigurator.ts` — reuse its per-category logic to avoid duplication
- `deferredDifficulty` and `deferredMode` are already computed via `useDeferredValue` — use them for `categoryCountMap` to avoid blocking

---

## Architecture Compliance

- **No new fetch** — reuse TanStack Query cache from `useCategories()`
- **`useDeferredValue`** — use existing deferred values for non-blocking count updates
- **`@/` alias only** — no relative imports
- **Tailwind v4** — `opacity-50` for dimmed categories, existing design tokens

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `useCategories()` hook: `src/hooks/data/useCategories.ts`
- `computeAvailableCount`: `src/components/features/SessionConfigurator/useSessionConfigurator.ts`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation straightforward.

### Completion Notes List

- Extracted `getFilteredCategoryCount` from `computeAvailableCount` as named export; refactored `computeAvailableCount` to reuse it (no logic change).
- Added `categoryCountMap` to `useSessionConfigurator` using `useMemo` with `[categories, deferredDifficulty, deferredMode]` deps — non-blocking.
- Category grid wrapped in single `<TooltipProvider>`; each chip uses `<Tooltip>` + count badge + `opacity-50` when count=0.
- i18n keys added to `configurator.categories.countBreakdown` in both en/ru locales.
- shadcn/ui import order lint error in generated `tooltip.tsx` fixed with `eslint --fix`.
- Added 5 tests for `getFilteredCategoryCount` + 1 test for `categoryCountMap` hook output. All 177 tests pass.

### File List

- `src/components/ui/tooltip.tsx` — NEW (shadcn/ui add tooltip)
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — MODIFIED
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — MODIFIED
- `src/components/features/SessionConfigurator/SessionConfigurator.test.tsx` — MODIFIED
- `public/locales/en/home.json` — MODIFIED
- `public/locales/ru/home.json` — MODIFIED

### Change Log

- feat(configurator): per-category question count preview with tooltip breakdown (Story 3.3, 2026-04-09)

---

## Review Findings

- [x] [Review][Patch] Missing reactivity tests for categoryCountMap [SessionConfigurator.test.tsx] — added two tests: difficulty filter change (easy → 3/2) and mode filter change (quiz → 4/3). All 179 tests pass.
- [x] [Review][Defer] Math.round rounding edge case [useSessionConfigurator.ts:45] — deferred, pre-existing pattern identical to computeAvailableCount
- [x] [Review][Defer] Keyboard navigation test for checkbox-role buttons — deferred, pre-existing gap unrelated to this story
- [x] [Review][Defer] i18n key rendering test for tooltip content — deferred, requires complex i18n mock setup for low value
