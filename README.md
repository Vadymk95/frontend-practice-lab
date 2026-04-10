# InterviewOS

Personal mobile-first interview preparation SPA for frontend engineers. Daily habit tool to combat cognitive atrophy from AI-assisted workflows.

Covers **trainee → principal/staff engineer** depth across 17 topic categories with an adaptive algorithm that surfaces weak areas more frequently.

## Stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind v4 · shadcn/ui · Zustand 5 · TanStack Query 5 · React Router 7 · i18next · Vitest 4 · PWA

## Question Modes

| Mode            | Description                                        |
| --------------- | -------------------------------------------------- |
| Quiz            | Single / multiple choice with instant reveal       |
| Bug Finding     | Spot the error in a code snippet                   |
| Code Completion | Fill in the blank — validated by string comparison |

## Categories (17)

`HTML` · `CSS` · `Browser Internals` · `JavaScript` · `TypeScript` · `React` · `Next.js` · `Architecture & Patterns` · `Build Tools` · `Performance` · `Security` · `API & Backend for Frontend` · `Feature Flags` · `Git` · `Testing` · `Team Lead & Processes` · `Best Practices`

## Quick Start

```bash
npm install
npm run dev
```

## Adding Questions

Follow the Zod schema in `src/lib/data/schema.ts` and add JSON under `public/data/` (see `manifest.json` for registered categories).

## Commands

```bash
npm run dev          # dev server :3000
npm run build        # production build
npm run test         # vitest
npm run lint         # eslint
npm run format:check # prettier check
npx tsc --noEmit     # type check
```

## PRD

Full product requirements: `_bmad-output/planning-artifacts/prd.md`
