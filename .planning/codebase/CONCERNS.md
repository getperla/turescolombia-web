# Codebase Concerns

**Analysis Date:** 2026-04-25
**Project:** La Perla / TourMarta web (`tourmarta-web`)
**Stack:** Next.js 16.2.4 + Turbopack, Supabase, React 18, Tailwind 3
**Launch:** 2026-04-26 (T-1 day)
**Audit type:** Fresh re-audit (full overwrite of previous CONCERNS.md)

---

## Recently Fixed (this session)

Verified by direct file reads — these are no longer concerns:

1. **`useRequireAuth` guard added to jalador dashboard**
   - File: `pages/dashboard/jalador.tsx:11`
   - Now calls `useRequireAuth(['jalador'])` and short-circuits with `if (authLoading || !authorized) return null;` at line 26.
   - Matches the pattern already used in `admin.tsx:19`, `operator.tsx:17`, `mis-reservas.tsx:18`.

2. **`.env.production` removed from git tracking**
   - `git ls-files | grep ^\.env` returns only `.env.example`. Confirmed.
   - `.gitignore` lines 3-5 correctly ignore `.env`, `.env.*`, except `.env.example`.
   - `.env.example` (file present) only contains documented public keys (`NEXT_PUBLIC_*`) — no service-role key, no secrets.

---

## HIGH severity

### 1. BetaGate writes a fake admin token on click — open public access pre-launch

**File:** `components/BetaGate.tsx:76-99`

Anyone landing on the site sees four role buttons. Clicking "Admin" runs:

```ts
localStorage.setItem('turescol_token', 'beta-demo-token');
localStorage.setItem('turescol_user', JSON.stringify({ id: 1, role: 'admin', ... }));
window.location.href = '/dashboard/admin';
```

This is **deliberate** for the beta — `lib/api.ts:13` detects the literal string `'beta-demo-token'` and routes every request to `lib/mockData.ts`, so no real backend gets hit. Server-side data is safe.

**But the guardrails are missing for a public launch tomorrow:**

- **No demo banner.** A real visitor entering as "admin" sees a fully populated dashboard with no indication that data is fake. They can demo bookings, "approve" jaladores, etc., and walk away thinking the product shipped that data.
- **Token collision blocks real auth.** A user who clicks Admin during beta, then tomorrow tries to register/login normally, will not see the BetaGate again (`isBetaActive()` returns true, line 24-32) and `lib/auth.tsx:35-41` will load the fake user instead of doing a real Supabase login. Only path out is `logout()` (auth.tsx:57) which clears storage — but most users won't know to do that.
- **SEO leak surface.** `public/robots.txt` does disallow `/dashboard/`, `/auth/`, `/j/`, `/api/`. Good. But the BetaGate landing itself (`/`) is indexable, and once Google fetches it, the role cards are visible HTML. Crawlers that execute JS can land on `/dashboard/admin` via the click — robots.txt is advisory.
- **Stale demo emails.** `BetaGate.tsx:17-22` and `pages/login.tsx:296-300` both reference `@turescolombia.co` addresses (old branding). The brand is now La Perla. Even though the emails are unused in demo mode (line 86-91 builds a `fakeUser` directly), they show up in `pages/login.tsx:294` "Acceso rápido DEV" buttons that are visible in production.

**Status:** by design but needs guardrails before public launch.

**Fix path before tomorrow:**
- Add a persistent banner ("Modo demo — datos de prueba") in `Layout.tsx` when `isBetaActive()` is true.
- On real login attempt (`lib/auth.tsx:45`), call `clearBeta()` first or detect `token === 'beta-demo-token'` and overwrite cleanly.
- Remove the "Acceso rápido DEV" block from `pages/login.tsx:292-310` — it has no place in a production login screen.
- Replace `@turescolombia.co` with `@laperla.co` (or whatever real domain is) in `BetaGate.tsx:17-22`.
- Consider gating BetaGate behind a query param or env flag (`NEXT_PUBLIC_BETA_MODE=true`) so production-of-tomorrow can flip it off without code change.

### 2. Token persisted in `localStorage` — XSS = full account takeover

**Files:**
- `lib/auth.tsx:35,48,49,52` — read/write of `turescol_token`, `turescol_refresh`, `turescol_user`.
- `lib/api.ts:56-57` — token read on every request and sent as `Authorization: Bearer`.
- `pages/auth/callback.tsx:12-19` — Supabase `access_token` written to `localStorage` after Google OAuth.
- `components/BetaGate.tsx:92-94` — same.

Any successful XSS injection (a single unsanitized `dangerouslySetInnerHTML`, a compromised npm dependency, a third-party script) reads the JWT and the refresh token in plaintext. There are zero `dangerouslySetInnerHTML` uses today (grep confirmed 0 hits) and CSP isn't set (only HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `next.config.js:33-37`).

**Fix path (post-launch):** Move auth token to an HttpOnly + Secure cookie set by the API, or use Supabase's first-party cookie helpers (`@supabase/ssr`). Refresh token in particular must not live in `localStorage`.

### 3. No CSP header

**File:** `next.config.js:28-41`

`headers()` sets HSTS, X-Frame-Options=SAMEORIGIN, X-Content-Type-Options=nosniff, Referrer-Policy, Permissions-Policy. Missing: `Content-Security-Policy`. Combined with concern #2, an inline-script injection has no defense in depth.

**Fix path:** Add a CSP with `script-src 'self' https://*.supabase.co`, `connect-src 'self' https://*.supabase.co <api host>`, `img-src 'self' data: https://images.unsplash.com https://*.supabase.co`, `frame-ancestors 'self'`. Test in `Content-Security-Policy-Report-Only` first.

### 4. Zero automated tests

No `*.test.*`, `*.spec.*`, `jest.config.*`, `vitest.config.*`, or `playwright.config.*` anywhere in the repo (verified). `package.json` has no test script. For a launch-tomorrow product handling money (Wompi integration declared in `.env.example:11-12`), this is the single biggest quality risk.

**Fix path (post-launch):** Add Playwright for the booking flow (`/tour/[id]` → checkout → confirmation), and Vitest for `lib/api.ts`, `lib/auth.tsx`, `lib/mockData.ts` mock router.

### 5. `.next/` build artifacts present in working tree

`.next/` directory exists at `C:/dev/tourmarta-web/.next/` (verified). It IS gitignored (`.gitignore:2`), so it won't be pushed. Not a security leak. But it's a **build hygiene** signal that someone ran `next build` locally and the artifact survived. If Vercel CI is the source of truth, leaving stale `.next/` in dev makes `next dev` slower and produces inconsistent dev/prod parity.

Action: optional `rm -rf .next/` before the launch deploy.

---

## MEDIUM severity

### 6. No React Error Boundary

Grep for `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError` returns 0 matches. Any uncaught render error in a route blanks the whole app. Combined with the next concern (silently swallowed fetch errors), users will see a white screen and zero context.

**Fix path:** Add a top-level error boundary in `pages/_app.tsx` wrapping `<BetaGate>`, with a "Algo salió mal — recarga" fallback.

### 7. Silent error swallowing across data-loading paths

15 instances of `.catch(() => {})` or `catch {}` (verified via grep). Concrete locations:

| File | Line | What gets swallowed |
|------|------|---------------------|
| `lib/auth.tsx` | 40 | `JSON.parse` of stored user — corrupt localStorage produces null user with no log |
| `components/Layout.tsx` | 28 | `/notifications/count` — badge silently zero |
| `pages/explorar.tsx` | 41 | tour list fetch |
| `pages/favoritos.tsx` | 17 | favorites fetch |
| `pages/dashboard/admin.tsx` | 36 | `/notifications` |
| `pages/dashboard/jalador.tsx` | 23 | `/tours` |
| `pages/dashboard/operator.tsx` | 25,26 | dashboard + bookings |
| `pages/j/[refCode]/tours.tsx` | 24,31 | jalador public link |
| `pages/j/[refCode]/[tour].tsx` | 43 | tour detail |
| `pages/dashboard/operator/tours.tsx` | 29 | tours list |
| `pages/tour/[id].tsx` | 50 | reviews |
| `pages/dashboard/operator/tours/[id]/disponibilidad.tsx` | 50 | availability save |
| `pages/dashboard/operator/tours/crear.tsx` | 35 | categories |

User sees empty list, no error message, no retry. Especially bad for the operator save at `disponibilidad.tsx:50` — a silently failed save on launch day = lost inventory.

**Fix path:** At minimum, set an error state and render a "No pudimos cargar — reintentar" UI. For state-changing requests (POST/PUT), surface the error toast unconditionally.

### 8. `package.json` still says `turescolombia-web`

**File:** `package.json:2`

Old brand name. Cosmetic, but it leaks in npm scripts, in Sentry/Vercel metadata, and in any tooling that reads `name`. Same in `package-lock.json:2,8`.

**Fix path:** rename to `tourmarta-web` or `laperla-web` and run `npm install` to refresh the lockfile.

### 9. Old "TuresColombia" branding in user-facing copy

User-visible strings still reference the old brand:

- `pages/mis-reservas.tsx:61` — `<title>Mis Reservas — TuresColombia</title>` (browser tab title)
- `pages/j/[refCode]/[tour].tsx:222` — WhatsApp confirmation message: `"Hola ... Tu reserva con TuresColombia esta confirmada"`
- `pages/j/[refCode]/[tour].tsx:234` — `"Gracias por confiar en TuresColombia!"`
- `pages/j/[refCode]/[tour].tsx:338` — footer text: `"Reserva verificada por TuresColombia"`
- `components/BetaGate.tsx:18-21` — demo emails on `@turescolombia.co`
- `pages/login.tsx:298,300` — same emails in DEV access buttons

Customers receive WhatsApp messages with the wrong brand name. **High user-perception impact for a launch.**

**Fix path:** find/replace `TuresColombia` → `La Perla` across `pages/`, `components/`. ~10 minutes of work.

### 10. `priceChild` falsy fallback is wrong when child price is 0

**Files:**
- `pages/tour/[id].tsx:80`
- `pages/j/[refCode]/[tour].tsx:80`

```ts
const totalPrice = (tour.priceAdult * numAdults) + ((tour.priceChild || tour.priceAdult * 0.7) * numChildren);
```

If an operator legitimately sets `priceChild: 0` (kids go free), the `||` falls through to `priceAdult * 0.7` and the customer is charged 70% of adult per kid. Bug exists in both the public detail view AND the jalador booking flow — same broken expression duplicated.

**Fix:** `tour.priceChild ?? tour.priceAdult * 0.7` (nullish coalescing) so only `null`/`undefined` triggers fallback. Same fix both files.

### 11. Viewport blocks pinch-zoom

**File:** `pages/_app.tsx:13`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

`maximum-scale=1` + `user-scalable=no` is a **WCAG 2.1 SC 1.4.4 violation**. Users with low vision can't zoom into prices, dates, QR codes. iOS Safari historically ignored this for accessibility, but Android Chrome and Firefox honor it.

**Fix:** drop `maximum-scale=1, user-scalable=no`. The form auto-zoom-on-focus issue can be solved with `font-size: 16px` on inputs instead.

### 12. Color contrast on muted text fails AA

83 inline uses of `color: '#717171'` and 7 of `#B0B0B0` across `components/` and `pages/` (verified count via grep).

- `#717171` on white: contrast ratio ~4.7:1 — passes AA for normal text (4.5:1) but barely. Used at 12px in many places (`text-xs`), where AA requires 4.5:1 only for >=18px or 14px-bold; at 12px regular it's effectively a fail.
- `#B0B0B0` on white: ~2.85:1 — **fails AA** at any size.

Used for visible content like price labels (`jalador.tsx:84,85`), descriptions (`BetaGate.tsx:148`), placeholder/footer copy (`BetaGate.tsx:169`), DEV access label (`login.tsx:294`).

**Fix path:** establish two tokens — `--color-text-muted: #5C5C5C` (4.5:1+ at 12px) and `--color-text-subtle: #717171` reserved for >=14px. Replace inline colors.

### 13. Admin role guard depends on client-side localStorage

**File:** `lib/auth.tsx:89-105`

`useRequireAuth(['admin'])` reads `user.role` from `localStorage`, which the user controls. In demo mode this is by design (concern #1). In **real** mode, this is the only client-side gate — the admin page can be rendered (briefly) with whatever role the attacker writes into localStorage. The server is the actual authority (it should reject the JWT's role claim), but during the render-before-redirect window, the admin UI markup ships to the client. Any embedded admin-only data fetched via `lib/api.ts` will be rejected by the backend, but `pages/dashboard/admin.tsx` is a 507-line file that renders a lot of structure before the first API call returns.

**Fix path:** server-side role check via `getServerSideProps` for `/dashboard/admin` and `/dashboard/operator`, returning `notFound: true` for non-matching roles. Don't rely on the client.

---

## LOW severity

### 14. `pages/dashboard/admin.tsx` is 507 lines

Exceeds the 500-line guideline. Holds 7 tabs, ~14 useState, BarChart, edit modal. Splittable into `<AdminTabs>`, `<EditModal>`, `<NotificationsPanel>`. Not urgent.

### 15. `pages/tour/[id].tsx` is 535 lines

Same story: tour hero + booking form + reviews list + similar tours all in one file. Worth extracting the booking form (~150 lines) since `pages/j/[refCode]/[tour].tsx:80` duplicates the same total-price math.

### 16. `lib/mockData.ts` 357 lines bundled lazily — verify

`lib/api.ts:48` does `await import('./mockData')` only when demo mode is active. Good. Worth a build-analyzer check on launch day to confirm `mockData.ts` is **not** in the main bundle. If it leaks in, that's ~29KB on every page load for a feature that 0% of real users hit.

### 17. `recharts` loaded via `next/dynamic` 6 times in admin.tsx

`pages/dashboard/admin.tsx:9-14` does six separate `dynamic(() => import('recharts').then(m => m.X))` calls. Each one is a separate dynamic import wrapper. Better: one `dynamic(() => import('./AdminChart'), { ssr: false })` that re-exports. Same bundle outcome, less boilerplate.

### 18. `any` is widespread in dashboard data shapes

Examples:
- `pages/dashboard/admin.tsx:20` — `useState<any>(null)` for the dashboard payload
- `pages/dashboard/admin.tsx:22` — `useState<any[]>([])` for the entity list
- `pages/dashboard/admin.tsx:36` — `(n: any) => !n.isRead`
- `pages/dashboard/jalador.tsx:12` — `useState<any>(null)`
- `pages/dashboard/operator.tsx` — same pattern

The backend response shapes aren't typed end-to-end. If the API contract drifts, TypeScript won't catch it. Add `Notification`, `AdminDashboardData`, `JaladorDashboardData` types in `lib/api.ts` next to the existing `Tour`, `Booking`, `Jalador` types.

### 19. No `eslint` script enforced in CI / pre-commit

`package.json:8` has `"lint": "eslint ."` but there's no pre-commit hook, no GitHub Action visible, no Vercel build-time lint. ESLint config exists (`eslint-config-next` in devDeps). Easy win: add `"build": "next lint && next build"` or wire a Husky pre-commit.

### 20. WhatsApp confirmation flow has no fallback

`pages/j/[refCode]/[tour].tsx:236-238` builds a `wa.me` URL from `clientPhone`. If the user enters a non-numeric phone, `cleanPhone` is empty and the URL becomes `https://wa.me/57?text=...` which 404s. No validation.

**Fix:** validate phone (10 digits Colombian) before showing the WhatsApp CTA.

### 21. `tsconfig.tsbuildinfo` modified in git status

Build cache for incremental TS. Shows up as modified because someone ran `tsc`. Should be in `.gitignore` — currently it's listed there at line 11, so subsequent commits won't pick it up, but the existing tracked version is what's "modified". Run once: `git rm --cached tsconfig.tsbuildinfo` and re-commit.

---

## Test Coverage Gaps

Since concern #4 covers "no tests" generally, the highest-priority surfaces to test post-launch:

| Area | File | Why critical |
|------|------|--------------|
| Booking total price math | `pages/tour/[id].tsx:80`, `pages/j/[refCode]/[tour].tsx:80` | Money. Has a known bug (#10). |
| Auth token routing | `lib/api.ts:10-15`, `lib/auth.tsx:45-66` | Demo/real token collision (#1). |
| Mock router | `lib/mockData.ts` (357 lines) | If demo is the launch experience, the mock IS the product. |
| Role guard | `lib/auth.tsx:89-105` | Single point of admin protection client-side. |
| Wompi webhook (when added) | not yet implemented | Payment confirmation must be idempotent. |

---

## Dependencies at Risk

`package.json` is unusually lean (5 runtime deps). Nothing flagged. `next@^16.2.4` is current as of the audit date, `@supabase/supabase-js@^2.103.3` current, `recharts@^3.8.1` current, React pinned to `18.3.0` exact (good for stability, will need a minor bump when React 19 lands in production projects).

No deprecation warnings, no abandoned packages. **This is the healthiest part of the stack.**

---

## Summary

Pre-launch (today, 2026-04-25):
- **Must fix:** #1 demo guardrails (banner + token collision), #9 brand strings in WhatsApp messages, #10 `priceChild === 0` bug. ~2 hours total.
- **Should fix:** #11 viewport zoom, #15 admin server-side role guard. ~1 hour.

Post-launch:
- #2/#3 cookie auth + CSP — security hardening sprint, 1-2 days.
- #4 testing — Playwright booking flow first, 1-2 days.
- #6/#7 error boundary + replace silent catches — 1 day.
- #8/#12/#18 cleanup — half day.

---

*Concerns audit: 2026-04-25 (T-1 to launch)*
