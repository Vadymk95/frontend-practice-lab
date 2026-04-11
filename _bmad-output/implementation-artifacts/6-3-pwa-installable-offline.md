# Story 6.3: PWA — Installable & Offline

Status: ready-for-dev

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

- [ ] Task 1: Install `vite-plugin-pwa` (AC: #1)
  - [ ] **Prerequisite: Story 6.7 (Vite 8 migration) MUST be complete before this task**
  - [ ] `npm install -D vite-plugin-pwa`
  - [ ] Verify peer dependency: `vite-plugin-pwa` requires Vite ≥ 5. After Vite 8 migration it will be satisfied

- [ ] Task 2: Configure PWA in `vite.config.ts` (AC: #1, #2)
  - [ ] Import `VitePWA` from `vite-plugin-pwa`
  - [ ] Add to `plugins` array with `registerType: 'prompt'` (update flow is manual via toast — Story 6.4)
  - [ ] Configure `manifest` object (name, short_name, icons, theme_color, display)
  - [ ] Configure `workbox.globPatterns` to include `**/*.{js,css,html,ico,png,svg,json}` + `data/*.json`
  - [ ] Add `workbox.runtimeCaching` for `public/data/*.json` files

- [ ] Task 3: Add PWA icons to `public/icons/` (AC: #1)
  - [ ] Create/add icons: `192x192.png`, `512x512.png`, `apple-touch-icon.png` (180x180)
  - [ ] Reference them in manifest `icons` array

- [ ] Task 4: Create `PwaInstallToast` component (AC: #4)
  - [ ] Create `src/components/common/PwaInstallToast/PwaInstallToast.tsx`
  - [ ] Create `src/components/common/PwaInstallToast/usePwaInstallToast.ts`
  - [ ] Create `src/components/common/PwaInstallToast/index.ts`
  - [ ] Hook: listen for `beforeinstallprompt` event, track dismissed state in `sessionStorage`
  - [ ] Show toast only after first session completes (listen for route change to `/summary`)
  - [ ] Render toast from `AppShell` or `main.tsx`

- [ ] Task 5: Add i18n keys for install prompt (AC: #4)
  - [ ] `public/locales/en/common.json` — `pwa.installPrompt`, `pwa.dismiss`
  - [ ] `public/locales/ru/common.json` — same keys in Russian

- [ ] Task 6: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`
  - [ ] `npm run build` — verify `dist/sw.js` and `dist/manifest.webmanifest` are generated

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
