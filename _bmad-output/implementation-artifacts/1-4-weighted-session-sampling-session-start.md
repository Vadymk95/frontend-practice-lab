# Story 1.4: Weighted Session Sampling & Session Start

Status: done

## Story

As a **user**,
I want the app to sample questions based on my configured filters,
So that my session contains the right questions drawn from my selected categories.

## Acceptance Criteria

1. **Given** a valid session configuration is confirmed (set in `sessionStore.config`)
   **When** the user navigates to `/session/play`
   **Then** `useSessionSetup` fetches JSON data for all selected categories via TanStack Query (parallel fetches)
   **And** a spinner/skeleton is shown if fetch takes > 200ms — no blank screen
   **And** on fetch error: full-screen `ErrorState` with "Could not load questions. Check your connection." + Retry button

2. **Given** data is loaded successfully
   **When** questions are sampled
   **Then** `sampleWeighted()` from `src/lib/algorithm/` is called with weights from `progressStore`
   **And** unregistered question IDs use `ALGORITHM_CONFIG.DEFAULT_WEIGHT` (1.0)
   **And** the sampled list respects the configured `questionCount` limit
   **And** category + difficulty + mode filters are applied BEFORE sampling

3. **Given** the session questions are sampled
   **When** `order` is `'sequential'`
   **Then** questions are sorted by difficulty: `easy` → `medium` → `hard`

   **Given** `order` is `'random'`
   **Then** questions remain in their sampled (shuffled) order from `sampleWeighted()`

4. **Given** the session questions are ready
   **When** `sessionStore.setQuestionList()` is called
   **Then** `sessionStore` holds the full question list, `currentIndex = 0`, `answers = {}`
   **And** the progress indicator on the page shows "1 / N" where N = total question count

5. **Given** the user navigates to `/session/play` with NO session config in `sessionStore`
   **When** the page renders
   **Then** the user is immediately redirected to `/` (home) — no crash, no blank screen

## Critical Prerequisite Tasks (Must Complete Before Main Work)

### Prerequisite A: Create `ErrorState` Component

Architecture specifies `src/components/common/error-state/ErrorState.tsx`. However, the project uses **PascalCase directories** (see `ErrorBoundary/`). Create using PascalCase:

**File:** `src/components/common/ErrorState/ErrorState.tsx`

```typescript
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ message, onRetry }) => {
    const { t } = useTranslation('errors');
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <p className="text-error text-base">{message ?? t('generic')}</p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    {t('retry')}
                </Button>
            )}
        </div>
    );
};
```

**File:** `src/components/common/ErrorState/index.ts`
```typescript
export { ErrorState } from './ErrorState';
```

**i18n keys needed** in `public/locales/en/errors.json` (add if not present):
```json
{
    "generic": "Something went wrong.",
    "retry": "Try again",
    "fetchQuestions": "Could not load questions. Check your connection."
}
```

Also check `public/locales/ru/errors.json` — add matching Russian keys.

### Prerequisite B: Create `useCategoryQuestions` shared hook

**File:** `src/hooks/data/useCategoryQuestions.ts`

```typescript
import { useQueries } from '@tanstack/react-query';

import type { Question } from '@/lib/data/schema';
import { CategoryFileSchema } from '@/lib/data/schema';

function fetchCategoryQuestions(slug: string): Promise<Question[]> {
    return fetch(`/data/${slug}.json`)
        .then((res) => {
            if (!res.ok) throw new Error(`Failed to load category: ${slug}`);
            return res.json();
        })
        .then((data) => CategoryFileSchema.parse(data));
}

export function useCategoryQuestions(slugs: string[]) {
    const results = useQueries({
        queries: slugs.map((slug) => ({
            queryKey: ['questions', slug],
            queryFn: () => fetchCategoryQuestions(slug),
            staleTime: Infinity, // questions don't change at runtime
        })),
    });

    const isLoading = results.some((r) => r.isLoading);
    const isError = results.some((r) => r.isError);
    const data: Question[] = results
        .filter((r) => r.data)
        .flatMap((r) => r.data as Question[]);

    // Expose refetch for ErrorState retry button
    const refetch = () => results.forEach((r) => r.refetch());

    return { data, isLoading, isError, refetch };
}
```

**Note:** Uses `useQueries` (plural) from TanStack Query 5 for parallel fetching. This is already installed — no new packages.

## Tasks / Subtasks

- [ ] Task 0: Prerequisites
  - [ ] Create `src/components/common/ErrorState/ErrorState.tsx` (see spec above)
  - [ ] Create `src/components/common/ErrorState/index.ts`
  - [ ] Add missing keys to `public/locales/en/errors.json` and `public/locales/ru/errors.json`
  - [ ] Create `src/hooks/data/useCategoryQuestions.ts` (see spec above)
  - [ ] Verify `npx tsc --noEmit` passes after prerequisites

- [ ] Task 1: Create `useSessionSetup` hook

  **File:** `src/hooks/session/useSessionSetup.ts`

  This hook coordinates: config read → questions fetch → filter → sample → sort → store.

  ```typescript
  // src/hooks/session/useSessionSetup.ts
  import { useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';

  import { useCategoryQuestions } from '@/hooks/data/useCategoryQuestions';
  import { sampleWeighted } from '@/lib/algorithm';
  import type { Question } from '@/lib/data/schema';
  import type { SessionConfig } from '@/lib/storage/types';
  import { RoutesPath } from '@/router/routes';
  import { useProgressStore } from '@/store/progress';
  import { useSessionStore } from '@/store/session';

  function filterQuestions(questions: Question[], config: SessionConfig): Question[] {
      return questions.filter((q) => {
          const difficultyMatch =
              config.difficulty === 'all' || q.difficulty === config.difficulty;
          const modeMatch =
              config.mode === 'all' ||
              (config.mode === 'quiz' && (q.type === 'single-choice' || q.type === 'multi-choice')) ||
              (config.mode === 'bug-finding' && q.type === 'bug-finding') ||
              (config.mode === 'code-completion' && q.type === 'code-completion');
          return difficultyMatch && modeMatch;
      });
  }

  const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

  function sortByDifficulty(questions: Question[]): Question[] {
      return [...questions].sort(
          (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
      );
  }

  export function useSessionSetup() {
      const navigate = useNavigate();
      const config = useSessionStore.use.config();
      const setQuestionList = useSessionStore.use.setQuestionList();
      const weights = useProgressStore.use.weights();

      // Guard: no config → go home
      useEffect(() => {
          if (!config) {
              navigate(RoutesPath.Root, { replace: true });
          }
      }, [config, navigate]);

      const categories = config?.categories ?? [];
      const { data: allQuestions, isLoading, isError, refetch } = useCategoryQuestions(categories);

      useEffect(() => {
          if (!config || isLoading || isError || allQuestions.length === 0) return;

          const filtered = filterQuestions(allQuestions, config);
          const sampled = sampleWeighted(filtered, weights, config.questionCount);
          const ordered =
              config.order === 'sequential' ? sortByDifficulty(sampled) : sampled;

          setQuestionList(ordered);
      }, [config, isLoading, isError, allQuestions, weights, setQuestionList]);

      return { isLoading, isError, refetch };
  }
  ```

  **Critical rules:**
  - `filterQuestions` is a pure function — extract it for unit testing
  - `sortByDifficulty` creates a new array (`[...questions].sort(...)`) — never mutates input
  - The `useEffect` guard runs only when all three conditions are false
  - `weights` come from `progressStore` — missing IDs default to 1.0 inside `sampleWeighted()`
  - This hook lives in `src/hooks/session/` (shared hook layer), not inside the page

- [ ] Task 2: Update `SessionPlayPage` — replace stub with setup logic

  **File:** `src/pages/SessionPlayPage/SessionPlayPage.tsx`

  Replace the placeholder. The page is JSX-only — all logic in `useSessionPlayPage.ts`.

  ```typescript
  // src/pages/SessionPlayPage/SessionPlayPage.tsx
  import type { FC } from 'react';
  import { useTranslation } from 'react-i18next';

  import { ErrorState } from '@/components/common/ErrorState';
  import { useSessionPlayPage } from './useSessionPlayPage';

  export const SessionPlayPage: FC = () => {
      const { t } = useTranslation('session');
      const { isSetupLoading, isSetupError, questionCount, currentIndex, onRetry } =
          useSessionPlayPage();

      if (isSetupError) {
          return (
              <ErrorState
                  message={t('errors.fetchQuestions')}
                  onRetry={onRetry}
              />
          );
      }

      if (isSetupLoading) {
          return (
              <div role="status" aria-live="polite" className="flex justify-center py-12">
                  <span className="text-muted-foreground text-sm">{t('loading')}</span>
              </div>
          );
      }

      return (
          <div className="flex flex-col gap-4">
              {/* Progress indicator — full QuestionCard rendering in Story 1.5 */}
              <div aria-label={t('progress.ariaLabel')} className="text-sm text-muted-foreground">
                  {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
              </div>
              {/* Question content placeholder — Story 1.5 */}
              <div className="text-muted-foreground text-sm">{t('questionPlaceholder')}</div>
          </div>
      );
  };

  export default SessionPlayPage;
  ```

- [ ] Task 3: Create `useSessionPlayPage` hook

  **File:** `src/pages/SessionPlayPage/useSessionPlayPage.ts`

  ```typescript
  // src/pages/SessionPlayPage/useSessionPlayPage.ts
  import { useSessionSetup } from '@/hooks/session/useSessionSetup';
  import { useSessionStore } from '@/store/session';

  export function useSessionPlayPage() {
      const { isLoading: isSetupLoading, isError: isSetupError, refetch } = useSessionSetup();
      const questionList = useSessionStore.use.questionList();
      const currentIndex = useSessionStore.use.currentIndex();

      return {
          isSetupLoading,
          isSetupError,
          questionCount: questionList.length,
          currentIndex,
          onRetry: refetch,
      };
  }
  ```

- [ ] Task 4: Add i18n keys for `session` namespace

  **File:** `public/locales/en/session.json` — create if it doesn't exist:

  ```json
  {
      "loading": "Loading questions...",
      "questionPlaceholder": "Question view coming soon.",
      "progress": {
          "indicator": "{{current}} / {{total}}",
          "ariaLabel": "Session progress"
      },
      "errors": {
          "fetchQuestions": "Could not load questions. Check your connection."
      }
  }
  ```

  **File:** `public/locales/ru/session.json`:
  ```json
  {
      "loading": "Загрузка вопросов...",
      "questionPlaceholder": "Отображение вопросов появится позже.",
      "progress": {
          "indicator": "{{current}} / {{total}}",
          "ariaLabel": "Прогресс сессии"
      },
      "errors": {
          "fetchQuestions": "Не удалось загрузить вопросы. Проверьте соединение."
      }
  }
  ```

  **Register the namespace** in i18n config if lazy loading is configured (check `src/lib/i18n/`):
  - `session` namespace should be loaded lazily on route entry — confirm this with the i18n config

- [ ] Task 5: Write tests for `useSessionSetup`

  **File:** `src/hooks/session/useSessionSetup.test.ts`

  Use `renderHook` + `MemoryRouter` wrapper.

  ```typescript
  // Key test cases:
  it('redirects to / when no config in sessionStore', ...)
  it('calls setQuestionList with filtered questions matching difficulty', ...)
  it('calls setQuestionList with filtered questions matching mode', ...)
  it('sorts questions easy→medium→hard when order is sequential', ...)
  it('does NOT sort questions when order is random', ...)
  it('respects questionCount limit via sampleWeighted', ...)
  it('passes progressStore weights to sampleWeighted', ...)
  it('returns isError=true when fetch fails', ...)
  ```

  Mock `useCategoryQuestions` with vitest `vi.mock`:
  ```typescript
  vi.mock('@/hooks/data/useCategoryQuestions', () => ({
      useCategoryQuestions: vi.fn(),
  }));
  ```

  Test `filterQuestions` and `sortByDifficulty` as pure functions — export them from `useSessionSetup.ts`:
  ```typescript
  // At bottom of useSessionSetup.ts, add:
  export { filterQuestions, sortByDifficulty }; // for testing
  ```

- [ ] Task 6: Write tests for `useCategoryQuestions`

  **File:** `src/hooks/data/useCategoryQuestions.test.ts`

  Mock `fetch` via `vi.spyOn(global, 'fetch')`. Wrap with `QueryClientProvider`.

  ```typescript
  // Key test cases:
  it('returns combined questions from all slugs', ...)
  it('isLoading is true while fetch is pending', ...)
  it('isError is true when any category fetch fails', ...)
  it('validates response against CategoryFileSchema', ...)
  ```

- [ ] Task 7: DevPlayground section

  Add a "Session Setup" section to `/dev-playground` showing:
  - Error state (simulate `isSetupError = true`)
  - Loading state
  - Success state with progress indicator

  Keep it minimal — just enough to verify the three states visually during development.

- [ ] Task 8: Verification

  - [ ] `npm run build:manifest` exits 0
  - [ ] `npm run validate:data` exits 0
  - [ ] `npm run lint` clean
  - [ ] `npm run format:check` clean
  - [ ] `npx tsc --noEmit` clean
  - [ ] `npm run test` — all tests pass including new ones

## Dev Notes

### File Structure

```
src/
  components/
    common/
      ErrorState/
        ErrorState.tsx         ← NEW
        index.ts               ← NEW
  hooks/
    data/
      useCategoryQuestions.ts  ← NEW
    session/
      useSessionSetup.ts       ← NEW (note: create directory)
      useSessionSetup.test.ts  ← NEW
  pages/
    SessionPlayPage/
      SessionPlayPage.tsx      ← MODIFY: replace stub with real content
      useSessionPlayPage.ts    ← NEW
      index.ts                 ← NO CHANGE (lazy export already correct)
public/
  locales/
    en/
      errors.json              ← MODIFY: add missing keys
      session.json             ← NEW
    ru/
      errors.json              ← MODIFY: add missing keys
      session.json             ← NEW
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/lib/algorithm/index.ts` | `sampleWeighted()` already implemented and tested — do not modify |
| `src/lib/algorithm/config.ts` | Constants correct — do not modify |
| `src/store/session/sessionStore.ts` | `setQuestionList` action already exists with correct signature |
| `src/store/progress/progressStore.ts` | `weights` selector already available |
| `src/hooks/data/useCategories.ts` | Fetches manifest only — do not conflate with question fetch |
| `src/router/modules/base.routes.tsx` | SessionPlayPage route already wired |
| `src/pages/SessionPlayPage/index.ts` | Lazy export already correct |
| `src/components/features/SessionConfigurator/` | Story 1.3 complete — do not touch |

### Key Data Flow (Critical — understand before coding)

```
SessionConfigurator (Story 1.3)
  └─ handleStart() → sessionStore.setConfig(config) → navigate('/session/play')

SessionPlayPage mounts at /session/play
  └─ useSessionPlayPage()
       └─ useSessionSetup()
            ├─ reads config from sessionStore.use.config()
            ├─ guard: no config → navigate('/', replace: true)
            ├─ useCategoryQuestions(config.categories) — parallel fetches
            │    └─ useQueries([{queryKey: ['questions', slug], ...}])
            ├─ filterQuestions(allQuestions, config)  ← pure function
            ├─ sampleWeighted(filtered, weights, count) ← from lib/algorithm
            ├─ sortByDifficulty or keep random order
            └─ sessionStore.setQuestionList(ordered)
```

### sessionStore State After This Story

```typescript
// After setQuestionList() is called:
{
    config: SessionConfig,         // set in Story 1.3
    questionList: Question[],      // set in THIS story
    currentIndex: 0,               // reset by setQuestionList
    answers: {},                   // reset is NOT called — keep previous answers? No!
    skipList: [],
    timerMs: 0,
}
```

**Note:** `setQuestionList` in `sessionStore.ts` resets `currentIndex` to 0. It does NOT reset `answers` or `skipList`. For Story 1.4, this is fine since we're starting fresh. If `answers` need clearing, add to `setQuestionList` action: `set({ questionList, currentIndex: 0, answers: {}, skipList: [] })`. Confirm this is correct before implementing.

### Filter Logic — Mode Mapping

The `SessionConfig.mode` maps to question types as follows:

```
mode === 'quiz'            → type 'single-choice' OR 'multi-choice'
mode === 'bug-finding'     → type 'bug-finding'
mode === 'code-completion' → type 'code-completion'
mode === 'all'             → all types (no filter)
```

This mapping mirrors what `generate-manifest.ts` uses for counting (established in Story 1.3).

### sampleWeighted — Integration Notes

```typescript
// Already implemented in src/lib/algorithm/index.ts
// Signature:
export function sampleWeighted(
    questions: Question[],
    weights: Record<string, number>,
    count: number
): Question[]

// Usage in useSessionSetup:
const weights = useProgressStore.use.weights(); // Record<string, number>
// For first-time users, weights = {} → sampleWeighted uses DEFAULT_WEIGHT (1.0) for all
const sampled = sampleWeighted(filtered, weights, config.questionCount);
```

**Do NOT re-implement sampling.** The function is complete and tested (8 tests). Just call it.

### Difficulty Sort Order

```typescript
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;
// easy first → simple to complex progression for sequential mode
```

### TanStack Query v5 — `useQueries` Syntax

TanStack Query v5 changed `useQueries` signature:

```typescript
// v5 (CORRECT):
const results = useQueries({
    queries: slugs.map((slug) => ({ ... })),
});

// v4 (WRONG — do not use):
const results = useQueries(slugs.map((slug) => ({ ... })));
```

### ErrorState Color Token

Use `text-error` Tailwind class (defined in design tokens from Story 1.1). Do NOT use `text-red-500`.

### Spinner Timing — 200ms Threshold

The acceptance criteria says "spinner shown if fetch takes > 200ms". React Suspense and TanStack Query don't have built-in delay thresholds. Use `useDeferredValue` pattern (React 19) or a simple approach:

**Recommended for this story:** Show spinner immediately when `isLoading = true`. The 200ms requirement prevents "flicker" — `isLoading` in TanStack Query is only true during actual network fetch, not on cache hit. Since the manifest already establishes the staleTime as Infinity for question files too, subsequent visits won't show the spinner. This satisfies the spirit of the requirement.

**Do NOT add artificial setTimeout delays** — this creates race conditions in tests.

### i18n Namespace Registration

Check `src/lib/i18n/config.ts` or wherever i18n is initialized. If namespaces are explicitly listed, add `'session'` and `'errors'` (if missing). If using lazy loading, ensure the `session` namespace is loaded on route entry.

Confirm `errors` namespace is already loaded (it may have been set up in Story 1.1/1.2).

### progressStore — `weights` selector

```typescript
// Access pattern (createSelectors):
const weights = useProgressStore.use.weights();
// Returns Record<string, number> — empty {} for first-time users
```

Ensure `useProgressStore` is exported from `src/store/progress/index.ts` (already done in Story 1.2).

### Tests — `useSessionSetup` Wrapper

```typescript
// Wrapper for renderHook:
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/session/play']}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {children}
        </QueryClientProvider>
    </MemoryRouter>
);
```

Set sessionStore state before rendering:
```typescript
// In beforeEach or test setup:
useSessionStoreBase.setState({
    config: {
        categories: ['javascript'],
        difficulty: 'all',
        mode: 'all',
        questionCount: 5,
        order: 'random',
    },
    questionList: [],
    currentIndex: 0,
    answers: {},
    skipList: [],
    timerMs: 0,
});
```

### Post-Edit Verification Commands

```bash
npm run build:manifest   # must succeed
npm run validate:data    # must exit 0
npm run lint
npm run format:check
npx tsc --noEmit
npm run test             # all tests pass including new useSessionSetup + useCategoryQuestions tests
```

All 5 must pass before marking complete.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

(to be filled after implementation)

### File List

(to be filled after implementation)

### Change Log

- 2026-03-24: Story 1.4 created — Weighted Session Sampling & Session Start
