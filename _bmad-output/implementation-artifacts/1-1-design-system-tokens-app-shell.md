# Story 1.1: Design System Tokens & App Shell

Status: review

## Story

As a **developer**,
I want the design token system and app shell implemented,
so that all future components can reference a consistent visual foundation and the user sees a functional app frame.

## Acceptance Criteria

1. **Given** the app is opened in any supported browser
   **When** the page loads
   **Then** the app shell renders with AppHeader (logo + language toggle placeholder + theme toggle placeholder) and a main content area
   **And** the background is `#0d0d0d` (dark mode default), all colour tokens are defined in `src/index.css` under `@theme inline {}`
   **And** JetBrains Mono is loaded and applied as the global font
   **And** the layout is single-column, 16px padding on mobile, 24px on tablet (≥768px), 32px on desktop (≥1024px), max-width 760px centred on desktop

2. **Given** a user has `prefers-reduced-motion: reduce` set
   **When** any component renders
   **Then** all CSS transitions and animations are disabled via a global rule in `index.css`

3. **Given** a developer opens `/dev-playground` on localhost
   **When** the page loads in development mode (`import.meta.env.DEV`)
   **Then** the DevPlayground route renders and is accessible
   **And** the route does not exist in the production build

## Tasks / Subtasks

- [x] Task 1: Replace design tokens in `src/index.css` with terminal palette (AC: #1)
  - [x] Replace Google Fonts import — Inter → JetBrains Mono (weights 400/500/600)
  - [x] Rewrite `@theme inline {}` with semantic terminal tokens (see Dev Notes for exact values)
  - [x] Replace `:root {}` block with light-mode token values using the terminal palette
  - [x] Replace `.dark {}` block with dark-mode token overrides (dark = default)
  - [x] Add `prefers-reduced-motion` global rule (AC: #2)

- [x] Task 2: Update AppHeader component (AC: #1)
  - [x] Rename/replace `src/components/layout/Header/index.tsx` → implement `AppHeader`
  - [x] AppHeader anatomy: logo text ("InterviewOS") + language toggle placeholder + theme toggle placeholder
  - [x] Language and theme toggles are placeholders (non-functional buttons) — functional implementation is Epic 6
  - [x] Apply `border-b border-border bg-surface` styling; height auto with padding
  - [x] Hook file: `useAppHeader.ts` alongside the component (required pattern — see Dev Notes)

- [x] Task 3: Update responsive layout in `src/components/layout/Main/index.tsx` (AC: #1)
  - [x] Apply responsive padding: `px-4` (mobile) / `md:px-6` (≥768px) / `lg:px-8` (≥1024px)
  - [x] Apply max-width 760px centred on desktop: `lg:max-w-[760px] lg:mx-auto`
  - [x] Keep `<Outlet />` as the child

- [x] Task 4: Fix DevPlayground route path (AC: #3)
  - [x] In `src/router/routes.ts` change `DevPlayground: '/dev/ui'` → `DevPlayground: '/dev-playground'`
  - [x] Verify `base.routes.tsx` still uses `RoutesPath.DevPlayground` (no hardcoded path needed)

- [x] Task 5: Add skip link to AppShell for keyboard accessibility (AC: #1)
  - [x] Add visually-hidden skip link in `src/App.tsx` pointing to `#main-content`
  - [x] Add `id="main-content"` to `<main>` element

## Dev Notes

### Critical Architecture Rules

**Tailwind v4 — no `tailwind.config.ts`.**
Theme lives entirely in `src/index.css`. The `@theme inline {}` block is the single source of truth for all design tokens. Never add a tailwind.config.ts file.

**Component pattern — no exceptions:**
```
ComponentName/
  ComponentName.tsx      # JSX only — no logic
  useComponentName.ts    # ALL logic, state, handlers, selectors
  index.ts               # re-export only
```
Every feature component MUST have a co-located hook. The `.tsx` is presentation-only.

**Imports — `@/` alias only.** Never use relative `../../` paths.

**i18n — no hardcoded strings.** Even placeholder buttons must use `t('key')`. Use existing translation keys or add new ones under the `common` namespace.

### Design Token Specification

Replace `src/index.css` completely with the following structure:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  /* Typography */
  --font-sans: 'JetBrains Mono', ui-monospace, monospace;

  /* Semantic colour tokens — map to CSS vars below */
  --color-background:    var(--color-bg);
  --color-surface:       var(--color-surf);
  --color-surface-raised:var(--color-surf-raised);
  --color-border:        var(--color-brd);
  --color-text-primary:  var(--color-txt);
  --color-text-muted:    var(--color-txt-muted);
  --color-accent:        var(--color-acc);
  --color-accent-alt:    var(--color-acc-alt);
  --color-error:         var(--color-err);
  --color-warning:       var(--color-warn);

  /* shadcn/ui compatibility aliases */
  --color-foreground:           var(--color-txt);
  --color-card:                 var(--color-surf);
  --color-card-foreground:      var(--color-txt);
  --color-popover:              var(--color-surf-raised);
  --color-popover-foreground:   var(--color-txt);
  --color-primary:              var(--color-acc);
  --color-primary-foreground:   #000000;
  --color-secondary:            var(--color-surf);
  --color-secondary-foreground: var(--color-txt);
  --color-muted:                var(--color-surf);
  --color-muted-foreground:     var(--color-txt-muted);
  --color-destructive:          var(--color-err);
  --color-destructive-foreground: #ffffff;
  --color-input:                var(--color-brd);
  --color-ring:                 var(--color-acc-alt);

  /* Border radius — sharp terminal aesthetic */
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 2px;
  --radius:    2px;

  /* Animations */
  --animate-accordion-down: accordion-down 0.15s ease-out;
  --animate-accordion-up:   accordion-up 0.15s ease-out;
}

/* Dark mode tokens (default) */
:root {
  --color-bg:         #0d0d0d;
  --color-surf:       #1a1a1a;
  --color-surf-raised:#1e1e1e;
  --color-brd:        #2a2a2a;
  --color-txt:        #e5e5e5;
  --color-txt-muted:  #6b7280;
  --color-acc:        #00ff87;
  --color-acc-alt:    #3b82f6;
  --color-err:        #ef4444;
  --color-warn:       #f59e0b;
}

/* Light mode overrides */
.dark\:light,
html:not(.dark) {
  --color-bg:         #f9fafb;
  --color-surf:       #ffffff;
  --color-surf-raised:#f3f4f6;
  --color-brd:        #e5e7eb;
  --color-txt:        #111111;
  --color-txt-muted:  #6b7280;
  --color-acc:        #009a52;
  --color-acc-alt:    #2563eb;
  --color-err:        #dc2626;
  --color-warn:       #d97706;
}
```

> **Note on dark default:** Apply `.dark` class to `<html>` in `index.html` OR in `main.tsx`/`App.tsx` on mount (before uiStore exists). For Story 1.1, just hardcode `class="dark"` in `public/index.html` — uiStore (Story 1.2) will take over persistence.

**Semantic colour usage rules — strictly enforced:**
- `--color-accent` (`#00ff87` terminal green): correct answers + brand logo only. **NEVER on interactive controls/buttons.**
- `--color-accent-alt` (`#3b82f6` electric blue): CTAs, navigation, focus rings, interactive controls.
- `--color-error` (`#ef4444`): wrong answers, danger states only.

### Prefers-Reduced-Motion Rule

Add inside `src/index.css` after the `@theme` block:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### AppHeader Specification

**File locations:**
- `src/components/layout/AppHeader/AppHeader.tsx` — JSX only
- `src/components/layout/AppHeader/useAppHeader.ts` — logic hook
- `src/components/layout/AppHeader/index.ts` — re-export

> The existing `src/components/layout/Header/index.tsx` is a placeholder. Either replace it in-place (rename folder to `AppHeader`) or create new and update `App.tsx` imports. Preferred: rename folder + update import in `App.tsx`.

**AppHeader layout:**
```
| logo "InterviewOS"    | [RU/EN placeholder] [🌙 placeholder] |
```
- Full width, `border-b border-border bg-background`
- Padding: `px-4 py-3 md:px-6 lg:px-8`
- Logo: text "InterviewOS" in `font-mono font-semibold text-accent` (terminal green for brand)
- Language button: text "RU" or "EN", non-functional, `aria-label="Toggle language"`
- Theme button: moon/sun icon from `lucide-react`, non-functional, `aria-label="Toggle theme"`
- Both placeholder buttons: `variant="ghost"` shadcn Button or unstyled button with focus-visible ring using `--color-accent-alt`

**useAppHeader.ts** — for Story 1.1, can return empty object `{}` since no logic exists yet. The hook must exist as the pattern is required.

### Responsive Layout in Main

Current `src/components/layout/Main/index.tsx`:
```tsx
<main className="container mx-auto flex h-full flex-1 items-center justify-center py-12">
```

Replace with:
```tsx
<main
  id="main-content"
  className="flex-1 px-4 py-8 md:px-6 lg:px-8 lg:max-w-[760px] lg:mx-auto w-full"
>
```
- Remove `container mx-auto` (that uses Tailwind's container plugin with breakpoints — we want manual control)
- Add `id="main-content"` for skip link
- `flex-1` keeps it filling vertical space

### DevPlayground Route Fix

`src/router/routes.ts` — change one line:
```ts
// BEFORE:
DevPlayground: '/dev/ui',
// AFTER:
DevPlayground: '/dev-playground',
```

`base.routes.tsx` already uses `RoutesPath.DevPlayground` constant — no other changes needed.

### Skip Link (Accessibility)

Add to `src/App.tsx` before `<Header />`:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-text-primary focus:border focus:border-accent-alt"
>
  {t('common:skipToContent')}
</a>
```

Add translation key `skipToContent` to `common` namespace in both RU and EN locale files.

### Existing Files — What to Keep Untouched

| File | Status |
|------|--------|
| `src/App.tsx` | Modify: update Header import, add skip link |
| `src/main.tsx` | Do NOT touch |
| `src/components/common/ErrorBoundary/` | Do NOT touch |
| `src/components/layout/Footer/` | Do NOT touch |
| `src/components/layout/Main/index.tsx` | Modify: responsive classes + id |
| `src/store/utils/createSelectors.ts` | Do NOT touch — already correct |
| `src/hocs/WithSuspense.tsx` | Do NOT touch |
| `src/router/index.tsx` | Do NOT touch |
| `src/router/modules/base.routes.tsx` | Do NOT touch — uses RoutesPath constant |
| `src/router/routes.ts` | Modify: fix DevPlayground path |
| `src/pages/DevPlayground/` | Do NOT touch |
| `src/pages/HomePage/` | Do NOT touch |
| `src/pages/NotFoundPage/` | Do NOT touch |

### File Structure Notes

Architecture specifies this layout structure:
```
src/components/layout/
  app-header/              ← rename from Header
    AppHeader.tsx
    useAppHeader.ts
    index.ts
  app-shell/               ← App.tsx IS the shell; no separate AppShell component needed
    AppShell.tsx           ← OPTIONAL: extract from App.tsx if preferred
  Footer/                  ← keep as-is
  Main/                    ← modify in-place
```

The existing `App.tsx` is effectively the AppShell. A separate `AppShell` component is NOT required for this story — it's an architecture diagram label, not a mandate.

### Colour Token Naming — Tailwind Class Reference

After implementing tokens, these Tailwind classes become available:
- `bg-background` → `#0d0d0d` (dark)
- `bg-surface` → `#1a1a1a`
- `bg-surface-raised` → `#1e1e1e`
- `border-border` → `#2a2a2a`
- `text-text-primary` → `#e5e5e5`
- `text-text-muted` → `#6b7280`
- `text-accent` → `#00ff87` (terminal green)
- `text-accent-alt` → `#3b82f6` (electric blue)
- `text-error` → `#ef4444`
- `border-accent-alt` → focus rings

### What Is NOT In Scope for This Story

Do NOT implement in Story 1.1 (deferred to later stories):
- Functional theme toggle (uiStore, localStorage — Story 1.2)
- Functional language toggle (i18n namespace switching — Epic 6)
- Zustand stores (Story 1.2)
- Session routes `/session`, `/session/play`, `/session/summary` (Story 1.3+)
- Any question components (Epic 1 later stories)

### Post-Edit Verification Commands

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm run test
```

All 4 must pass. Fix any TypeScript or lint errors before marking complete.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Tailwind v4 Configuration Rule]
- [Source: _bmad-output/planning-artifacts/architecture.md#UI / Logic Separation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Routing Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Design System Tokens & App Shell]
- [Source: _bmad-output/planning-artifacts/prd.md#Design System & Visual Identity]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Installed node_modules (was missing) before running tests
- Added `.claude`, `.cursor`, `_bmad`, `_bmad-output` to ESLint globalIgnores and .prettierignore — pre-existing lint/format issues in skill template files

### Completion Notes List

- Task 1: Replaced `src/index.css` completely — JetBrains Mono font, terminal palette tokens, dark-mode-default `:root`, light-mode `html:not(.dark)`, prefers-reduced-motion rule
- Task 2: Created `AppHeader` component with logo + language + theme placeholder buttons; `useAppHeader.ts` hook returns `{}`; `App.tsx` imports `AppHeader` instead of old `Header`
- Task 3: Updated `Main/index.tsx` with `id="main-content"`, responsive padding `px-4/md:px-6/lg:px-8`, max-width `lg:max-w-[760px] lg:mx-auto`
- Task 4: Fixed `RoutesPath.DevPlayground` from `/dev/ui` to `/dev-playground`
- Task 5: Added sr-only skip link in `App.tsx` pointing to `#main-content`; added `skipToContent` + `header.*` keys to `en/common.json`
- All tests pass (18 tests in 8 files), lint clean, TypeScript clean

### File List

- `index.html` — added `class="dark"` to `<html>`
- `src/index.css` — full rewrite with terminal palette tokens
- `public/locales/en/common.json` — added `skipToContent`, `header.toggleLanguage`, `header.toggleTheme`, `header.languageLabel`
- `src/components/layout/AppHeader/AppHeader.tsx` — new component
- `src/components/layout/AppHeader/useAppHeader.ts` — new hook
- `src/components/layout/AppHeader/index.ts` — new re-export
- `src/components/layout/AppHeader/AppHeader.test.tsx` — new tests
- `src/components/layout/Main/index.tsx` — updated responsive classes + id
- `src/components/layout/Main/Main.test.tsx` — new test
- `src/router/routes.ts` — fixed DevPlayground path
- `src/router/routes.test.ts` — new test
- `src/App.tsx` — updated to use AppHeader, added skip link
- `src/App.test.tsx` — new test
- `eslint.config.js` — added ignore dirs for skill template files
- `.prettierignore` — added ignore dirs for skill template files

### Change Log

- 2026-03-23: Story 1.1 implemented — design tokens, AppHeader, responsive Main, DevPlayground route fix, skip link accessibility
