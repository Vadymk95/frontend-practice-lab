# PWA

InterviewOS ships as an installable Progressive Web App via `vite-plugin-pwa`. This file is the authoritative reference for how it's wired, what was deliberately skipped, and why.

## Stack

- `vite-plugin-pwa` 1.x (Workbox under the hood, `generateSW` mode)
- Hosted on Firebase Hosting (`firebase.json`)
- No SSR — CSR SPA, Vite 8 + Rolldown bundler

## Source of truth

| Concern                   | File                                                    |
| ------------------------- | ------------------------------------------------------- |
| Plugin config + manifest  | `vite.config.ts` (`VitePWA({...})`)                     |
| SW registration           | Auto-injected by plugin via `injectRegister: 'auto'`    |
| Update UI                 | `src/components/common/PwaUpdateToast/`                 |
| Install UI                | `src/components/common/PwaInstallToast/`                |
| iOS/Android meta          | `index.html`                                            |
| Icons                     | `public/icons/{192x192,512x512,apple-touch-icon}.png`   |
| Hosting cache policy      | `firebase.json` → `hosting.headers`                     |

Generated at build: `dist/manifest.webmanifest`, `dist/sw.js`, `dist/workbox-*.js`.

## Update strategy — `prompt` (not `autoUpdate`)

`registerType: 'prompt'` is chosen deliberately. Reasoning:

- `autoUpdate` mode forces `workbox.skipWaiting = true` + `clientsClaim = true` internally and reloads tabs without asking — incompatible with a `needRefresh`-driven toast. Mixing them makes the toast dead code.
- Users can be mid-session (quiz answers in memory); silent reload destroys state. vite-plugin-pwa docs flag this explicitly on the autoUpdate page.
- `prompt` exposes `needRefresh`, `PwaUpdateToast` shows, user clicks → `updateServiceWorker(true)` triggers skipWaiting + reload in one controlled step.

**Do not** set `skipWaiting: true` or `clientsClaim: true` in `workbox: {}` — `prompt` mode expects them off; `updateServiceWorker(true)` handles activation.

## Caching strategy — precache only

`workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest,json}']`

All app assets including `data/*.json` question files are precached with content-hash revisions (verified in `dist/sw.js`). No `runtimeCaching` routes — build-versioned assets don't need a TTL cache; Workbox revisions are already content-addressable.

Reserve `runtimeCaching` only for third-party responses (external APIs, CDN fonts, cross-origin images) when they appear.

## Manifest — what ships and why

See `vite.config.ts → VitePWA.manifest`. Present fields:

| Field              | Value                                                              | Purpose                                          |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| `id`               | `/`                                                                | Stable identity — decouples PWA from `start_url` |
| `scope`            | `/`                                                                | Explicit navigation boundary                     |
| `name` / `short_name` | `InterviewOS`                                                   | Install UI + home screen                         |
| `description`      | `Frontend interview preparation`                                   | Rich install sheet body                          |
| `lang`             | `ru`                                                               | Default app locale                               |
| `theme_color`      | `#0a0a0a`                                                          | Address-bar tint on Chromium                     |
| `background_color` | `#0a0a0a`                                                          | Splash screen base                               |
| `display`          | `standalone`                                                       | No browser chrome when launched                  |
| `orientation`      | `portrait`                                                         | Mobile-first product                             |
| `start_url`        | `/`                                                                | Home on launch                                   |
| `icons`            | 192 (`any`), 512 (`any`), 180 (apple-touch)                        | Minimum viable per vite-plugin-pwa docs          |
| `screenshots`      | 1×wide (1901×954) + 1×narrow (390×841), form_factor + label        | Enables Chromium rich install sheet              |

Screenshots live in `public/screenshots/` and are **excluded from Workbox precache** via `globIgnores: ['**/screenshots/**']` — they only render inside the install dialog. Spec constraint: all screenshots sharing a `form_factor` must be identical dimensions; if more get added, match 1901×954 / 390×841 or introduce a third set.

### Deliberate omissions

- **`maskable` icon** — removed. The single-icon `purpose: 'any maskable'` is a documented anti-pattern (Chrome logs a console warning; icons without a safe zone look clipped). A proper maskable icon needs a dedicated render with ~10% padding — out of scope for a pet project. Stock `any` icon is served on Android, adaptive icon mask falls back gracefully.
- **`categories`, `dir`, `display_override`, `launch_handler`, `handle_links`, `prefer_related_applications`** — noise for a personal SPA without store-listings or window-controls-overlay UI.
- **`monochrome` icon** — not needed for notification badging (app emits no notifications).
- **`robots.txt` / `sitemap.xml`** — Googlebot renders JS; no commercial traffic targets. Add only if Bing/Yandex indexing becomes relevant.

## iOS + Android meta in `index.html`

All tags present serve a concrete installability or splash-screen purpose:

- **`description`** — SEO + install dialog.
- **`theme-color`** with `media="(prefers-color-scheme: light|dark)"` — address-bar tint swap between light/dark themes (Chrome/Safari 15+).
- **`mobile-web-app-capable` AND `apple-mobile-web-app-capable`** — ship both. The apple-prefixed one is marked deprecated on MDN but Safari **still** requires it for iOS splash screens (confirmed by Firtman, Next.js issue #74524). Deprecation warning is cosmetic; removing it breaks iOS splash.
- **`apple-mobile-web-app-status-bar-style: default`** — safest choice; avoids safe-area layout obligations that `black-translucent` imposes.
- **`apple-mobile-web-app-title: InterviewOS`** — overrides page `<title>` on the iOS home screen.
- **`<link rel="apple-touch-icon">`** — iOS does not read the manifest for the home-screen icon; this link is mandatory.
- **`<link rel="icon" sizes="192x192">`** — browser tab favicon. Pointing at the existing manifest icon avoids a dedicated favicon.ico/svg pipeline.

## Firebase hosting cache policy

`firebase.json → hosting.headers`:

| Glob                                                      | Cache-Control                         | Reason                                    |
| --------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `**/*.@(js\|css)`                                         | `max-age=31536000`                    | Content-hashed, safe to cache forever     |
| `/data/**`                                                | `max-age=86400`                       | Paired with SW precache; still bounded    |
| `/@(index.html\|sw.js\|registerSW.js\|manifest.webmanifest)` | `public, max-age=0, must-revalidate` | Must reach clients on every deploy        |

The last rule is load-bearing: without it Firebase defaults (≈1h CDN cache) delay SW updates, making the "New version available" toast invisible for hours after a deploy.

## Install flow — `PwaInstallToast`

`src/components/common/PwaInstallToast/usePwaInstallToast.ts`:

- Captures the `beforeinstallprompt` event globally on mount.
- Shows toast **only on `/session/summary`** (post-session moment of value) and only when not previously dismissed in this tab session.
- Fires `pwa_install_prompt` analytics once per session via `installPromptTrackedRef`.
- User accept → browser-native install dialog via `promptEvent.prompt()`.

iOS has no `beforeinstallprompt` — Safari users install via the Share sheet. The toast simply never appears there. No fallback banner on purpose (would clutter the summary page on desktop Safari too).

## Update flow — `PwaUpdateToast`

`src/components/common/PwaUpdateToast/usePwaUpdateToast.ts`:

1. `useRegisterSW` subscribes to `needRefresh` (set when a new SW reaches `waiting` state).
2. Toast renders "New version available" + Refresh / × buttons.
3. Refresh → `track('pwa_update_applied')` → `updateServiceWorker(true)` — plugin performs skipWaiting + `location.reload()`.
4. Dismiss → sessionStorage flag; suppresses re-display until tab closes. Intentional: surviving hard reload (F5) in the same tab is correct for PWA home-screen use.

## Verification checklist (after any PWA-related change)

```bash
npm run build
cat dist/manifest.webmanifest            # id, scope, lang, icons sane
# Precache list should list every public/data/*.json (manifest + one file per category; currently 19 files in public/data/)
grep -c 'data/.*\.json' dist/sw.js
grep 'theme-color\|apple-mobile' dist/index.html   # meta survived minification
```

Production reality-check (deploy + new tab):
- Lighthouse → Installable + best-practices
- DevTools → Application → Manifest: no warnings
- DevTools → Application → Service Workers: `sw.js` activated, no errors
- Force a deploy, reload: `PwaUpdateToast` appears within ~30-60s (SW update check interval)

## Known TODO / future work

- **Maskable icon** → commission a 512×512 with safe-zone padding; add as a second icon entry with `purpose: 'maskable'`.
- **Update-check cadence** → current reliance on the plugin's built-in periodic check is fine for a pet project. If staleness becomes painful, add an explicit `r.update()` on route change via `registerSW({ onRegisteredSW })`.

## References (verified 2026-04)

- [vite-plugin-pwa — Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)
- [vite-plugin-pwa — Auto update](https://vite-pwa-org.netlify.app/guide/auto-update.html)
- [web.dev — Web App Manifest](https://web.dev/learn/pwa/web-app-manifest)
- [web.dev — Maskable icons](https://web.dev/articles/maskable-icon)
- [Chrome — Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching)
- [Firtman — iOS PWA compatibility](https://firt.dev/notes/pwa-ios/)
