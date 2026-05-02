# External Integrations

**Analysis Date:** 2026-04-25

## Three-Backend Reality

The app currently routes traffic across **three backends** depending on the operation and the demo flag. Plans/executions touching auth or data must pick the correct one explicitly.

| Backend | Used for | Auth model | Entry point |
|---------|----------|------------|-------------|
| **Supabase** | New auth flows (email/password, Google OAuth, SMS OTP) | JWT issued by Supabase, stored as `turescol_token` | `lib/supabase.ts` |
| **Legacy Render API** | Tours, bookings, dashboards, jaladores, operators, reviews, notifications | Bearer token (own JWT) via `/auth/login` | `lib/api.ts` |
| **Mock data** | Beta/demo mode (family + friends preview) | Sentinel token `'beta-demo-token'` | `lib/mockData.ts` |

The mock layer **intercepts inside `lib/api.ts:47-52`** before any HTTP request when `localStorage.turescol_token === 'beta-demo-token'`. Supabase calls go directly to Supabase regardless of demo mode (the demo flag is set by the OTP fallback path at `pages/login.tsx:111`).

---

## 1. Supabase (Auth + future data)

**Package:** `@supabase/supabase-js@2.103.3` (`package.json:13`)

**Client init (`lib/supabase.ts:8-11`):**
```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

`isSupabaseConfigured()` (`lib/supabase.ts:13-15`) gates every Supabase code path so the app degrades gracefully to the legacy backend when env vars are missing.

**Auth methods used:**

| Method | Where | Purpose |
|--------|-------|---------|
| `supabase.auth.signInWithPassword({ email, password })` | `pages/login.tsx:47` | Email + password login |
| `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` | `pages/login.tsx:66-69` | Google SSO; redirects to `/auth/callback` |
| `supabase.auth.signInWithOtp({ phone })` | `pages/login.tsx:83` | Send SMS OTP to `+57XXXXXXXXXX` |
| `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` | `pages/login.tsx:99` | Confirm OTP, get session |
| `supabase.auth.onAuthStateChange((event, session) => ...)` | `pages/auth/callback.tsx:10-22` | OAuth callback handler |

**OAuth callback (`pages/auth/callback.tsx`):**

- Listens for `SIGNED_IN`, then writes `session.access_token` to `localStorage.turescol_token` (`pages/auth/callback.tsx:12`) and a synthesized user object to `turescol_user` (`pages/auth/callback.tsx:13-19`).
- Hard navigation to `/explorar` via `window.location.href` to force a clean Auth context reload (`pages/auth/callback.tsx:20`).

**Token unification:**
Both Supabase sessions and legacy login store under the **same** key `turescol_token` (`lib/api.ts:56`, `pages/login.tsx:50`, `pages/auth/callback.tsx:12`). The app cannot tell which backend issued a given token from its shape — downstream code only checks for the `'beta-demo-token'` sentinel.

**Known issue:** The legacy Render API will reject Supabase JWTs (different signing key). For users who logged in via Supabase, calls to `lib/api.ts` endpoints (`/tours`, `/bookings/*`, etc.) will return 401 unless mock mode is active. This is the central tension of the current architecture.

**Phone normalization (`pages/login.tsx:81-82`, `:97-98`):**
```ts
const cleanPhone = phone.replace(/\D/g, '');
const fullPhone = cleanPhone.startsWith('57') ? `+${cleanPhone}` : `+57${cleanPhone}`;
```
Hardcoded Colombia (+57) — no country picker.

**Allowed remote images:** `*.supabase.co` already whitelisted in `next.config.js:14-17` for Supabase Storage avatars.

---

## 2. Legacy API on Render

**Base URL:** `process.env.NEXT_PUBLIC_API_URL` (`lib/api.ts:1`), fallback `http://localhost:3000/api`.

**HTTP client:** Native `fetch` wrapped in `request<T>()` (`lib/api.ts:39-78`). Returns `{ data, status }` to mirror axios call sites.

**Auth header:** Bearer from `localStorage.turescol_token` (`lib/api.ts:55-58`).

**Demo mode short-circuit (`lib/api.ts:47-52`):**
```ts
if (isDemoModeFast()) {
  const { getMockResponse } = await import('./mockData');
  await new Promise(r => setTimeout(r, 120));
  return { data: getMockResponse(method.toLowerCase(), url) as T, status: 200 };
}
```
Dynamic import keeps `mockData.ts` (~29KB) out of normal bundles.

**Endpoints exposed via typed helpers (`lib/api.ts:148-317`):**

| Helper | Verb + path |
|--------|-------------|
| `getTours(params)` | `GET /tours` |
| `getTourBySlug(slug)` | `GET /tours/slug/:slug` |
| `getTour(id)` | `GET /tours/:id` |
| `getFeaturedTours()` | `GET /tours/featured` |
| `getCategories()` | `GET /tours/categories` |
| `getJaladorRanking()` | `GET /reputation/ranking` |
| `login(email, password)` | `POST /auth/login` (legacy fallback) |
| `magicLogin(refCode, phone)` | `POST /auth/magic-login` (jalador shortcut) |
| `register(body)` | `POST /auth/register` |
| `getMyBookings()` | `GET /bookings/my` |
| `getBooking(id)` | `GET /bookings/:id` |
| `cancelBooking(id, reason)` | `PUT /bookings/:id/cancel` |
| `createReview(body)` | `POST /reviews` |
| `getTourReviews(tourId, page)` | `GET /reviews/tour/:tourId` |
| `getProfile()` | `GET /auth/profile` |
| `updateProfile(body)` | `PUT /users/me` |
| `updateJaladorProfile(body)` | `PUT /users/jaladores/me` |
| `getOperatorBookings(params)` | `GET /bookings/operator` |
| `createTour(body)` | `POST /tours` |
| `updateTour(id, body)` | `PUT /tours/:id` |
| `createAvailability(tourId, body)` | `POST /tours/:tourId/availability` |
| `createAvailabilityBulk(tourId, body)` | `POST /tours/:tourId/availability/bulk` |

**Error handling:** Custom `ApiError` class (`lib/api.ts:20-26`) preserves `response.data.message` for UI display.

---

## 3. Mock Data System (`lib/mockData.ts`)

**Activation:** `localStorage.turescol_token === 'beta-demo-token'`. Set by:
- BetaGate "demo mode" entry (welcome screen)
- OTP fallback when Supabase not configured (`pages/login.tsx:111`)

**Cache:** `lib/api.ts:3-15` caches the demo flag in module scope to avoid `localStorage` reads on every request. `invalidateDemoModeCache()` (`lib/api.ts:6-8`) is called when the user logs in/out.

**Mock dataset sizes:**
- 8 jaladores (`mockData.ts:59-68`)
- 5 operators (`mockData.ts:70-76`)
- 17 tours with full gallery + descriptions (`mockData.ts:78-96`, enriched at `:312-357`)
- 8 bookings (`mockData.ts:98-107`)
- 5 notifications (`mockData.ts:109-115`)

**Endpoint coverage in `getMockResponse()` (`mockData.ts:134-250`):**

| Method | Path pattern | Source |
|--------|--------------|--------|
| GET | `/dashboard/admin` | `mockDashboardAdmin` (`:139`) |
| GET | `/dashboard/jalador` | Inline object (`:140-146`) |
| GET | `/dashboard/operator` | Inline object (`:147-153`) |
| GET | `/dashboard/tourist` | Inline object (`:154-156`) |
| GET | `/notifications/count` | Filtered `mockNotifications` (`:159`) |
| GET | `/notifications` | `mockNotifications` (`:160`) |
| POST | `/notifications/read-all` | Mutates flags, returns `{ ok: true }` (`:161-164`) |
| GET | `/users/jaladores` | `{ data, total }` (`:167`) |
| GET | `/users/operators` | `{ data, total }` (`:168`) |
| GET | `/reputation/ranking` | Top 5 jaladores (`:169`) |
| GET | `/tours/featured` | Filtered active tours (`:172`) |
| GET | `/tours/categories` | 4 hardcoded categories (`:173-178`) |
| GET | `/tours/slug/:slug` | Enriched tour (`:179-182`) |
| GET | `/tours/:id` | Enriched tour (`:183-186`) |
| GET | `/tours` | All enriched tours (`:187`) |
| GET | `/bookings/operator` | `mockBookings` (`:190`) |
| GET | `/bookings/my` | First 3 bookings (`:191`) |
| POST | `/bookings` | Synthesized booking with QR (`:194-201`) |
| POST | `/bookings/:id/(confirm\|complete\|cancel)` | `{ ok: true }` (`:202`) |
| POST | `/admin/.../(approve\|reject\|suspend\|reactivate)` | `{ ok: true }` (`:205`) |
| PUT | `/admin/(jaladores\|operators)/:id` | `{ ok: true }` (`:206`) |
| GET | `/reviews/tour/:id` | 5 hand-written realistic reviews (`:209-218`) |
| GET | `/auth/profile` | Full jalador demo profile (`:221-244`) |
| PUT | `/users/me` | `{ ok: true }` (`:245`) |
| PUT | `/users/jaladores/me` | `{ ok: true }` (`:246`) |
| `*` | catch-all | `{}` to avoid crashes (`:249`) |

**Tour enrichment (`mockData.ts:312-357`):** The base `mockTours` only carry list-view fields. `enrichTour()` adds `description`, `includes`/`excludes`, departure info, `priceChild` (70% of adult), `galleryUrls`, fake `totalReviews`, and a default category. Per-tour overrides live in `tourDescriptions` (`:321-331`) and `tourGalleries` (`:258-308`).

---

## 4. Wompi Payments (sandbox, env-gated)

**No SDK:** Pure REST + redirect URL composition (`lib/wompi.ts`).

**Env gating (`lib/wompi.ts:10-30`):**
```ts
const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
const WOMPI_ENV = process.env.NEXT_PUBLIC_WOMPI_ENV || 'sandbox';
const SANDBOX_KEY = 'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7';
```

`isWompiConfigured()` returns true only when `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` is set. Otherwise `isDemoPayment()` returns true and the booking flow short-circuits to a fake success page (`lib/wompi.ts:24-30, 74-77`).

**Note:** A hardcoded `SANDBOX_KEY` constant exists at `lib/wompi.ts:18` for fallback. This is a Wompi-published staging test key (not a secret), but worth flagging for the security review pass.

**Checkout flow:**
1. Booking page calls `getWompiCheckoutUrl(params)` (`lib/wompi.ts:43-53`) — builds URL: `https://checkout.wompi.co/p/?public-key=...&currency=COP&amount-in-cents=...&reference=...&redirect-url=...`
2. `openWompiCheckout()` (`lib/wompi.ts:74-83`) does `window.location.href = url`
3. Wompi redirects user back to `redirectUrl` (`pages/pago-resultado.tsx`) with `id` (transaction id) in query
4. `checkPaymentStatus(transactionId)` (`lib/wompi.ts:96-113`) calls `GET https://(production|sandbox).wompi.co/v1/transactions/:id` to confirm status

**Payment status types (`lib/wompi.ts:97`):**
`'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR'`

**Reference generator (`lib/wompi.ts:86-90`):** `LP-{base36(timestamp)}-{4-char-random}` uppercased.

**Optional widget script:** `loadWompiWidget()` (`lib/wompi.ts:56-68`) injects `<script src="https://checkout.wompi.co/widget.js">` for in-page widget mode (currently the redirect path is preferred).

**Used in:**
- `pages/tour/[id].tsx` — booking confirmation
- `pages/pago-resultado.tsx` — payment result polling

---

## Environment Configuration

**`.env.example` inventory** (sanitized, not real values):

| Var | Required | Purpose | Default behavior if missing |
|-----|----------|---------|------------------------------|
| `NEXT_PUBLIC_API_URL` | Yes | Legacy Render API base URL | Falls back to `http://localhost:3000/api` (`lib/api.ts:1`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `isSupabaseConfigured()` → false → all auth falls back to legacy/demo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key | Same as above |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | No | Wompi merchant public key | Demo payment mode (skip real checkout) |
| `NEXT_PUBLIC_WOMPI_ENV` | No | `sandbox` or `production` | Defaults to `sandbox` (`lib/wompi.ts:11`) |

All env vars are `NEXT_PUBLIC_*` (baked at build time, exposed to browser). **No server-only secrets** in this app — Supabase anon key and Wompi public key are both safe by design.

**Secrets management:** Real values live in Vercel project env vars. Repo only has `.env.example`. `.env.local` is git-ignored.

---

## Authentication & Identity

**Storage keys (localStorage):**
- `turescol_token` — Active session token (Supabase JWT, legacy JWT, or `'beta-demo-token'`)
- `turescol_refresh` — Legacy refresh token (jalador magic-login only, `pages/login.tsx:274`)
- `turescol_user` — Cached user object `{ id, name, email, role, avatarUrl? }`
- `laperla_beta` — Beta-gate state `{ role, betaMode }` (`pages/login.tsx:113`)

**Roles:** `'tourist' | 'jalador' | 'operator' | 'admin'`. Routed in `navigateByRole()` (`pages/login.tsx:24-30`).

**Auth provider hook:** `lib/auth.tsx` (`useAuth`) — wraps the legacy login path; Supabase paths call `supabase.auth.*` directly and write the same localStorage keys.

---

## Monitoring & Observability

**Error tracking:** None integrated (no Sentry / LogRocket / etc.).

**Logs:** `console.log` / `console.error` only — flagged for cleanup before launch.

---

## CI/CD & Deployment

**Hosting:** Vercel (per project conventions and `next.config.js` headers).

**CI Pipeline:** Vercel build hooks on push to `main`. No GitHub Actions workflow detected.

---

## Webhooks & Callbacks

**Incoming HTTP:**
- `pages/auth/callback.tsx` — Supabase OAuth redirect target

**Outgoing:**
- Wompi redirect-back to `redirectUrl` (configured per booking) handled by `pages/pago-resultado.tsx`

**No server-to-server webhooks** in this Next app — Wompi webhook reception (transaction confirmation) is the legacy Render API's responsibility.

---

*Integration audit: 2026-04-25 — Three-backend topology documented; Supabase ↔ legacy token-shape mismatch flagged for the architecture review.*
