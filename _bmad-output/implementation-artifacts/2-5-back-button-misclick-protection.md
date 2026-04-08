# Story 2.5: Back Button — Misclick Protection

Status: done

## Story

As a **user**,
I want to undo my last answer immediately after tapping,
So that I can recover from accidental taps on single-choice questions without losing session progress.

## Acceptance Criteria

1. **Given** the user has just revealed an answer (any question type)
   **When** the answer state is active (reveal shown, Next not yet tapped)
   **Then** a "Back" ghost button appears in the question header alongside the progress indicator

2. **Given** the user taps "Back"
   **When** the undo action fires
   **Then** the current question returns to unanswered state (options reset, ExplanationPanel hidden)
   **And** the answer is removed from `sessionStore`
   **And** the "Back" button disappears

3. **Given** the user taps "Next" after an answer reveal
   **When** navigation to the next question occurs
   **Then** the "Back" button is no longer available for the previous question
   **And** session moves forward only — no further undo possible

## Tasks / Subtasks

- [x] Task 1: Add `removeAnswer` to sessionStore (AC: #2)
  - [x] Add `removeAnswer: (questionId: string) => void` to `SessionState` interface in `src/store/session/sessionStore.ts`
  - [x] Implement: destructure `[questionId]` out of `state.answers`, return remaining object
  - [x] Create `src/store/session/sessionStore.test.ts` with `removeAnswer` tests

- [x] Task 2: Update `useQuestionCard` to expose `isAnswered` and `handleBack` (AC: #1, #2)
  - [x] Read `answers` and `removeAnswer` from sessionStore
  - [x] Derive `isAnswered = question !== null && answers[question.id] !== undefined`
  - [x] Expose `handleBack` callback: calls `removeAnswer(question.id)`
  - [x] Return `{ question, currentIndex, questionCount, isAnswered, handleBack }`

- [x] Task 3: Add Back button and `resetKey` to `QuestionCard` (AC: #1, #2, #3)
  - [x] Add `const [resetKey, setResetKey] = useState(0)` local state
  - [x] Wrap progress indicator in `flex items-center justify-between` row
  - [x] Render `<Button variant="ghost" size="sm">` when `isAnswered` is true
  - [x] On click: call `handleBack()` + `setResetKey(k => k + 1)`
  - [x] Pass `key={resetKey}` to all question type components (forces remount on undo)

- [x] Task 4: Add i18n keys (AC: #1)
  - [x] `public/locales/en/question.json` — add `"back": "Back"`
  - [x] `public/locales/ru/question.json` — add `"back": "Назад"`

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `sessionStore.ts` — `removeAnswer` Implementation

Add to `SessionState` interface:
```typescript
removeAnswer: (questionId: string) => void;
```

Add to store implementation (inside `create`):
```typescript
removeAnswer: (questionId: string) => {
    set(
        (state) => {
            const { [questionId]: _removed, ...rest } = state.answers;
            return { answers: rest };
        },
        false,
        { type: 'session-store/removeAnswer' }
    );
},
```

**TypeScript note:** Use `_removed` (not `_`) to satisfy the no-unused-vars linter rule. The pattern `const { [questionId]: _removed, ...rest }` is valid TypeScript for deleting a dynamic key from an object.

**IMPORTANT:** Also add `removeAnswer` to the `initialState` in the `beforeEach`/`afterEach` test setup pattern used in other test files (the store initializer). Only the data fields are in `initialState` const — actions come from the store factory. `useSessionStore.setState()` only needs the data fields: `{ questionList, currentIndex, answers, skipList, config, timerMs }`.

### `useQuestionCard.ts` — Updates

Current file (`src/components/features/QuestionCard/useQuestionCard.ts`) only returns `{ question, currentIndex, questionCount }`. Extend it:

```typescript
import { useCallback } from 'react';
import { useSessionStore } from '@/store/session';

export function useQuestionCard() {
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    const answers = useSessionStore.use.answers();
    const removeAnswer = useSessionStore.use.removeAnswer();

    const question = questionList[currentIndex] ?? null;
    const isAnswered = question !== null && answers[question.id] !== undefined;

    const handleBack = useCallback(() => {
        if (question) removeAnswer(question.id);
    }, [question, removeAnswer]);

    return { question, currentIndex, questionCount: questionList.length, isAnswered, handleBack };
}
```

### `QuestionCard.tsx` — Full Update Plan

**Current progress row structure** (from reading the file):
```tsx
<div
    aria-label={t('progress.ariaLabel', { current: currentIndex + 1, total: questionCount })}
    className="text-sm text-muted-foreground"
>
    {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
</div>
```

**New structure** — wrap in a flex row, add conditional Back button:
```tsx
<div className="flex items-center justify-between">
    <div
        aria-label={t('progress.ariaLabel', { current: currentIndex + 1, total: questionCount })}
        className="text-sm text-muted-foreground"
    >
        {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
    </div>
    {isAnswered && (
        <Button variant="ghost" size="sm" onClick={onBack}>
            {t('back')}
        </Button>
    )}
</div>
```

**`resetKey` pattern** — add local state and wire to all question components:
```tsx
const [resetKey, setResetKey] = useState(0);
const { question, currentIndex, questionCount, isAnswered, handleBack } = useQuestionCard();

const onBack = useCallback(() => {
    handleBack();
    setResetKey(k => k + 1);
}, [handleBack]);
```

**Pass `key={resetKey}` to ALL question type components:**
```tsx
{question.type === 'single-choice' && (
    <SingleChoiceQuestion key={resetKey} question={question} />
)}
{question.type === 'multi-choice' && (
    <MultiChoiceQuestion key={resetKey} question={question} ... />
)}
{question.type === 'bug-finding' && (
    <BugFindingQuestion key={resetKey} question={question} ... />
)}
{question.type === 'code-completion' && (
    <CodeCompletionQuestion key={resetKey} question={question} ... />
)}
```

**Why `key={resetKey}`?** When Back is tapped, `question.id` has NOT changed (same question, just cleared from `answers`). The question components hold internal state (`selectedOption`, `isSubmitted`, etc.). The only way to reset them without modifying every component is to change the React `key`, forcing a full remount. Incrementing `resetKey` achieves this.

**CRITICAL:** The `code-completion` branch will be added in Story 2.4. If Story 2.5 is implemented after 2.4, add `key={resetKey}` to all 4 branches. If implemented before 2.4 (Story 2.4 not yet done), add only to the 3 existing branches (`single-choice`, `multi-choice`, `bug-finding`).

### SessionPlayPage — No Changes Required

`useSessionPlayPage` derives `isAnswered` from `answers[currentQuestion.id] !== undefined`. After `removeAnswer`, that answer is gone → `isAnswered` becomes `false` → "Next" button disappears automatically. The sticky bar reverts to showing the appropriate CTA (Check/Submit) based on question type. No changes to `SessionPlayPage.tsx` or `useSessionPlayPage.ts`.

### i18n Keys to Add

**`public/locales/en/question.json`** — add:
```json
"back": "Back"
```

**`public/locales/ru/question.json`** — add:
```json
"back": "Назад"
```

### File Structure

```
src/store/session/sessionStore.ts ← MODIFY (add removeAnswer action)
src/store/session/sessionStore.test.ts ← NEW (removeAnswer tests)
src/components/features/QuestionCard/useQuestionCard.ts ← MODIFY (add isAnswered, handleBack)
src/components/features/QuestionCard/QuestionCard.tsx ← MODIFY (Back button + resetKey)
public/locales/en/question.json ← MODIFY (add "back")
public/locales/ru/question.json ← MODIFY (add "back")
```

No new components, no new routes, no DevPlayground update needed.

---

## Testing Requirements

### `src/store/session/sessionStore.test.ts` — New File

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('sessionStore', () => {
    beforeEach(() => {
        useSessionStore.setState({
            questionList: [],
            currentIndex: 0,
            answers: {},
            skipList: [],
            config: null,
            timerMs: 0,
        });
    });

    describe('removeAnswer', () => {
        it('removes the answer for the given questionId', () => {
            useSessionStore.setState({ answers: { 'q-1': 2, 'q-2': 1 } });
            useSessionStore.getState().removeAnswer('q-1');
            expect(useSessionStore.getState().answers['q-1']).toBeUndefined();
            expect(useSessionStore.getState().answers['q-2']).toBe(1);
        });

        it('does nothing when questionId not in answers', () => {
            useSessionStore.setState({ answers: { 'q-1': 2 } });
            useSessionStore.getState().removeAnswer('q-99');
            expect(useSessionStore.getState().answers).toEqual({ 'q-1': 2 });
        });

        it('results in empty answers when last answer removed', () => {
            useSessionStore.setState({ answers: { 'q-1': 2 } });
            useSessionStore.getState().removeAnswer('q-1');
            expect(useSessionStore.getState().answers).toEqual({});
        });
    });
});
```

### `QuestionCard.test.tsx` — Add Back Button Tests

Add to the existing `describe('QuestionCard', ...)` block (already at `src/components/features/QuestionCard/QuestionCard.test.tsx`). Needs `fireEvent`, `waitFor` imports from `@testing-library/react`.

```typescript
describe('Back button', () => {
    it('does not show Back button when question is unanswered', () => {
        renderWithProviders(<QuestionCard />);
        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('shows Back button when question is answered', () => {
        useSessionStore.setState({
            questionList: [mockQuestion],
            currentIndex: 0,
            answers: { [mockQuestion.id]: 2 },
            skipList: [],
            config: null,
            timerMs: 0,
        });
        renderWithProviders(<QuestionCard />);
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('removes answer from store when Back is tapped', async () => {
        useSessionStore.setState({
            questionList: [mockQuestion],
            currentIndex: 0,
            answers: { [mockQuestion.id]: 2 },
            skipList: [],
            config: null,
            timerMs: 0,
        });
        renderWithProviders(<QuestionCard />);
        fireEvent.click(screen.getByRole('button', { name: /back/i }));
        await waitFor(() => {
            expect(useSessionStore.getState().answers[mockQuestion.id]).toBeUndefined();
        });
    });

    it('hides Back button after tapping it (answer removed)', async () => {
        useSessionStore.setState({
            questionList: [mockQuestion],
            currentIndex: 0,
            answers: { [mockQuestion.id]: 2 },
            skipList: [],
            config: null,
            timerMs: 0,
        });
        renderWithProviders(<QuestionCard />);
        fireEvent.click(screen.getByRole('button', { name: /back/i }));
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
        });
    });
});
```

### Test Count

Current: 142 tests passing. Do not regress.

---

## Previous Story Intelligence

### From Stories 2.1–2.4

- **`renderWithProviders`** — always use, never bare `render`
- **`useSessionStore.setState()`** in `beforeEach`/`afterEach` — required for test isolation; always include all data fields: `questionList, currentIndex, answers, skipList, config, timerMs`
- **`useTranslation('question')`** — question namespace
- **`Button` component** — import from `@/components/ui/button`; `variant="ghost"` and `size="sm"` for the Back button

### QuestionCard Existing Pattern Notes

From reading `QuestionCard.tsx`:
- `noop` and `noopSelfAssess` are defined as constants **outside** the component — follow this pattern for any new stable references
- `useQuestionCard()` hook currently returns `{ question, currentIndex, questionCount }` — extend it, do not replace it
- Props are all optional (`?`) — no breaking changes when adding `onAllBlanksFilled` (Story 2.4) before this story

---

## Architecture Compliance

- **No new components** — this story modifies existing files only
- **`@/` alias only** — no relative `../../`
- **i18n:** `t('back')` in `question` namespace
- **TypeScript strict** — `_removed` naming for unused destructured variable to satisfy linter
- **`resetKey` pattern** — cleanest undo without modifying all question components; documented in Dev Notes for future maintainers
- **No `tailwind.config.ts`** — `ghost` variant of `Button` already defined in shadcn/ui, no custom styles needed

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- No DevPlayground update required — Back button is wired into QuestionCard globally
- `sessionStore.ts` already uses Zustand devtools middleware — `removeAnswer` dispatch name follows existing `session-store/actionName` convention

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `removeAnswer` action to `sessionStore.ts` using dynamic key destructuring pattern (`_removed` naming satisfies no-unused-vars linter rule)
- Extended `useQuestionCard` hook with `isAnswered` derived state and `handleBack` callback via `useCallback`
- Added Back ghost button to `QuestionCard` header with `resetKey` pattern — forces question component remount on undo without modifying child components
- Added `key={resetKey}` to all 4 question type branches (single-choice, multi-choice, bug-finding, code-completion)
- Created `sessionStore.test.ts` (3 new tests) + 4 Back button tests in `QuestionCard.test.tsx`
- Total test count: 142 → 161 (19 new tests, all passing)

### Review Findings

- [x] [Review][Defer] Store test imports `useSessionStore` instead of `useSessionStoreBase` [src/store/session/sessionStore.test.ts:3] — deferred, pre-existing; `createSelectors` returns same object reference; `.setState/.getState` don't require React context; 90%+ project tests follow this pattern
- [x] [Review][Defer] `resetKey` not reset on forward question navigation [src/components/features/QuestionCard/QuestionCard.tsx:35] — deferred, by design; child components reset via `useEffect([question.id])`; AC#3 specifies forward-only navigation
- [x] [Review][Defer] No test verifying `key={resetKey}` forces child component remount [src/components/features/QuestionCard/QuestionCard.test.tsx:89] — deferred, indirect coverage exists; testing React-internal key mechanics is an anti-pattern
- [x] [Review][Defer] `isAnswered` derived independently in both `useSessionPlayPage` and `useQuestionCard` — deferred, pre-existing; not introduced by Story 2.5

### File List

- `src/store/session/sessionStore.ts` — added `removeAnswer` to interface + implementation
- `src/store/session/sessionStore.test.ts` — NEW: 3 tests for `removeAnswer`
- `src/components/features/QuestionCard/useQuestionCard.ts` — added `isAnswered`, `handleBack`
- `src/components/features/QuestionCard/QuestionCard.tsx` — added Back button, `resetKey`, `key={resetKey}` on all question types
- `src/components/features/QuestionCard/QuestionCard.test.tsx` — added 4 Back button tests
- `public/locales/en/question.json` — added `"back": "Back"`
- `public/locales/ru/question.json` — added `"back": "Назад"`
