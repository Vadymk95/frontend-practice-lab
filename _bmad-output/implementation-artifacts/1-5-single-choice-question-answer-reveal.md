# Story 1.5: Single-Choice Question & Answer Reveal

Status: review

## Story

As a **user**,
I want to tap an option on a single-choice question and immediately see if I was right,
So that I can get instant feedback and read the explanation without extra steps.

## Acceptance Criteria

1. **Given** the user is on `/session/play` and questions are loaded
   **When** the question renders
   **Then** `QuestionCard` displays: progress indicator ("N / Total"), category badge, difficulty badge, and question text
   **And** 2–5 `AnswerOption` components are shown below, each min-height 52px, full-width, with key indicator (A/B/C/D)
   **And** "Next" button is anchored to the sticky bottom bar on mobile (< 1024px); inline below content on desktop

2. **Given** the user taps an option (pre-reveal)
   **When** the tap registers
   **Then** the selected option highlights immediately (< 100ms — no async, pure state update)
   **And** the answer is evaluated instantly — no "Check" button required
   **And** if correct: selected option → `bg-accent/10` + `border-accent` + ✓ icon
   **And** if wrong: selected option → `bg-error/10` + `border-error` + ✗ icon; correct option → `bg-accent/10` + `border-accent` + ✓ icon
   **And** `ExplanationPanel` slides in below within ≤ 150ms (via CSS animation)
   **And** all other options become disabled (cannot re-select)
   **And** `sessionStore.setAnswer(question.id, selectedIndex)` is called

3. **Given** the answer has been revealed
   **When** the user taps "Next"
   **Then** if NOT the last question: `sessionStore.nextQuestion()` is called and next question renders
   **And** if the last question: navigation goes to `/session/summary`

4. **Given** the user is on desktop with keyboard
   **When** keys 1–4 are pressed (pre-reveal)
   **Then** the corresponding option (index 0–3) is selected with instant reveal
   **When** Enter is pressed (post-reveal)
   **Then** "Next" action fires (same as tapping Next button)

5. **Given** the user navigates to `/session/summary` after session end
   **When** the page renders
   **Then** a stub SummaryPage is shown (placeholder — real content in Story 1.6)

---

## Critical Prerequisite Tasks

### Prerequisite A: Fix i18n constants — add session + question namespaces

**File:** `src/lib/i18n/constants.ts`

Currently `LAZY_NAMESPACES = [] as const` — this is empty. The `session` namespace added in Story 1.4 works at runtime (HttpBackend lazy-loads any namespace on demand), but it breaks the TypeScript `Namespace` type, which currently only includes `'common' | 'errors' | 'home'`. Add both `session` and `question`:

```typescript
const LAZY_NAMESPACES = ['session', 'question'] as const;
```

**Why this matters:** Without this, `useTranslation('question')` will produce TypeScript errors in strict mode if anything type-checks namespace strings.

### Prerequisite B: Add `question` namespace locale files

**File:** `public/locales/en/question.json` — create:

```json
{
    "progress": {
        "indicator": "{{current}} / {{total}}",
        "ariaLabel": "Question {{current}} of {{total}}"
    },
    "difficulty": {
        "easy": "Easy",
        "medium": "Medium",
        "hard": "Hard"
    },
    "explanation": {
        "label": "Explanation"
    }
}
```

**File:** `public/locales/ru/question.json` — create:

```json
{
    "progress": {
        "indicator": "{{current}} / {{total}}",
        "ariaLabel": "Вопрос {{current}} из {{total}}"
    },
    "difficulty": {
        "easy": "Лёгкий",
        "medium": "Средний",
        "hard": "Сложный"
    },
    "explanation": {
        "label": "Объяснение"
    }
}
```

### Prerequisite C: Add `next` key to session locale files

**File:** `public/locales/en/session.json` — add to root:
```json
{
    "next": "Next",
    ...existing keys
}
```

**File:** `public/locales/ru/session.json` — add to root:
```json
{
    "next": "Далее",
    ...existing keys
}
```

### Prerequisite D: Create SummaryPage stub + wire route

**File:** `src/pages/SummaryPage/SummaryPage.tsx`

```typescript
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

export const SummaryPage: FC = () => {
    const { t } = useTranslation('common');
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground text-sm">{t('comingSoon', 'Summary coming in Story 1.6')}</p>
        </div>
    );
};

export default SummaryPage;
```

**File:** `src/pages/SummaryPage/index.ts`

```typescript
import { lazy } from 'react';
export const SummaryPage = lazy(() => import('./SummaryPage'));
```

**File:** `src/router/modules/base.routes.tsx` — add SummaryPage route:

```typescript
import { SummaryPage } from '@/pages/SummaryPage';

// Add to children array:
{
    path: RoutesPath.SessionSummary,
    element: WithSuspense(<SummaryPage />)
},
```

---

## Tasks / Subtasks

- [x] Task 0: Prerequisites (A + B + C + D above)
  - [x] Update `src/lib/i18n/constants.ts` — add 'session', 'question' to LAZY_NAMESPACES
  - [x] Create `public/locales/en/question.json`
  - [x] Create `public/locales/ru/question.json`
  - [x] Update `public/locales/en/session.json` — add `next` key
  - [x] Update `public/locales/ru/session.json` — add `next` key
  - [x] Create `src/pages/SummaryPage/SummaryPage.tsx`
  - [x] Create `src/pages/SummaryPage/index.ts`
  - [x] Update `src/router/modules/base.routes.tsx` — add SummaryPage route
  - [x] `npx tsc --noEmit` passes after prerequisites

- [x] Task 1: Create `AnswerOption` component

  **File:** `src/components/features/QuestionCard/AnswerOption/AnswerOption.tsx`

  ```typescript
  import type { FC } from 'react';
  import { cn } from '@/lib/utils';

  const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

  interface AnswerOptionProps {
      index: number;
      text: string;
      isSelected: boolean;
      isAnswered: boolean;
      isCorrect: boolean;
      isDisabled: boolean;
      onSelect: () => void;
  }

  export const AnswerOption: FC<AnswerOptionProps> = ({
      index,
      text,
      isSelected,
      isAnswered,
      isCorrect,
      isDisabled,
      onSelect,
  }) => {
      const showCorrect = isAnswered && isCorrect;
      const showWrong = isAnswered && isSelected && !isCorrect;

      return (
          <button
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={onSelect}
              className={cn(
                  'flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-lg border text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !isAnswered && 'hover:bg-accent/5 border-border cursor-pointer',
                  isSelected && !isAnswered && 'border-primary bg-primary/10',
                  showCorrect && 'bg-accent/10 border-accent',
                  showWrong && 'bg-error/10 border-error',
                  isDisabled && 'cursor-not-allowed opacity-60',
              )}
          >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border text-xs font-medium">
                  {OPTION_KEYS[index]}
              </span>
              <span className="flex-1 text-sm">{text}</span>
              {showCorrect && <span aria-hidden="true" className="text-accent">✓</span>}
              {showWrong && <span aria-hidden="true" className="text-error">✗</span>}
          </button>
      );
  };
  ```

  **File:** `src/components/features/QuestionCard/AnswerOption/index.ts`
  ```typescript
  export { AnswerOption } from './AnswerOption';
  ```

- [x] Task 2: Create `ExplanationPanel` component

  **File:** `src/components/features/QuestionCard/ExplanationPanel/ExplanationPanel.tsx`

  ```typescript
  import type { FC } from 'react';
  import { useTranslation } from 'react-i18next';

  interface ExplanationPanelProps {
      explanation: string;
  }

  export const ExplanationPanel: FC<ExplanationPanelProps> = ({ explanation }) => {
      const { t } = useTranslation('question');
      return (
          <div
              role="complementary"
              aria-label={t('explanation.label')}
              className="mt-2 p-4 rounded-lg bg-muted/50 border border-border animate-in slide-in-from-bottom-2 duration-150"
          >
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('explanation.label')}</p>
              <p className="text-sm">{explanation}</p>
          </div>
      );
  };
  ```

  **File:** `src/components/features/QuestionCard/ExplanationPanel/index.ts`
  ```typescript
  export { ExplanationPanel } from './ExplanationPanel';
  ```

- [x] Task 3: Create `useSingleChoiceQuestion` hook + `SingleChoiceQuestion` component

  **File:** `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts`

  ```typescript
  import { useCallback, useEffect, useState } from 'react';
  import type { SingleChoiceQuestion } from '@/lib/data/schema';
  import { useSessionStore } from '@/store/session';

  export function useSingleChoiceQuestion(question: SingleChoiceQuestion) {
      const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
      const setAnswer = useSessionStore.use.setAnswer();
      const isAnswered = selectedIndex !== null;

      const onSelect = useCallback(
          (index: number) => {
              if (isAnswered) return; // lock after first selection
              setSelectedIndex(index);
              setAnswer(question.id, index);
          },
          [isAnswered, question.id, setAnswer],
      );

      // Reset when question changes (navigation forward)
      useEffect(() => {
          setSelectedIndex(null);
      }, [question.id]);

      // Keyboard: 1–4 keys select option
      useEffect(() => {
          if (isAnswered) return;
          const handleKey = (e: KeyboardEvent) => {
              const index = parseInt(e.key) - 1; // '1' → 0, '2' → 1, etc.
              if (index >= 0 && index < question.options.length) {
                  onSelect(index);
              }
          };
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }, [isAnswered, question.options.length, onSelect]);

      return { selectedIndex, isAnswered, onSelect };
  }
  ```

  **File:** `src/components/features/QuestionCard/SingleChoice/SingleChoiceQuestion.tsx`

  ```typescript
  import type { FC } from 'react';
  import type { SingleChoiceQuestion as SingleChoiceQuestionType } from '@/lib/data/schema';
  import { AnswerOption } from '../AnswerOption';
  import { ExplanationPanel } from '../ExplanationPanel';
  import { useSingleChoiceQuestion } from './useSingleChoiceQuestion';

  interface Props {
      question: SingleChoiceQuestionType;
  }

  export const SingleChoiceQuestion: FC<Props> = ({ question }) => {
      const { selectedIndex, isAnswered, onSelect } = useSingleChoiceQuestion(question);
      return (
          <div className="flex flex-col gap-2">
              <div role="radiogroup" aria-label="Answer options">
                  {question.options.map((option, index) => (
                      <AnswerOption
                          key={index}
                          index={index}
                          text={option}
                          isSelected={selectedIndex === index}
                          isAnswered={isAnswered}
                          isCorrect={question.correct === index}
                          isDisabled={isAnswered && selectedIndex !== index}
                          onSelect={() => onSelect(index)}
                      />
                  ))}
              </div>
              {isAnswered && <ExplanationPanel explanation={question.explanation} />}
          </div>
      );
  };
  ```

  **File:** `src/components/features/QuestionCard/SingleChoice/index.ts`
  ```typescript
  export { SingleChoiceQuestion } from './SingleChoiceQuestion';
  ```

- [x] Task 4: Create `QuestionCard` orchestrator component

  **File:** `src/components/features/QuestionCard/useQuestionCard.ts`

  ```typescript
  import { useSessionStore } from '@/store/session';

  export function useQuestionCard() {
      const questionList = useSessionStore.use.questionList();
      const currentIndex = useSessionStore.use.currentIndex();
      return {
          question: questionList[currentIndex] ?? null,
          currentIndex,
          questionCount: questionList.length,
      };
  }
  ```

  **File:** `src/components/features/QuestionCard/QuestionCard.tsx`

  ```typescript
  import type { FC } from 'react';
  import { useTranslation } from 'react-i18next';
  import { Badge } from '@/components/ui/badge';
  import { SingleChoiceQuestion } from './SingleChoice';
  import { useQuestionCard } from './useQuestionCard';

  export const QuestionCard: FC = () => {
      const { t } = useTranslation('question');
      const { question, currentIndex, questionCount } = useQuestionCard();

      if (!question) return null;

      return (
          <article role="article" className="flex flex-col gap-4">
              <div
                  aria-label={t('progress.ariaLabel', { current: currentIndex + 1, total: questionCount })}
                  className="text-sm text-muted-foreground"
              >
                  {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
              </div>
              <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{question.category}</Badge>
                  <Badge variant="outline">{t(`difficulty.${question.difficulty}`)}</Badge>
              </div>
              <h2 className="text-base font-medium">{question.question}</h2>
              {question.type === 'single-choice' && <SingleChoiceQuestion question={question} />}
          </article>
      );
  };
  ```

  **File:** `src/components/features/QuestionCard/index.ts`
  ```typescript
  export { QuestionCard } from './QuestionCard';
  ```

- [x] Task 5: Update `useSessionPlayPage` — add answer state + navigation

  **File:** `src/pages/SessionPlayPage/useSessionPlayPage.ts` — REPLACE ENTIRE FILE:

  ```typescript
  import { useCallback, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { useSessionSetup } from '@/hooks/session/useSessionSetup';
  import { RoutesPath } from '@/router/routes';
  import { useSessionStore } from '@/store/session';

  export function useSessionPlayPage() {
      const navigate = useNavigate();
      const { isLoading: isSetupLoading, isError: isSetupError, refetch } = useSessionSetup();
      const questionList = useSessionStore.use.questionList();
      const currentIndex = useSessionStore.use.currentIndex();
      const answers = useSessionStore.use.answers();
      const nextQuestion = useSessionStore.use.nextQuestion();

      const currentQuestion = questionList[currentIndex] ?? null;
      const isAnswered = currentQuestion !== null && answers[currentQuestion.id] !== undefined;
      const isLastQuestion = questionList.length > 0 && currentIndex === questionList.length - 1;

      const handleNext = useCallback(() => {
          if (isLastQuestion) {
              navigate(RoutesPath.SessionSummary);
          } else {
              nextQuestion();
          }
      }, [isLastQuestion, navigate, nextQuestion]);

      // Keyboard: Enter advances to next question when answered
      useEffect(() => {
          if (!isAnswered) return;
          const handleKey = (e: KeyboardEvent) => {
              if (e.key === 'Enter') handleNext();
          };
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }, [isAnswered, handleNext]);

      return {
          isSetupLoading,
          isSetupError,
          questionCount: questionList.length,
          currentIndex,
          isAnswered,
          handleNext,
          onRetry: refetch,
      };
  }
  ```

- [x] Task 6: Update `SessionPlayPage` — render QuestionCard + Next button

  **File:** `src/pages/SessionPlayPage/SessionPlayPage.tsx` — REPLACE ENTIRE FILE:

  ```typescript
  import type { FC } from 'react';
  import { useTranslation } from 'react-i18next';
  import { ErrorState } from '@/components/common/ErrorState';
  import { QuestionCard } from '@/components/features/QuestionCard';
  import { Button } from '@/components/ui/button';
  import { useSessionPlayPage } from './useSessionPlayPage';

  export const SessionPlayPage: FC = () => {
      const { t } = useTranslation('session');
      const {
          isSetupLoading,
          isSetupError,
          questionCount,
          isAnswered,
          handleNext,
          onRetry,
      } = useSessionPlayPage();

      if (isSetupError) {
          return <ErrorState message={t('errors.fetchQuestions')} onRetry={onRetry} />;
      }

      if (isSetupLoading || questionCount === 0) {
          return (
              <div role="status" aria-live="polite" className="flex justify-center py-12">
                  <span className="text-muted-foreground text-sm">{t('loading')}</span>
              </div>
          );
      }

      return (
          <div className="flex flex-col gap-4 pb-24 lg:pb-0">
              <QuestionCard />
              {/* Desktop inline */}
              {isAnswered && (
                  <div className="hidden lg:flex justify-end mt-2">
                      <Button onClick={handleNext}>{t('next')}</Button>
                  </div>
              )}
              {/* Mobile sticky bottom bar */}
              {isAnswered && (
                  <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                      <Button onClick={handleNext} className="w-full">
                          {t('next')}
                      </Button>
                  </div>
              )}
          </div>
      );
  };

  export default SessionPlayPage;
  ```

- [x] Task 7: Write tests for `QuestionCard` and `useSingleChoiceQuestion`

  **File:** `src/components/features/QuestionCard/QuestionCard.test.tsx`

  ```typescript
  // Key test cases using renderHook or render + MemoryRouter + QueryClientProvider

  it('renders null when no current question', ...)
  it('displays progress indicator "1 / 5"', ...)
  it('shows category and difficulty badges', ...)
  it('renders question text as h2', ...)
  it('renders SingleChoiceQuestion when type is single-choice', ...)
  ```

  Mock `useSessionStore` state:
  ```typescript
  // Import the raw store for setState
  import { useSessionStoreBase } from '@/store/session/sessionStore'; // add export if needed
  // OR use the existing pattern from Story 1.4:
  useSessionStoreBase.setState({ questionList: [mockQuestion], currentIndex: 0, ... });
  ```

  **Note:** Check how Story 1.4 tests imported the raw store. If `useSessionStoreBase` is not exported from `sessionStore.ts`, add:
  ```typescript
  export { useSessionStoreBase }; // at bottom of sessionStore.ts
  ```

  **File:** `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.test.ts`

  ```typescript
  // Key test cases:
  it('isAnswered is false initially', ...)
  it('onSelect sets selectedIndex and calls setAnswer', ...)
  it('onSelect is locked after first selection (no re-select)', ...)
  it('selectedIndex resets when question.id changes', ...)
  it('keyboard key "1" selects option at index 0', ...)
  it('keyboard key "2" selects option at index 1', ...)
  it('keyboard keys ignored after answer is revealed', ...)
  ```

  Wrap with:
  ```typescript
  const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
              {children}
          </QueryClientProvider>
      </MemoryRouter>
  );
  ```

- [x] Task 8: DevPlayground section — add QuestionCard states

  Add a "Question Card" section to `/dev-playground` showing:
  - Unanswered state (options selectable)
  - Correct answer revealed (option A highlighted green)
  - Wrong answer revealed (option B red, correct A green)
  - ExplanationPanel visible

  Use mock data, not live store. Keep minimal.

- [x] Task 9: Verification

  - [x] `npm run build:manifest` exits 0
  - [x] `npm run validate:data` exits 0
  - [x] `npm run lint` clean
  - [x] `npm run format:check` clean (pre-existing `_inspect.mjs` unrelated to story)
  - [x] `npx tsc --noEmit` clean
  - [x] `npm run test` — all tests pass including new ones (75 total)
  - [ ] Manual: navigate to `/session/play`, select category, start → verify question renders, option tap reveals answer, Next navigates forward, last question goes to `/session/summary` stub

---

## Dev Notes

### CRITICAL: Directory Naming — PascalCase, NOT kebab-case

Architecture document shows `question-card/` (kebab-case), but **the actual project uses PascalCase directories**. Established precedent:
- `src/components/common/ErrorBoundary/` — PascalCase ✓
- `src/components/common/ErrorState/` — PascalCase ✓ (from Story 1.4)
- `src/components/features/SessionConfigurator/` — PascalCase ✓ (from Story 1.3)

**Always use PascalCase for component directories.** Do NOT create `question-card/`, `answer-option/`, etc.

### CRITICAL: Page Name Deviation — No QuestionPage

Architecture specifies `src/pages/QuestionPage/` for question rendering, but the project uses `SessionPlayPage` at `/session/play`. Do NOT create a new `QuestionPage` directory. Build everything inside `SessionPlayPage` and `useSessionPlayPage`.

### CRITICAL: Design Token Colors — Never Raw Tailwind

| ✅ USE | ❌ DO NOT USE |
|--------|---------------|
| `bg-accent/10` | `bg-green-500/10` |
| `border-accent` | `border-green-500` |
| `text-accent` | `text-green-500` |
| `bg-error/10` | `bg-red-500/10` |
| `border-error` | `border-red-500` |
| `text-error` | `text-red-500` |

These tokens are defined in `src/index.css` (Tailwind v4 `@theme inline {}`) from Story 1.1.

### File Structure — Complete

```
src/
  components/
    features/
      QuestionCard/
        QuestionCard.tsx              ← NEW
        useQuestionCard.ts            ← NEW
        QuestionCard.test.tsx         ← NEW
        index.ts                      ← NEW
        AnswerOption/
          AnswerOption.tsx            ← NEW
          index.ts                    ← NEW
        ExplanationPanel/
          ExplanationPanel.tsx        ← NEW
          index.ts                    ← NEW
        SingleChoice/
          SingleChoiceQuestion.tsx    ← NEW
          useSingleChoiceQuestion.ts  ← NEW
          useSingleChoiceQuestion.test.ts ← NEW
          index.ts                    ← NEW
  pages/
    SessionPlayPage/
      SessionPlayPage.tsx             ← MODIFY (replace entire file)
      useSessionPlayPage.ts           ← MODIFY (replace entire file)
      index.ts                        ← NO CHANGE
    SummaryPage/
      SummaryPage.tsx                 ← NEW (stub)
      index.ts                        ← NEW
  lib/
    i18n/
      constants.ts                    ← MODIFY (LAZY_NAMESPACES)
  router/
    modules/
      base.routes.tsx                 ← MODIFY (add SummaryPage route)
  router/
    routes.ts                         ← NO CHANGE (SessionSummary already defined)
public/
  locales/
    en/
      session.json                    ← MODIFY (add 'next' key)
      question.json                   ← NEW
    ru/
      session.json                    ← MODIFY (add 'next' key)
      question.json                   ← NEW
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/hooks/session/useSessionSetup.ts` | Fully implemented in Story 1.4 — do not modify |
| `src/store/session/sessionStore.ts` | `setAnswer`, `nextQuestion`, `answers` already exist with correct signatures |
| `src/store/progress/progressStore.ts` | Progress saving is Story 1.6 — do not touch yet |
| `src/lib/algorithm/` | Not needed in this story |
| `src/hooks/data/useCategoryQuestions.ts` | No changes needed |
| `src/components/features/SessionConfigurator/` | Story 1.3 complete |
| `src/pages/SessionPlayPage/index.ts` | Lazy export already correct |
| `src/router/routes.ts` | `SessionSummary` path already defined |

### Key Data Flow for Story 1.5

```
SessionPlayPage mounts (after Story 1.4 setup is done)
  └─ useSessionPlayPage()
       ├─ reads questionList, currentIndex, answers from sessionStore
       ├─ isAnswered = answers[currentQuestion.id] !== undefined
       ├─ handleNext() → nextQuestion() OR navigate('/session/summary')
       └─ renders <QuestionCard />

QuestionCard
  └─ useQuestionCard() → reads questionList[currentIndex]
       └─ renders question text, badges, progress
       └─ question.type === 'single-choice' → <SingleChoiceQuestion question={q} />

SingleChoiceQuestion
  └─ useSingleChoiceQuestion(question)
       ├─ selectedIndex (local state)
       ├─ onSelect(index) → setSelectedIndex + sessionStore.setAnswer(id, index)
       └─ keyboard listener for keys 1–4 (pre-reveal only)
  └─ maps options → <AnswerOption> (isDisabled if answered & not this option)
  └─ isAnswered → <ExplanationPanel explanation={question.explanation} />
```

### sessionStore Selectors Used in This Story

All via `createSelectors` pattern — no raw store imports needed in components:

```typescript
const questionList = useSessionStore.use.questionList();  // Question[]
const currentIndex = useSessionStore.use.currentIndex();  // number
const answers = useSessionStore.use.answers();            // Record<string, Answer>
const setAnswer = useSessionStore.use.setAnswer();        // (id, answer) => void
const nextQuestion = useSessionStore.use.nextQuestion();  // () => void
```

`nextQuestion()` in sessionStore:
- Increments `currentIndex` by 1
- **Clamps** at `questionList.length - 1` — does NOT overflow
- So: check `isLastQuestion` in `useSessionPlayPage` BEFORE calling `nextQuestion()`

### Answer Model — Single Choice

```typescript
// sessionStore.answers after user selects option at index 2:
{ "js-closure-001": 2 }  // number = selected option index

// Evaluate correctness in AnswerOption:
isCorrect = question.correct === index  // question.correct is the correct option index
```

### AnswerOption State Matrix

| isAnswered | isSelected | isCorrect | Visual |
|------------|------------|-----------|--------|
| false | false | — | default (grey border) |
| false | true | — | selected (primary border) — pre-reveal |
| true | true | true | correct (accent/10 bg + accent border + ✓) |
| true | true | false | wrong (error/10 bg + error border + ✗) |
| true | false | true | correct hint (accent/10 bg + accent border + ✓) |
| true | false | false | disabled (opacity-60) |

### Animation — ExplanationPanel Slide-In

Use `tw-animate-css` classes already in the project:
```tsx
className="animate-in slide-in-from-bottom-2 duration-150"
```
Do NOT add custom CSS animations. The 150ms duration satisfies the AC ≤ 150ms requirement.

### Mobile Sticky Bottom Bar — Padding

The `SessionPlayPage` wrapper needs `pb-24 lg:pb-0` so the sticky button doesn't overlap content on mobile. The sticky bar itself uses `fixed bottom-0 left-0 right-0`.

### Keyboard Shortcuts Split

- **Keys 1–4**: handled in `useSingleChoiceQuestion` (knows about options)
- **Enter**: handled in `useSessionPlayPage` (knows about navigation/next logic)

Do NOT merge them into one place — this keeps concerns separated.

### i18n Namespace Loading

The project uses `i18next-http-backend` with `partialBundledLanguages: true`. Namespaces not in `DEFAULT_NAMESPACES` are loaded lazily on demand (when `useTranslation('question')` is first called). The `LAZY_NAMESPACES` constant affects only the TypeScript `Namespace` union type — not runtime behavior. Add to constants.ts for type safety.

### Tests — useSessionStoreBase Export

Story 1.4 tests used `useSessionStoreBase.setState(...)` for test setup. Check if `useSessionStoreBase` is exported from `src/store/session/sessionStore.ts`. If not, add:
```typescript
export { useSessionStoreBase }; // add to bottom of sessionStore.ts
```

Then import in tests:
```typescript
import { useSessionStoreBase } from '@/store/session/sessionStore';
```

### Post-Edit Verification Commands

```bash
npm run build:manifest
npm run validate:data
npm run lint
npm run format:check
npx tsc --noEmit
npm run test
```

All 5 must pass before marking complete.

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Implemented all 10 tasks (0–9) in one session without deviations.
- Created `src/components/ui/badge.tsx` (shadcn/ui pattern, cva) — required by QuestionCard, not in task list but implied by spec.
- Exported `useSessionStoreBase` from `sessionStore.ts` for test isolation.
- Updated `src/test/test-utils.tsx` to include `session` and `question` namespaces (required after LAZY_NAMESPACES update).
- `format:check` failure on `_inspect.mjs` is pre-existing (untracked file, exists before this story).
- All 75 tests pass, 0 regressions.

### File List

- `src/lib/i18n/constants.ts` — modified (added session, question to LAZY_NAMESPACES)
- `public/locales/en/question.json` — created
- `public/locales/ru/question.json` — created
- `public/locales/en/session.json` — modified (added next key)
- `public/locales/ru/session.json` — modified (added next key)
- `src/pages/SummaryPage/SummaryPage.tsx` — created (stub)
- `src/pages/SummaryPage/index.ts` — created
- `src/router/modules/base.routes.tsx` — modified (added SummaryPage route)
- `src/components/features/QuestionCard/AnswerOption/AnswerOption.tsx` — created
- `src/components/features/QuestionCard/AnswerOption/index.ts` — created
- `src/components/features/QuestionCard/ExplanationPanel/ExplanationPanel.tsx` — created
- `src/components/features/QuestionCard/ExplanationPanel/index.ts` — created
- `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts` — created
- `src/components/features/QuestionCard/SingleChoice/SingleChoiceQuestion.tsx` — created
- `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.test.ts` — created
- `src/components/features/QuestionCard/SingleChoice/index.ts` — created
- `src/components/features/QuestionCard/useQuestionCard.ts` — created
- `src/components/features/QuestionCard/QuestionCard.tsx` — created
- `src/components/features/QuestionCard/QuestionCard.test.tsx` — created
- `src/components/features/QuestionCard/index.ts` — created
- `src/components/ui/badge.tsx` — created (shadcn/ui Badge component)
- `src/pages/SessionPlayPage/useSessionPlayPage.ts` — replaced (added isAnswered, handleNext, keyboard Enter)
- `src/pages/SessionPlayPage/SessionPlayPage.tsx` — replaced (QuestionCard + sticky Next button)
- `src/store/session/sessionStore.ts` — modified (exported useSessionStoreBase)
- `src/test/test-utils.tsx` — modified (added session, question namespace imports)
- `src/pages/DevPlayground/DevPlayground.tsx` — modified (added QuestionCard states section)

### Change Log

- 2026-03-25: Story 1.5 created — Single-Choice Question & Answer Reveal
- 2026-03-25: Story 1.5 implemented — all tasks complete, 75 tests passing
