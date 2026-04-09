# Story 3.4: Skip Question

Status: review

## Story

As a **user**,
I want to skip a question and immediately see the answer,
So that I can move past questions I'm stuck on without breaking my session flow.

## Acceptance Criteria

1. **Given** the user is on an unanswered question
   **When** they tap the "Skip" ghost button (visible in question header)
   **Then** the question is marked as skipped in `sessionStore`
   **And** the correct answer and `ExplanationPanel` are revealed immediately
   **And** the skipped answer is recorded as incorrect for progress tracking purposes
   **And** "Next" becomes active

2. **Given** a skipped question is recorded
   **When** the adaptive algorithm processes session results
   **Then** the skipped question is treated as incorrect for weight calculation — error rate for that category increases
   **And** the distinction "skipped vs wrong" exists only in the session summary UI — not in the algorithm logic

3. **Given** the session ends with skipped questions
   **When** the post-session summary renders
   **Then** skipped count is shown separately from wrong answers in the summary

## Tasks / Subtasks

- [x] Task 1: Update `useQuestionCard` — expose `isSkipped` and `handleSkip` (AC: #1)
  - [x] Modify `src/components/features/QuestionCard/useQuestionCard.ts`
  - [x] Add `skipList = useSessionStore.use.skipList()` and `skipQuestion = useSessionStore.use.skipQuestion()`
  - [x] Add `setAnswer = useSessionStore.use.setAnswer()`
  - [x] `isSkipped = question !== null && skipList.includes(question.id)`
  - [x] `handleSkip = useCallback(() => { if (question && !isSkipped) { skipQuestion(question.id); setAnswer(question.id, 'skipped'); } }, [...])`
  - [x] Return `{ question, currentIndex, questionCount, isAnswered, handleBack, isSkipped, handleSkip }`

- [x] Task 2: Add Skip button to `QuestionCard` header (AC: #1)
  - [x] Modify `src/components/features/QuestionCard/QuestionCard.tsx`
  - [x] Skip button: `<Button variant="ghost" size="sm">` shown when `!isAnswered` (only on unanswered questions)
  - [x] Place in the header row alongside progress indicator (same row as Back button from Story 2.5)
  - [x] Header row layout: `<div className="flex items-center justify-between">` — progress on left, action buttons on right
  - [x] When unanswered: show Skip on right; when answered: show Back on right (no Skip after answering)

- [x] Task 3: Update question type components to handle `isSkipped` (AC: #1)
  - [x] Each question type component receives `isSkipped?: boolean` prop and passes it to its hook
  - [x] Modify `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts` — when `isSkipped=true`, initialize `selectedOption = question.correct` and `isAnswered = true`
  - [x] Modify `src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts` — when `isSkipped=true`, initialize `selectedOptions = question.correct` and `isChecked = true`
  - [x] Modify `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts` — when `isSkipped=true`, initialize in "self-assess revealed" state (show referenceAnswer)
  - [x] Modify `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` — when `isSkipped=true`, initialize in "submitted/revealed" state showing blanks filled with correct values
  - [x] Pass `isSkipped` from `QuestionCard.tsx` to each question type component

- [x] Task 4: Update `useSummaryPage` to expose skipped count (AC: #3)
  - [x] Modify `src/pages/SummaryPage/useSummaryPage.ts`
  - [x] Read `skipList = useSessionStore.use.skipList()`
  - [x] `skippedCount = skipList.length`
  - [x] In `isCorrectAnswer()`: `answers[id] === 'skipped'` → returns `false` (already incorrect — algorithm correct)
  - [x] Skipped questions go into `wrongQuestions` array (for repeat mistakes) — no change needed, they're already counted as wrong
  - [x] Return `skippedCount` from hook

- [x] Task 5: Show skipped count in `SummaryPage` (AC: #3)
  - [x] Modify `src/pages/SummaryPage/SummaryPage.tsx` — add skipped count display when `skippedCount > 0`
  - [x] Placement: below score, above weak topics section

- [x] Task 6: Add i18n keys (AC: #1, #3)
  - [x] `public/locales/en/question.json` — add `"skip": "Skip"`
  - [x] `public/locales/ru/question.json` — add `"skip": "Пропустить"`
  - [x] `public/locales/en/summary.json` — add `"skipped": "Skipped: {{count}}"`
  - [x] `public/locales/ru/summary.json` — add `"skipped": "Пропущено: {{count}}"`

- [x] Task 7: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `useQuestionCard.ts` — Updated Hook

```typescript
import { useCallback } from 'react';
import { useSessionStore } from '@/store/session';

export function useQuestionCard() {
  const questionList = useSessionStore.use.questionList();
  const currentIndex = useSessionStore.use.currentIndex();
  const answers = useSessionStore.use.answers();
  const removeAnswer = useSessionStore.use.removeAnswer();
  const skipList = useSessionStore.use.skipList();
  const skipQuestion = useSessionStore.use.skipQuestion();
  const setAnswer = useSessionStore.use.setAnswer();

  const question = questionList[currentIndex] ?? null;
  const isAnswered = question !== null && answers[question.id] !== undefined;
  const isSkipped = question !== null && skipList.includes(question.id);

  const handleBack = useCallback(() => {
    if (question) removeAnswer(question.id);
  }, [question, removeAnswer]);

  const handleSkip = useCallback(() => {
    if (question && !isSkipped) {
      skipQuestion(question.id);
      setAnswer(question.id, 'skipped');
    }
  }, [question, isSkipped, skipQuestion, setAnswer]);

  return { question, currentIndex, questionCount: questionList.length, isAnswered, handleBack, isSkipped, handleSkip };
}
```

**Why `setAnswer(question.id, 'skipped')`?** `isAnswered` in both `useQuestionCard` and `useSessionPlayPage` is derived from `answers[id] !== undefined`. Setting an answer with value `'skipped'` makes `isAnswered = true`, which activates "Next" and hides the Back button — all without changes to `useSessionPlayPage`.

### `QuestionCard.tsx` — Header Layout

Current header structure (from Story 2.5):
```tsx
<div className="flex items-center justify-between">
  <div aria-label={...} className="text-sm text-muted-foreground">
    {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
  </div>
  {isAnswered && (
    <Button variant="ghost" size="sm" onClick={onBack}>
      {t('back')}
    </Button>
  )}
</div>
```

Update to add Skip button (shown only when NOT yet answered):
```tsx
<div className="flex items-center justify-between">
  <div aria-label={...} className="text-sm text-muted-foreground">
    {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
  </div>
  <div className="flex items-center gap-2">
    {!isAnswered && (
      <Button variant="ghost" size="sm" onClick={handleSkip}>
        {t('skip')}
      </Button>
    )}
    {isAnswered && !isSkipped && (
      <Button variant="ghost" size="sm" onClick={onBack}>
        {t('back')}
      </Button>
    )}
  </div>
</div>
```

**No Back button when skipped** — it would be confusing to "un-skip" a question (Back was designed for accidental taps, not skip undo). Story 2.5 AC#3 says "forward-only navigation after Next", but skip-then-back would still be in the same question. Decision: hide Back button on skipped questions.

### Question Type Components — `isSkipped` Prop

**Pattern for all 4 question types** — each hook accepts `isSkipped?: boolean` and uses it for initial state:

**`useSingleChoiceQuestion.ts`:**
```typescript
export function useSingleChoiceQuestion(question: SingleChoiceQuestion, isSkipped = false) {
  const setAnswer = useSessionStore.use.setAnswer();
  const [selectedOption, setSelectedOption] = useState<number | null>(
    isSkipped ? question.correct : null
  );
  const [isAnswered, setIsAnswered] = useState(isSkipped);
  // ...rest unchanged
}
```

**`useMultiChoiceQuestion.ts`:**
```typescript
export function useMultiChoiceQuestion(question: MultiChoiceQuestion, isSkipped = false) {
  const [selectedOptions, setSelectedOptions] = useState<number[]>(
    isSkipped ? question.correct : []
  );
  const [isChecked, setIsChecked] = useState(isSkipped);
  // ...rest unchanged
}
```

**`useBugFindingQuestion.ts`** — check existing state shape, but same pattern: init in revealed state when `isSkipped=true`.

**`useCodeCompletionQuestion.ts`** — when `isSkipped=true`, initialize each blank with correct values from `question.blanks`.

**`QuestionCard.tsx`** — pass `isSkipped` to each question type:
```tsx
{question.type === 'single-choice' && (
  <SingleChoiceQuestion key={resetKey} question={question} isSkipped={isSkipped} />
)}
// same for all 4 types
```

**Read each hook before modifying** — understand the exact state variables. The pattern is `useState(isSkipped ? correctValue : initialValue)`.

### `isCorrectAnswer()` in `useSummaryPage.ts`

The existing function already returns `false` for unknown answer formats. `'skipped'` value is `string`, not a valid answer for any type, so `isCorrectAnswer` already returns `false` for skipped questions — **no change needed here**.

### `skipList` in Summary

Skipped questions are already in `answers` with value `'skipped'`, so they're already counted in `wrongQuestions` (via `isCorrectAnswer` returning `false`). The `skippedCount` is additional UI information derived from `skipList.length`.

### File Structure

```
src/components/features/QuestionCard/useQuestionCard.ts       ← MODIFY
src/components/features/QuestionCard/QuestionCard.tsx         ← MODIFY
src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts  ← MODIFY
src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts    ← MODIFY
src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts      ← MODIFY
src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts ← MODIFY
src/pages/SummaryPage/useSummaryPage.ts    ← MODIFY
src/pages/SummaryPage/SummaryPage.tsx      ← MODIFY
public/locales/en/question.json            ← MODIFY
public/locales/ru/question.json            ← MODIFY
public/locales/en/summary.json             ← MODIFY
public/locales/ru/summary.json             ← MODIFY
```

---

## Testing Requirements

### `QuestionCard` — Skip Button Tests

Add to `src/components/features/QuestionCard/QuestionCard.test.tsx`:

```typescript
describe('Skip button', () => {
  it('shows Skip button when question is unanswered', () => {
    // setup: unanswered question in store
    renderWithProviders(<QuestionCard />);
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('hides Skip button when question is answered', () => {
    // setup: question with answer in store
    renderWithProviders(<QuestionCard />);
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('adds question to skipList and answers when Skip tapped', async () => {
    useSessionStore.setState({ questionList: [mockQuestion], currentIndex: 0, answers: {}, skipList: [] });
    renderWithProviders(<QuestionCard />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    await waitFor(() => {
      expect(useSessionStore.getState().skipList).toContain(mockQuestion.id);
      expect(useSessionStore.getState().answers[mockQuestion.id]).toBe('skipped');
    });
  });
});
```

---

## Previous Story Intelligence

### From Story 2.5

- `isAnswered = question !== null && answers[question.id] !== undefined` — setting `answers[id] = 'skipped'` makes `isAnswered = true`; "Next" activates automatically in `useSessionPlayPage`
- `resetKey` pattern: pass `isSkipped` to question type components via props; they handle reveal via initial state
- `useSessionStore.setState({ questionList, currentIndex, answers, skipList, config, timerMs })` in test setup

---

## Architecture Compliance

- **No changes to `useSessionPlayPage`** — skip works transparently because `isAnswered` is already derived from `answers[id] !== undefined`
- **`skipList` already in store** — `sessionStore.ts` has `skipList: string[]` and `skipQuestion(questionId: string)` action
- **Algorithm treatment** — skipped = wrong: `isCorrectAnswer()` already returns `false` for `'skipped'` value; no algorithm changes needed
- **`@/` alias only** — no relative imports

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `skipQuestion` action: `src/store/session/sessionStore.ts:65` — adds to `skipList`
- `sessionStore` initial state: `{ questionList, currentIndex, answers, skipList, config, timerMs }`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered.

### Completion Notes List

- Implemented `handleSkip` in `useQuestionCard` — calls `skipQuestion` + `setAnswer('skipped')` making `isAnswered=true` transparently activating Next without touching `useSessionPlayPage`
- Skip button shows only on unanswered questions; Back button shows on answered but non-skipped questions; no button on skipped (by design — no skip undo)
- All 4 question type hooks accept `isSkipped?: boolean` with initial state set to "revealed" when skipped: SingleChoice pre-selects correct answer, MultiChoice pre-selects correct options and sets isChecked, BugFinding initializes in submitted+selfAssess=missedIt state, CodeCompletion fills blanks with correct values and marks all as 'correct'
- `useSummaryPage` reads `skipList.length` for `skippedCount`; skipped questions already count as wrong via `isCorrectAnswer` returning false for 'skipped' string — no algorithm changes needed
- 4 new Skip button tests added to `QuestionCard.test.tsx`; all 183 tests pass

### File List

- `src/components/features/QuestionCard/useQuestionCard.ts` — modified
- `src/components/features/QuestionCard/QuestionCard.tsx` — modified
- `src/components/features/QuestionCard/QuestionCard.test.tsx` — modified (4 new tests)
- `src/components/features/QuestionCard/SingleChoice/SingleChoiceQuestion.tsx` — modified
- `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts` — modified
- `src/components/features/QuestionCard/MultiChoice/MultiChoiceQuestion.tsx` — modified
- `src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts` — modified
- `src/components/features/QuestionCard/BugFinding/BugFindingQuestion.tsx` — modified
- `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts` — modified
- `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx` — modified
- `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` — modified
- `src/pages/SummaryPage/useSummaryPage.ts` — modified
- `src/pages/SummaryPage/SummaryPage.tsx` — modified
- `public/locales/en/question.json` — modified
- `public/locales/ru/question.json` — modified
- `public/locales/en/summary.json` — modified
- `public/locales/ru/summary.json` — modified

## Change Log

- Implemented Story 3.4: Skip Question — ghost Skip button, question reveal on skip, skipped count in summary (Date: 2026-04-09)
