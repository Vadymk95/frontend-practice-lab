# InterviewOS

Personal mobile-first interview preparation SPA for frontend engineers. Daily habit tool to combat cognitive atrophy from AI-assisted workflows.

Covers **trainee → principal/staff engineer** depth across 18 topic categories (955 bilingual RU/EN questions) with an adaptive algorithm that surfaces weak areas more frequently.

## Stack

React 19 · TypeScript 5.9 · Vite 8 · Tailwind v4 · shadcn/ui · Zustand 5 · TanStack Query 5 · React Router 7 · i18next · Vitest 4 · PWA

## Question Modes

| Mode            | Description                                        |
| --------------- | -------------------------------------------------- |
| Quiz            | Single / multiple choice with instant reveal       |
| Bug Finding     | Spot the error in a code snippet                   |
| Code Completion | Fill in the blank — validated by string comparison |

## Categories (18)

`HTML` · `CSS` · `Browser Internals` · `JavaScript` · `TypeScript` · `React` · `Next.js` · `Architecture & Patterns` · `Build Tools` · `Performance` · `Security` · `API & Backend for Frontend` · `Feature Flags` · `Git` · `Testing` · `Team Lead & Processes` · `Best Practices` · `AI / LLM`

## Quick Start

```bash
npm install
npm run dev
```

## Adding Questions

See [`docs/content-guide.md`](docs/content-guide.md) for the full schema reference, ID naming conventions, manual and AI-agent contribution paths, and instructions for adding new categories.

After editing any JSON under `public/data/`:

```bash
npm run validate:data   # validate all questions against Zod schema
npm run build:manifest  # regenerate manifest.json (required after adding a new category)
```

## Commands

```bash
npm run dev             # dev server :3000
npm run build           # production build (includes manifest regeneration)
npm run test            # vitest
npm run lint            # eslint
npm run format:check    # prettier check
npx tsc --noEmit        # type check
npm run validate:data   # validate public/data/*.json against schema
npm run build:manifest  # regenerate public/data/manifest.json
```

## PRD

Full product requirements: `_bmad-output/planning-artifacts/prd.md`
