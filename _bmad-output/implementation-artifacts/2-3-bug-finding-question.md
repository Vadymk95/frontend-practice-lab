# Story 2.3: Bug-Finding Question with Self-Assessment

Status: done

## Story

As a **user**,
I want to identify a bug in a code snippet and self-assess my answer,
So that I can practice spotting real-world errors and compare against a reference solution.

## Acceptance Criteria

1. **Given** the current question is of type `bug-finding`
   **When** the question renders
   **Then** `CodeBlock` (readonly) displays the code snippet with syntax highlighting
   **And** answer options (if present) or a short text input is shown below
   **And** "Submit" is the primary CTA in the sticky bottom bar

2. **Given** the user selects an option or types an answer and taps "Submit"
   **When** the answer is evaluated
   **Then** the reference solution is revealed in a `CodeBlock` below
   **And** `ExplanationPanel` appears with the explanation
   **And** "Got it" (accent outline) and "Missed it" (ghost) self-assessment buttons replace "Submit"

3. **Given** the user taps "Got it" or "Missed it"
   **When** the self-assessment is recorded
   **Then** the answer is stored as correct ("Got it") or incorrect ("Missed it") in `sessionStore`
   **And** "Next" becomes active

## Tasks / Subtasks

- [x] Task 1: Create `BugFindingQuestion` component (AC: #1, #2, #3)
  - [x] Create `src/components/features/QuestionCard/BugFinding/BugFindingQuestion.tsx`
  - [x] Create `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts`
  - [x] Create `src/components/features/QuestionCard/BugFinding/BugFindingQuestion.test.tsx`
  - [x] Create `src/components/features/QuestionCard/BugFinding/index.ts`

- [x] Task 2: Wire `BugFindingQuestion` into `QuestionCard` (AC: #1)
  - [x] Add `question.type === 'bug-finding'` branch in `QuestionCard.tsx`
  - [x] Pass `onSubmitRegister` and `onSelfAssessRegister` callbacks (same pattern as `onCheckRegister`)

- [x] Task 3: Add i18n keys (AC: #2, #3)
  - [x] `public/locales/en/question.json` — add `"submit"`, `"gotIt"`, `"missedIt"`, `"referenceSolution"`
  - [x] `public/locales/ru/question.json` — add same keys in Russian

- [x] Task 4: Wire `BugFindingQuestion` into `DevPlayground` (AC: companion)
  - [x] Add `<section>` for `BugFindingQuestion` showing: with options (pre-submit, post-submit with self-assessment), without options (text input variant)

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

### Review Findings

- [x] [Review][Patch] Empty `options=[]` locks UI — fixed: added `.min(1)` to `BugFindingSchema.options` in schema.ts
- [x] [Review][Patch] Inline `() => {}` fallback in QuestionCard creates new reference each render → fixed: stable `noop`/`noopSelfAssess` constants defined outside component [QuestionCard.tsx]
- [x] [Review][Defer] `SelfAssessment` type duplicated in BugFindingQuestion.tsx and useBugFindingQuestion.ts — compile-safe but code smell — deferred, pre-existing
- [x] [Review][Defer] No callback unregistration/cleanup in useEffect registration pattern — deferred, pre-existing architectural pattern (same as onCheckRegister in Story 2.1)
- [x] [Review][Defer] `question.correct` not validated against options array in schema — data quality issue, component correct — deferred, pre-existing
- [x] [Review][Defer] Stale closure risk: parent may call old registered callback during question transition — deferred, pre-existing architectural pattern

---

## Dev Notes

### Data Schema (already exists — `src/lib/data/schema.ts`)

```typescript
export const BugFindingSchema = BaseQuestionSchema.extend({
    type: z.literal('bug-finding'),
    code: z.string(),            // buggy code snippet
    options: z.array(z.string()).optional(), // if present → AnswerOption (radio); if absent → <input>
    correct: z.string(),         // correct option text or free-text answer
    referenceAnswer: z.string()  // fixed code snippet shown after Submit
});

export type BugFindingQuestion = z.infer<typeof BugFindingSchema>;
```

`options` is optional — when present, render `AnswerOption` (radio variant); when absent, render a text `<Input>`.
`correct` is a string — compare trimmed, case-insensitively for text input; by option text for option mode.
`referenceAnswer` is the fixed code to show in a second `CodeBlock` after Submit.

### `useBugFindingQuestion.ts` — Full Specification

```typescript
import { useCallback, useEffect, useState } from 'react';
import type { BugFindingQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

type SelfAssessment = 'gotIt' | 'missedIt';

interface UseBugFindingQuestionProps {
    question: BugFindingQuestion;
    onSubmitRegister: (submitFn: () => void) => void;
    onSelfAssessRegister: (selfAssessFn: (result: SelfAssessment) => void) => void;
}

interface UseBugFindingQuestionReturn {
    selectedOption: number | null;      // index of selected option (options mode)
    textAnswer: string;                  // typed answer (text input mode)
    isSubmitted: boolean;                // true after Submit tapped
    selfAssessment: SelfAssessment | null; // null until user taps Got it / Missed it
    onSelectOption: (index: number) => void;
    onTextChange: (value: string) => void;
    onSubmit: () => void;
    onSelfAssess: (result: SelfAssessment) => void;
}

export function useBugFindingQuestion({
    question,
    onSubmitRegister,
    onSelfAssessRegister,
}: UseBugFindingQuestionProps): UseBugFindingQuestionReturn
```

**State:**
- `selectedOption: number | null` — index into `question.options` when present
- `textAnswer: string` — free text when `question.options` is absent
- `isSubmitted: boolean` — flips on Submit
- `selfAssessment: SelfAssessment | null` — set when user taps Got it / Missed it

**Submit logic:**
```typescript
const onSubmit = useCallback(() => {
    if (isSubmitted) return;
    if (question.options) {
        if (selectedOption === null) return;
    } else {
        if (!textAnswer.trim()) return;
    }
    setIsSubmitted(true);
    // Store the raw answer text; self-assessment records the final result
    const rawAnswer = question.options
        ? question.options[selectedOption!]
        : textAnswer.trim();
    setAnswer(question.id, rawAnswer);
}, [isSubmitted, question, selectedOption, textAnswer, setAnswer]);
```

**Self-assess logic:**
```typescript
const onSelfAssess = useCallback((result: SelfAssessment) => {
    if (selfAssessment !== null) return;
    setSelfAssessment(result);
    // Overwrite answer with self-assessment result
    setAnswer(question.id, result);
}, [selfAssessment, setAnswer, question.id]);
```

**Register callbacks:**
```typescript
useEffect(() => {
    onSubmitRegister(onSubmit);
}, [onSubmit, onSubmitRegister]);

useEffect(() => {
    onSelfAssessRegister(onSelfAssess);
}, [onSelfAssess, onSelfAssessRegister]);
```

**Reset on question change:**
```typescript
useEffect(() => {
    setSelectedOption(null);
    setTextAnswer('');
    setIsSubmitted(false);
    setSelfAssessment(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [question.id]);
```

### `BugFindingQuestion.tsx` — Component Structure

```tsx
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeBlock } from '@/components/common/CodeBlock';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { BugFindingQuestion as BugFindingQuestionData } from '@/lib/data/schema';
import { AnswerOption } from '../AnswerOption';
import { ExplanationPanel } from '../ExplanationPanel';
import { useBugFindingQuestion } from './useBugFindingQuestion';

type SelfAssessment = 'gotIt' | 'missedIt';

interface Props {
    question: BugFindingQuestionData;
    onSubmitRegister: (submitFn: () => void) => void;
    onSelfAssessRegister: (selfAssessFn: (result: SelfAssessment) => void) => void;
}

export const BugFindingQuestion: FC<Props> = ({
    question,
    onSubmitRegister,
    onSelfAssessRegister,
}) => {
    const { t } = useTranslation('question');
    const {
        selectedOption,
        textAnswer,
        isSubmitted,
        selfAssessment,
        onSelectOption,
        onTextChange,
        onSelfAssess,
    } = useBugFindingQuestion({ question, onSubmitRegister, onSelfAssessRegister });

    return (
        <div className="flex flex-col gap-4">
            {/* Buggy code */}
            <CodeBlock code={question.code} lang="javascript" />

            {/* Answer area — options or text input */}
            {question.options ? (
                <div role="group" aria-label="Answer options">
                    {question.options.map((option, index) => (
                        <AnswerOption
                            key={`${question.id}-${index}`}
                            index={index}
                            text={option}
                            variant="radio"
                            isSelected={selectedOption === index}
                            isAnswered={isSubmitted}
                            isCorrect={option === question.correct}
                            isMissed={false}
                            isDisabled={isSubmitted}
                            onSelect={() => onSelectOption(index)}
                        />
                    ))}
                </div>
            ) : (
                <Input
                    value={textAnswer}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={isSubmitted}
                    placeholder={t('bugFinding.placeholder')}
                    aria-label={t('bugFinding.inputLabel')}
                />
            )}

            {/* Post-submit: reference solution + explanation + self-assessment */}
            {isSubmitted && (
                <>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('referenceSolution')}
                        </p>
                        <CodeBlock code={question.referenceAnswer} lang="javascript" />
                    </div>
                    <ExplanationPanel explanation={question.explanation} />

                    {/* Self-assessment buttons (only if not yet assessed) */}
                    {selfAssessment === null && (
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onSelfAssess('gotIt')}
                                className="flex-1 border-accent text-accent hover:bg-accent/10"
                            >
                                {t('gotIt')}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => onSelfAssess('missedIt')}
                                className="flex-1"
                            >
                                {t('missedIt')}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
```

**Key design decisions:**
- `CodeBlock` is always `lang="javascript"` here; the `lang` field could be added to the schema in a future story if multi-language support is needed. For now hardcode `"javascript"` per FR51 (code always in English/code format).
- After self-assessment, `setAnswer` is called a second time with `'gotIt'` or `'missedIt'` — this overwrites the raw text answer in `sessionStore`. The session summary reads this value to determine correct/incorrect.
- Self-assessment buttons disappear once tapped (guarded by `selfAssessment === null`). They are **not** shown after `selfAssessment` is set — the user cannot change their self-assessment.
- "Next" CTA is controlled by the parent page (`QuestionPage`/`SessionPlayPage`) via `onSelfAssessRegister` callback — parent enables "Next" only after `selfAssessment !== null`.

### Wiring `QuestionCard.tsx`

The `QuestionCard` currently supports `single-choice` and `multi-choice`. Add `bug-finding`:

```tsx
// New props to add to QuestionCardProps:
interface QuestionCardProps {
    onSelectionChange?: (hasSelection: boolean) => void;
    onCheckRegister?: (checkFn: () => void) => void;
    // NEW:
    onSubmitRegister?: (submitFn: () => void) => void;
    onSelfAssessRegister?: (selfAssessFn: (result: 'gotIt' | 'missedIt') => void) => void;
}

// Add in JSX after multi-choice branch:
{question.type === 'bug-finding' && (
    <BugFindingQuestion
        question={question}
        onSubmitRegister={onSubmitRegister ?? (() => {})}
        onSelfAssessRegister={onSelfAssessRegister ?? (() => {})}
    />
)}
```

### i18n Keys to Add

**`public/locales/en/question.json`** — add:
```json
"submit": "Submit",
"gotIt": "Got it",
"missedIt": "Missed it",
"referenceSolution": "Reference solution",
"bugFinding": {
    "placeholder": "Describe the bug...",
    "inputLabel": "Your answer"
}
```

**`public/locales/ru/question.json`** — add:
```json
"submit": "Отправить",
"gotIt": "Понял",
"missedIt": "Не угадал",
"referenceSolution": "Эталонное решение",
"bugFinding": {
    "placeholder": "Опишите ошибку...",
    "inputLabel": "Ваш ответ"
}
```

**Note:** `button.submit` already exists in `common.json` — the `question.submit` key is for the Submit CTA specifically in the question flow context (may be different wording in future). If the parent page drives the CTA from `common.submit`, this key can be omitted. Use `common.button.submit` if the CTA is managed by the parent; add `question.submit` only if the component renders its own CTA. **Per the AC, "Submit" CTA is in the sticky bottom bar (parent-driven) — do NOT add a Submit button inside `BugFindingQuestion.tsx` itself.**

### DevPlayground Section

Add after the existing `CodeBlock` section in `DevPlayground.tsx`:

```tsx
{/* BugFindingQuestion Section */}
<section className="space-y-4">
    <h2 className="text-2xl font-semibold tracking-tight">BugFindingQuestion</h2>
    <div className="rounded-lg border p-6 space-y-8">
        <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                With options — pre-submit
            </h3>
            <BugFindingQuestion
                question={{
                    id: 'bf-demo-1',
                    type: 'bug-finding',
                    category: 'javascript',
                    difficulty: 'medium',
                    tags: ['closures'],
                    question: 'Find the bug in this closure:',
                    code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}`,
                    options: ['var should be let', 'setTimeout delay is wrong', 'console.log is wrong'],
                    correct: 'var should be let',
                    referenceAnswer: `for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}`,
                    explanation: 'var is function-scoped. By the time the timeouts fire, i is 3. Using let creates a new binding per iteration.'
                }}
                onSubmitRegister={() => {}}
                onSelfAssessRegister={() => {}}
            />
        </div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Text input variant — pre-submit
            </h3>
            <BugFindingQuestion
                question={{
                    id: 'bf-demo-2',
                    type: 'bug-finding',
                    category: 'javascript',
                    difficulty: 'easy',
                    tags: ['types'],
                    question: 'What is wrong with this comparison?',
                    code: `if (userAge == "18") {\n  grantAccess();\n}`,
                    correct: 'uses loose equality instead of strict',
                    referenceAnswer: `if (userAge === 18) {\n  grantAccess();\n}`,
                    explanation: 'Use === for type-safe comparison. == coerces types which can lead to unexpected behavior.'
                }}
                onSubmitRegister={() => {}}
                onSelfAssessRegister={() => {}}
            />
        </div>
    </div>
</section>
```

### File Structure

```
src/
  components/
    features/
      QuestionCard/
        BugFinding/
          BugFindingQuestion.tsx    ← NEW
          useBugFindingQuestion.ts  ← NEW
          BugFindingQuestion.test.tsx ← NEW
          index.ts                  ← NEW
        QuestionCard.tsx            ← MODIFY (add bug-finding branch + new props)
public/
  locales/en/question.json         ← MODIFY (add submit, gotIt, missedIt, referenceSolution, bugFinding)
  locales/ru/question.json         ← MODIFY (same in Russian)
src/
  pages/
    DevPlayground/
      DevPlayground.tsx             ← MODIFY (add BugFindingQuestion section)
```

No new stores, no new routes. `sessionStore.setAnswer` already accepts `string` — no schema change needed.

---

## Testing Requirements

### Test Fixture

```typescript
import type { BugFindingQuestion } from '@/lib/data/schema';

export const makeBugFindingQuestion = (
    overrides: Partial<BugFindingQuestion> = {}
): BugFindingQuestion => ({
    id: 'bf-test-001',
    type: 'bug-finding',
    category: 'javascript',
    difficulty: 'medium',
    tags: ['test'],
    question: 'Find the bug in this code',
    code: 'for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }',
    options: ['var should be let', 'setTimeout delay is wrong', 'Arrow function is wrong'],
    correct: 'var should be let',
    referenceAnswer: 'for (let i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }',
    explanation: 'var is function-scoped; use let for block-scoped binding.',
    ...overrides,
});
```

### Shiki Mock (same as Story 2.2 — reuse pattern)

```typescript
vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) =>
            `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`,
    }),
}));
```

### `BugFindingQuestion.test.tsx`

**Test: renders CodeBlock with buggy code**
- Render with options question
- Assert: `screen.getByText(/for.*var.*i/)` or check that `CodeBlock` renders (check for `.shiki` class after `waitFor`)

**Test: renders AnswerOption list when `options` present**
- Render with options question
- Assert: `screen.getAllByRole('radio')` has length 3
- Assert: `role="group"` with "Answer options" label present

**Test: renders text Input when `options` absent**
- Render with `makeBugFindingQuestion({ options: undefined })`
- Assert: `screen.getByRole('textbox')` is present
- Assert: no radio buttons

**Test: Submit not shown inside component (CTA is parent-driven)**
- Render with options question
- Assert: `screen.queryByRole('button', { name: /submit/i })` returns null (buttons only appear post-submit)

**Test: onSubmitRegister receives a function**
- `const onSubmitRegister = vi.fn()`
- Render, assert `onSubmitRegister` called with `expect.any(Function)`

**Test: triggering submit shows reference solution and ExplanationPanel**
```typescript
let capturedSubmitFn: (() => void) | null = null;
const onSubmitRegister = vi.fn((fn) => { capturedSubmitFn = fn; });

renderWithProviders(<BugFindingQuestion question={q} onSubmitRegister={onSubmitRegister} onSelfAssessRegister={vi.fn()} />);

// Select an option first
fireEvent.click(screen.getAllByRole('radio')[0]);

// Trigger submit
await act(async () => { capturedSubmitFn!(); });

// Reference solution CodeBlock should appear (check for referenceSolution label)
await waitFor(() => {
    expect(screen.getByText('Reference solution')).toBeInTheDocument();
});
expect(screen.getByRole('complementary')).toBeInTheDocument(); // ExplanationPanel
```

**Test: self-assessment buttons appear after submit, disappear after tap**
```typescript
// After triggering submit:
expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Missed it' })).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

// Buttons gone
expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
```

**Test: "Got it" stores `'gotIt'` in sessionStore**
```typescript
// After submit + clicking "Got it":
const storedAnswer = useSessionStore.getState().answers['bf-test-001'];
expect(storedAnswer).toBe('gotIt');
```

**Test: "Missed it" stores `'missedIt'` in sessionStore**
```typescript
// After submit + clicking "Missed it":
const storedAnswer = useSessionStore.getState().answers['bf-test-001'];
expect(storedAnswer).toBe('missedIt');
```

**Test: onSelfAssessRegister callback is triggered with result**
```typescript
let capturedSelfAssessFn: ((r: 'gotIt' | 'missedIt') => void) | null = null;
const onSelfAssessRegister = vi.fn((fn) => { capturedSelfAssessFn = fn; });

// After submit, call via registered fn:
capturedSelfAssessFn!('gotIt');
// Same assertion: sessionStore has 'gotIt'
```

**Test: text input answer stores trimmed text on submit**
```typescript
const q = makeBugFindingQuestion({ options: undefined });
// ... render, type in input, trigger submit
fireEvent.change(screen.getByRole('textbox'), { target: { value: '  loose equality  ' } });
capturedSubmitFn!();
// sessionStore answer is 'loose equality' (trimmed — then overwritten by self-assess)
```

**Test: resets state when question id changes**
```typescript
const q1 = makeBugFindingQuestion({ id: 'bf-q1' });
const q2 = makeBugFindingQuestion({ id: 'bf-q2' });

const { rerender } = renderWithProviders(<BugFindingQuestion question={q1} ... />);
fireEvent.click(screen.getAllByRole('radio')[0]); // select option
capturedSubmitFn!(); // submit

rerender(<BugFindingQuestion question={q2} ... />);

// Reference solution NOT shown (isSubmitted reset)
expect(screen.queryByText('Reference solution')).not.toBeInTheDocument();
// Options are unselected
screen.getAllByRole('radio').forEach(r => expect(r).toHaveAttribute('aria-checked', 'false'));
```

**Test: options locked after submit (cannot change selection)**
```typescript
// After submit, try clicking another option
fireEvent.click(screen.getAllByRole('radio')[1]);
// selectedOption should still be 0 (first click), aria-checked unchanged
expect(screen.getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'false');
```

### Setup / Teardown

```typescript
beforeEach(() => {
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0,
    });
    vi.clearAllMocks();
});

afterEach(() => {
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0,
    });
});
```

---

## Previous Story Intelligence

### From Story 2.1 (MultiChoiceQuestion)
- **`renderWithProviders`** — always use, never bare `render`
- **`onCheckRegister` callback pattern** — parent registers a function; hook calls it via `useEffect([onCallback, registerFn])`. Mirror this exactly with `onSubmitRegister` / `onSelfAssessRegister`
- **`useSessionStore.setState()`** in `beforeEach`/`afterEach` — required for test isolation
- **`eslint-disable-next-line react-hooks/exhaustive-deps`** — use for reset `useEffect` with `[question.id]`
- **`act(() => { capturedFn!(); })`** — wrap callback invocations that trigger state

### From Story 2.2 (CodeBlock)
- **`vi.mock('@/lib/shiki', ...)`** — required in any test that renders `CodeBlock`
- **`waitFor(() => ...)` after async Shiki** — use when asserting highlighted content
- **`useTranslation('question')`** — component uses question namespace for question-specific keys

### Test Count
- 128 tests pass after Story 2.2 — do not regress

---

## Architecture Compliance

- **Component pattern:** `BugFindingQuestion.tsx` (JSX only) + `useBugFindingQuestion.ts` (all logic)
- **`@/` alias:** All imports use `@/components`, `@/lib`, `@/store` — no relative `../../`
- **i18n:** All user-visible strings via `t()` — `useTranslation('question')` inside component
- **No `tailwind.config.ts`:** Tailwind tokens in `src/index.css`; use design tokens (`bg-accent/10`, `border-error`, etc.)
- **No store changes:** `sessionStore.setAnswer` already accepts `string` — `'gotIt'`/`'missedIt'` are valid string values
- **TypeScript strict:** No `any`, mock casts use `as unknown as Type` pattern
- **Colour semantics:** "Got it" button uses accent (green) variant; "Missed it" uses ghost — matches UX-DR2 (green = correct, never on navigation CTAs but OK on self-assessment answer feedback)

---

## Project Context Reference

- Rules: read `.cursor/rules/` before implementing
- Component pattern: always extract logic to `useComponentName.ts` hook
- DevPlayground update rule: **this PR is not complete until a BugFindingQuestion section exists in DevPlayground**
- i18n: add keys to both `en` and `ru` locale files
- Imports: `@/` alias only
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed import order in `BugFindingQuestion.tsx` (`button` before `input`, separate group for relative imports)
- Removed unnecessary `eslint-disable-next-line react-hooks/exhaustive-deps` from reset `useEffect` — the rule didn't flag it since only `question.id` is accessed in deps

### Completion Notes List

- Implemented `useBugFindingQuestion` hook with full state machine: selectedOption / textAnswer / isSubmitted / selfAssessment
- `onSubmit` stores raw answer, `onSelfAssess` overwrites with `'gotIt'`/`'missedIt'` — parent enables Next only after self-assessment
- `BugFindingQuestion` renders `CodeBlock` (buggy code) → options or text input → post-submit: reference CodeBlock + ExplanationPanel + self-assessment buttons
- Wired into `QuestionCard` with new optional props `onSubmitRegister` / `onSelfAssessRegister`
- Added all i18n keys to both `en` and `ru` locales
- DevPlayground updated with two demo sections (with options, text input variant)
- 14 new tests written; total suite: 142 tests, 0 failures

### Change Log

- 2026-03-31: Story 2.3 implemented — BugFindingQuestion component, hook, tests, QuestionCard wiring, i18n keys (en+ru), DevPlayground section

## File List

- `src/components/features/QuestionCard/BugFinding/BugFindingQuestion.tsx` — NEW
- `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts` — NEW
- `src/components/features/QuestionCard/BugFinding/BugFindingQuestion.test.tsx` — NEW
- `src/components/features/QuestionCard/BugFinding/index.ts` — NEW
- `src/components/features/QuestionCard/QuestionCard.tsx` — MODIFIED
- `public/locales/en/question.json` — MODIFIED
- `public/locales/ru/question.json` — MODIFIED
- `src/pages/DevPlayground/DevPlayground.tsx` — MODIFIED
