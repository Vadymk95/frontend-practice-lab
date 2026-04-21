# Skeletons — Danger Zones

## Tailwind v4 — NO tailwind.config.ts

**There is no `tailwind.config.ts`.** All theme config is in `src/index.css`.

- Adding TW config file will conflict with `@tailwindcss/vite` plugin
- Dark mode is `@custom-variant dark`, NOT `darkMode: 'class'` in JS config
- `container` is no longer configured via JS — apply utilities directly

## i18n Init Race

`main.tsx` has a `isI18nReady` gate — app renders `null` until i18next resolves.

- Don't call `t()` outside the `I18nextProvider` subtree
- Don't add async providers between `I18nextProvider` and `RouterProvider` without updating the gate

## Lazy Pages + Suspense

Lazy pages MUST be wrapped with `WithSuspense` in the route definition.
Missing `WithSuspense` = uncaught Suspense boundary = blank screen.

## createSelectors — no direct store subscription in tests

Tests for stores use the base store directly (`useUserStoreBase`), not the selector wrapper.
Selector wrapper relies on React context and will throw outside component tree.

## DevPlayground

`src/pages/DevPlayground/` is a dev sandbox (route `/dev-playground`, registered only when `import.meta.env.DEV`). Remove before production or rely on the existing prod guard.

## Vite 8 — Rolldown bundler (stable)

Migrated from `rolldown-vite` (experimental) to **Vite 8** in Story 6.7. Rolldown is now the native bundler — no longer an experimental alias.

- `overrides` in package.json are **security patches only** (axios, follow-redirects, serialize-javascript) — not bundler-related
- Vite 8 requires Node.js ≥ 20.19 or ≥ 22.12 (project runs Node 24)
- All plugins confirmed Vite 8 compatible: `@tailwindcss/vite`, `vite-plugin-pwa`, `vite-plugin-svgr`, `vite-plugin-eslint2`, `vite-plugin-compression`, `vite-plugin-webfont-dl`
- Test new plugins against Vite 8 before adding — some older plugins may pin to `vite@^7`

## tw-animate-css vs tailwindcss-animate

This project uses `tw-animate-css` (CSS import, no PostCSS plugin).
`tailwindcss-animate` (the old PostCSS plugin) will NOT work with `@tailwindcss/vite`.
Don't add `tailwindcss-animate` as a dependency — it's a breaking conflict.

## husky + commitlint

Pre-commit: lint + format on staged files (lint-staged)
Commit-msg: commitlint (`type(scope): subject`, max 96 chars)
Pre-push: TypeScript project check via `npx tsc -b --force --noEmit`

Skipping hooks (`--no-verify`) bypasses all checks — don't do it.

## ESLint flat config

`eslint.config.js` is the only ESLint config. Do not add a legacy `.eslintrc.*` — flat config owns all rules; a second config file risks confusion and stale docs.

## Bilingual question schema — `{ en, ru }` required

User-visible question fields are `LocalizedString = { en: string; ru: string }` objects, not plain strings. This applies to `question`, `explanation`, and option `value`s.

- Both `en` and `ru` are required — schema rejects single-language entries
- Language-agnostic fields stay plain strings: `id`, `category`, `tags`, `code`, `blanks[]`, `referenceAnswer`, and `correct` (when number or code-string for bug-finding)
- Render via `useLocalized(field)` from `src/lib/i18n/localized.ts` — reactive to language toggle
- See `docs/content-guide.md` for examples and the AI-agent contribution prompt
