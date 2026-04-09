# Story 3.4: Skip Question

Status: ready-for-dev

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

- [ ] Task 1: Update `useQuestionCard` — expose `isSkipped` and `handleSkip` (AC: #1)
  - [ ] Modify `src/components/features/QuestionCard/useQuestionCard.ts`
  - [ ] Add `skipList = useSessionStore.use.skipList()` and `skipQuestion = useSessionStore.use.skipQuestion()`
  - [ ] Add `setAnswer = useSessionStore.use.setAnswer()`
  - [ ] `isSkipped = question !== null && skipList.includes(question.id)`
  - [ ] `handleSkip = useCallback(() => { if (question && !isSkipped) { skipQuestion(question.id); setAnswer(question.id, 'skipped'); } }, [...])`
  - [ ] Return `{ question, currentIndex, questionCount, isAnswered, handleBack, isSkipped, handleSkip }`

- [ ] Task 2: Add Skip button to `QuestionCard` header (AC: #1)
  - [ ] Modify `src/components/features/QuestionCard/QuestionCard.tsx`
  - [ ] Skip button: `<Button variant="ghost" size="sm">` shown when `!isAnswered` (only on unanswered questions)
  - [ ] Place in the header row alongside progress indicator (same row as Back button from Story 2.5)
  - [ ] Header row layout: `<div className="flex items-center justify-between">` — progress on left, action buttons on right
  - [ ] When unanswered: show Skip on right; when answered: show Back on right (no Skip after answering)

- [ ] Task 3: Update question type components to handle `isSkipped` (AC: #1)
  - [ ] Each question type component receives `isSkipped?: boolean` prop and passes it to its hook
  - [ ] Modify `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts` — when `isSkipped=true`, initialize `selectedOption = question.correct` and `isAnswered = true`
  - [ ] Modify `src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts` — when `isSkipped=true`, initialize `selectedOptions = question.correct` and `isChecked = true`
  - [ ] Modify `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts` — when `isSkipped=true`, initialize in "self-assess revealed" state (show referenceAnswer)
  - [ ] Modify `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` — when `isSkipped=true`, initialize in "submitted/revealed" state showing blanks filled with correct values
  - [ ] Pass `isSkipped` from `QuestionCard.tsx` to each question type component

- [ ] Task 4: Update `useSummaryPage` to expose skipped count (AC: #3)
  - [ ] Modify `src/pages/SummaryPage/useSummaryPage.ts`
  - [ ] Read `skipList = useSessionStore.use.skipList()`
  - [ ] `skippedCount = skipList.length`
  - [ ] In `isCorrectAnswer()`: `answers[id] === 'skipped'` → returns `false` (already incorrect — algorithm correct)
  - [ ] Skipped questions go into `wrongQuestions` array (for repeat mistakes) — no change needed, they're already counted as wrong
  - [ ] Return `skippedCount` from hook

- [ ] Task 5: Show skipped count in `SummaryPage` (AC: #3)
  - [ ] Modify `src/pages/SummaryPage/SummaryPage.tsx` — add skipped count display when `skippedCount > 0`
  - [ ] Placement: below score, above weak topics section

- [ ] Task 6: Add i18n keys (AC: #1, #3)
  - [ ] `public/locales/en/question.json` — add `"skip": "Skip"`
  - [ ] `public/locales/ru/question.json` — add `"skip": "Пропустить"`
  - [ ] `public/locales/en/summary.json` — add `"skipped": "Skipped: {{count}}"`
  - [ ] `public/locales/ru/summary.json` — add `"skipped": "Пропущено: {{count}}"`

- [ ] Task 7: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

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

### Debug Log References

### Completion Notes List

### File List
