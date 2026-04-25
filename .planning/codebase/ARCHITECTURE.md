# Architecture

**Analysis Date:** 2026-04-25

## Pattern Overview

**Overall:** Next.js 16 Pages Router SPA-leaning hybrid, client-rendered data fetching, with a deliberately swappable 3-tier data layer (Supabase auth → legacy Render REST API → in-memory mock interceptor).

**Key Characteristics:**
- Pages Router (`pages/*`), not App Router. Confirmed by `pages/_app.tsx:7` and absence of an `app/` directory.
- Turbopack-driven build (Next 16 default, `package.json:14` `"next": "^16.2.4"`, `"build": "next build"`).
- Client-side data fetching by default: nearly every dashboard/list page calls `useEffect(() => api.get(...))` rather than `getServerSideProps`. Only `pages/sitemap.xml.ts` and `pages/api/og.tsx` run server/edge.
- Client-side auth gate via `AuthProvider` + `useRequireAuth` (no Next middleware).
- "Demo mode" first-class: a global runtime switch keyed by a magic localStorage value reroutes every API call to a synthetic mock, so the entire app is demoable without a backend.

## Rendering Strategy Per Route

| Route | Strategy | Evidence |
|-------|----------|----------|
| `pages/index.tsx` | CSR — redirects based on auth/beta state in `useEffect` | `pages/index.tsx:14-38` |
| `pages/explorar.tsx` | CSR — `getTours` + `getCategories` in `useEffect` | `pages/explorar.tsx:34-42` |
| `pages/tour/[id].tsx` | CSR (no `getServerSideProps`) — fetched client-side specifically so the demo interceptor can intercept | `pages/tour/[id].tsx:36-44` (comment: "Fetch tour client-side so the mock/demo interceptor can handle it") |
| `pages/favoritos.tsx` | CSR | `pages/favoritos.tsx:14-19` |
| `pages/login.tsx` | CSR | `pages/login.tsx:42-117` |
| `pages/auth/callback.tsx` | CSR — Supabase OAuth callback, listens to `onAuthStateChange` | `pages/auth/callback.tsx:9-23` |
| `pages/dashboard/*` | CSR — guarded by `useRequireAuth([...roles])` then polls `api.get` | `pages/dashboard/admin.tsx:19,34-40`, `pages/dashboard/jalador.tsx:11,17-24` |
| `pages/j/[refCode]/tours.tsx` & `[tour].tsx` | CSR — referral landing pages | `pages/j/[refCode]/tours.tsx:17-32` |
| `pages/pago-resultado.tsx` | CSR — calls Wompi public API to verify `transactionId` query param | `pages/pago-resultado.tsx:13-25` |
| `pages/sitemap.xml.ts` | **SSR** — `getServerSideProps`, fetches tour slugs, sets `Content-Type: application/xml`, 1h cache | `pages/sitemap.xml.ts:20-33` |
| `pages/api/og.tsx` | **Edge runtime** — `runtime: 'edge'`, returns dynamic OG image via `next/og` `ImageResponse` | `pages/api/og.tsx:4-6` |
| `pages/404.tsx` | Static | `pages/404.tsx` |

There is no `getStaticProps`/`getStaticPaths` anywhere. All dynamic content is fetched after hydration.

## Data Flow

The data layer is a 3-tier cascade. Every API call passes through `lib/api.ts`, which decides where the call actually goes.

### Tier 1 — Demo Mock Interceptor (highest priority)

`lib/api.ts:10-15` reads `localStorage.turescol_token`. If the value is the literal string `'beta-demo-token'`, the request is short-circuited:

```
lib/api.ts:47-52
if (isDemoModeFast()) {
  const { getMockResponse } = await import('./mockData');
  await new Promise((r) => setTimeout(r, 120));
  return { data: getMockResponse(method.toLowerCase(), url) as T, status: 200 };
}
```

Key design decisions:
- **Magic-string sentinel**, not a build flag. Deliberate so a regular user (family/friends) can flip in/out of demo mode at runtime via the `BetaGate` UI without env var rebuilds.
- **Dynamic import** of `./mockData` (`lib/api.ts:48`) so the 29KB mock bundle (357 lines) is only fetched when actually in demo mode. Comment at `lib/api.ts:45-46` explicitly calls this out.
- **120ms artificial latency** to make the demo "feel" like a real network.
- `getMockResponse` is a giant URL/method matcher (`lib/mockData.ts:134-249`) covering: `/dashboard/admin|jalador|operator|tourist`, `/notifications`, `/users/jaladores|operators`, `/reputation/ranking`, `/tours`, `/tours/featured`, `/tours/categories`, `/tours/slug/:slug`, `/tours/:id`, `/bookings/my|operator`, `/bookings`, admin `approve|reject|suspend|reactivate` actions, `/reviews/tour/:id`, `/auth/profile`, `/users/me`. Unknown endpoints return `{}` to avoid crashes.
- `enrichTour` (`lib/mockData.ts:312-357`) hydrates tour-list shapes into the rich detail-page shape with hardcoded includes/excludes/galleries per slug.

### Tier 2 — Legacy Render REST API (real backend for data)

When not in demo mode, `lib/api.ts:60-77` issues a native `fetch` to `process.env.NEXT_PUBLIC_API_URL` (`lib/api.ts:1`). Notable traits:
- **Native fetch**, not axios. The error class `ApiError` (`lib/api.ts:20-26`) re-creates an axios-like `error.response.data` shape so callers that still write `err.response?.data?.message` (e.g., `pages/login.tsx:38`) keep working.
- Bearer token from `localStorage.turescol_token` (`lib/api.ts:55-57`).
- Query params built via `URLSearchParams` in `buildUrl` (`lib/api.ts:28-37`).
- Domain endpoints used by the app: `/auth/login`, `/auth/register`, `/auth/magic-login` (jalador refCode + phone), `/auth/profile`, `/tours`, `/tours/:id`, `/tours/slug/:slug`, `/tours/featured`, `/tours/categories`, `/tours/:id/availability[/bulk]`, `/bookings`, `/bookings/my`, `/bookings/operator`, `/bookings/:id/cancel`, `/reviews`, `/reviews/tour/:id`, `/reputation/ranking`, `/users/me`, `/users/jaladores/me`, `/users/jaladores/ref/:refCode`, `/dashboard/admin|jalador|operator`, `/notifications[/count|read-all]`, plus admin `approve|reject|suspend|reactivate` mutations.

### Tier 3 — Supabase (auth only, optional payments table)

`lib/supabase.ts:11` exports a singleton `supabase` client built from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `isSupabaseConfigured()` (`lib/supabase.ts:13-15`) is the gating check used throughout the auth flow.

Supabase is used **only for auth** in this app. Tour/booking data still lives behind the legacy API (Tier 2) or the mock (Tier 1). This is intentional: it lets the team replace Supabase or the legacy API independently.

## Auth Flow

There are **three concurrent auth modes**, all funneled into the same `localStorage` slots so the rest of the app needs only one read:

| Slot | Owner | Purpose |
|------|-------|---------|
| `turescol_token` | All modes | Bearer token (or sentinel `'beta-demo-token'`) |
| `turescol_refresh` | Real login | Optional refresh token from legacy backend |
| `turescol_user` | All modes | JSON-serialized `AuthUser` |
| `laperla_beta` | Demo mode | `{ role, betaMode: true }` payload for the BetaGate |
| `laperla_favorites` | Any mode | Array of tour IDs (separate from auth) |

### Mode A — Email + Password via Supabase (preferred when configured)

`pages/login.tsx:45-57`:
```
supabase.auth.signInWithPassword({ email, password })
  → localStorage.setItem('turescol_token', session.access_token)
  → localStorage.setItem('turescol_user', { id, name, email, role })
  → navigateByRole(role)
```

### Mode B — Google OAuth via Supabase

`pages/login.tsx:64-74`:
```
supabase.auth.signInWithOAuth({ provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` } })
```
Provider redirects back to `/auth/callback`, where `pages/auth/callback.tsx:10-22` listens for `SIGNED_IN`, writes the session into the same localStorage slots, and hard-navigates to `/explorar`.

### Mode C — Phone OTP via Supabase

`pages/login.tsx:76-117`. `signInWithOtp({ phone })` → user enters code → `verifyOtp({ phone, token, type: 'sms' })`. Phone is normalized to `+57…`.

### Mode D — Legacy backend fallback

When Supabase is not configured, `pages/login.tsx:59` and `lib/auth.tsx:46-55` fall back to `POST /auth/login` against the legacy API and store the returned `access_token` + `refresh_token`.

### Mode E — Magic login for jaladores

`pages/login.tsx:262-288` calls `magicLogin(refCode, phone)` (`lib/api.ts:188-191`) — refCode + WhatsApp number, no password. Used for offline-recruited jaladores who don't manage email accounts.

### Mode F — Beta demo "login"

`components/BetaGate.tsx:76-99` does **not** call any backend. It writes a fake user and the sentinel token into localStorage:
```
localStorage.setItem('turescol_token', 'beta-demo-token')
localStorage.setItem('turescol_user', JSON.stringify(fakeUser))
localStorage.setItem('laperla_beta', JSON.stringify({ role, betaMode: true }))
window.location.href = path
```
Then `lib/api.ts` Tier 1 takes over.

### AuthProvider + Route Guards

`lib/auth.tsx:29-82`:
- `AuthProvider` is mounted at `pages/_app.tsx:9`, wraps every route.
- On mount it reads `turescol_token` and `turescol_user` from localStorage and hydrates `user` state (`lib/auth.tsx:33-43`).
- `logout()` (`lib/auth.tsx:57-66`) clears all four slots, invalidates the demo cache, and **hard reloads to `/`** so `BetaGate` reappears.
- `useRequireAuth(allowedRoles?)` (`lib/auth.tsx:89-105`) is the per-page guard: redirects to `/login?redirect=…` if no user, redirects to `/` if role mismatch. Used in `pages/dashboard/admin.tsx:19`, `pages/dashboard/jalador.tsx:11`, etc.

### BetaGate (root-level interception)

`components/BetaGate.tsx` wraps the entire app inside `_app.tsx:39-41`. On every initial mount:
1. If `turescol_token` + `turescol_user` exist → render children.
2. Else if `laperla_beta.betaMode === true` → render children.
3. Else → render the role picker screen (Tourist / Jalador / Operator / Admin).

This is why the app cannot be used "anonymously" right now — by design, every visitor must either log in for real or pick a demo role.

## Domains

| Domain | Pages | Backend endpoints |
|--------|-------|-------------------|
| **Tours** (catalog) | `pages/explorar.tsx`, `pages/tours.tsx`, `pages/tour/[id].tsx`, `pages/favoritos.tsx` | `/tours`, `/tours/featured`, `/tours/categories`, `/tours/slug/:slug`, `/reviews/tour/:id` |
| **Bookings** | `pages/mis-reservas.tsx`, booking flow inside `pages/tour/[id].tsx` | `/bookings`, `/bookings/my`, `/bookings/:id/cancel`, `/bookings/operator` |
| **Jalador** (referral / sales) | `pages/jaladores.tsx`, `pages/dashboard/jalador.tsx`, `pages/j/[refCode]/tours.tsx`, `pages/j/[refCode]/[tour].tsx` | `/dashboard/jalador`, `/users/jaladores/ref/:refCode`, `/reputation/ranking`, `/auth/magic-login`, `/users/jaladores/me` |
| **Operator** (tour management) | `pages/dashboard/operator.tsx`, `pages/dashboard/operator/tours.tsx`, `pages/dashboard/operator/tours/crear.tsx`, `pages/dashboard/operator/tours/[id]/editar.tsx`, `pages/dashboard/operator/tours/[id]/disponibilidad.tsx` | `/tours` (CRUD), `/tours/:id/availability`, `/tours/:id/availability/bulk`, `/bookings/operator` |
| **Admin** | `pages/dashboard/admin.tsx` | `/dashboard/admin`, `/users/jaladores`, `/users/operators`, `/admin/{jaladores,operators}/:id` (PUT, approve/reject/suspend/reactivate) |
| **Payments** | `pages/pago-resultado.tsx`, booking step in `pages/tour/[id].tsx` | Wompi public API (`sandbox.wompi.co` / `production.wompi.co`) |
| **Auth** | `pages/login.tsx`, `pages/register.tsx`, `pages/perfil.tsx`, `pages/auth/callback.tsx` | Supabase Auth + `/auth/login|register|profile|magic-login` |
| **SEO / Sharing** | `pages/sitemap.xml.ts`, `pages/api/og.tsx`, `public/robots.txt`, `public/manifest.json` | n/a |

## Error Handling

**Strategy:** Catch-and-degrade. Most calls follow `api.get(...).then(setState).catch(() => {})` or `.catch(() => setError('mensaje'))`. There is no global error boundary and no `_error.tsx` override beyond Next defaults.

**Patterns:**
- `lib/api.ts:71-76` throws `ApiError` with axios-shaped `response.data`. UI reads `err.response?.data?.message` (e.g., `pages/login.tsx:38`).
- Demo mode never throws — `getMockResponse` returns `{}` for unknown endpoints (`lib/mockData.ts:249`).
- `pages/sitemap.xml.ts:25-27` swallows API failure and serves a static-only sitemap rather than 500.
- Wompi errors degrade to `status: 'ERROR'` (`lib/wompi.ts:96-113`).

## Cross-Cutting Concerns

| Concern | Approach | Location |
|---------|----------|----------|
| Logging | `console.log`/`console.error` ad-hoc, no logger lib | scattered |
| Validation | Manual (`required` HTML attrs, `if (!field)` early returns). No Zod / no schema. | per-form |
| Authentication | `AuthProvider` (React Context) + localStorage; `useRequireAuth` hook on protected pages | `lib/auth.tsx` |
| Authorization | Role check inside `useRequireAuth(allowedRoles)`; the legacy backend re-validates server-side | `lib/auth.tsx:89-105` |
| Caching | In-memory module-level caches: `cachedDemoMode` (`lib/api.ts:4`), `cachedFavorites` (`lib/useFavorites.ts:6`). No SWR / TanStack Query. | `lib/api.ts`, `lib/useFavorites.ts` |
| HTTP headers | Set globally in `next.config.js:28-41` (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) | `next.config.js` |
| Image optimization | `next/image` + remote patterns for Unsplash + Supabase storage; AVIF/WebP first; 60-day CDN cache | `next.config.js:8-23` |
| Lazy loading | `dynamic()` for recharts in admin (`pages/dashboard/admin.tsx:9-14`); dynamic `import('./mockData')` and `import('../lib/api')` for code-splitting | various |

## Key Architectural Decisions

1. **Pages Router on Next 16.** Stayed on Pages Router despite Next 16 favoring App Router. Reduces churn and keeps the demo-mode interceptor pattern simple (one fetch wrapper, no Server Components hitting it).
2. **localStorage-as-source-of-truth for auth state.** Three independent auth backends (Supabase / legacy REST / fake demo) all converge on the same four localStorage keys. Anything else in the app reads only from there.
3. **Magic-string demo sentinel (`beta-demo-token`).** A 17-char string in localStorage flips the entire app into mock mode. Trade-off: anyone who sets that string sees fake data; on launch day this is acceptable because it's the explicit goal — let family/friends explore without infra.
4. **Native `fetch`, axios-shaped errors.** Removed axios for bundle size; preserved axios's `error.response.data` shape via a custom `ApiError` class so call sites didn't have to change.
5. **No SSR for product data.** Tour pages are CSR specifically so the same code path serves real users and demo users. The cost is worse first-paint SEO on tour detail; mitigated for the catalog by the static sitemap.
6. **Hard-reload logout** (`window.location.href = '/'`). React state is not enough — BetaGate has to remount fresh to re-prompt for a role.
7. **Edge OG image generation.** `pages/api/og.tsx` runs on Vercel Edge to keep social-card latency low for WhatsApp/FB previews.
8. **Wompi from the client.** Payment redirect URL is built client-side (`lib/wompi.ts:74-83`) and status is checked from the browser against the Wompi public API. Acceptable for MVP launch; the comment at `lib/wompi.ts:93-95` explicitly flags this should move server-side later.

---

*Architecture analysis: 2026-04-25*
