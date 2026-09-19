# InterviewOS

## Navigation

Gate law, lanes, must-not-touch list: `AGENTS.md` (read first).
Always read `.cursor/brain/PROJECT_CONTEXT.md` before any task.
Architecture map: `.cursor/brain/MAP.md`
Danger zones: `.cursor/brain/SKELETONS.md`

## Stack

React 19 · TypeScript 5.9 strict · Vite (rolldown) · Tailwind **v4** · shadcn/ui · Zustand 5 · TanStack Query 5 · React Router 7 · i18next · Vitest 4

## Critical Rules

**Tailwind v4** — no `tailwind.config.ts`. Theme lives in `src/index.css` (`@theme inline {}`).
Dark mode via `.dark` class. Animations via `tw-animate-css`.

**Components** — always extract logic to `useComponentName.ts` hook alongside the component.

**Pages** — lazy by default (`PageName.tsx` + `index.ts` with `lazy()`), wrap with `WithSuspense` in router.

**Stores** — Zustand with `createSelectors`. Files in `src/store/<domain>/`, tests alongside.

**i18n** — no hardcoded strings. Every user-visible string goes through `t()`.

**Imports** — `@/` alias only, no relative `../../`. Order enforced by eslint-plugin-import.

## Post-Edit Commands

After every change: `npm run verify:iter` (types + changed tests, seconds), and `npm run format`
before staging. The full chain runs once, at push (`verify:ci`) — the moments and what each one
runs are owned by `AGENTS.md` § The gate; this file does not restate them.

## Commit Format

`type(scope): description` — max 96 chars
Types: `feat` `fix` `chore` `docs` `style` `refactor` `perf` `test` `revert`
