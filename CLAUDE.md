<!-- GSD:project-start source:PROJECT.md -->
## Project

**La Perla**

La Perla es la plataforma que digitaliza el turismo informal de Santa Marta — la "Airbnb del turismo" para el Caribe colombiano. Conecta cuatro actores que ya existen y mueven millones en el mercado real: turistas (clientes finales), jaladores (vendedores comisionistas en la calle), operadores (agencias de tours) y la plataforma misma. El producto convierte la tiquetera física tradicional (libreta con originales y copias) en un sistema digital con trazabilidad, pagos integrados y comisiones automáticas.

**Core Value:** **Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.** Si esto no es cierto y simple en el flujo del jalador, el producto no tiene razón de existir. Todo lo demás (panel admin, reportes, marketing) es secundario.

### Constraints

- **Timeline**: Launch beta el 2026-04-26 ya está en pie. Estabilización urgente las primeras 2-3 semanas. Resto del milestone se distribuye en 4-5 meses.
- **Tech stack**: Next.js 16 + Supabase + Vercel + Wompi (Colombia). Cambios de stack requieren justificación fuerte — la base es sólida y reciente.
- **Budget**: Desconocido formalmente; asumir restricciones de bootstrap. Servicios SaaS deben ser gratis o muy baratos (Vercel Hobby, Supabase Free → Pro cuando justifique, Wompi sin minimum monthly).
- **Localización**: Producto pensado 100% para Santa Marta + región Magdalena en v1. Geografía y moneda fijas (COP).
- **Equipo**: 1 dev. No hay PM, QA, designer dedicado. Diseño y QA los hace el dev con apoyo de IA.
- **Compliance**: Pagos requieren cumplir con regulación financiera colombiana (Wompi se encarga del KYC del operador, pero La Perla debe tener claros los términos de servicio y manejo de fondos).
- **Sin tests**: Coverage actual es 0%. Cualquier feature nuevo en este milestone debe nacer con tests al menos del flujo crítico.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.5 — All app code under `pages/`, `components/`, `lib/` (`tsconfig.json:29`)
- TSX (React) — Page and component files
- JavaScript — Config files only (`next.config.js`, `postcss.config.js`)
- CSS — Tailwind 4 entry + globals under `styles/`
## Runtime
- Node.js v24 (per Juanda's environment, not pinned via `.nvmrc`)
- Next.js dev server with Turbopack (default in Next 16) via `next dev` (`package.json:6`)
- npm (no `pnpm-lock.yaml` / `yarn.lock` present)
- `package-lock.json` expected as lockfile
## Frameworks
- **Next.js 16.2.4** — Pages Router (`pages/` directory), Turbopack dev/build (`package.json:14`)
- **React 18.3.0** — Pinned exact (no caret) (`package.json:15`)
- **React DOM 18.3.0** — Same pin (`package.json:16`)
- **Tailwind CSS 3.4.19** runtime utility set (`package.json:28`)
- **@tailwindcss/postcss 4.2.2** — Tailwind v4 PostCSS plugin pipeline (`package.json:20`). This is the new Tailwind 4 architecture: PostCSS plugin handles tokens/JIT, `tailwindcss` v3 still provides class names during transition.
- **autoprefixer 10.4.27** + **postcss 8.5.8** — Standard PostCSS chain
- **Recharts 3.8.1** — Dashboard charts (admin/operator/jalador) (`package.json:17`)
- **ESLint 9.39.4** — Flat config (no `.eslintrc.*`, uses `eslint.config.*`) (`package.json:25`)
- **eslint-config-next 16.2.4** — Next.js rules pinned to framework version (`package.json:26`)
## Key Dependencies
- **@supabase/supabase-js 2.103.3** — New auth backend (password, OAuth Google, SMS OTP). Replaces legacy auth flows for new users (`package.json:13`, `lib/supabase.ts:1`).
- No SDK package — **Wompi** integrated via direct REST + checkout URL redirect, no npm dep (`lib/wompi.ts`). Widget script loaded dynamically from `https://checkout.wompi.co/widget.js` (`lib/wompi.ts:62`).
- **No axios** — fully replaced by native `fetch` in a custom wrapper at `lib/api.ts:60`. Returns `{ data, status }` to keep call sites compatible with the prior axios shape.
## TypeScript Configuration
- `strict: true` — Full strict mode (`tsconfig.json:11`)
- `forceConsistentCasingInFileNames: true` (`tsconfig.json:12`)
- `noEmit: true` — Next compiles, tsc only type-checks (`tsconfig.json:13`)
- `isolatedModules: true` — Required by SWC/Turbopack (`tsconfig.json:18`)
- `target: es5`, `module: esnext`, `moduleResolution: bundler` (`tsconfig.json:3,15,16`)
- `jsx: react-jsx` — New JSX transform (`tsconfig.json:19`)
- `@/*` → `./*` (project root) (`tsconfig.json:21-25`)
- `incremental: true` with `tsconfig.tsbuildinfo` committed-but-dirty in repo (`tsconfig.json:20`)
## Build Tooling
- **Turbopack** (Next 16 default) for both `next dev` and `next build` (`package.json:6-8`)
- Bundle analysis: `npm run analyze` → `next build --experimental-analyze` (`package.json:10`)
- `reactStrictMode: true` (`next.config.js:3`)
- `compress: true` — gzip/brotli responses (`next.config.js:5`)
- `poweredByHeader: false` (`next.config.js:7`)
- `images.formats: ['image/avif', 'image/webp']` with 60-day cache (`next.config.js:20-22`)
- Allowed remote image hosts: `images.unsplash.com`, `*.supabase.co` (`next.config.js:9-18`)
- `experimental.optimizePackageImports: ['recharts', '@supabase/supabase-js']` — tree-shake heavy deps (`next.config.js:25-27`)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options=SAMEORIGIN, Referrer-Policy, Permissions-Policy (`next.config.js:28-40`)
## Configuration Files
- `package.json` — Deps + scripts
- `tsconfig.json` — TypeScript config (strict, path aliases)
- `next.config.js` — Next.js config (images, headers, experimental flags)
- `postcss.config.js` — PostCSS pipeline (Tailwind 4 plugin + autoprefixer)
- `.env.example` — Sanitized env var template (NOT secrets)
- `.eslintrc` — Flat config (ESLint 9)
- `tsconfig.tsbuildinfo` — Incremental TS build cache (currently dirty in working tree)
## Platform Requirements
- Node 20+ (Next 16 requirement)
- Modern browser for dev (Turbopack HMR)
- Git Bash on Windows (per user platform)
- Vercel-style Node deployment target
- `NEXT_PUBLIC_*` env vars baked at build time
- Real Supabase project (auth backend) + legacy Render API (data) both reachable
## Scripts (`package.json:5-11`)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Local dev server (Turbopack) |
| `build` | `next build` | Production build (Turbopack) |
| `start` | `next start` | Run production build |
| `lint` | `eslint .` | Flat-config ESLint |
| `analyze` | `next build --experimental-analyze` | Bundle analysis |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript Strictness
- `"strict": true` (`tsconfig.json:11`) — full strict mode (noImplicitAny, strictNullChecks, etc.)
- `"target": "es5"` (`tsconfig.json:3`) — wide browser compatibility
- `"jsx": "react-jsx"` (`tsconfig.json:19`) — automatic runtime, no need to import React
- `"moduleResolution": "bundler"` (`tsconfig.json:16`) — modern Next 16 default
- `"isolatedModules": true` (`tsconfig.json:18`) — every file must be its own module
- `"forceConsistentCasingInFileNames": true` (`tsconfig.json:12`)
- Path alias: `@/*` → project root (`tsconfig.json:21-25`), but in practice the codebase uses **relative imports** (`../lib/api`, `../../components/Layout`), not `@/`.
## Naming Patterns
| Kind | Pattern | Example |
|------|---------|---------|
| Page files | kebab-case `.tsx` | `pages/mis-reservas.tsx`, `pages/pago-resultado.tsx` |
| Page route folders | kebab/lowercase | `pages/dashboard/`, `pages/auth/`, `pages/tour/` |
| Dynamic segments | `[param].tsx` | `pages/tour/[id].tsx`, `pages/j/[refCode]/[tour].tsx` |
| Components | PascalCase `.tsx` | `components/BetaGate.tsx`, `components/Layout.tsx`, `components/Logo.tsx` |
| Hooks | camelCase `use*.ts` | `lib/useFavorites.ts` |
| Library modules | camelCase `.ts` / `.tsx` | `lib/api.ts`, `lib/auth.tsx`, `lib/mockData.ts`, `lib/wompi.ts`, `lib/supabase.ts` |
| Components per file | One default export | `export default function Logo(...)` (`components/Logo.tsx:1`) |
| Local helpers | camelCase functions | `buildUrl`, `isDemoModeFast` (`lib/api.ts:10,28`) |
| Types/interfaces | PascalCase, mostly `type` aliases | `type Tour = {...}` (`lib/api.ts:89`), `type AuthUser = {...}` (`lib/auth.tsx:5`) |
| Storage keys | snake/lowercase string constants | `'turescol_token'`, `'turescol_user'`, `'laperla_beta'`, `'laperla_favorites'` |
## Import Organization
## Component Patterns
## CSS / Styling Approach
- In `tailwind.config.js:9-124` as named scales: `caribe`, `turquesa`, `ambar`, `coral`, `arena`, `verde`, `oscuro`, plus aliases `primary/secondary/accent/brand/sand/palm/ocean`.
- In real code as inline hex strings (`#F5882A`, `#C9A05C`, `#2D6A4F`, `#0D5C8A`, `#222222`, `#717171`, `#EBEBEB`).
## Comment Style
- `// Cache global del estado demo — evita leer localStorage en cada request` (`lib/api.ts:3`)
- `// Demo mode: carga dinamica de mockData SOLO si estamos en demo.` (`lib/api.ts:45-46`)
- `// Modo demo instantaneo: no llamamos al backend para permitir cambio` (`components/BetaGate.tsx:84-85`)
- `// Debounce de busqueda — evita filtrar en cada tecla (300ms)` (`pages/explorar.tsx:44`)
- `// Auto-refresh cada 60s (antes 30s) — reduce carga y re-renders del chart` (`pages/dashboard/admin.tsx:39`)
- `// Demo users — match seed data` (`components/BetaGate.tsx:16`)
- `// Hard navigation forces AuthProvider to re-read localStorage on remount,` (`components/BetaGate.tsx:96-97`)
- `// Single date form` / `// Bulk form` (`pages/dashboard/operator/tours/[id]/disponibilidad.tsx:26,31`)
## Error Handling Patterns
- Custom `ApiError extends Error` (`lib/api.ts:20-26`) carries `response: { data, status }` so callers can read backend error payloads via the same shape Axios used to expose. This is **the** project error contract.
- `request()` throws `ApiError` for non-2xx (`lib/api.ts:71-76`); 2xx always returns `{ data, status }` (`lib/api.ts:77`).
- Body parsing tolerates non-JSON: `try { data = JSON.parse(text); } catch { data = text; }` (`lib/api.ts:69`).
## Async Patterns
- Builds URL via `buildUrl(path, params)` with `URLSearchParams` (`lib/api.ts:28-37`)
- Auto-attaches `Authorization: Bearer <token>` if `turescol_token` is in localStorage (`lib/api.ts:55-58`)
- Auto-stringifies body to JSON
- Returns the **Axios-shaped** envelope `{ data, status }` so existing `const { data } = await api.get(...)` callsites keep working
- Throws `ApiError` with `.response.data.message` for server errors
## ESLint Flat Config
- ESLint **9.39.4** (`package.json:25`)
- `eslint-config-next` **16.2.4** (`package.json:26`) provides `core-web-vitals` preset (Next 16 + React + a11y + perf rules)
- No project-specific overrides yet. No Prettier integration. No import-order plugin.
- **TypeScript-aware linting is implicit** through the Next preset; there's no `@typescript-eslint` block in this config.
## Linter Scripts
- `npm run dev` — `next dev`
- `npm run build` — `next build`
- `npm run start` — `next start`
- `npm run lint` — `eslint .` (no `--fix` flag, no path filter)
- `npm run analyze` — `next build --experimental-analyze` (Next 16 bundle analyzer)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
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
## Data Flow
### Tier 1 — Demo Mock Interceptor (highest priority)
```
```
- **Magic-string sentinel**, not a build flag. Deliberate so a regular user (family/friends) can flip in/out of demo mode at runtime via the `BetaGate` UI without env var rebuilds.
- **Dynamic import** of `./mockData` (`lib/api.ts:48`) so the 29KB mock bundle (357 lines) is only fetched when actually in demo mode. Comment at `lib/api.ts:45-46` explicitly calls this out.
- **120ms artificial latency** to make the demo "feel" like a real network.
- `getMockResponse` is a giant URL/method matcher (`lib/mockData.ts:134-249`) covering: `/dashboard/admin|jalador|operator|tourist`, `/notifications`, `/users/jaladores|operators`, `/reputation/ranking`, `/tours`, `/tours/featured`, `/tours/categories`, `/tours/slug/:slug`, `/tours/:id`, `/bookings/my|operator`, `/bookings`, admin `approve|reject|suspend|reactivate` actions, `/reviews/tour/:id`, `/auth/profile`, `/users/me`. Unknown endpoints return `{}` to avoid crashes.
- `enrichTour` (`lib/mockData.ts:312-357`) hydrates tour-list shapes into the rich detail-page shape with hardcoded includes/excludes/galleries per slug.
### Tier 2 — Legacy Render REST API (real backend for data)
- **Native fetch**, not axios. The error class `ApiError` (`lib/api.ts:20-26`) re-creates an axios-like `error.response.data` shape so callers that still write `err.response?.data?.message` (e.g., `pages/login.tsx:38`) keep working.
- Bearer token from `localStorage.turescol_token` (`lib/api.ts:55-57`).
- Query params built via `URLSearchParams` in `buildUrl` (`lib/api.ts:28-37`).
- Domain endpoints used by the app: `/auth/login`, `/auth/register`, `/auth/magic-login` (jalador refCode + phone), `/auth/profile`, `/tours`, `/tours/:id`, `/tours/slug/:slug`, `/tours/featured`, `/tours/categories`, `/tours/:id/availability[/bulk]`, `/bookings`, `/bookings/my`, `/bookings/operator`, `/bookings/:id/cancel`, `/reviews`, `/reviews/tour/:id`, `/reputation/ranking`, `/users/me`, `/users/jaladores/me`, `/users/jaladores/ref/:refCode`, `/dashboard/admin|jalador|operator`, `/notifications[/count|read-all]`, plus admin `approve|reject|suspend|reactivate` mutations.
### Tier 3 — Supabase (auth only, optional payments table)
## Auth Flow
| Slot | Owner | Purpose |
|------|-------|---------|
| `turescol_token` | All modes | Bearer token (or sentinel `'beta-demo-token'`) |
| `turescol_refresh` | Real login | Optional refresh token from legacy backend |
| `turescol_user` | All modes | JSON-serialized `AuthUser` |
| `laperla_beta` | Demo mode | `{ role, betaMode: true }` payload for the BetaGate |
| `laperla_favorites` | Any mode | Array of tour IDs (separate from auth) |
### Mode A — Email + Password via Supabase (preferred when configured)
```
```
### Mode B — Google OAuth via Supabase
```
```
### Mode C — Phone OTP via Supabase
### Mode D — Legacy backend fallback
### Mode E — Magic login for jaladores
### Mode F — Beta demo "login"
```
```
### AuthProvider + Route Guards
- `AuthProvider` is mounted at `pages/_app.tsx:9`, wraps every route.
- On mount it reads `turescol_token` and `turescol_user` from localStorage and hydrates `user` state (`lib/auth.tsx:33-43`).
- `logout()` (`lib/auth.tsx:57-66`) clears all four slots, invalidates the demo cache, and **hard reloads to `/`** so `BetaGate` reappears.
- `useRequireAuth(allowedRoles?)` (`lib/auth.tsx:89-105`) is the per-page guard: redirects to `/login?redirect=…` if no user, redirects to `/` if role mismatch. Used in `pages/dashboard/admin.tsx:19`, `pages/dashboard/jalador.tsx:11`, etc.
### BetaGate (root-level interception)
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
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->


<!-- USER:engineering-workflow-start -->
## Workflow de Ingeniería (instrucciones del owner)

Cómo Claude Code debe operar en este repo. Estas instrucciones tienen prioridad
sobre cualquier configuración default y deben respetarse en cada sesión.

### Mindset general — Senior Software Engineer

- **Antes de escribir código**, analiza la arquitectura existente. No improvises
  sobre patrones que ya están establecidos.
- **Sigue los patrones del repo** (Next.js Pages Router, Tailwind utilities,
  TypeScript estricto, Supabase Auth). Mira los archivos vecinos antes de
  inventar.
- **TypeScript estricto:** `any` está prohibido. Si un tipo es complejo,
  define una `interface` o `type` y reusa.
- **No borres comentarios existentes** sin razón. Conservan contexto que no
  está en otro lado.
- **Mantén las pruebas actualizadas** cuando se agreguen tests al repo.
  Hoy no hay (`npm run test` no existe), pero al introducirlas, cualquier
  cambio funcional debe actualizar o agregar tests.
- **Antes de un cambio crítico, explica el "porqué".** Lista de cambios
  críticos que requieren explicación previa al usuario:
  - Cálculo de comisiones (`lib/pricing.ts`)
  - Sistema de auth (`lib/auth.tsx`, `lib/supabase.ts`)
  - Sistema de pagos (`lib/wompi.ts`, integración Wompi)
  - Schema de Supabase (cualquier `supabase.from(...)`)
  - Convenciones de diseño (tipografías, paleta, componentes core)

### Tareas específicas

**Refactor.** Optimiza componentes para reducir re-renders y mejorar
legibilidad. Extrae a hooks personalizados cuando la lógica se repite o el
componente pasa de ~200 líneas. No abstrayas prematuramente — 3 usos antes
de extraer.

**Debugging.** Analiza logs de error, busca causa raíz en archivos específicos
(no parches en la superficie). Propón solución que prevenga el edge case en
el futuro. Documenta el bug y el fix en el commit message.

**Documentar.** JSDoc en todas las funciones exportadas de `lib/`.
Comentarios inline solo donde el "por qué" no sea obvio.

**Git commits.** Conventional Commits estricto:
- `feat:`, `fix:`, `chore:`, `docs:`, `perf:`, `refactor:`, `test:`, `style:`
- Scopes opcionales: `(jalador)`, `(auth)`, `(api)`, etc.
- Mensaje en español siempre que sea posible.

### Configuración de tooling

- **`.gitignore` y `.claudeignore`** deben mantenerse pulidos. `node_modules/`,
  `.next/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.claude/` están
  gitignored. Cualquier nuevo artefacto generado debe agregarse.
- **`-y` flag (full auto)** solo para instalaciones de paquetes y scripts
  obvios. Para cualquier comando con efectos en producción (push, merge a main,
  destructivos), pedir confirmación explícita.
- **No usar `<img>` directo.** Siempre `next/image` excepto el lightbox del
  tour-detail (aspect ratio dinámico, ya documentado con eslint-disable).
- **No silenciar errores.** Mínimo `console.error('contexto:', err)`. Nunca
  `catch {}` vacío.

### Workflow paso a paso para tareas grandes

En vez de "haz toda la feature", trabajar en pasos verificables:

1. **Esquematizar** la estructura (componentes, archivos, tablas Supabase si
   aplica). Pedir aprobación antes de codear.
2. **Implementar capa por capa.** Ej: schema → tipos → API → UI.
3. **Verificar después de cada capa.** `npm run build` y `npm run lint`
   deben pasar antes de seguir.
4. **Smoke test runtime.** Levantar dev server y probar las rutas afectadas
   con curl/dev tools antes de declarar terminado.
5. **Commit pequeño y atómico.** Un PR de 800 líneas se vuelve un PR de
   3 PRs de 250 líneas cada uno.

### Reglas inquebrantables ("no hacer")

Estas siguen las del bloque general arriba pero las repito acá:

- **No agregar dependencias nuevas** sin preguntar primero.
- **No tocar el cálculo de comisiones** sin confirmación explícita.
- **No cambiar el sistema de diseño** sin discutirlo.
- **No mergear a `main`** sin luz verde explícita del owner.
- **No introducir capa beta/demo/mock.** Fue eliminada deliberadamente.
- **No silenciar errores** en `catch {}`.
<!-- USER:engineering-workflow-end -->
