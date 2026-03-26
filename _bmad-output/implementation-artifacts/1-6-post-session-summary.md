# Story 1.6: Post-Session Summary

Status: done

## Story

As a **user**,
I want to see my score and weak topics after completing a session,
So that I know how I performed and what to focus on next.

## Acceptance Criteria

1. **Given** the user has answered all questions in the session
   **When** `SummaryPage` renders at `/session/summary`
   **Then** `SessionSummary` shows the score prominently ("38 / 50")
   **And** weak topics are listed (categories where error rate > 30% in this session)
   **And** if wrong answers exist: "Repeat mistakes" is shown as primary CTA
   **And** if no wrong answers: score like "50 / 50" is displayed; CTAs are "Try again" + "Try something else" + "Home"
   **And** when wrong answers exist: "New session" (secondary) and "Home" (ghost) are present
   **And** when perfect score: "Try something else" (secondary) and "Home" (ghost) are present

2. **Given** the session completes
   **When** progress is saved (on SummaryPage mount)
   **Then** per-question answer results (questionId → wasCorrect) are written to `progressStore.saveSessionResults()`
   **And** `progressStore` persists to localStorage via `StorageService`
   **And** data survives page reload (re-read from localStorage on next app init)

3. **Given** the user taps "Repeat mistakes"
   **When** navigation occurs
   **Then** `sessionStore.setRepeatMistakes(wrongQuestions)` is called — sets new question list, resets answers/index, KEEPS config
   **And** navigation goes to `/session/play`
   **And** `useSessionSetup` does NOT re-sample (sees `questionList.length > 0`)

4. **Given** the user taps "New session" or "Home"
   **When** navigation occurs
   **Then** navigation goes to `/` (home)

5. **Given** the user lands on `/session/summary` with no session data (direct URL access)
   **When** `questionList.length === 0`
   **Then** redirect to `/` immediately

---

## Critical Prerequisite Tasks

### Prerequisite A: Add `summary` to LAZY_NAMESPACES in i18n constants

**File:** `src/lib/i18n/constants.ts`

Current (after Story 1.5):
```typescript
const LAZY_NAMESPACES = ['session', 'question'] as const;
```

Change to:
```typescript
const LAZY_NAMESPACES = ['session', 'question', 'summary'] as const;
```

**Why:** `useTranslation('summary')` inside SummaryPage needs the namespace in the union type for TypeScript strict mode.

### Prerequisite B: Create `summary` namespace locale files

**File:** `public/locales/en/summary.json` — create:
```json
{
    "title": "Session Complete",
    "score": {
        "label": "Your score",
        "display": "{{correct}} / {{total}}"
    },
    "weakTopics": {
        "title": "Focus areas",
        "empty": "No weak topics — great job!"
    },
    "actions": {
        "repeatMistakes": "Repeat mistakes",
        "tryAgain": "Try again",
        "trySomethingElse": "Try something else",
        "newSession": "New session",
        "home": "Home"
    },
    "perfect": "Perfect score!"
}
```

**File:** `public/locales/ru/summary.json` — create:
```json
{
    "title": "Сессия завершена",
    "score": {
        "label": "Ваш результат",
        "display": "{{correct}} / {{total}}"
    },
    "weakTopics": {
        "title": "Слабые темы",
        "empty": "Слабых тем нет — отличная работа!"
    },
    "actions": {
        "repeatMistakes": "Повторить ошибки",
        "tryAgain": "Ещё раз",
        "trySomethingElse": "Другие темы",
        "newSession": "Новая сессия",
        "home": "Главная"
    },
    "perfect": "Идеальный результат!"
}
```

### Prerequisite C: Add `lastSessionResults` to StorageService

**File:** `src/lib/storage/types.ts` — add to `StorageService` interface:
```typescript
getLastSessionResults(): Record<string, boolean>;
setLastSessionResults(results: Record<string, boolean>): void;
```

**File:** `src/lib/storage/LocalStorageService.ts` — add to `STORAGE_KEYS`:
```typescript
LAST_SESSION_RESULTS: 'ios_last_session_results',
```

And implement the two methods:
```typescript
getLastSessionResults(): Record<string, boolean> {
    return readJson<Record<string, boolean>>(STORAGE_KEYS.LAST_SESSION_RESULTS, {});
}

setLastSessionResults(results: Record<string, boolean>): void {
    writeJson(STORAGE_KEYS.LAST_SESSION_RESULTS, results);
}
```

### Prerequisite D: Extend `progressStore` with `saveSessionResults`

**File:** `src/store/progress/progressStore.ts` — add to `ProgressState` interface:
```typescript
lastSessionResults: Record<string, boolean>;
// Actions
saveSessionResults: (results: Record<string, boolean>) => void;
```

Add to the `create` call (initial value + action):
```typescript
lastSessionResults: storageService.getLastSessionResults(),

saveSessionResults: (results: Record<string, boolean>) => {
    storageService.setLastSessionResults(results);
    set({ lastSessionResults: results }, false, { type: 'progress-store/saveSessionResults' });
},
```

### Prerequisite E: Add `setRepeatMistakes` to `sessionStore`

**File:** `src/store/session/sessionStore.ts` — add to `SessionState` interface:
```typescript
setRepeatMistakes: (questions: Question[]) => void;
```

Add to the `create` call:
```typescript
setRepeatMistakes: (questionList: Question[]) => {
    set(
        { questionList, currentIndex: 0, answers: {}, skipList: [] },
        false,
        { type: 'session-store/setRepeatMistakes' }
    );
},
```

**Why `setRepeatMistakes` instead of `resetSession + setQuestionList`:** `resetSession` clears `config` to `null`. When the user navigates to `/session/play` after repeat, `useSessionSetup` checks `if (!config) → navigate home`. `setRepeatMistakes` preserves `config` while clearing answer/navigation state, allowing the play page to work without re-sampling.

---

## Tasks / Subtasks

- [x] Task 0: Prerequisites (A + B + C + D + E above)
  - [x] Update `src/lib/i18n/constants.ts` — add 'summary' to LAZY_NAMESPACES
  - [x] Create `public/locales/en/summary.json`
  - [x] Create `public/locales/ru/summary.json`
  - [x] Update `src/lib/storage/types.ts` — add `getLastSessionResults` / `setLastSessionResults`
  - [x] Update `src/lib/storage/LocalStorageService.ts` — implement new storage methods
  - [x] Update `src/store/progress/progressStore.ts` — add `lastSessionResults` + `saveSessionResults`
  - [x] Update `src/store/session/sessionStore.ts` — add `setRepeatMistakes`
  - [x] `npx tsc --noEmit` passes after prerequisites

- [x] Task 1: Create `useSummaryPage` hook

  **File:** `src/pages/SummaryPage/useSummaryPage.ts`

  ```typescript
  import { useEffect, useMemo } from 'react';
  import { useNavigate } from 'react-router-dom';
  import type { Question } from '@/lib/data/schema';
  import { RoutesPath } from '@/router/routes';
  import { useProgressStore } from '@/store/progress';
  import { useSessionStore } from '@/store/session';

  const WEAK_TOPIC_THRESHOLD = 0.3; // error rate > 30% = weak

  function isCorrectAnswer(question: Question, answer: unknown): boolean {
      if (question.type === 'single-choice') {
          return typeof answer === 'number' && answer === question.correct;
      }
      // Other types (multi-choice, bug-finding, code-completion) handled in future stories
      return false;
  }

  export function useSummaryPage() {
      const navigate = useNavigate();
      const questionList = useSessionStore.use.questionList();
      const answers = useSessionStore.use.answers();
      const setRepeatMistakes = useSessionStore.use.setRepeatMistakes();
      const saveSessionResults = useProgressStore.use.saveSessionResults();

      // Guard: if no session data, redirect home
      useEffect(() => {
          if (questionList.length === 0) {
              navigate(RoutesPath.Root, { replace: true });
          }
      }, [questionList.length, navigate]);

      // Derive score and wrong questions
      const { correctCount, wrongQuestions, sessionResults } = useMemo(() => {
          let correctCount = 0;
          const wrongQuestions: Question[] = [];
          const sessionResults: Record<string, boolean> = {};

          for (const question of questionList) {
              const answer = answers[question.id];
              const correct = isCorrectAnswer(question, answer);
              sessionResults[question.id] = correct;
              if (correct) {
                  correctCount++;
              } else {
                  wrongQuestions.push(question);
              }
          }

          return { correctCount, wrongQuestions, sessionResults };
      }, [questionList, answers]);

      // Persist session results to progressStore/localStorage on first mount
      useEffect(() => {
          if (questionList.length === 0) return;
          saveSessionResults(sessionResults);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Run once on mount — sessionResults is stable after mount

      // Derive weak topics: categories with error rate > 30% in this session
      const weakTopics = useMemo(() => {
          const categoryMap: Record<string, { total: number; wrong: number }> = {};

          for (const question of questionList) {
              const cat = question.category;
              if (!categoryMap[cat]) categoryMap[cat] = { total: 0, wrong: 0 };
              categoryMap[cat].total++;
              if (!sessionResults[question.id]) categoryMap[cat].wrong++;
          }

          return Object.entries(categoryMap)
              .filter(([, { total, wrong }]) => wrong / total > WEAK_TOPIC_THRESHOLD)
              .map(([category]) => category);
      }, [questionList, sessionResults]);

      const isPerfectScore = wrongQuestions.length === 0;

      const handleRepeatMistakes = () => {
          setRepeatMistakes(wrongQuestions);
          navigate(RoutesPath.SessionPlay);
      };

      const handleHome = () => navigate(RoutesPath.Root);

      return {
          correctCount,
          totalCount: questionList.length,
          wrongCount: wrongQuestions.length,
          weakTopics,
          isPerfectScore,
          handleRepeatMistakes,
          handleHome,
      };
  }
  ```

- [x] Task 2: Replace SummaryPage stub with real implementation

  **File:** `src/pages/SummaryPage/SummaryPage.tsx` — REPLACE ENTIRE FILE:

  ```typescript
  import type { FC } from 'react';
  import { useTranslation } from 'react-i18next';
  import { Button } from '@/components/ui/button';
  import { useSummaryPage } from './useSummaryPage';

  export const SummaryPage: FC = () => {
      const { t } = useTranslation('summary');
      const {
          correctCount,
          totalCount,
          wrongCount,
          weakTopics,
          isPerfectScore,
          handleRepeatMistakes,
          handleHome,
      } = useSummaryPage();

      // During redirect (questionList empty), render nothing
      if (totalCount === 0) return null;

      return (
          <div className="flex flex-col gap-6 max-w-md mx-auto py-8 px-4">
              {/* Score */}
              <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t('score.label')}</p>
                  <p className="text-5xl font-bold tabular-nums">
                      {t('score.display', { correct: correctCount, total: totalCount })}
                  </p>
                  {isPerfectScore && (
                      <p className="mt-2 text-accent font-medium">{t('perfect')}</p>
                  )}
              </div>

              {/* Weak topics */}
              {!isPerfectScore && (
                  <div>
                      <p className="text-sm font-medium mb-2">{t('weakTopics.title')}</p>
                      {weakTopics.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('weakTopics.empty')}</p>
                      ) : (
                          <ul className="flex flex-wrap gap-2">
                              {weakTopics.map((topic) => (
                                  <li
                                      key={topic}
                                      className="px-3 py-1 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                                  >
                                      {topic}
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-3 mt-2">
                  {isPerfectScore ? (
                      <>
                          <Button onClick={handleRepeatMistakes} variant="default">
                              {t('actions.tryAgain')}
                          </Button>
                          <Button onClick={handleHome} variant="secondary">
                              {t('actions.trySomethingElse')}
                          </Button>
                      </>
                  ) : (
                      <>
                          <Button onClick={handleRepeatMistakes} variant="default">
                              {t('actions.repeatMistakes')} ({wrongCount})
                          </Button>
                          <Button onClick={handleHome} variant="secondary">
                              {t('actions.newSession')}
                          </Button>
                      </>
                  )}
                  <Button onClick={handleHome} variant="ghost">
                      {t('actions.home')}
                  </Button>
              </div>
          </div>
      );
  };

  export default SummaryPage;
  ```

- [x] Task 3: Write tests for `useSummaryPage`

  **File:** `src/pages/SummaryPage/SummaryPage.test.tsx`

  Key test cases:

  ```typescript
  // Test setup: mock sessionStore state using useSessionStoreBase.setState
  // Mock progressStore using useProgressStoreBase.setState (export it like useSessionStoreBase)

  it('redirects to / when questionList is empty (direct URL access)', ...)
  it('calculates correctCount = 2 when 2 out of 3 answers are correct', ...)
  it('isPerfectScore is true when all answers are correct', ...)
  it('shows "Repeat mistakes" button when there are wrong answers', ...)
  it('shows "Try again" and "Try something else" when perfect score', ...)
  it('identifies weak topics where error rate > 30%', ...)
  it('does NOT list topic as weak when error rate ≤ 30%', ...)
  it('calls saveSessionResults on mount', ...)
  it('calls setRepeatMistakes with wrong questions on handleRepeatMistakes', ...)
  it('navigates to /session/play after handleRepeatMistakes', ...)
  it('navigates to / on handleHome', ...)
  ```

  Test setup pattern (same as Story 1.5 for sessionStore):
  ```typescript
  import { useSessionStoreBase } from '@/store/session/sessionStore';
  import { useProgressStoreBase } from '@/store/progress/progressStore'; // export this

  // In beforeEach:
  useSessionStoreBase.setState({
      questionList: [mockSingleChoiceQuestion],
      answers: { 'q-001': 0 }, // 0 is correct in mock
      currentIndex: 0,
      config: null,
      skipList: [],
      timerMs: 0,
  });
  ```

  Mock question for tests:
  ```typescript
  const mockQuestion = {
      id: 'q-001',
      type: 'single-choice' as const,
      category: 'JavaScript',
      difficulty: 'easy' as const,
      tags: [],
      question: 'What is 2+2?',
      explanation: 'Basic math.',
      options: ['3', '4', '5'],
      correct: 1, // index 1 = '4'
  };
  ```

  **IMPORTANT:** Export `useProgressStoreBase` from `src/store/progress/progressStore.ts` (same pattern as `useSessionStoreBase`):
  ```typescript
  export { useProgressStoreBase }; // add to bottom of progressStore.ts
  ```

- [x] Task 4: DevPlayground section — add SummaryPage states

  Add a "Summary" section to `/dev-playground` showing:
  - Summary with wrong answers (Repeat mistakes CTA visible)
  - Perfect score summary (Try again / Try something else CTAs)

  Use mocked `useSummaryPage` return values or pass props directly. Keep minimal — just enough to see both states.

- [x] Task 5: Verification

  - [x] `npm run format` — no errors
  - [x] `npm run lint` — clean
  - [x] `npx tsc --noEmit` — clean
  - [x] `npm run test` — all 88 tests pass (13 new)
  - [ ] Manual: answer all questions → land on `/session/summary` → score shows → tap "Repeat mistakes" → only wrong questions appear in new session → navigate to `/session/summary` again → data correct

---

## Dev Notes

### CRITICAL: Directory Naming — PascalCase Always

All component/page directories use PascalCase. `SummaryPage/` is already correct. Do NOT create `summary-page/` or any kebab-case variant.

### CRITICAL: `setRepeatMistakes` MUST Preserve `config`

Do NOT call `resetSession()` before `setRepeatMistakes`. `resetSession` clears `config = null`, causing `useSessionSetup` to redirect to home on the play page mount. `setRepeatMistakes` sets only `{ questionList, currentIndex: 0, answers: {}, skipList: [] }` — leaving `config` and `timerMs` untouched.

### CRITICAL: `useSessionSetup` Skips Re-Sampling

`useSessionSetup` has this guard: `if (questionList.length > 0) return;`

After `setRepeatMistakes(wrongQuestions)`, `questionList.length > 0`, so `useSessionSetup` will NOT re-fetch or re-sample. The wrong questions become the new session list directly. This is correct behaviour.

### CRITICAL: `isCorrectAnswer` Only Handles `single-choice` in This Story

Story 1.6 exists in a world where only single-choice questions are implemented. Multi-choice, bug-finding, and code-completion question types are Stories 2.1–2.4. The `isCorrectAnswer` function returns `false` for all non-single-choice types (safe default — they appear in wrongQuestions). Do NOT try to implement other type evaluations here.

### CRITICAL: Design Token Colors — Never Raw Tailwind

Same rule as Story 1.5:
| ✅ USE | ❌ DO NOT USE |
|--------|---------------|
| `text-accent` | `text-green-500` |
| `bg-muted` | `bg-gray-100` |
| `text-muted-foreground` | `text-gray-500` |
| `border-border` | `border-gray-200` |

### CRITICAL: `saveSessionResults` Called ONCE on Mount

The `useEffect` for `saveSessionResults` has an empty dependency array `[]`. It runs once when SummaryPage mounts. Do NOT add `sessionResults` to the deps array — this would re-save on every re-render.

ESLint will warn about the missing dep. Suppress with:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // intentional — save once on mount
```

### `useMemo` Dependency on `sessionResults`

`sessionResults` is derived inside the first `useMemo` block (alongside `correctCount` and `wrongQuestions`). The `weakTopics` `useMemo` depends on `sessionResults`. Both `useMemo` blocks have stable deps (`questionList`, `answers`) — they only recompute if the store changes, which it doesn't during summary view.

### File Structure — Complete

```
src/
  pages/
    SummaryPage/
      SummaryPage.tsx          ← REPLACE (stub → real)
      useSummaryPage.ts        ← NEW
      SummaryPage.test.tsx     ← NEW
      index.ts                 ← NO CHANGE (lazy export already correct)
  store/
    session/
      sessionStore.ts          ← MODIFY (add setRepeatMistakes + export useSessionStoreBase already done)
    progress/
      progressStore.ts         ← MODIFY (add lastSessionResults + saveSessionResults + export useProgressStoreBase)
  lib/
    i18n/
      constants.ts             ← MODIFY (add 'summary' to LAZY_NAMESPACES)
    storage/
      types.ts                 ← MODIFY (add getLastSessionResults/setLastSessionResults to interface)
      LocalStorageService.ts   ← MODIFY (add LAST_SESSION_RESULTS key + implement methods)
public/
  locales/
    en/
      summary.json             ← NEW
    ru/
      summary.json             ← NEW
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/pages/SummaryPage/index.ts` | Lazy export already correct from Story 1.5 |
| `src/router/modules/base.routes.tsx` | SummaryPage route already wired in Story 1.5 |
| `src/router/routes.ts` | `SessionSummary` + `SessionPlay` paths already defined |
| `src/hooks/session/useSessionSetup.ts` | No changes needed — skip logic works correctly |
| `src/lib/algorithm/` | Adaptive algorithm is Story 4.x |
| `src/components/features/QuestionCard/` | Story 1.5 complete |
| `src/store/ui/` | No changes needed |

### Key Data Flow for Story 1.6

```
User answers last question → SessionPlayPage → navigate('/session/summary')
  └─ SummaryPage mounts
       └─ useSummaryPage()
            ├─ reads questionList + answers from sessionStore (still populated)
            ├─ computes: correctCount, wrongQuestions, sessionResults (Record<string, boolean>)
            ├─ useEffect[]: saveSessionResults(sessionResults) → progressStore → localStorage
            ├─ computes weakTopics from sessionResults (categories with error rate > 30%)
            └─ returns derived data + handlers to SummaryPage

User taps "Repeat mistakes":
  → setRepeatMistakes(wrongQuestions)   [sessionStore: sets new questionList, clears answers, KEEPS config]
  → navigate('/session/play')
  → SessionPlayPage mounts → useSessionSetup sees questionList.length > 0 → skips re-sample ✓

User taps "New session" or "Home":
  → navigate('/')
```

### sessionStore Selectors Used

```typescript
const questionList = useSessionStore.use.questionList();       // Question[]
const answers = useSessionStore.use.answers();                 // Record<string, Answer>
const setRepeatMistakes = useSessionStore.use.setRepeatMistakes(); // (questions: Question[]) => void
```

### progressStore Selectors Used

```typescript
const saveSessionResults = useProgressStore.use.saveSessionResults(); // (results: Record<string, boolean>) => void
```

### Test Helper: Export `useProgressStoreBase`

Add to bottom of `src/store/progress/progressStore.ts`:
```typescript
export { useProgressStoreBase };
```

Then in tests:
```typescript
import { useProgressStoreBase } from '@/store/progress/progressStore';

// Reset progress store between tests:
beforeEach(() => {
    useProgressStoreBase.setState({
        weights: {},
        errorRates: {},
        streak: { current: 0, lastActivityDate: '' },
        records: {},
        lastSessionResults: {},
    });
});
```

### CTA Logic Summary

| Condition | Primary CTA | Secondary CTA | Ghost CTA |
|-----------|-------------|---------------|-----------|
| `wrongCount > 0` | "Repeat mistakes (N)" | "New session" | "Home" |
| `isPerfectScore` | "Try again" | "Try something else" | "Home" |

Both "New session" and "Try something else" navigate to `/` (home). They are intentionally the same action with different labels to match the emotional state.

### Post-Edit Verification Commands

```bash
npm run format
npm run lint
npx tsc --noEmit
npm run test
```

All 4 must pass before marking complete.

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Implemented `useSummaryPage` hook with score calculation, weak topic detection (>30% error rate), and navigation handlers
- Replaced SummaryPage stub with full implementation using `summary` i18n namespace
- Added `setRepeatMistakes` to sessionStore — preserves `config` while resetting answers/index (critical for useSessionSetup skip-guard)
- Extended progressStore with `lastSessionResults` + `saveSessionResults` persisted via LocalStorageService
- Extended StorageService interface and LocalStorageService with `getLastSessionResults`/`setLastSessionResults`
- Added `summary` namespace to LAZY_NAMESPACES and created locale files (en + ru)
- Exported `useProgressStoreBase` for test state control
- Updated test-utils.tsx to include `summary` namespace translations
- 13 new tests in SummaryPage.test.tsx — all pass; total suite: 88 tests
- DevPlayground: added "Summary Page States" section with two visual states (wrong answers / perfect score)

### File List

- `src/lib/i18n/constants.ts` — added 'summary' to LAZY_NAMESPACES
- `public/locales/en/summary.json` — new locale file
- `public/locales/ru/summary.json` — new locale file
- `src/lib/storage/types.ts` — added getLastSessionResults/setLastSessionResults to StorageService interface
- `src/lib/storage/LocalStorageService.ts` — added LAST_SESSION_RESULTS key + implemented methods
- `src/store/progress/progressStore.ts` — added lastSessionResults, saveSessionResults, exported useProgressStoreBase
- `src/store/session/sessionStore.ts` — added setRepeatMistakes
- `src/pages/SummaryPage/useSummaryPage.ts` — new hook
- `src/pages/SummaryPage/SummaryPage.tsx` — replaced stub with real implementation
- `src/pages/SummaryPage/SummaryPage.test.tsx` — 13 tests for useSummaryPage
- `src/pages/DevPlayground/DevPlayground.tsx` — added Summary States section
- `src/test/test-utils.tsx` — added summary namespace import

### Change Log

- 2026-03-26: Story 1.6 created — Post-Session Summary
- 2026-03-26: Story 1.6 implemented — all tasks complete, 88 tests passing
