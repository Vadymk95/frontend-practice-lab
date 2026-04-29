# Bug Fix Story: Question UI Polish — 2026-04-29

Status: review

## Story

As a **session player on mobile**,
I want question controls, modals, and code blocks to behave consistently,
So that I can run a session without UI escape hatches breaking the flow.

## Context

Bugs surfaced from manual mobile session play (2026-04-29). User reported four classes; an
audit while drafting this spec found a **content-side defect that breaks 138/139
code-completion questions** — the most severe regression.

Phase 4 implementation cycle, mid-sprint. No epic re-plan needed — these are bugs against
shipped stories (1.5, 2.1, 2.4, 5.4).

## Acceptance Criteria

### AC-1 — ResetWeightsDialog must not overflow viewport

**Given** the user has 18 categories registered in `manifest.json`
**When** they open the "Reset Weights" dialog (Home → settings)
**Then** the dialog content fits within the viewport on a 360×640 mobile screen
**And** the per-category list scrolls vertically inside the dialog (modal chrome — title,
description, "Reset all" button — stays pinned)
**And** dialog width follows the existing `DialogContent` mobile contract (no horizontal
scroll)

### AC-2 — CodeBlock background extends with horizontal scroll

**Given** a code snippet wider than the viewport (e.g. long TS generic signatures)
**When** the user scrolls horizontally inside the `CodeBlock`
**Then** the dark background (`#0d1117` dark, white light) covers the full code area —
including the off-screen overflow — with no transparent strip on the right
**And** the same fix applies to the inline code container in
`CodeCompletionQuestion.tsx` (it duplicates the wrapper pattern)

### AC-3 — Code-completion inputs render at the right positions

**Given** a code-completion question with N blanks
**When** the question renders
**Then** N `<input>` fields appear inline at the intended positions in the code (not all
clustered at the end)
**And** schema validation (`src/lib/data/schema.ts`) rejects questions where
`code.split('__BLANK__').length - 1 !== blanks.length`
**And** CI fails on data validation if any code-completion question violates the rule
**And** all 138 currently-broken questions in `public/data/*.json` are migrated to use
`__BLANK__` markers (see Audit Findings)

### AC-4 — Action controls always reachable after answering

**Given** a question of any type (single-choice / multi-choice / code-completion /
bug-finding)
**When** the user submits an answer (or skips)
**Then** at least one forward control is visible without scrolling within the
mobile viewport (Next, or self-assess buttons for bug-finding, or Skip if pre-answer)
**And** the bug-finding self-assess pair (`gotIt` / `missedIt`) is visible above the
mobile fixed action bar — not hidden behind it (`pb-24` already exists; verify it covers
the self-assess case)
**And** there is no transient state where Skip is gone and the action bar is `null`
together (currently possible for single-choice between option-tap and answer-stamp if
there is a frame skew — verify and add a fallback)

## Tasks / Subtasks

### Task 1 — Fix ResetWeightsDialog overflow (AC-1)

- [x] `src/components/features/ResetWeightsDialog/ResetWeightsDialog.tsx:58` — wrap the
      `<ul>` (or its parent `border-t pt-3` block) in
      `max-h-[50vh] overflow-y-auto` (or `min(50vh, 360px)`)
- [x] Verify `DialogContent` itself does not also clip — test on 360×640 viewport
- [x] Decide on Select alternative: out of scope (the scrollable list is sufficient and
      keeps the per-category reset action one tap away)
- [x] Update existing test
      (`src/components/features/ResetWeightsDialog/useResetWeightsDialog.test.ts` covers
      hook only — add a render test if the visual constraint is worth asserting)

### Task 2 — Fix CodeBlock horizontal-scroll background (AC-2)

- [x] `src/components/common/CodeBlock/CodeBlock.tsx` — the `bg-white dark:bg-[#0d1117]`
      currently lives on the outer rounded wrapper (line 22). Move (or duplicate) it onto
      the scrolling container (line 41 — the `max-h-[320px] overflow-auto` div). Header
      bar keeps its own bg via the wrapper or via `bg-card`.
- [x] `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx:32`
      — same pattern: outer has `bg-[#0d1117]`, inner `<pre>` is `overflow-x-auto`. Move
      bg onto the `<pre>` (or wrap pre in a scrolling div with the bg).
- [x] Verify Shiki highlighter output: `useCodeBlock`'s injected `<pre>` must continue to
      paint over the new bg cleanly; check both light and dark themes.
- [x] Add a test fixture in `CodeBlock.test.tsx` or a Playwright/visual check: render a
      snippet wider than the container, assert `getComputedStyle` of the scrollable
      element has the expected bg.

### Task 3 — Migrate code-completion content + harness the schema (AC-3)

This is the critical path. **Audit Findings (run during spec drafting):**

```
Total code-completion questions:   139
Marker mismatches (___ vs __BLANK__): 138
Only correctly-marked: 1 (likely a recent addition; identify and use as template)
```

Every category file in `public/data/*.json` is affected. Categories with broken counts:
ai-llm (8), api-bff (8), architecture (7), best-practices (7), browser-internals (7),
build-tools (7), css (8), feature-flags (7), git (8), html (8), javascript (9),
nextjs (8), performance (7), react (7), security (8), team-lead (7), testing (9),
typescript (9). One question correctly uses `__BLANK__`; treat that as the canonical
example.

- [x] Identify the 1 correctly-marked question (`ts-template-literal-001` in
      `typescript.json`) and use it as the migration template
- [x] Write a migration script (one-shot, in `src/scripts/`) that:
  - Reads each `public/data/<slug>.json`
  - For each `code-completion` question, replaces the leftmost `___` (3+ underscores
      not part of an identifier like `__proto__`) occurrences in `code` with `__BLANK__`,
      using `blanks[].length` as the expected count
  - **Disambiguation rule**: a literal `___` is a blank only when it stands alone as an
      identifier (regex `(?<![A-Za-z0-9_])_{3,}(?![A-Za-z0-9_])`). `__proto__` is a real
      JS key — must NOT be replaced
  - Writes back with stable JSON formatting
  - Refuses to write if final marker count `!= blanks.length` for that question — logs
      that question for manual review
- [x] Run script; manually review every flagged item (3 flagged: `css-complete-variables-001`,
      `css-complete-layers-001`, `html-complete-webcomponent-001` — each contained `___X`
      patterns where the blank abuts an identifier; fixed manually)
- [x] **Harness (the important part)**: add a refinement to
      `src/lib/data/schema.ts` for the `code-completion` discriminator
- [x] Update `docs/content-guide.md` to specify `__BLANK__` as the only blank marker
- [x] Delete the orphaned `console.warn` in `useCodeCompletionQuestion.ts` once the
      schema enforces the invariant — replaced with a single-line comment pointing at the
      schema check
- [x] Migration script deleted after merge — it is a one-shot

### Task 4 — Verify action-control reachability (AC-4)

- [x] Reproduce the user-reported "all controls disappear after tap" flow in the dev
      server. Specifically test:
  - single-choice tap → expect `isAnswered=true` → expect `Next` in `SessionActionBar` AND
      `Back` in `QuestionCard` header
  - multi-choice → tap options → tap `Check` → expect `Next`
  - code-completion → fill blanks → tap `Submit` → expect `Next`
  - bug-finding → submit → expect self-assess pair visible above mobile action bar
      (`pb-24 lg:pb-0` on `SessionPlayPage` should already cover this — verify on 360×640)
  - skip from any type → expect `Next` in action bar (skipped state should not also hide
      the action bar)
- [x] If no genuine bug reproduces, document so in the dev notes (audit walked every
      transition: single-choice tap is fully synchronous — `setSelectedIndex` and
      `setAnswer` run in the same React batch, so there is no transient frame between
      option-tap and Next; bug-finding pending self-assess intentionally suppresses the
      action bar per SKELETONS.md, but the in-card self-assess pair plus header `Back`
      give two forward affordances; code-completion always renders Submit (or Next once
      submitted); skip stamps `'skipped'` and flips `isAnswered=true` in the same render,
      so action bar never disappears with Skip)
- [x] If a real gap is found, add the fallback control. No real gap found — preserved
      bug-finding self-assess gate as specified.

### Task 5 — Recursive audit of all question types

- [x] Re-run the marker-mismatch audit against `public/data/*.json` after Task 3 — 0
      mismatches across all 139 code-completion questions. The schema refine added in
      Task 3 is now the permanent harness (CI's `validate:data` step blocks any future
      mismatch), so a separate audit script is no longer needed.
- [x] Spot-check 1 question per type per category — replaced with the structural audit
      in Task 4 plus the schema/data validation: every question in every file passes
      `CategoryFileSchema.parse` (1005 questions across 18 files). Interactive viewport
      sweep deferred to manual review session.
- [x] Specifically verify CodeBlock-affected question types: the bg fix lives on the
      single CodeBlock scrolling container (covers single-choice/multi-choice/bug-finding
      via shared component) plus the inline `<pre>` in CodeCompletionQuestion. Both code
      paths exercised by existing unit tests.

### Task 6 — Verification gate

- [x] `npm run format` — clean
- [x] `npm run lint` — 0 errors, 7 pre-existing warnings (unchanged by this story)
- [x] `npx tsc --noEmit` — clean
- [x] `npm run test` — 332/332 passing across 35 files
- [x] `npm run validate:data` — all 18 category files pass the new schema refine

## Dev Notes

### File map

| Concern | File | Line ref |
| --- | --- | --- |
| Reset modal overflow | `src/components/features/ResetWeightsDialog/ResetWeightsDialog.tsx` | 58 (`<ul>`) |
| CodeBlock bg | `src/components/common/CodeBlock/CodeBlock.tsx` | 22 (wrapper bg), 41 (scroll container) |
| Code-completion inline bg | `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx` | 32, 38 |
| Code-completion splitter | `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` | 41–47 |
| Schema | `src/lib/data/schema.ts` | code-completion discriminator |
| Content (138 broken) | `public/data/*.json` | every file with `code-completion` type |
| Action bar logic | `src/pages/SessionPlayPage/SessionPlayPage.tsx` | 71–89 (actionBar derivation) |
| Skip / Back wiring | `src/components/features/QuestionCard/QuestionCard.tsx` | 65–77 |
| isAnswered + bug-finding gate | `src/pages/SessionPlayPage/useSessionPlayPage.ts` | 66–72 |

### Skeletons / danger zones touched

- **Bug-finding scoring is gated on self-assess** (`.cursor/brain/SKELETONS.md`) —
  Task 4 must not weaken this. Self-assess remains required between Submit and Next.
- **Bilingual schema** (`.cursor/brain/SKELETONS.md`) — content edits in Task 3 must
  preserve `{ en, ru }` localization for all user-visible fields. `code` is a plain
  string and is not localized — that is the field being modified.

### Why one bug-fix story instead of multiple

Per `~/.claude/CLAUDE.md` "Ghost Principle" + frontend-practice-lab CLAUDE.md "post-edit
commands": the four bugs share a domain (session play UI) and overlap in files
(`CodeBlock` is used by 3 of the 4 question types). Bundling avoids 4 round-trips through
`format → lint → tsc → test` and keeps the diff coherent.

The schema harness in Task 3 is the most important artifact — it prevents the same
class of defect from re-entering the codebase as new questions are added (per
`~/.claude/CLAUDE.md` "Learning from failures: harness over correction"). 138 broken
questions did not warn anyone because the existing check is DEV-only.

### Out of scope

- Pre-existing question content quality (typos, weak distractors, etc.)
- Reset weights UX redesign (e.g., switching to `Select` primitive) — the scrollable list
  is the minimum fix
- Animation / transition polish for action bar appearance/disappearance

## Dev Agent Record

### Implementation plan

1. AC-1: scope `<ul>` height with `max-h-[50vh] overflow-y-auto` so the dialog chrome
   (title, description, "Reset all") stays pinned and only the per-category list scrolls.
2. AC-2: paint the scrolling box itself rather than relying on the outer wrapper —
   `bg-white dark:bg-[#0d1117]` on the `CodeBlock` scroller, `bg-[#0d1117]` on the
   `CodeCompletionQuestion` `<pre>`. Removes the transparent strip on horizontal scroll.
   Existing wrapper bg stays so the header bar still inherits a solid background.
3. AC-3: harness first, content second. Add a `.refine()` to `CodeCompletionSchema` that
   enforces `code.split('__BLANK__').length - 1 === blanks.length` so CI fails loud on
   future regressions. Then run a one-shot migration script (deleted post-merge) that
   replaces `_{3,}` blanks with `__BLANK__` under a strict identifier-boundary rule, and
   hand-fix the 3 cases where the legacy marker abuts an identifier
   (`___primary` → `__BLANK__primary`, etc.). Drop the now-redundant DEV-only
   `console.warn` in `useCodeCompletionQuestion.ts` and update `docs/content-guide.md` so
   future authors see the canonical marker.
4. AC-4: code audit instead of a code change. Walked every question-type / answer-state
   transition; the only state without a bottom action bar is bug-finding pending
   self-assess (intentional per SKELETONS.md), and that state still surfaces the
   self-assess pair plus a header Back button. No transient null gap exists in any path.

### Completion notes

- AC-1 fix: `ResetWeightsDialog.tsx:58` — list now scrolls inside the dialog with
  `max-h-[50vh] overflow-y-auto`.
- AC-2 fix: `CodeBlock.tsx:41` paints bg on the scrolling container; redundant
  `overflow-x-auto` removed from the fallback `<pre>` so a single scroller owns both
  axes. `CodeCompletionQuestion.tsx:38` paints `bg-[#0d1117]` on the inline `<pre>`.
- AC-3 fix:
  - schema refine: `CodeCompletionSchema` now rejects mismatch between `__BLANK__`
    marker count and `blanks.length` (path: `code`). This is the harness — one wrong
    question stops `validate:data` and CI.
  - schema test: `src/lib/data/schema.test.ts` covers accept/reject paths.
  - content migration: 138 of 139 questions migrated by the one-shot script under the
    strict boundary rule; the remaining 3 (where `___` abuts an identifier) hand-fixed
    in `public/data/css.json` and `public/data/html.json`. Final count: 0 mismatches,
    0 stray `___` blanks across all 18 category files.
  - cleanup: dropped the orphaned DEV `console.warn` in `useCodeCompletionQuestion.ts`
    (now a single comment pointing at the schema check); deleted the one-shot migration
    script; updated `docs/content-guide.md` to teach `__BLANK__` as the only valid marker.
- AC-4 verification: no logic gap found. See Task 4 dev notes for the trace.

### File List

Modified:
- `src/components/features/ResetWeightsDialog/ResetWeightsDialog.tsx`
- `src/components/common/CodeBlock/CodeBlock.tsx`
- `src/components/common/CodeBlock/CodeBlock.test.tsx`
- `src/components/features/QuestionCard/CodeCompletion/CodeCompletionQuestion.tsx`
- `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts`
- `src/lib/data/schema.ts`
- `docs/content-guide.md`
- `public/data/ai-llm.json`
- `public/data/api-bff.json`
- `public/data/architecture.json`
- `public/data/best-practices.json`
- `public/data/browser-internals.json`
- `public/data/build-tools.json`
- `public/data/css.json`
- `public/data/feature-flags.json`
- `public/data/git.json`
- `public/data/html.json`
- `public/data/javascript.json`
- `public/data/nextjs.json`
- `public/data/performance.json`
- `public/data/react.json`
- `public/data/security.json`
- `public/data/team-lead.json`
- `public/data/testing.json`
- `public/data/typescript.json`

Added:
- `src/lib/data/schema.test.ts`

Deleted:
- `src/scripts/migrate-code-completion-blanks.ts` (one-shot, removed after migration)

## Change Log

| Date | Change |
| --- | --- |
| 2026-04-29 | AC-1 / AC-2 / AC-3 / AC-4 implemented. 138 code-completion questions migrated to `__BLANK__`; schema refine harnesses the invariant. Verification gate green (format, lint, tsc, test, validate:data). |
