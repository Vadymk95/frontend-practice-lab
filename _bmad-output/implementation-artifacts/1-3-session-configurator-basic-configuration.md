# Story 1.3: Session Configurator — Basic Configuration

Status: review

## Story

As a **user**,
I want to configure a session by selecting categories, difficulty, mode, question count, and order,
So that I can start a focused practice session tailored to my current needs.

## Acceptance Criteria

1. **Given** the user is on the home screen (`/`)
   **When** the `SessionConfigurator` renders
   **Then** all available category buttons from `manifest.json` are displayed in a grid, each tappable to toggle selection
   **And** difficulty filter shows 3 options (`easy` / `medium` / `hard`) as radio-style toggles (single select only)
   **And** mode filter shows 4 options (`quiz` / `bug-finding` / `code-completion` / `all`) as radio-style toggles (single select only)
   **And** question count input accepts a number (min 1, max = available count for current filter state)
   **And** order toggle offers `random` / `sequential`

2. **Given** the user selects or changes any filter
   **When** the filter state updates
   **Then** the live available question count recalculates within 150ms (debounced)
   **And** the count reflects the intersection of selected categories × difficulty × mode

3. **Given** the user opens the home screen for the first time (no presets, no prior data)
   **When** `SessionConfigurator` renders
   **Then** no categories are pre-selected
   **And** Start button is disabled
   **And** live count shows "0 questions selected"
   **And** hint text is visible: "Select at least one category to begin"

4. **Given** no categories are selected OR available count = 0
   **When** the configurator renders
   **Then** empty state is shown: "No questions match your selection. Try removing a difficulty filter or selecting more categories." with total available count shown
   **And** Start button is disabled

5. **Given** at least one category is selected with count > 0
   **When** the user taps Start
   **Then** `sessionStore.setConfig()` is called with the full `SessionConfig`
   **And** the app navigates to `/session/play`
   **And** no authentication or registration is required (FR27)

## Critical Prerequisite Tasks (Must Complete Before UI Work)

### Prerequisite A: Update `SessionConfig` type

**File:** `src/lib/storage/types.ts`

Current `SessionConfig` is incompatible with Story 1.3. Rename and extend it:

```typescript
// BEFORE (Story 1.2 shape — single category, no mode/order):
export interface SessionConfig {
    categorySlug: string;
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    timeLimit?: number;
}

// AFTER (Story 1.3 shape — multi-category, mode, order):
export interface SessionConfig {
    categories: string[];                                       // multi-select slugs
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'all';           // 'mixed' → 'all'
    mode: 'quiz' | 'bug-finding' | 'code-completion' | 'all'; // NEW
    order: 'random' | 'sequential';                            // NEW
}
```

**After change:** verify `sessionStore.ts` compiles — it references `SessionConfig` type; the shape change is backward-compatible in TypeScript usage (type-only imports), but the devtools label must remain consistent.

### Prerequisite B: Add mode counts to manifest

The live count calculation must reflect mode filtering. The current manifest only has difficulty counts — mode counts must be added.

**File:** `src/scripts/generate-manifest.ts`

Add mode counts alongside difficulty counts:

```typescript
// Type mapping:
// 'single-choice' and 'multi-choice' → 'quiz'
// 'bug-finding' → 'bug-finding'
// 'code-completion' → 'code-completion'

interface ManifestEntry {
    slug: string;
    displayName: string;
    counts: {
        easy: number;
        medium: number;
        hard: number;
        total: number;
        // ADD:
        quiz: number;           // single-choice + multi-choice
        bugFinding: number;     // bug-finding type
        codeCompletion: number; // code-completion type
    };
}
```

After editing the generator:
1. Run `npm run build:manifest` to regenerate `public/data/manifest.json`
2. Update `ManifestEntry` interface in `src/hooks/data/useCategories.ts` to match the new shape

**File:** `src/hooks/data/useCategories.ts` — update `ManifestEntry.counts` interface to add `quiz`, `bugFinding`, `codeCompletion` fields.

### Prerequisite C: Add `/session/play` route stub

Story 1.3 navigates to `/session/play` on Start. The route must exist (even as an empty page) to avoid a 404.

**File:** `src/router/routes.ts` — add:

```typescript
export const RoutesPath = {
    Root: '/',
    DevPlayground: '/dev-playground',
    SessionPlay: '/session/play',
    SessionSummary: '/session/summary',
    NotFound: '*'
} as const;
```

**File:** `src/pages/SessionPlayPage/` — create stub:

```
src/pages/SessionPlayPage/
  SessionPlayPage.tsx   ← stub: just renders <div>Session Play — coming in Story 1.4</div>
  index.ts              ← re-export { lazy(() => import('./SessionPlayPage')) }
```

**File:** `src/router/modules/base.routes.tsx` — add lazy route for `SessionPlay`:

```tsx
import { lazy } from 'react';
const SessionPlayPage = lazy(() => import('@/pages/SessionPlayPage'));

// in routes array:
{
    path: RoutesPath.SessionPlay,
    element: WithSuspense(<SessionPlayPage />)
},
```

## Tasks / Subtasks

- [x] Task 0: Prerequisites
  - [x] Update `SessionConfig` in `src/lib/storage/types.ts` (multi-category + mode + order fields)
  - [x] Update `generate-manifest.ts` to include mode counts (`quiz`, `bugFinding`, `codeCompletion`)
  - [x] Regenerate `public/data/manifest.json`
  - [x] Update `ManifestEntry` in `src/hooks/data/useCategories.ts`
  - [x] Add `SessionPlay` and `SessionSummary` to `RoutesPath` in `src/router/routes.ts`
  - [x] Create `src/pages/SessionPlayPage/` stub + lazy export
  - [x] Wire `SessionPlayPage` into `src/router/modules/base.routes.tsx`
  - [x] Verify `npx tsc --noEmit` passes after all prerequisite changes

- [x] Task 1: Create `SessionConfigurator` component
  - [x] Create `src/components/features/SessionConfigurator/SessionConfigurator.tsx` (JSX-only, imports hook)
  - [x] Create `src/components/features/SessionConfigurator/useSessionConfigurator.ts` (all logic)
  - [x] Create `src/components/features/SessionConfigurator/SessionConfigurator.test.tsx`
  - [x] Create `src/components/features/SessionConfigurator/index.ts`

- [x] Task 2: Implement `useSessionConfigurator` hook
  - [x] Local state: `selectedCategories: string[]`, `difficulty: SessionConfig['difficulty']`, `mode: SessionConfig['mode']`, `questionCount: number`, `order: SessionConfig['order']`
  - [x] Default values: `difficulty: 'all'`, `mode: 'all'`, `questionCount: 10`, `order: 'random'`
  - [x] `useCategories()` call to fetch manifest
  - [x] Derived `availableCount` via `useMemo` with debounce 150ms (use `useDeferredValue` React 19 pattern)
  - [x] `availableCount` calculation: sum counts for selected categories × filter by difficulty × filter by mode
  - [x] `isStartEnabled`: `selectedCategories.length > 0 && availableCount > 0`
  - [x] `handleStart`: call `sessionStore.setConfig(...)` then `navigate('/session/play')`
  - [x] `handleCategoryToggle(slug: string)`: toggle slug in `selectedCategories`
  - [x] All handlers named `handle*`, all derived values computed from state (no side effects in render)

- [x] Task 3: Implement `SessionConfigurator.tsx` (presentation layer)
  - [x] Render category grid — `role="group"` per ARIA spec (UX-DR10)
  - [x] Render difficulty radio group — `role="radiogroup"`
  - [x] Render mode radio group — `role="radiogroup"`
  - [x] Render question count input (shadcn `Input`, type="number", min/max enforced)
  - [x] Render order toggle (two buttons: random / sequential)
  - [x] Live count display (debounced) — `aria-live="polite"` on count element
  - [x] Empty/hint state logic (see AC 3 and AC 4)
  - [x] Start button (shadcn `Button`, disabled when `!isStartEnabled`)
  - [x] Sticky bottom bar on mobile (< 1024px): Start button at 72px height fixed bottom
  - [x] Desktop: Start button inline, right-aligned
  - [x] All strings via `t('home:...')` — zero hardcoded text

- [x] Task 4: Update `HomePage`
  - [x] Replace placeholder content (fake `useQuery`, mock greeting) with `<SessionConfigurator />`
  - [x] Keep `HomePage.tsx` — just swap its content; do not rename/delete the file
  - [x] Keep `HomePage.test.tsx` — update tests to reflect new content

- [x] Task 5: Update i18n translation files
  - [x] `public/locales/en/home.json` — replace placeholder keys with configurator keys (see Dev Notes for full key list)

- [x] Task 6: Write tests for `useSessionConfigurator`
  - [x] Category toggle adds/removes from `selectedCategories`
  - [x] `availableCount` returns correct count for a given selection + filter combo
  - [x] `isStartEnabled` is false when no categories selected
  - [x] `isStartEnabled` is false when count = 0
  - [x] `handleStart` calls `sessionStore.setConfig` with correct shape and navigates

- [x] Task 7: DevPlayground section
  - [x] Add `SessionConfigurator` section to `/dev-playground` showing: empty state, configured state, zero-results state

- [x] Task 8: Verification
  - [x] `npm run build:manifest` exits 0
  - [x] `npm run validate:data` exits 0
  - [x] `npm run lint` clean
  - [x] `npm run format:check` clean
  - [x] `npx tsc --noEmit` clean
  - [x] `npm run test` — all tests pass including new ones

## Dev Notes

### File Structure

```
src/
  components/
    features/
      SessionConfigurator/
        SessionConfigurator.tsx      ← NEW
        useSessionConfigurator.ts    ← NEW
        SessionConfigurator.test.tsx ← NEW
        index.ts                     ← NEW
  pages/
    HomePage/
      index.tsx                      ← MODIFY: replace placeholder with <SessionConfigurator />
      HomePage.test.tsx              ← MODIFY: update tests
    SessionPlayPage/                 ← NEW (stub)
      SessionPlayPage.tsx
      index.ts
  router/
    routes.ts                        ← MODIFY: add SessionPlay, SessionSummary
    modules/
      base.routes.tsx                ← MODIFY: add SessionPlay lazy route
  lib/
    storage/
      types.ts                       ← MODIFY: update SessionConfig shape
  hooks/
    data/
      useCategories.ts               ← MODIFY: update ManifestEntry.counts
  scripts/
    generate-manifest.ts             ← MODIFY: add mode counts
public/
  locales/
    en/
      home.json                      ← MODIFY: replace with configurator keys
  data/
    manifest.json                    ← REGENERATE: run build:manifest
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/lib/data/schema.ts` | Zod schemas complete, do not modify |
| `src/lib/algorithm/` | Algorithm stubs complete, no changes needed |
| `src/store/progress/` | No progress display in this story |
| `src/store/ui/` | No theme/lang changes |
| `src/components/layout/AppHeader/` | Stays as placeholder (Epic 6) |
| `src/lib/queryClient.ts` | Already configured |
| `src/lib/i18n/` | i18n config complete — only update locale JSON files |
| `src/lib/storage/LocalStorageService.ts` | Interface updated but implementation unchanged |

### `useSessionConfigurator` — Complete Contract

```typescript
// src/components/features/SessionConfigurator/useSessionConfigurator.ts

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import type { SessionConfig } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { useSessionStore } from '@/store/session';

type Difficulty = SessionConfig['difficulty'];
type Mode = SessionConfig['mode'];
type Order = SessionConfig['order'];

export function useSessionConfigurator() {
    const { data: categories = [], isLoading } = useCategories();
    const navigate = useNavigate();
    const setConfig = useSessionStore.use.setConfig();

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<Difficulty>('all');
    const [mode, setMode] = useState<Mode>('all');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [order, setOrder] = useState<Order>('random');

    const availableCount = useMemo(() => {
        return computeAvailableCount(categories, selectedCategories, difficulty, mode);
    }, [categories, selectedCategories, difficulty, mode]);

    const maxCount = useMemo(() => {
        return computeAvailableCount(categories, selectedCategories, difficulty, mode);
    }, [categories, selectedCategories, difficulty, mode]);

    const isStartEnabled = selectedCategories.length > 0 && availableCount > 0;

    const handleCategoryToggle = useCallback((slug: string) => {
        setSelectedCategories((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
        );
    }, []);

    const handleDifficultyChange = useCallback((value: Difficulty) => {
        setDifficulty(value);
    }, []);

    const handleModeChange = useCallback((value: Mode) => {
        setMode(value);
    }, []);

    const handleQuestionCountChange = useCallback((value: number) => {
        setQuestionCount(Math.max(1, Math.min(value, maxCount)));
    }, [maxCount]);

    const handleOrderChange = useCallback((value: Order) => {
        setOrder(value);
    }, []);

    const handleStart = useCallback(() => {
        if (!isStartEnabled) return;
        const config: SessionConfig = {
            categories: selectedCategories,
            questionCount: Math.min(questionCount, availableCount),
            difficulty,
            mode,
            order,
        };
        setConfig(config);
        navigate(RoutesPath.SessionPlay);
    }, [isStartEnabled, selectedCategories, questionCount, availableCount, difficulty, mode, order, setConfig, navigate]);

    return {
        // Data
        categories,
        isLoading,
        // Filter state
        selectedCategories,
        difficulty,
        mode,
        questionCount,
        order,
        // Derived
        availableCount,
        maxCount,
        isStartEnabled,
        // Handlers
        handleCategoryToggle,
        handleDifficultyChange,
        handleModeChange,
        handleQuestionCountChange,
        handleOrderChange,
        handleStart,
    };
}

// Pure helper — extract for testability
function computeAvailableCount(
    categories: ManifestEntry[],
    selectedSlugs: string[],
    difficulty: Difficulty,
    mode: Mode,
): number {
    if (selectedSlugs.length === 0) return 0;

    return categories
        .filter((cat) => selectedSlugs.includes(cat.slug))
        .reduce((total, cat) => {
            // Difficulty count
            let diffCount: number;
            if (difficulty === 'all') {
                diffCount = cat.counts.total;
            } else {
                diffCount = cat.counts[difficulty];
            }

            // Mode fraction: approximate using mode proportion of total
            // Because manifest tracks mode counts as totals (not split by difficulty),
            // we compute: (mode_count / total) × diffCount for a proportional estimate.
            // For 'all' mode: use diffCount directly (no mode filter).
            if (mode === 'all') {
                return total + diffCount;
            }
            const modeTotal = mode === 'quiz'
                ? cat.counts.quiz
                : mode === 'bug-finding'
                    ? cat.counts.bugFinding
                    : cat.counts.codeCompletion;

            if (cat.counts.total === 0) return total;
            const modeFraction = modeTotal / cat.counts.total;
            return total + Math.round(diffCount * modeFraction);
        }, 0);
}
```

**Note on count approximation:** When both difficulty and mode are filtered simultaneously, the count is an estimate (mode fraction × difficulty count). Exact counts would require loading all question JSON files — the manifest only has separate breakdowns. This is acceptable per the UX spec's intent (live count as guidance, not a strict guarantee). The actual session sampling in Story 1.4 will use real counts.

### Available Count Debounce Pattern

The `useMemo` already runs synchronously — no async needed. However, the AC says "within 150ms". Use `useDeferredValue` from React 19 to defer the expensive recalculation without blocking the UI:

```typescript
import { useDeferredValue } from 'react';

// In the hook:
const deferredSelectedCategories = useDeferredValue(selectedCategories);
const deferredDifficulty = useDeferredValue(difficulty);
const deferredMode = useDeferredValue(mode);

const availableCount = useMemo(() => {
    return computeAvailableCount(categories, deferredSelectedCategories, deferredDifficulty, deferredMode);
}, [categories, deferredSelectedCategories, deferredDifficulty, deferredMode]);
```

This is the React 19 idiomatic approach — no `setTimeout` debounce needed.

### SessionConfigurator Component Structure (JSX only)

```typescript
// src/components/features/SessionConfigurator/SessionConfigurator.tsx
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionConfigurator } from './useSessionConfigurator';

export const SessionConfigurator: FC = () => {
    const { t } = useTranslation('home');
    const {
        categories, isLoading,
        selectedCategories, difficulty, mode, questionCount, order,
        availableCount, maxCount, isStartEnabled,
        handleCategoryToggle, handleDifficultyChange, handleModeChange,
        handleQuestionCountChange, handleOrderChange, handleStart,
    } = useSessionConfigurator();

    if (isLoading) {
        return <div role="status" aria-live="polite">{t('configurator.loading')}</div>;
    }

    return (
        <div className="flex flex-col gap-6 pb-24 lg:pb-0">
            {/* Category Grid */}
            <section>
                <h2 className="text-sm font-medium text-muted mb-3">{t('configurator.categories.label')}</h2>
                <div role="group" aria-label={t('configurator.categories.ariaLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((cat) => (
                        <button
                            key={cat.slug}
                            type="button"
                            role="checkbox"
                            aria-checked={selectedCategories.includes(cat.slug)}
                            onClick={() => handleCategoryToggle(cat.slug)}
                            className={/* selected: border-accent-alt, default: border-border */
                                `min-h-11 px-3 py-2 text-sm text-left border transition-colors ${
                                    selectedCategories.includes(cat.slug)
                                        ? 'border-accent-alt bg-accent-alt/10 text-primary'
                                        : 'border-border bg-surface text-muted-foreground hover:border-accent-alt/50'
                                }`
                            }
                        >
                            {cat.displayName}
                        </button>
                    ))}
                </div>
            </section>

            {/* Difficulty Filter */}
            <section>
                <h2 className="text-sm font-medium text-muted mb-3">{t('configurator.difficulty.label')}</h2>
                <div role="radiogroup" aria-label={t('configurator.difficulty.ariaLabel')} className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={difficulty === d}
                            onClick={() => handleDifficultyChange(d)}
                            className={/* same radio toggle pattern as difficulty */
                                `flex-1 py-2 text-sm border ${difficulty === d ? 'border-accent-alt bg-accent-alt/10' : 'border-border'}`
                            }
                        >
                            {t(`configurator.difficulty.${d}`)}
                        </button>
                    ))}
                </div>
            </section>

            {/* Mode Filter + Count + Order ... (same pattern) */}

            {/* Live Count */}
            <div aria-live="polite" aria-atomic="true" className="text-sm text-muted">
                {selectedCategories.length === 0
                    ? t('configurator.hint.selectCategory')
                    : availableCount === 0
                        ? t('configurator.emptyState.message')
                        : t('configurator.count.available', { count: availableCount })
                }
            </div>

            {/* Sticky Start Button (mobile) */}
            <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-surface border-t border-border px-4 flex items-center lg:hidden">
                <Button
                    className="w-full"
                    disabled={!isStartEnabled}
                    onClick={handleStart}
                >
                    {t('configurator.start')}
                </Button>
            </div>

            {/* Inline Start Button (desktop) */}
            <div className="hidden lg:flex lg:justify-end">
                <Button disabled={!isStartEnabled} onClick={handleStart}>
                    {t('configurator.start')}
                </Button>
            </div>
        </div>
    );
};
```

### Color Semantics — Critical Rule (UX-DR2)

| Color | Token class | Use | Never use for |
|-------|------------|-----|---------------|
| Terminal green | `accent` / `bg-accent` | Correct answer reveal, streak | Interactive controls, buttons, selections |
| Electric blue | `accent-alt` / `bg-accent-alt` | CTAs, selected category state, focus ring, Start button, active radio/toggle | Answer feedback |
| Error red | `error` / `bg-error` | Wrong answer, destructive | Selections, CTAs |

**Category selected state:** `border-accent-alt bg-accent-alt/10` (blue — it's a navigation/selection control)
**Start button:** primary Button component uses `bg-accent-alt` per design token overrides (configured in Story 1.1)

### i18n Keys — `public/locales/en/home.json`

Replace the entire file with:

```json
{
    "configurator": {
        "loading": "Loading categories...",
        "categories": {
            "label": "Categories",
            "ariaLabel": "Select question categories"
        },
        "difficulty": {
            "label": "Difficulty",
            "ariaLabel": "Select difficulty level",
            "easy": "Easy",
            "medium": "Medium",
            "hard": "Hard"
        },
        "mode": {
            "label": "Mode",
            "ariaLabel": "Select question mode",
            "quiz": "Quiz",
            "bug-finding": "Bug Finding",
            "code-completion": "Code Completion",
            "all": "All"
        },
        "count": {
            "label": "Question Count",
            "available": "{{count}} questions available"
        },
        "order": {
            "label": "Order",
            "random": "Random",
            "sequential": "Sequential"
        },
        "hint": {
            "selectCategory": "Select at least one category to begin"
        },
        "emptyState": {
            "message": "No questions match your selection. Try removing a difficulty filter or selecting more categories."
        },
        "start": "Start Session"
    }
}
```

**Note:** The `ru` locale (`public/locales/ru/home.json`) will be added in Epic 6 (i18n story). For now the `en` keys act as fallback for both languages. The i18n config already has `fallbackLng: 'en'` — no crash will occur.

### SessionConfig Update — Impact on `sessionStore`

After updating `SessionConfig` in `types.ts`, verify `sessionStore.ts` compiles. The store holds `config: SessionConfig | null` — the type change is purely structural. The `setConfig` action signature remains identical. No runtime changes to the store.

However, `LocalStorageService.ts` stores `SessionPreset` which embeds `SessionConfig`. Any existing presets in localStorage (from dev testing) will be invalid after the type change — this is acceptable for development (clear localStorage if needed).

### Routing After Story 1.3

After this story, the route table will be:

```
/                  → HomePage (SessionConfigurator content) [eager]
/session/play      → SessionPlayPage (stub) [lazy]
/dev-playground    → DevPlayground [lazy, DEV only]
*                  → NotFoundPage [eager]
```

`/session/summary` is defined in `RoutesPath` but its lazy page is created in Story 1.6.

### Pattern: Existing Component Examples to Follow

Architecture mandates every feature component follows `ComponentName/ComponentName.tsx + useComponentName.ts`. Already implemented examples in this project:
- `src/components/layout/AppHeader/AppHeader.tsx` + `useAppHeader.ts` — same folder structure

Look at `AppHeader` for the exact pattern to follow for file naming and hook structure.

### Available shadcn/ui Components (Already Installed)

- `Button` — `@/components/ui/button` — use for Start, difficulty toggles, order toggles
- `Input` — `@/components/ui/input` — use for question count field

Do NOT install new shadcn/ui components. The category grid, radio-style toggles, and order toggle are implemented as plain `<button>` elements styled with Tailwind tokens — they are not Radix/shadcn primitives (no dropdown menus, no custom Select components needed).

### Tests: `useSessionConfigurator` (Vitest + Testing Library)

Test via the hook directly using `renderHook` from `@testing-library/react`. Wrap with the necessary providers (QueryClient, MemoryRouter).

```typescript
// Key test cases:
it('starts with no categories selected and Start disabled', ...)
it('toggling a category adds it to selectedCategories', ...)
it('toggling an already-selected category removes it', ...)
it('availableCount is 0 when no categories selected', ...)
it('availableCount reflects selected categories difficulty and mode', ...)
it('handleStart calls setConfig with correct shape and navigates', ...)
it('handleQuestionCountChange clamps value between 1 and maxCount', ...)
```

Mock `useCategories` to return a fixed manifest with known counts for deterministic testing.

### Post-Edit Verification Commands

```bash
npm run build:manifest   # must succeed (regenerate manifest with mode counts)
npm run validate:data    # must exit 0
npm run lint
npm run format:check
npx tsc --noEmit
npm run test             # all tests including new SessionConfigurator tests
```

All 5 must pass before marking complete.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Updated `SessionConfig` type: `categorySlug` → `categories[]`, `'mixed'` → `'all'`, added `mode` and `order` fields
- Updated `generate-manifest.ts` to count quiz/bugFinding/codeCompletion types per category; regenerated manifest.json
- Added `SessionPlay` + `SessionSummary` routes; created `SessionPlayPage` stub (lazy)
- Implemented `useSessionConfigurator` with `useDeferredValue` (React 19 pattern) for 150ms-equivalent debounce
- `computeAvailableCount` exported as pure helper for direct unit testing
- `SessionConfigurator.tsx` is presentation-only; all logic in hook
- All strings via `t('home:...')` — zero hardcoded text; full ARIA roles applied
- 41/41 tests pass; lint, format, tsc all clean

### File List

- `src/lib/storage/types.ts` — modified: updated SessionConfig shape
- `src/scripts/generate-manifest.ts` — modified: added mode counts
- `public/data/manifest.json` — regenerated: added quiz/bugFinding/codeCompletion counts
- `src/hooks/data/useCategories.ts` — modified: updated ManifestEntry.counts interface
- `src/router/routes.ts` — modified: added SessionPlay and SessionSummary
- `src/pages/SessionPlayPage/SessionPlayPage.tsx` — created: stub page
- `src/pages/SessionPlayPage/index.ts` — created: lazy export
- `src/router/modules/base.routes.tsx` — modified: wired SessionPlayPage
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — created
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — created
- `src/components/features/SessionConfigurator/SessionConfigurator.test.tsx` — created
- `src/components/features/SessionConfigurator/index.ts` — created
- `src/pages/HomePage/index.tsx` — modified: replaced placeholder with SessionConfigurator
- `src/pages/HomePage/HomePage.test.tsx` — modified: updated tests for new content
- `public/locales/en/home.json` — modified: replaced with configurator keys
- `src/pages/DevPlayground/DevPlayground.tsx` — modified: added SessionConfigurator section

### Change Log

- 2026-03-24: Story 1.3 created — Session Configurator with category grid, filters, live count, and navigation to /session/play
- 2026-03-24: Story 1.3 implemented — all tasks complete, 41 tests pass, status → review
