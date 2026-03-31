# Story 2.2: CodeBlock Component with Syntax Highlighting

Status: review

## Story

As a **user**,
I want to see code snippets with syntax highlighting,
So that I can read code as clearly as in my editor without straining to parse plain text.

## Acceptance Criteria

1. **Given** a question contains a `code` field
   **When** the `CodeBlock` component renders
   **Then** syntax highlighting is applied using **Shiki** (`github-dark` theme, VS Code Dark+ colour palette)
   **And** the language label is shown top-left; a copy button top-right
   **And** on mobile: `max-height: 320px` with internal vertical scroll; horizontal scroll for long lines; no layout breakage at 375px
   **And** on desktop: `max-height: 480px`

2. **Given** `CodeBlock` is rendered in DevPlayground
   **When** a developer views the playground
   **Then** both readonly and interactive variants are shown with all states

## Tasks / Subtasks

- [x] Task 0: Install Shiki
  - [x] `npm install shiki` (not a devDependency — used at runtime)

- [x] Task 1: Create Shiki singleton helper (AC: #1)
  - [x] Create `src/lib/shiki.ts` — module-level cached `createHighlighter` promise
  - [x] Supported langs: `javascript`, `typescript`, `jsx`, `tsx`, `html`, `css`, `json`, `bash`
  - [x] Theme: `github-dark`

- [x] Task 2: Create `CodeBlock` component (AC: #1)
  - [x] Create folder `src/components/common/CodeBlock/`
  - [x] `CodeBlock.tsx` — presentational, uses `useCodeBlock` hook
  - [x] `useCodeBlock.ts` — async highlight logic + copy state
  - [x] `CodeBlock.test.tsx` — unit tests (see Testing section)
  - [x] `index.ts` — re-export

- [x] Task 3: Wire `CodeBlock` into `DevPlayground` (AC: #2)
  - [x] Add `<section>` for `CodeBlock` in `src/pages/DevPlayground/DevPlayground.tsx`
  - [x] Show: readonly state (loading → highlighted), copy button interaction, 2–3 language examples

- [x] Task 4: Add i18n keys (AC: #1)
  - [x] `public/locales/en/question.json` — add `"copy": "Copy"` and `"copied": "Copied"`
  - [x] `public/locales/ru/question.json` — add `"copy": "Копировать"` and `"copied": "Скопировано"`

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

---

## Dev Notes

### CRITICAL: Shiki Is NOT Installed

**Shiki is not in `package.json`** — run `npm install shiki` before writing any code. Shiki v3 is current as of 2026.

### Module-Level Singleton Pattern (Required)

Shiki's `createHighlighter` is async and expensive. Initialize **once** at module level, never inside a component:

```typescript
// src/lib/shiki.ts
import { createHighlighter, type Highlighter } from 'shiki';

let _promise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!_promise) {
    _promise = createHighlighter({
      themes: ['github-dark'],
      langs: ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'json', 'bash'],
    });
  }
  return _promise;
}
```

This is not a React hook — it's a plain module. Import `getHighlighter` in `useCodeBlock.ts`.

### `useCodeBlock.ts` — Full Specification

```typescript
interface UseCodeBlockProps {
  code: string;
  lang?: string; // defaults to 'javascript'
}

interface UseCodeBlockReturn {
  highlightedHtml: string | null; // null = still loading
  isCopied: boolean;
  onCopy: () => void;
}

export function useCodeBlock({ code, lang = 'javascript' }: UseCodeBlockProps): UseCodeBlockReturn
```

**Async highlight effect:**

```typescript
const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  getHighlighter().then((h) => {
    if (!cancelled) {
      setHighlightedHtml(
        h.codeToHtml(code, { lang, theme: 'github-dark' })
      );
    }
  });
  return () => { cancelled = true; };
}, [code, lang]);
```

**Copy with feedback:**

```typescript
const [isCopied, setIsCopied] = useState(false);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const onCopy = useCallback(() => {
  navigator.clipboard.writeText(code).then(() => {
    setIsCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
  });
}, [code]);

// cleanup on unmount
useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
```

### `CodeBlock.tsx` — Component Structure

```tsx
interface CodeBlockProps {
  code: string;
  lang?: string; // default: 'javascript'
  className?: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({ code, lang = 'javascript', className }) => {
  const { highlightedHtml, isCopied, onCopy } = useCodeBlock({ code, lang });

  return (
    <div className={cn('relative rounded-none border border-border bg-[#0d1117] font-mono text-sm', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-xs text-muted-foreground">{lang}</span>
        <button
          type="button"
          aria-label={isCopied ? t('copied', { ns: 'question' }) : t('copy', { ns: 'question' })}
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? t('copied', { ns: 'question' }) : t('copy', { ns: 'question' })}
        </button>
      </div>

      {/* Code area */}
      <div
        className="overflow-auto md:max-h-[480px] max-h-[320px]"
        style={{ overflowX: 'auto' }}
      >
        {highlightedHtml ? (
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className="[&>pre]:m-0 [&>pre]:p-4 [&>pre]:bg-transparent [&>pre]:text-sm"
          />
        ) : (
          <pre className="m-0 p-4 text-muted-foreground whitespace-pre overflow-x-auto">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
```

**IMPORTANT — `dangerouslySetInnerHTML`:**
- Shiki returns sanitised HTML — it's safe for internal code snippets (never user-supplied HTML)
- The eslint-disable comment is required (project lint config flags `no-danger`)
- Shiki wraps output in `<pre><code>` — override Shiki's inline background via CSS-in-JSX `[&>pre]` Tailwind selectors

**Background colour:** Shiki's `github-dark` uses `#0d1117`. Set `bg-[#0d1117]` on the wrapper. Do NOT use a CSS token — the value must match Shiki's theme exactly.

**Rounded corners:** `rounded-none` — project uses sharp corners (terminal aesthetic).

### Tailwind v4 Overflow Classes

Tailwind v4: `max-h-[320px]` and `max-h-[480px]` are arbitrary values — no config needed. `overflow-auto` applies `overflow: auto` on both axes. Add `overflow-x: auto` via `style` prop to ensure horizontal scroll works on iOS Safari (Tailwind's `overflow-x-auto` is fine too).

### Lucide Icons

Use `Copy` and `Check` from `lucide-react` (already installed). Size: `size={12}` (12px for inline header icons).

### File Location

`CodeBlock` goes in `src/components/common/` (not `features/QuestionCard/`) because it will be reused in Story 2.3 (bug-finding) and Story 2.4 (code-completion). Keep it generic.

```
src/
  components/
    common/
      CodeBlock/
        CodeBlock.tsx        ← NEW
        useCodeBlock.ts      ← NEW
        CodeBlock.test.tsx   ← NEW
        index.ts             ← NEW
  lib/
    shiki.ts                 ← NEW singleton helper
  pages/
    DevPlayground/
      DevPlayground.tsx      ← MODIFY (add CodeBlock section)
public/
  locales/en/question.json   ← MODIFY (add copy, copied)
  locales/ru/question.json   ← MODIFY (add copy, copied)
```

No new stores, no new routes. `QuestionCard` is NOT modified in this story — that's Story 2.3.

### DevPlayground Section

Add after existing sections in `DevPlayground.tsx`:

```tsx
{/* CodeBlock Section */}
<section className="space-y-4">
  <h2 className="text-2xl font-semibold tracking-tight">CodeBlock</h2>
  <div className="rounded-lg border p-6 space-y-8">
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        JavaScript (readonly)
      </h3>
      <CodeBlock
        lang="javascript"
        code={`function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}`}
      />
    </div>
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        TypeScript
      </h3>
      <CodeBlock
        lang="typescript"
        code={`interface User {\n  id: string;\n  name: string;\n  role: 'admin' | 'user';\n}\n\nfunction getUser(id: string): Promise<User | null> {\n  return fetch(\`/api/users/\${id}\`).then(r => r.json());\n}`}
      />
    </div>
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Long lines (horizontal scroll test)
      </h3>
      <CodeBlock
        lang="javascript"
        code={`const result = someVeryLongFunctionName(firstArgument, secondArgument, thirdArgument, fourthArgument, fifthArgument);`}
      />
    </div>
  </div>
</section>
```

---

## Testing Requirements

### Mock Strategy for Shiki

Shiki uses WASM + dynamic imports — mock it in Vitest. Create `src/test/mocks/shiki.ts` (or inline in test):

```typescript
vi.mock('@/lib/shiki', () => ({
  getHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: (code: string) =>
      `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`,
  }),
}));
```

Use `renderWithProviders` (not `render`) — already established pattern from Story 2.1.

### `CodeBlock.test.tsx`

**Test: renders fallback while loading**
- Mock `getHighlighter` to return a promise that never resolves
- Render `<CodeBlock code="const x = 1" lang="javascript" />`
- Assert: raw `<code>` element with `const x = 1` is visible (fallback state)

**Test: renders highlighted HTML after load**
- Use resolved mock (default mock above)
- `await waitFor(() => expect(screen.getByText('...')).toBeInTheDocument())`
- Assert: `dangerouslySetInnerHTML` container is present (check for `.shiki` class)

**Test: shows language label**
- Render with `lang="typescript"`
- Assert: `screen.getByText('typescript')` exists

**Test: copy button triggers clipboard**
- Mock `navigator.clipboard.writeText` → `vi.fn().mockResolvedValue(undefined)`
- Click copy button
- Assert: `clipboard.writeText` called with the `code` string

**Test: copy button shows "Copied" state then reverts**
- Use `vi.useFakeTimers()`
- Click copy button
- Assert: `isCopied` icon/text visible immediately
- `vi.advanceTimersByTime(2000)`
- Assert: back to "Copy" state

**Test: cleanup — cancels in-flight highlight on unmount**
- Mock `getHighlighter` to return a promise that resolves after unmount
- Ensure no state update after unmount (no "Cannot update unmounted component" warning)

### `useCodeBlock.ts` — unit tests (optional, test via component)

The hook logic is tightly coupled to Shiki's async API; testing via the component is sufficient.

---

## Previous Story Intelligence (Story 2.1)

- **`renderWithProviders`** from `src/test/test-utils.tsx` — always use this, never bare `render`
- **`act()` from `@testing-library/react`** — required when asserting state changes from captured refs/callbacks; similarly needed here for async Shiki resolution
- **`vi.useFakeTimers()`** — use for the copy-button timeout (2000ms) test to avoid real delays
- **`eslint-disable-line react-hooks/exhaustive-deps`** — safe for `useEffect` with `[question.id]`; similar pattern applies for `[code, lang]` if linter complains
- **Fixture location:** `src/test/fixtures/` — no CodeBlock fixture needed (code is just a string)
- **Callback pattern works well** — Story 2.1 established that lifting callbacks via props is clean; no need to pollute stores with UI state
- All 122 tests pass after Story 2.1 — do not regress them

---

## Architecture Compliance

- **Component pattern:** `CodeBlock.tsx` (JSX only) + `useCodeBlock.ts` (all logic) — no exceptions
- **`@/` alias:** All imports use `@/components`, `@/lib`, etc. — no relative `../../`
- **i18n:** Copy/Copied strings go through `t()` — `useTranslation('question')` inside component
- **No `tailwind.config.ts`:** All Tailwind tokens in `src/index.css`. Shiki background `#0d1117` as arbitrary value `bg-[#0d1117]`.
- **lucide-react:** Already installed. Use `Copy` and `Check` icons.
- **No store changes:** `CodeBlock` is stateless regarding session/progress — local state only.
- **TypeScript strict:** No `any`, no non-null assertions without justification.

---

## Project Context Reference

- Rules: read `.cursor/rules/` before implementing (engineering-standards, react-patterns, test-driven-development)
- Component pattern: always extract logic to `useComponentName.ts` hook
- DevPlayground update rule: **this PR is not complete until a CodeBlock section exists in DevPlayground**
- Tailwind v4: tokens in `src/index.css`; arbitrary values via `[]` syntax
- i18n: `useTranslation('question')` inside components; add to both `en` and `ru` locale files
- Imports: `@/` alias only, no relative `../../`
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Shiki installed as v4.0.2 (story mentioned v3 — v4 API is compatible, `createHighlighter` exists)
- `@testing-library/user-event` not installed in project — used `fireEvent` from `@testing-library/react` instead (consistent with Story 2.1 pattern)
- ESLint rules `react/forbid-dom-props` and `react/no-danger` not configured — removed eslint-disable comments; `dangerouslySetInnerHTML` is allowed in project
- Timer test fixed: used `vi.useFakeTimers({ shouldAdvanceTime: false })` + `await act(() => Promise.resolve())` to flush clipboard Promise before advancing timers

### Completion Notes List

- Implemented Shiki singleton helper (`src/lib/shiki.ts`) — module-level cached promise, `github-dark` theme, 8 languages
- Created `CodeBlock` component with `useCodeBlock` hook following project pattern (presentational + hook separation)
- Copy button with 2s "Copied" feedback, cancel-on-unmount effect for in-flight highlights
- 6 unit tests added (128 total, was 122) — all pass
- DevPlayground updated with 3 CodeBlock examples (JS, TS, long-line scroll test)
- i18n keys added to both `en` and `ru` question namespaces

### File List

- `src/lib/shiki.ts` — NEW: Shiki singleton helper
- `src/components/common/CodeBlock/CodeBlock.tsx` — NEW: presentational component
- `src/components/common/CodeBlock/useCodeBlock.ts` — NEW: async highlight + copy logic
- `src/components/common/CodeBlock/CodeBlock.test.tsx` — NEW: 6 unit tests
- `src/components/common/CodeBlock/index.ts` — NEW: re-export
- `src/pages/DevPlayground/DevPlayground.tsx` — MODIFIED: CodeBlock section added
- `public/locales/en/question.json` — MODIFIED: copy/copied keys
- `public/locales/ru/question.json` — MODIFIED: copy/copied keys
- `package.json` — MODIFIED: shiki dependency added
- `package-lock.json` — MODIFIED: lockfile updated

### Change Log

- 2026-03-30: Story 2.2 implemented — CodeBlock component with Shiki syntax highlighting, copy button, DevPlayground integration, i18n keys
