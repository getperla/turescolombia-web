# Codebase Structure

**Analysis Date:** 2026-04-25

## Directory Layout

```
tourmarta-web/
├── pages/                          # Next.js Pages Router — every file = a route
│   ├── _app.tsx                    # Root wrapper: AuthProvider + BetaGate + global <Head>
│   ├── 404.tsx                     # Custom 404
│   ├── index.tsx                   # / — redirects to dashboard or BetaGate
│   ├── explorar.tsx                # /explorar — tour catalog with filters
│   ├── tours.tsx                   # /tours — thin redirect to /explorar
│   ├── favoritos.tsx               # /favoritos — saved tours (localStorage-backed)
│   ├── jaladores.tsx               # /jaladores — public ranking page
│   ├── login.tsx                   # /login — multi-mode auth (email/Google/SMS/magic)
│   ├── register.tsx                # /register
│   ├── perfil.tsx                  # /perfil — user + jalador profile editor
│   ├── mis-reservas.tsx            # /mis-reservas — tourist booking list
│   ├── pago-resultado.tsx          # /pago-resultado — Wompi payment result page
│   ├── sitemap.xml.ts              # /sitemap.xml — SSR XML sitemap
│   ├── auth/
│   │   └── callback.tsx            # /auth/callback — Supabase OAuth landing
│   ├── api/
│   │   └── og.tsx                  # /api/og — Edge runtime OG image generator
│   ├── tour/
│   │   └── [id].tsx                # /tour/:slug-or-id — detail + booking flow
│   ├── j/
│   │   └── [refCode]/
│   │       ├── tours.tsx           # /j/:refCode/tours — jalador's referral catalog
│   │       └── [tour].tsx          # /j/:refCode/:tour — jalador's referral tour page
│   └── dashboard/
│       ├── admin.tsx               # /dashboard/admin
│       ├── jalador.tsx             # /dashboard/jalador
│       ├── operator.tsx            # /dashboard/operator
│       └── operator/
│           ├── tours.tsx           # /dashboard/operator/tours
│           └── tours/
│               ├── crear.tsx                       # /dashboard/operator/tours/crear
│               └── [id]/
│                   ├── editar.tsx                  # /dashboard/operator/tours/:id/editar
│                   └── disponibilidad.tsx         # /dashboard/operator/tours/:id/disponibilidad
├── components/                     # Shared UI components (3 files, intentionally tiny)
│   ├── BetaGate.tsx                # Root demo-mode role picker
│   ├── Layout.tsx                  # Header + main + footer wrapper
│   └── Logo.tsx                    # Animated 3D-ish pearl logo
├── lib/                            # Cross-cutting utilities, hooks, clients
│   ├── api.ts                      # Native-fetch HTTP client w/ demo interceptor
│   ├── auth.tsx                    # AuthProvider, useAuth, useRequireAuth
│   ├── supabase.ts                 # Supabase singleton + isSupabaseConfigured
│   ├── mockData.ts                 # Demo-mode fixtures + URL→response router
│   ├── useFavorites.ts             # localStorage-backed favorites hook
│   └── wompi.ts                    # Wompi checkout helpers + status poll
├── styles/
│   └── globals.css                 # Tailwind + custom utilities + pearl animations
├── public/                         # Served as-is at /
│   ├── favicon.svg / favicon.ico
│   ├── icon-192.svg
│   ├── logo-perla.png / logo-perla.svg
│   ├── manifest.json               # PWA manifest
│   ├── robots.txt
│   └── tours/                      # Tour cover/gallery images (jpg, jfif)
├── next.config.js                  # Image domains, headers, optimizePackageImports
├── tailwind.config.js              # Tailwind theme tokens
├── postcss.config.js
├── tsconfig.json                   # Strict TS, paths: { "@/*": ["./*"] }
├── eslint.config.mjs               # ESLint (next/core-web-vitals)
├── package.json
├── package-lock.json
├── .env.example                    # Documents required env vars (do not read .env*)
└── .next/                          # Build output (ignored)
```

## Directory Purposes

### `pages/`
- **Purpose:** Routing and per-route React entry points. Every `.tsx`/`.ts` file becomes a route; folders nest into URL segments; `[param]` segments are dynamic.
- **Contains:** Public pages, role-gated dashboards, OAuth callback, dynamic sitemap, single edge API route.
- **Key files:**
  - `pages/_app.tsx` — top-level wrapper; mounts `AuthProvider` and `BetaGate`.
  - `pages/tour/[id].tsx` — 535 lines, the booking flow. Largest file in the app.
  - `pages/dashboard/admin.tsx` — 507 lines, second largest.
  - `pages/sitemap.xml.ts` — only file outside `pages/api/` that uses `getServerSideProps`.

### `components/`
- **Purpose:** Reusable UI shared across pages.
- **Contains:** Three components only. The codebase deliberately keeps shared components small; most UI lives inline inside the page file that uses it.
- **Key files:** `Layout.tsx` (the only chrome), `BetaGate.tsx` (demo-mode root gate), `Logo.tsx`.

### `lib/`
- **Purpose:** Framework-agnostic utilities, hooks, and external-service clients.
- **Contains:** HTTP client, auth context, Supabase client, mock data, custom hooks, payment helpers.
- **Key files (all six):**

| File | Lines | Purpose |
|------|-------|---------|
| `lib/api.ts` | 318 | Native-`fetch` HTTP client. Re-creates an axios-shaped `ApiError`. Intercepts demo mode at the top of `request()` (`lib/api.ts:47-52`) and dynamically imports `./mockData` only when needed. Exports typed wrappers: `getTours`, `getTour`, `getTourBySlug`, `getFeaturedTours`, `getCategories`, `getJaladorRanking`, `login`, `magicLogin`, `register`, `getMyBookings`, `getBooking`, `cancelBooking`, `createReview`, `getTourReviews`, `getProfile`, `updateProfile`, `updateJaladorProfile`, `getOperatorBookings`, `createTour`, `updateTour`, `createAvailability`, `createAvailabilityBulk`. Also exports the shared types `Tour`, `Category`, `Jalador`, `Booking`, `ReviewItem`, `ReviewData`. |
| `lib/auth.tsx` | 105 | `AuthProvider` (React Context), `useAuth()` and `useRequireAuth(roles?)` hooks. Persists `{turescol_token, turescol_refresh, turescol_user}` to localStorage. Hard-reloads on logout to reset BetaGate. |
| `lib/supabase.ts` | 15 | Single `createClient(...)` call. `isSupabaseConfigured()` is the gating flag used everywhere auth branches. |
| `lib/mockData.ts` | 357 | Demo-mode fixtures (`mockJaladores`, `mockOperators`, `mockTours` with 17 entries, `mockBookings`, `mockNotifications`, `mockDashboardAdmin`) plus the dispatcher `getMockResponse(method, url)` (`lib/mockData.ts:134-249`) that maps `(method, path)` → fake JSON. Includes `enrichTour()` for upgrading list-shape tours into detail-shape with hardcoded includes/excludes/galleries per slug. |
| `lib/useFavorites.ts` | 39 | `useFavorites()` hook. Stores favorite tour IDs in `localStorage.laperla_favorites`. Module-level cache to avoid `JSON.parse` on every mount. Returns `{ favorites, toggle, isFavorite, count }` with O(1) lookup via `Set`. |
| `lib/wompi.ts` | 113 | Wompi payment gateway helpers. `getWompiCheckoutUrl()` builds the redirect URL, `openWompiCheckout()` does the redirect, `checkPaymentStatus()` polls `sandbox.wompi.co` or `production.wompi.co` from the browser. Falls back to demo behavior when `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` is missing. |

### `styles/`
- **Purpose:** Global stylesheet only. Per-component styles use Tailwind classes inline or `<style jsx>` (e.g., `components/Logo.tsx:25`).
- **Key file:** `styles/globals.css` (≈170 lines): Tailwind layers + custom button classes (`.btn-primary`, `.btn-outline`, `.btn-white`, `.input`, `.rounded-card`, `.shadow-card`, `.rounded-pill`) + the pearl animation keyframes.

### `public/`
- **Purpose:** Static assets served verbatim at the URL root.
- **Contains:** Favicons, PWA manifest, robots.txt, brand logos, and `public/tours/` — the tour gallery photos referenced by `lib/mockData.ts:258-307` (URL-encoded filenames with spaces).

## Key File Locations

**Entry Points:**
- `pages/_app.tsx` — every page renders inside this. Wraps with `<AuthProvider><BetaGate>{children}</BetaGate></AuthProvider>`.
- `pages/index.tsx:9` — `/` route; redirects to dashboard or BetaGate.

**Configuration:**
- `next.config.js:8-23` — image domains (Unsplash + `*.supabase.co`) and AVIF/WebP defaults.
- `next.config.js:25-27` — `optimizePackageImports: ['recharts', '@supabase/supabase-js']`.
- `next.config.js:28-41` — security headers (HSTS, X-Frame-Options, etc.).
- `tsconfig.json:21-25` — path alias `@/*` (defined but rarely used in the codebase; most imports are relative).
- `tailwind.config.js` — design tokens.
- `postcss.config.js` — `tailwindcss` + `autoprefixer`.

**Core Logic:**
- `lib/api.ts:39-78` — the `request()` function; the entire API surface flows through here.
- `lib/auth.tsx:29-82` — `AuthProvider`.
- `lib/auth.tsx:89-105` — `useRequireAuth` route guard.
- `components/BetaGate.tsx:49-174` — root-level demo-mode gate.
- `lib/mockData.ts:134-249` — `getMockResponse` dispatcher.

**Testing:**
- None. There is no test directory, no Jest/Vitest config, no Playwright. Test framework not adopted yet.

## Naming Conventions

**Files:**
- Pages: lowercase Spanish nouns matching the URL (`explorar.tsx`, `favoritos.tsx`, `mis-reservas.tsx`, `pago-resultado.tsx`, `jaladores.tsx`). Spanish slugs are deliberate — they double as user-facing URLs.
- Dynamic segments: `[paramName].tsx` (`pages/tour/[id].tsx`, `pages/j/[refCode]/[tour].tsx`).
- Components: PascalCase, single component per file (`BetaGate.tsx`, `Layout.tsx`, `Logo.tsx`).
- Lib utilities: lowercase, single concern per file (`api.ts`, `auth.tsx`, `wompi.ts`). `.tsx` only when the file exports JSX (`auth.tsx`).
- Mixed Spanish/English: route slugs and user-visible strings are Spanish; identifiers, types, and comments are mostly English with Spanish exceptions.

**Directories:**
- All lowercase, kebab-case where multi-word would apply (none currently).
- Route folders mirror URL structure exactly.

**Identifiers:**
- React components: `PascalCase`.
- Functions and variables: `camelCase`.
- Types and interfaces: `PascalCase` (`Tour`, `Booking`, `AuthUser`, `ApiResponse`).
- Constants: occasional `SCREAMING_SNAKE_CASE` (`STORAGE_KEY` in `lib/useFavorites.ts:3`, `BETA_KEY` in `components/BetaGate.tsx:5`, `WOMPI_PUBLIC_KEY` in `lib/wompi.ts:10`); module-level `let` caches use `camelCase` (`cachedDemoMode`, `cachedFavorites`).
- localStorage keys: `turescol_*` (legacy brand prefix, kept for backwards-compat) and `laperla_*` (new brand prefix).

## Where to Add New Code

**New page (public route):**
- Create `pages/<slug>.tsx`. Wrap in `<Layout>{...}</Layout>`. Add to `STATIC_PAGES` in `pages/sitemap.xml.ts:6` if it should appear in the sitemap.

**New protected page:**
- Create the page, call `const { authorized } = useRequireAuth(['role1', 'role2'])` from `lib/auth` at the top, return `null` while not authorized.
- Place admin-only pages under `pages/dashboard/admin*`, operator under `pages/dashboard/operator*`, jalador under `pages/dashboard/jalador*` to match the existing pattern.

**New API call:**
- Add a typed wrapper in `lib/api.ts` next to the existing ones. Export a function returning the unwrapped data. Add the corresponding mock branch in `lib/mockData.ts` `getMockResponse` (otherwise demo mode will return `{}` and the page will appear empty in demo).

**New shared component:**
- Add to `components/`. The bar for promotion is high — most UI is intentionally inline. Promote only when used in 2+ pages.

**New external integration / SDK client:**
- Add to `lib/<service>.ts`. Mirror the `lib/wompi.ts` shape: env-var guard at top, exported `is<Service>Configured()` helper, named functions for each operation.

**New static asset:**
- Drop into `public/`. For tour images, follow the URL-encoded uppercase pattern in `public/tours/` (used by hardcoded URLs in `lib/mockData.ts:258-307`).

**New env var:**
- Add to `.env.example`. Reference via `process.env.NEXT_PUBLIC_*` (client-readable) or `process.env.*` (server-only, only consumable from `getServerSideProps`/`pages/api/*`/`pages/sitemap.xml.ts`).

## Largest Files (by line count)

| Lines | File | Notes |
|------:|------|-------|
| 535 | `pages/tour/[id].tsx` | Tour detail + multi-step booking flow + Wompi integration. Approaches the 800-line ceiling — candidate for extraction. |
| 507 | `pages/dashboard/admin.tsx` | Admin panel with tabs, charts, edit modals. Recharts dynamically imported. |
| 357 | `lib/mockData.ts` | All demo fixtures + URL dispatcher. |
| 346 | `pages/j/[refCode]/[tour].tsx` | Jalador-attributed booking landing. Mirrors `pages/tour/[id].tsx`. |
| 318 | `lib/api.ts` | HTTP client + typed API surface. |
| 316 | `pages/login.tsx` | 5 auth modes in one page. |
| 271 | `pages/perfil.tsx` | User + jalador profile editor. |
| 238 | `pages/explorar.tsx` | Catalog, filters, debounce, sort. |
| 217 | `pages/dashboard/operator/tours/[id]/editar.tsx` | Tour edit form. |
| 196 | `pages/dashboard/operator/tours/[id]/disponibilidad.tsx` | Availability calendar. |
| 191 | `pages/dashboard/operator/tours/crear.tsx` | New tour form. |

Total source: ~5,715 lines across 24 source files (`wc -l` over `pages/` + `components/` + `lib/`).

## Special Directories

**`.next/`**
- Purpose: Next.js build cache and output.
- Generated: Yes (by `next dev` and `next build`).
- Committed: No (in `.gitignore`).

**`.vercel/`**
- Purpose: Vercel CLI project linkage.
- Generated: Yes.
- Committed: No.

**`node_modules/`**
- Standard. Not committed.

**`public/tours/`**
- Purpose: Tour cover/gallery images. Filenames use uppercase Spanish words with spaces and `.jpg`/`.jfif` extensions; URLs in `lib/mockData.ts` reference them URL-encoded (`%20`).
- Generated: No — manual asset drop.
- Committed: Yes.

**`.planning/`**
- Purpose: GSD command planning artifacts (this file lives here).
- Generated: Yes (by `/gsd:*` commands).
- Committed: Yes.

---

*Structure analysis: 2026-04-25*
