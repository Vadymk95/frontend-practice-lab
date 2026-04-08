# Story 2.4: Code-Completion Question with Blank Inputs

Status: done

## Story

As a **user**,
I want to fill in blanks within a code snippet to complete it,
So that I can practice recalling exact syntax in context.

## Acceptance Criteria

1. **Given** the current question is of type `code-completion`
   **When** the question renders
   **Then** an interactive code block displays the code with `__BLANK__` markers replaced by inline `<input>` elements styled as code (monospace, same background)
   **And** "Submit" is the primary CTA in the sticky bottom bar (disabled until all blanks are filled)

2. **Given** the user fills all blanks and taps "Submit"
   **When** answers are validated
   **Then** each blank is compared case-insensitively with leading/trailing whitespace trimmed (FR45)
   **And** correct blanks highlight with accent colour; incorrect blanks highlight with error colour
   **And** `ExplanationPanel` and a readonly `CodeBlock` with the reference solution appear below the code block
   **And** "Next" becomes active

3. **Given** all blanks are correct
   **When** the answer is recorded
   **Then** it is stored as `'correct'` in `sessionStore`
   **And** if any blank is incorrect, it is stored as `'incorrect'`

## Tasks / Subtasks

- [x] Task 1: Create `CodeCompletionQuestion` component (AC: #1, #2, #3)
  - [x] Create `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx`
  - [x] Create `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts`
  - [x] Create `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.test.tsx`
  - [x] Create `src/components/features/QuestionCard/CodeCompletion/index.ts`

- [x] Task 2: Wire `CodeCompletionQuestion` into `QuestionCard` (AC: #1)
  - [x] Add `question.type === 'code-completion'` branch in `QuestionCard.tsx`
  - [x] Add `onAllBlanksFilled?: (filled: boolean) => void` prop to `QuestionCardProps`
  - [x] Pass `onSubmitRegister` and `onAllBlanksFilled` callbacks to the component

- [x] Task 3: Update `SessionPlayPage` to handle Submit CTA for code-completion (AC: #1)
  - [x] Add `submitFnRef` and `codeCompletionAllFilled` state to `SessionPlayPage.tsx`
  - [x] Pass `onSubmitRegister={handleSubmitRegister}` and `onAllBlanksFilled={handleAllBlanksFilled}` to `QuestionCard`
  - [x] Show "Submit" button when `currentQuestion?.type === 'code-completion'` AND `!isAnswered`
  - [x] Disable Submit until `codeCompletionAllFilled === true`
  - [x] Reset `codeCompletionAllFilled` and `submitFnRef` in the `useEffect([currentQuestion?.id])` block

- [x] Task 4: Update `isCorrectAnswer` in `useSummaryPage.ts` (AC: #3)
  - [x] Add `code-completion` branch: `return answer === 'correct'`

- [x] Task 5: Add i18n keys (AC: #1, #2)
  - [x] `public/locales/en/question.json` — add `"codeCompletion": { "inputLabel": "Blank {{index}}", "expected": "Expected:" }`
  - [x] `public/locales/ru/question.json` — add same in Russian

- [x] Task 6: Add `CodeCompletionQuestion` section to `DevPlayground` (companion)
  - [x] Show pre-submit state with all blanks empty

- [x] Task 7: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Data Schema (already exists — `src/lib/data/schema.ts`)

```typescript
export const CodeCompletionSchema = BaseQuestionSchema.extend({
    type: z.literal('code-completion'),
    code: z.string(),            // contains __BLANK__ markers, one per entry in blanks[]
    blanks: z.array(z.string()), // correct answers in order, one per __BLANK__
    referenceAnswer: z.string()  // complete solution shown after Submit
});
export type CodeCompletionQuestion = z.infer<typeof CodeCompletionSchema>;
```

**Critical data contract:** `blanks.length` equals the number of `__BLANK__` occurrences in `code`. This is not validated by Zod — trust the data.

### Code Parsing Strategy

```typescript
// code.split('__BLANK__') yields (blanks.length + 1) segments
const segments = question.code.split('__BLANK__');
// Render: segments[0] + input[0] + segments[1] + input[1] + ... + segments[N]
```

### Interactive Code Block — Do NOT Use Existing `CodeBlock`

The existing `CodeBlock` at `src/components/common/CodeBlock/CodeBlock.tsx` renders Shiki-highlighted HTML via `dangerouslySetInnerHTML`. It is **incompatible** with interactive inline `<input>` elements. Do **not** use it for the editable code area.

Instead, render the interactive code area inline within `CodeCompletionQuestion.tsx`, styled to match CodeBlock's visual appearance:

```tsx
// Match CodeBlock's visual style exactly (same border, bg, font)
<div className="relative rounded-none border border-border bg-[#0d1117] font-mono text-sm">
    {/* Header — same pattern as CodeBlock */}
    <div className="flex items-center border-b border-border px-3 py-1">
        <span className="text-xs text-muted-foreground">javascript</span>
    </div>
    {/* Code area with inline inputs */}
    <pre className="m-0 overflow-x-auto whitespace-pre p-4">
        {segments.map((segment, i) => (
            <React.Fragment key={i}>
                <span className="text-muted-foreground">{segment}</span>
                {i < question.blanks.length && (
                    <input
                        value={blanksInput[i]}
                        onChange={(e) => onBlankChange(i, e.target.value)}
                        disabled={isSubmitted}
                        aria-label={t('codeCompletion.inputLabel', { index: i + 1 })}
                        className={cn(
                            'inline bg-transparent font-mono text-sm border-b-2 border-muted-foreground',
                            'text-foreground outline-none min-w-[4ch]',
                            isSubmitted && blankResults[i] === 'correct'
                                && 'border-accent text-accent',
                            isSubmitted && blankResults[i] === 'incorrect'
                                && 'border-error text-error'
                        )}
                        style={{ width: `${Math.max(4, (blanksInput[i]?.length ?? 0) + 2)}ch` }}
                    />
                )}
            </React.Fragment>
        ))}
    </pre>
</div>
```

After submit, show a corrections list **below** the code block (not inline — it would break code layout):
```tsx
{isSubmitted && blankResults.some(r => r === 'incorrect') && (
    <ul className="text-xs space-y-1 mt-1">
        {blankResults.map((result, i) =>
            result === 'incorrect' ? (
                <li key={i} className="text-error">
                    {t('codeCompletion.inputLabel', { index: i + 1 })}: {t('codeCompletion.expected')} <code>{question.blanks[i]}</code>
                </li>
            ) : null
        )}
    </ul>
)}
```

Then `ExplanationPanel` and reference `CodeBlock` (readonly, reuse existing component):
```tsx
{isSubmitted && (
    <>
        <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('referenceSolution')}
            </p>
            <CodeBlock code={question.referenceAnswer} lang="javascript" />
        </div>
        <ExplanationPanel explanation={question.explanation} />
    </>
)}
```

**`referenceSolution`** i18n key already exists from Story 2.3. Use it.

### `useCodeCompletionQuestion.ts` — Full Specification

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeCompletionQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

interface UseCodeCompletionQuestionProps {
    question: CodeCompletionQuestion;
    onSubmitRegister: (submitFn: () => void) => void;
    onAllBlanksFilled: (filled: boolean) => void;
}

interface UseCodeCompletionQuestionReturn {
    segments: string[];
    blanksInput: string[];
    isSubmitted: boolean;
    blankResults: Array<'correct' | 'incorrect'>;
    onBlankChange: (index: number, value: string) => void;
    onSubmit: () => void;
}

export function useCodeCompletionQuestion({
    question,
    onSubmitRegister,
    onAllBlanksFilled,
}: UseCodeCompletionQuestionProps): UseCodeCompletionQuestionReturn
```

**State:**
```typescript
const [blanksInput, setBlanksInput] = useState<string[]>(() =>
    Array(question.blanks.length).fill('')
);
const [isSubmitted, setIsSubmitted] = useState(false);
const [blankResults, setBlankResults] = useState<Array<'correct' | 'incorrect'>>([]);

const segments = useMemo(() => question.code.split('__BLANK__'), [question.code]);
const setAnswer = useSessionStore.use.setAnswer();
```

**`onBlankChange`:**
```typescript
const onBlankChange = useCallback((index: number, value: string) => {
    setBlanksInput(prev => {
        const next = [...prev];
        next[index] = value;
        return next;
    });
}, []);
```

**Notify parent when all blanks filled:**
```typescript
useEffect(() => {
    const allFilled = blanksInput.length > 0 && blanksInput.every(v => v.trim() !== '');
    onAllBlanksFilled(allFilled);
}, [blanksInput, onAllBlanksFilled]);
```

**Submit logic:**
```typescript
const onSubmit = useCallback(() => {
    if (isSubmitted) return;
    if (!blanksInput.every(v => v.trim() !== '')) return;

    const results = question.blanks.map((expected, i) =>
        blanksInput[i].trim().toLowerCase() === expected.trim().toLowerCase()
            ? 'correct' as const
            : 'incorrect' as const
    );
    setBlankResults(results);
    setIsSubmitted(true);
    setAnswer(question.id, results.every(r => r === 'correct') ? 'correct' : 'incorrect');
}, [isSubmitted, blanksInput, question, setAnswer]);
```

**Register submit callback:**
```typescript
useEffect(() => {
    onSubmitRegister(onSubmit);
}, [onSubmit, onSubmitRegister]);
```

**Reset on question change:**
```typescript
useEffect(() => {
    setBlanksInput(Array(question.blanks.length).fill(''));
    setIsSubmitted(false);
    setBlankResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [question.id]);
```

### `QuestionCard.tsx` Updates

Add `onAllBlanksFilled` prop and the `code-completion` branch:

```tsx
// Add to QuestionCardProps:
onAllBlanksFilled?: (filled: boolean) => void;  // NEW

// Add stable noop (outside component, alongside existing noop):
const noopAllFilled = (_: boolean) => {};

// In JSX after bug-finding branch:
{question.type === 'code-completion' && (
    <CodeCompletionQuestion
        question={question}
        onSubmitRegister={onSubmitRegister ?? noop}
        onAllBlanksFilled={onAllBlanksFilled ?? noopAllFilled}
    />
)}
```

### `SessionPlayPage.tsx` Updates

Add Submit CTA for code-completion alongside the existing Check CTA pattern:

```tsx
// New state/refs (alongside existing multiHasSelection, checkFnRef):
const [codeCompletionAllFilled, setCodeCompletionAllFilled] = useState(false);
const submitFnRef = useRef<(() => void) | null>(null);

const handleAllBlanksFilled = useCallback((filled: boolean) => {
    setCodeCompletionAllFilled(filled);
}, []);

const handleSubmitRegister = useCallback((submitFn: () => void) => {
    submitFnRef.current = submitFn;
}, []);

const handleSubmit = useCallback(() => {
    submitFnRef.current?.();
}, []);

// In the useEffect([currentQuestion?.id]) reset block — add:
setCodeCompletionAllFilled(false);
submitFnRef.current = null;

// Pass to QuestionCard:
<QuestionCard
    onSelectionChange={handleSelectionChange}
    onCheckRegister={handleCheckRegister}
    onSubmitRegister={handleSubmitRegister}
    onAllBlanksFilled={handleAllBlanksFilled}
/>

// Determine type (alongside isMultiChoice):
const isCodeCompletion = currentQuestion?.type === 'code-completion';

// Render Submit button — same dual pattern (desktop inline + mobile sticky):
{isCodeCompletion && !isAnswered && (
    <div className="hidden lg:flex justify-end mt-2">
        <Button disabled={!codeCompletionAllFilled} onClick={handleSubmit}>
            {tQuestion('submit')}
        </Button>
    </div>
)}
{isCodeCompletion && !isAnswered && (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button disabled={!codeCompletionAllFilled} onClick={handleSubmit} className="w-full">
            {tQuestion('submit')}
        </Button>
    </div>
)}
```

**Note:** `tQuestion('submit')` already exists (`"Submit"` in en, `"Отправить"` in ru). No new i18n key for the CTA.

**Note:** `isAnswered` in `useSessionPlayPage` checks `answers[currentQuestion.id] !== undefined`. After `setAnswer(question.id, 'correct'|'incorrect')`, `isAnswered` becomes true and "Next" appears automatically. No extra logic needed.

### `useSummaryPage.ts` Update

```typescript
function isCorrectAnswer(question: Question, answer: unknown): boolean {
    if (question.type === 'single-choice') {
        return typeof answer === 'number' && answer === question.correct;
    }
    if (question.type === 'code-completion') {
        return answer === 'correct';
    }
    // multi-choice, bug-finding handled in future stories
    return false;
}
```

### i18n Keys to Add

**`public/locales/en/question.json`** — add:
```json
"codeCompletion": {
    "inputLabel": "Blank {{index}}",
    "expected": "Expected:"
}
```

**`public/locales/ru/question.json`** — add:
```json
"codeCompletion": {
    "inputLabel": "Поле {{index}}",
    "expected": "Правильно:"
}
```

**Already existing keys to reuse:** `"submit"`, `"referenceSolution"` (both added in Story 2.3).

### DevPlayground Section

```tsx
{/* CodeCompletionQuestion Section */}
<section className="space-y-4">
    <h2 className="text-2xl font-semibold tracking-tight">CodeCompletionQuestion</h2>
    <div className="rounded-lg border p-6 space-y-8">
        <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Pre-submit (blanks empty)
            </h3>
            <CodeCompletionQuestion
                question={{
                    id: 'cc-demo-1',
                    type: 'code-completion',
                    category: 'javascript',
                    difficulty: 'easy',
                    tags: ['variables'],
                    question: 'Complete the function body:',
                    code: 'function add(a, b) {\n  return __BLANK__ + __BLANK__;\n}',
                    blanks: ['a', 'b'],
                    referenceAnswer: 'function add(a, b) {\n  return a + b;\n}',
                    explanation: 'Add the two parameters. Both a and b are the function arguments.'
                }}
                onSubmitRegister={() => {}}
                onAllBlanksFilled={() => {}}
            />
        </div>
    </div>
</section>
```

### File Structure

```
src/components/features/QuestionCard/CodeCompletion/
  CodeCompletionQuestion.tsx    ← NEW
  useCodeCompletionQuestion.ts  ← NEW
  CodeCompletionQuestion.test.tsx ← NEW
  index.ts                       ← NEW
src/components/features/QuestionCard/QuestionCard.tsx ← MODIFY (code-completion branch + onAllBlanksFilled prop)
src/pages/SessionPlayPage/SessionPlayPage.tsx ← MODIFY (Submit CTA for code-completion)
src/pages/SummaryPage/useSummaryPage.ts ← MODIFY (isCorrectAnswer for code-completion)
public/locales/en/question.json ← MODIFY (add codeCompletion keys)
public/locales/ru/question.json ← MODIFY (add codeCompletion keys)
src/pages/DevPlayground/DevPlayground.tsx ← MODIFY (add CodeCompletionQuestion section)
```

No new stores, no new routes.

---

## Testing Requirements

### Test Fixture

```typescript
import type { CodeCompletionQuestion } from '@/lib/data/schema';

export const makeCodeCompletionQuestion = (
    overrides: Partial<CodeCompletionQuestion> = {}
): CodeCompletionQuestion => ({
    id: 'cc-test-001',
    type: 'code-completion',
    category: 'javascript',
    difficulty: 'medium',
    tags: ['test'],
    question: 'Complete the function:',
    code: 'function add(a, b) {\n  return __BLANK__ + __BLANK__;\n}',
    blanks: ['a', 'b'],
    referenceAnswer: 'function add(a, b) {\n  return a + b;\n}',
    explanation: 'Add the two parameters.',
    ...overrides,
});
```

### No Shiki Mock Needed

`CodeCompletionQuestion` does NOT use the existing `CodeBlock` for its editable area — it renders inline inputs. Do NOT add `vi.mock('@/lib/shiki', ...)`. The reference solution (post-submit) does use `CodeBlock`, so Shiki mock IS required when testing post-submit state:

```typescript
vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) =>
            `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`,
    }),
}));
```

### `CodeCompletionQuestion.test.tsx`

**Test: renders inputs equal to blanks count**
```typescript
renderWithProviders(<CodeCompletionQuestion question={makeCodeCompletionQuestion()} ... />);
expect(screen.getAllByRole('textbox')).toHaveLength(2);
```

**Test: inputs have correct aria-label**
```typescript
expect(screen.getByRole('textbox', { name: 'Blank 1' })).toBeInTheDocument();
expect(screen.getByRole('textbox', { name: 'Blank 2' })).toBeInTheDocument();
```

**Test: onSubmitRegister receives a function**
```typescript
const onSubmitRegister = vi.fn();
renderWithProviders(<CodeCompletionQuestion ... onSubmitRegister={onSubmitRegister} />);
expect(onSubmitRegister).toHaveBeenCalledWith(expect.any(Function));
```

**Test: onAllBlanksFilled called with false initially**
```typescript
const onAllBlanksFilled = vi.fn();
renderWithProviders(<CodeCompletionQuestion ... onAllBlanksFilled={onAllBlanksFilled} />);
expect(onAllBlanksFilled).toHaveBeenCalledWith(false);
```

**Test: onAllBlanksFilled called with true when all blanks filled**
```typescript
const onAllBlanksFilled = vi.fn();
renderWithProviders(<CodeCompletionQuestion ... onAllBlanksFilled={onAllBlanksFilled} />);
const inputs = screen.getAllByRole('textbox');
fireEvent.change(inputs[0], { target: { value: 'a' } });
// still false — only one filled
fireEvent.change(inputs[1], { target: { value: 'b' } });
// now true
expect(onAllBlanksFilled).toHaveBeenLastCalledWith(true);
```

**Test: stores 'correct' when all blanks match (case-insensitive + trim)**
```typescript
let capturedSubmitFn: (() => void) | null = null;
const onSubmitRegister = vi.fn((fn) => { capturedSubmitFn = fn; });

renderWithProviders(<CodeCompletionQuestion question={makeCodeCompletionQuestion()} onSubmitRegister={onSubmitRegister} onAllBlanksFilled={vi.fn()} />);

const inputs = screen.getAllByRole('textbox');
fireEvent.change(inputs[0], { target: { value: '  A  ' } }); // case-insensitive trim
fireEvent.change(inputs[1], { target: { value: 'B  ' } });

await act(async () => { capturedSubmitFn!(); });

expect(useSessionStore.getState().answers['cc-test-001']).toBe('correct');
```

**Test: stores 'incorrect' when any blank is wrong**
```typescript
// Fill one wrong value, one correct
// expect answers['cc-test-001'] === 'incorrect'
```

**Test: correct blank gets accent styling after submit**
```typescript
// Submit with correct answers
// Assert input[0] has className including 'border-accent'
```

**Test: incorrect blank gets error styling after submit**
```typescript
// Submit with wrong answer for blank[0]
// Assert input[0] has className including 'border-error'
```

**Test: inputs disabled after submit**
```typescript
// Submit → all inputs should have disabled attribute
screen.getAllByRole('textbox').forEach(input => {
    expect(input).toBeDisabled();
});
```

**Test: ExplanationPanel and reference solution appear after submit**
```typescript
await act(async () => { capturedSubmitFn!(); });
await waitFor(() => {
    expect(screen.getByRole('complementary')).toBeInTheDocument(); // ExplanationPanel
    expect(screen.getByText('Reference solution')).toBeInTheDocument();
});
```

**Test: resets state when question id changes**
```typescript
const q1 = makeCodeCompletionQuestion({ id: 'cc-1' });
const q2 = makeCodeCompletionQuestion({ id: 'cc-2' });
const { rerender } = renderWithProviders(<CodeCompletionQuestion question={q1} ... />);

// Fill blanks and submit
fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'a' } });
fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'b' } });
await act(async () => { capturedSubmitFn!(); });

rerender(<CodeCompletionQuestion question={q2} ... />);

// Inputs should be empty, ExplanationPanel not shown
screen.getAllByRole('textbox').forEach(input => {
    expect(input).toHaveValue('');
});
expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
```

### Setup / Teardown

```typescript
beforeEach(() => {
    useSessionStore.setState({
        questionList: [], currentIndex: 0, answers: {}, skipList: [], config: null, timerMs: 0
    });
    vi.clearAllMocks();
});
afterEach(() => {
    useSessionStore.setState({
        questionList: [], currentIndex: 0, answers: {}, skipList: [], config: null, timerMs: 0
    });
});
```

---

## Previous Story Intelligence

### From Stories 2.1–2.3

- **`renderWithProviders`** — always use, never bare `render`
- **`onSubmitRegister` pattern** — same as BugFindingQuestion (Story 2.3): parent registers a fn, hook calls it via `useEffect([onSubmit, onSubmitRegister])`
- **`useSessionStore.setState()`** in `beforeEach`/`afterEach` — required for test isolation
- **`eslint-disable-next-line react-hooks/exhaustive-deps`** — use for reset `useEffect` with `[question.id]`
- **`act(() => { capturedFn!(); })`** — wrap callback invocations that trigger state
- **Shiki mock** — required in tests that render `CodeBlock` (reference solution is shown post-submit)
- **`useTranslation('question')`** — use `question` namespace
- **Noop constants outside component** — `const noop = () => {}` — already exists in `QuestionCard.tsx`
- **Test count:** 142 passing after Story 2.3 — do not regress

### Deferred Work to Be Aware Of

From `_bmad-output/implementation-artifacts/deferred-work.md`:
- No callback unregistration in `useEffect` registration pattern — pre-existing, do NOT fix here
- Stale closure risk in callback registration — pre-existing, do NOT fix here

---

## Architecture Compliance

- **Component pattern:** `CodeCompletionQuestion.tsx` (JSX) + `useCodeCompletionQuestion.ts` (all logic)
- **`@/` alias only** — no relative `../../`
- **i18n:** All user-visible strings via `t()` — `useTranslation('question')`
- **No `tailwind.config.ts`** — tokens in `src/index.css`; use `bg-accent`, `border-error`, etc.
- **TypeScript strict** — no `any`; `Array<'correct' | 'incorrect'>` typed explicitly
- **Answer format:** `'correct'` / `'incorrect'` string (consistent with bug-finding `'gotIt'`/`'missedIt'` pattern)
- **SessionPlayPage Submit pattern** — mirrors Check pattern exactly: `useRef` + `useState` + `useCallback` + reset `useEffect`

---

## Project Context Reference

- Component always has companion `useComponentName.ts` hook
- DevPlayground must be updated — this story is not complete until `CodeCompletionQuestion` section exists in `DevPlayground.tsx`
- i18n: add keys to both `en` and `ru`
- Imports: `@/` alias only
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `CodeCompletionQuestion` component with `useCodeCompletionQuestion` hook following the same pattern as `BugFindingQuestion` (Story 2.3)
- Interactive code area renders segments + inline `<input>` elements; does NOT use existing `CodeBlock` (incompatible with inline inputs)
- After submit: blank highlighting (accent/error), corrections list, reference `CodeBlock`, and `ExplanationPanel` shown below
- All 12 new tests pass; total suite: 154 tests (was 142)
- Import order errors fixed: type imports before value imports within `@/` group

### File List

- `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx` (NEW)
- `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` (NEW)
- `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.test.tsx` (NEW)
- `src/components/features/QuestionCard/CodeCompletion/index.ts` (NEW)
- `src/components/features/QuestionCard/QuestionCard.tsx` (MODIFIED)
- `src/pages/SessionPlayPage/SessionPlayPage.tsx` (MODIFIED)
- `src/pages/SummaryPage/useSummaryPage.ts` (MODIFIED)
- `public/locales/en/question.json` (MODIFIED)
- `public/locales/ru/question.json` (MODIFIED)
- `src/pages/DevPlayground/DevPlayground.tsx` (MODIFIED)

### Review Findings

- [x] [Review][Patch] Focus indicator missing on blank inputs — added `focus-visible:border-foreground` to input className [CodeCompletionQuestion.tsx:42]
- [x] [Review][Patch] Hardcoded `lang="javascript"` — added optional `lang` field to `CodeCompletionSchema`, component uses `question.lang ?? 'javascript'` [schema.ts, CodeCompletionQuestion.tsx]
- [x] [Review][Patch] No dev warning for blank count / `__BLANK__` mismatch — added `import.meta.env.DEV` guard with console.warn [useCodeCompletionQuestion.ts]
- [x] [Review][Defer] Mobile sticky bar missing z-index [SessionPlayPage.tsx:120] — deferred, pre-existing pattern across all sticky bars
- [x] [Review][Defer] `onSubmit` exported from hook but unused in component [useCodeCompletionQuestion.ts:73] — deferred, same pattern as BugFindingQuestion (per-spec)

### Change Log

- 2026-04-08: Story 2.4 implemented — CodeCompletionQuestion component with blank inputs, submit validation, result highlighting, and session store integration
- 2026-04-08: Code review — 3 patches applied (focus indicator, dynamic lang, dev mismatch warning); 2 deferred
