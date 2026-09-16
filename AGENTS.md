# InterviewOS — agent entry point

The one file both Claude Code and Cursor read. `CLAUDE.md` points here; stack conventions live in
`.cursor/rules/*.mdc` (loaded per file glob); the brain (`.cursor/brain/`) holds the map, danger
zones and decisions. Read `PROJECT_CONTEXT.md`, `MAP.md` and `SKELETONS.md` before any change.

## The gate — one chain, one home

This table is the law for what runs when. Every other file that mentions a command points here;
a restated chain goes stale in place. **A new check goes into the `verify` script in
`package.json`, never only into a workflow file.**

| Moment      | Command                               | What runs                                                                                                                                    |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **iterate** | `npm run verify:iter`                 | `tsc -b` + `vitest --changed` — seconds, after every change                                                                                  |
| one file    | `npx vitest run <file>`               | one suite                                                                                                                                    |
| **measure** | `npm run dev` · `npm run build`       | look at the result; never a violation                                                                                                        |
| **commit**  | hook: `.husky/pre-commit`             | lint-staged (eslint --fix + prettier on staged files); when `public/data/*.json` is staged also `validate:data` + `data:check`               |
| **push**    | hook: `.husky/pre-push` → `verify:ci` | `audit:gate` → `check:hooks` → `format:check` → `lint` → `typecheck` → `validate:data` → `data:check` → `test`                               |
| **CI**      | `.github/workflows/ci.yml`            | `verify:ci` (same script) + `test:e2e` (Playwright: desktop Chromium + iPhone 14 descriptor on Chromium); `deploy.yml` = `verify:ci` + build |

Prohibitions:

- Never `--no-verify`. A push that prints no gate output did not run the gate — silence is a failure, not a pass.
- Never run the push gate from a worktree; push from the main checkout.
- Never suppress a lint rule without the reason on the same line.
- `core.hooksPath` must resolve to this checkout's `.husky/_` (relative). `npm run check:hooks` refuses anything else; `npm run prepare` fixes it (lifecycle scripts are off, see `.npmrc`).

## Lanes

- **Main agent** (Claude Code): plans, reviews every diff, commits from the main checkout.
- **Implementer subagent**: writes in a hand-made worktree OUTSIDE the repo (`~/Code/personal/.worktrees/frontend-practice-lab/<slice>`, `node_modules` symlinked), runs `verify:iter` there, never the push gate. Returns a diff and the red-then-green proof of its tests.
- **Review posture**: correctness, test strength (would reverting the fix turn the suite red?), security, readability. Style belongs to ESLint/Prettier, not to a review.

## Must not touch without a plan

- The SKELETONS zones: Tailwind v4 CSS config (no `tailwind.config.ts`, no `tailwindcss-animate`), the i18n init gate in `main.tsx`, `WithSuspense` on lazy routes, the bug-finding self-assess gate, the `endedAt` end-session contract, `createSelectors` in store tests.
- Question `id`s in `public/data/*.json`: they key the adaptive weights in localStorage — never rename or reuse (`docs/content-guide.md` § 6).
- `public/data/manifest.json` by hand — it is generated (`npm run build:manifest`).
- The policy lines in `.npmrc` (`ignore-scripts`, `engine-strict`, `audit-level`, `min-release-age`).

## Content

`docs/content-guide.md` is the schema and authoring guide. The bar for any data change is
`npm run validate:data` (Zod schema) and `npm run data:check` (duplicates, unanswerable blanks,
untranslated text, all-options-correct, correct-index bias per file; length bias is a warning).
Bug fixes carry a regression test that fails without the fix. Commits: `type(scope): description`,
≤96 chars, English, no ticket keys.
