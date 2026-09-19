# InterviewOS

Personal mobile-first interview preparation SPA for frontend engineers. Daily habit tool to combat cognitive atrophy from AI-assisted workflows.

Covers **trainee → principal/staff engineer** depth across 20 topic categories (1217 bilingual RU/EN questions) with an adaptive algorithm: every answered question carries its own weight (wrong → asked more, right → asked less), and a category you keep failing lifts the questions in it you have not seen yet. The whole pool of a session is ordered by those weights, so the weak spots come first even when you take "all available".

## Stack

React 19 · TypeScript 5.9 · Vite 8 · Tailwind v4 · shadcn/ui · Zustand 5 · TanStack Query 5 · React Router 7 · i18next · Vitest 4 · Playwright · PWA

## Question Modes

| Mode            | Description                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Quiz            | Single / multiple choice with instant reveal; options are shuffled on every showing            |
| Bug Finding     | Spot the error in a code snippet, describe it, then self-assess against the reference          |
| Code Completion | Fill in the blanks — graded case-insensitively, tolerant of spacing, quotes and a trailing `;` |

## Categories (18)

`HTML` · `CSS` · `Browser Internals` · `JavaScript` · `TypeScript` · `React` · `Next.js` · `Architecture` · `Build Tools` · `Performance` · `Security` · `API & BFF` · `Feature Flags` · `Git` · `Testing` · `Team Lead` · `Best Practices` · `AI / LLM`

## Quick Start

Node **24** (`.nvmrc`; `engines` is enforced). Lifecycle scripts are off repo-wide, so git hooks are installed by hand once:

```bash
npm install
npm run prepare     # installs the husky hooks (once per clone)
npm run dev         # http://localhost:3000
```

## Commands

The gate is one chain with one home: `AGENTS.md` § The gate says what runs at each moment; this table only names the commands.

```bash
npm run dev             # dev server :3000
npm run build           # manifest regeneration + tsc -b + vite build
npm run verify:iter     # per change: tsc -b + the changed unit tests (seconds)
npm run verify          # the offline chain: hooks → format → lint → types → data schema → data quality → unit tests
npm run verify:ci       # audit gate + verify — what the pre-push hook and CI run
npm run test:e2e        # Playwright: desktop Chromium + iPhone 14 descriptor on Chromium
npm run validate:data   # public/data/*.json against the Zod schema
npm run data:check      # content-quality gate: duplicates, unanswerable blanks, untranslated text, answer-position bias
npm run build:manifest  # regenerate public/data/manifest.json (after adding or removing questions)
```

## Adding Questions

See [`docs/content-guide.md`](docs/content-guide.md) — schema per question type, what renders (inline `code`, `**bold**`, line breaks; snippets go in the `code` field), ID rules, the AI-agent prompt, and how the data gate judges a change.

After editing any JSON under `public/data/`:

```bash
npm run validate:data
npm run data:check
npm run build:manifest  # when the number of questions or categories changed
```

## Agents

`AGENTS.md` is the entry point for coding agents (gate law, lanes, must-not-touch list). `CLAUDE.md` points at it; `.cursor/brain/` holds the map, danger zones and decisions.

## PRD

Full product requirements: `_bmad-output/planning-artifacts/prd.md` (written for 17 categories; AI / LLM was added later).
