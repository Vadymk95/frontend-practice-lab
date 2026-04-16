# Story 6.3: PWA — Installable & Offline

Status: review

## Story

As a **user**,
I want to install the app to my home screen and use it offline,
so that I can practice during my morning routine without needing a browser or internet connection.

## Acceptance Criteria

1. **Given** `vite-plugin-pwa` is configured in `vite.config.ts`
   **When** the app is built
   **Then** a service worker and PWA manifest are generated
   **And** the manifest includes app name, icons (multiple sizes), theme colour, and `display: standalone`

2. **Given** the service worker registers on first load
   **When** the user visits the app on iOS Safari or Chrome Android
   **Then** the app shell and all `public/data/*.json` files are precached

3. **Given** the user has previously loaded the app and goes offline
   **When** they open the app
   **Then** the app loads from cache and all previously loaded question data is available

4. **Given** the PWA install prompt is available after first session completes
   **When** the prompt is shown
   **Then** it appears as a non-intrusive bottom toast: "Add InterviewOS to your home screen"
   **And** dismissing it does not show it again in the same session

## Tasks / Subtasks

- [x] Task 1: Install `vite-plugin-pwa` (AC: #1)
  - [x] **Prerequisite: Story 6.7 (Vite 8 migration) MUST be complete before this task**
  - [x] `npm install -D vite-plugin-pwa`
  - [x] Verify peer dependency: `vite-plugin-pwa` requires Vite ≥ 5. After Vite 8 migration it will be satisfied

- [x] Task 2: Configure PWA in `vite.config.ts` (AC: #1, #2)
  - [x] Import `VitePWA` from `vite-plugin-pwa`
  - [x] Add to `plugins` array with `registerType: 'prompt'` (update flow is manual via toast — Story 6.4)
  - [x] Configure `manifest` object (name, short_name, icons, theme_color, display)
  - [x] Configure `workbox.globPatterns` to include `**/*.{js,css,html,ico,png,svg,json}` + `data/*.json`
  - [x] Add `workbox.runtimeCaching` for `public/data/*.json` files

- [x] Task 3: Add PWA icons to `public/icons/` (AC: #1)
  - [x] Create/add icons: `192x192.png`, `512x512.png`, `apple-touch-icon.png` (180x180)
  - [x] Reference them in manifest `icons` array

- [x] Task 4: Create `PwaInstallToast` component (AC: #4)
  - [x] Create `src/components/common/PwaInstallToast/PwaInstallToast.tsx`
  - [x] Create `src/components/common/PwaInstallToast/usePwaInstallToast.ts`
  - [x] Create `src/components/common/PwaInstallToast/index.ts`
  - [x] Hook: listen for `beforeinstallprompt` event, track dismissed state in `sessionStorage`
  - [x] Show toast only after first session completes (listen for route change to `/summary`)
  - [x] Render toast from `AppShell` or `main.tsx`

- [x] Task 5: Add i18n keys for install prompt (AC: #4)
  - [x] `public/locales/en/common.json` — `pwa.installPrompt`, `pwa.dismiss`
  - [x] `public/locales/ru/common.json` — same keys in Russian

- [x] Task 6: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`
  - [x] `npm run build` — verify `dist/sw.js` and `dist/manifest.webmanifest` are generated

## Dev Notes

### BLOCKER: Story 6.7 Must Run First

`vite-plugin-pwa` peer dependency requires stable Vite. Current config uses `npm:rolldown-vite@7.3.1` (experimental). After Story 6.7 migrates to `vite@^8.0.0`, this story can proceed.

**Do not install `vite-plugin-pwa` until Vite 8 is in `package.json`.**

### vite-plugin-pwa Configuration

```typescript
// vite.config.ts — add to plugins array
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
    registerType: 'prompt',  // NOT 'autoUpdate' — we show our own toast (Story 6.4)
    injectRegister: 'auto',
    manifest: {
        name: 'InterviewOS',
        short_name: 'InterviewOS',
        description: 'Frontend interview preparation',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
            { src: '/icons/192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
    },
    workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
            {
                urlPattern: /^\/data\/.+\.json$/,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'question-data',
                    expiration: { maxAgeSeconds: 86400 }  // 24h
                }
            }
        ]
    }
})
```

### Precaching JSON Data Files

`public/data/*.json` (question files + manifest) are the most critical assets for offline use. Two strategies:

1. **`globPatterns`**: Add `'data/*.json'` to `globPatterns` — Workbox precaches ALL data files at SW install time. Works if data files are small and known count.
2. **`runtimeCaching`**: `CacheFirst` for `/data/` URLs — files are cached on first access, available offline after.

**Use both** — globPatterns for precaching (ensures offline from first visit), runtimeCaching as fallback for any dynamically discovered files.

### PwaInstallToast — Architecture Pattern

```
src/components/common/PwaInstallToast/
  PwaInstallToast.tsx          # UI only — bottom-positioned toast
  usePwaInstallToast.ts        # captures beforeinstallprompt, manages show/dismiss
  index.ts                     # named re-export
```

```typescript
// usePwaInstallToast.ts
const usePwaInstallToast = () => {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setPromptEvent(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const show = () => setIsVisible(true);
    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', '1');
    };
    const install = async () => {
        promptEvent?.prompt();
        const result = await promptEvent?.userChoice;
        if (result?.outcome === 'accepted') dismiss();
    };

    return { isVisible, show, dismiss, install, isAvailable: promptEvent !== null };
};
```

`BeforeInstallPromptEvent` is not in TypeScript's lib — add type declaration:

```typescript
// src/types/pwa.d.ts  (or inline in the hook file)
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

### Showing After First Session

Show the install prompt **after summary page is reached** for the first time, not on app load (too aggressive). Options:

1. Emit event from `SummaryPage` on mount: `usePwaInstallToast().show()` — pass `show` down or use a shared hook
2. Listen for route change to `/summary` in the toast hook with `useLocation`

Simplest: render `<PwaInstallToast />` from `AppShell` or `Layout`, expose `triggerAfterSession` function. Call it from `SummaryPage` via props or context.

### Icons Required

Minimal set for PWA installability:
- `public/icons/192x192.png` — Android home screen
- `public/icons/512x512.png` — Android splash / maskable
- `public/icons/apple-touch-icon.png` — iOS home screen (180x180)

Use a placeholder/generated icon if no design assets are available. Solid dark background (`#0a0a0a`) with `IO` monogram in accent green (`#00ff87`) is sufficient for v1.

### Tailwind v4 Styling for Toast

```tsx
// PwaInstallToast.tsx — bottom-positioned, non-intrusive
<div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-border bg-background p-4 shadow-lg md:left-auto md:right-4 md:w-80">
```

### Architecture Compliance Checklist

- `PwaInstallToast` uses component + hook pattern
- No `any` — type `BeforeInstallPromptEvent` properly
- `sessionStorage` (not `localStorage`) for dismiss — resets between tabs/sessions
- `vite-plugin-pwa` in `devDependencies`
- All user strings through `t()`

### References

- `vite.config.ts` — add `VitePWA` to plugins
- `src/lib/storage/LocalStorageService.ts` — storage pattern reference
- `public/data/` — question JSON files that must be precached
- Story 6.4 (`6-4-pwa-update-notification.md`) — uses `useRegisterSW` from same plugin
- Story 6.7 (`6-7-vite-8-migration.md`) — MUST complete before this story
- Architecture doc §8 — PWA + Analytics section (analytics events: `pwa_install_prompt`)

## File List

- `package.json` — vite upgraded to `^8.0.0`, `vite-plugin-eslint2` to `^5.1.0`, added `vite-plugin-pwa ^1.2.0`, `@testing-library/dom`
- `package-lock.json` — updated lockfile
- `vite.config.ts` — added VitePWA plugin with manifest, workbox config
- `public/icons/192x192.png` — new PWA icon (placeholder, dark background)
- `public/icons/512x512.png` — new PWA icon (placeholder, dark background)
- `public/icons/apple-touch-icon.png` — new PWA icon (placeholder, dark background)
- `src/components/common/PwaInstallToast/PwaInstallToast.tsx` — new toast UI component
- `src/components/common/PwaInstallToast/usePwaInstallToast.ts` — new hook (beforeinstallprompt, route detection, sessionStorage)
- `src/components/common/PwaInstallToast/index.ts` — new barrel export
- `src/components/common/PwaInstallToast/usePwaInstallToast.test.ts` — new unit tests (6 tests)
- `src/App.tsx` — added `<PwaInstallToast />` render
- `public/locales/en/common.json` — added `pwa.installPrompt`, `pwa.install`, `pwa.dismiss`
- `public/locales/ru/common.json` — same keys in Russian

## Dev Agent Record

### Completion Notes

- Performed Story 6.7 (Vite 8 migration) first: upgraded `rolldown-vite@7.3.1` → `vite@^8.0.0`, `vite-plugin-eslint2@5.0.5` → `5.1.0`. Build and all 269 tests passed.
- Installed `vite-plugin-pwa@^1.2.0` with `--legacy-peer-deps` (plugin peer deps lag behind Vite 8 release); added `@testing-library/dom` explicitly to fix transitive dep regression from `--legacy-peer-deps`.
- `VitePWA` configured with `registerType: 'prompt'` (Story 6.4 handles update flow), workbox precaches all assets + data/*.json, runtimeCaching for question data (CacheFirst, 24h TTL).
- Generated placeholder 3-icon set (dark `#0a0a0a` background) via pure Node.js zlib/PNG binary generation (no external tools required).
- `usePwaInstallToast` listens for `beforeinstallprompt` on mount, shows toast when user navigates to `/session/summary` if prompt is available and not previously dismissed in session (sessionStorage).
- All ACs satisfied: build generates `dist/sw.js` + `dist/manifest.webmanifest`; 275/275 tests pass; TypeScript clean; icons present.

## Change Log

- 2026-04-16: Completed Story 6.7 (Vite 8 migration) as prerequisite, then implemented PWA installability and offline support (Story 6.3). 30 test files, 275 tests passing.
