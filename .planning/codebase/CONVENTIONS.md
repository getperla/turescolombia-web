# Coding Conventions

**Analysis Date:** 2026-04-25

## TypeScript Strictness

**Config:** `tsconfig.json:1-35`
- `"strict": true` (`tsconfig.json:11`) — full strict mode (noImplicitAny, strictNullChecks, etc.)
- `"target": "es5"` (`tsconfig.json:3`) — wide browser compatibility
- `"jsx": "react-jsx"` (`tsconfig.json:19`) — automatic runtime, no need to import React
- `"moduleResolution": "bundler"` (`tsconfig.json:16`) — modern Next 16 default
- `"isolatedModules": true` (`tsconfig.json:18`) — every file must be its own module
- `"forceConsistentCasingInFileNames": true` (`tsconfig.json:12`)
- Path alias: `@/*` → project root (`tsconfig.json:21-25`), but in practice the codebase uses **relative imports** (`../lib/api`, `../../components/Layout`), not `@/`.

**Pragmatic strictness:** the code uses `any` liberally (e.g. `lib/api.ts:18` `ApiResponse<T = any>`, `pages/dashboard/admin.tsx:20` `useState<any>(null)`). Strict mode catches null/undefined but `any` is not banned.

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

**Type aliases vs. interfaces:** the codebase prefers `type` over `interface` everywhere — see `lib/api.ts:89,128,135,200,244,257`. No `interface` declarations found in app code.

**Storage prefix inconsistency:** auth tokens use `turescol_*` (legacy brand) while beta + favorites use `laperla_*`. Don't normalize without coordination — see `CONCERNS.md`.

## Import Organization

Observed order (e.g. `pages/dashboard/admin.tsx:1-7`, `pages/explorar.tsx:1-7`):

1. React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) from `'react'`
2. Next primitives (`Head`, `Link`, `Image`, `useRouter`, `dynamic`)
3. Local lib imports via **relative paths** (`../lib/api`, `../../lib/auth`)
4. Local components via relative paths (`../components/Layout`)

**No path alias usage in app code.** Even though `@/*` is configured, every file uses relative paths. Stay consistent with relatives unless migrating wholesale.

**No barrel files** (no `index.ts` re-exports). Each module imports the specific thing it needs from a specific file.

## Component Patterns

**Pages:** function component with `default export`, hooks at top, JSX inline. Wrap in `<Layout>` for app shell, plus `<Head>` for per-page meta.

```tsx
// pages/explorar.tsx:22
export default function Explorar() {
  const [allTours, setAllTours] = useState<Tour[]>([]);
  // ...
  return <Layout><Head>...</Head>...</Layout>;
}
```

**Auth gating:** page-level role check via `useRequireAuth(['admin'])` (`pages/dashboard/admin.tsx:19`, defined in `lib/auth.tsx:89`). Returns `{ user, loading, authorized }` and redirects if unauthorized.

**Context provider pattern:** `AuthProvider` wraps app in `pages/_app.tsx:9`. Defined in `lib/auth.tsx:29-82` with `createContext` + `useContext` hook (`useAuth`, `lib/auth.tsx:84`).

**Wrapper / gate pattern:** `BetaGate` at `components/BetaGate.tsx:49` decides whether to render children or the role picker. Same shape: `({ children }: { children: ReactNode }) => JSX`.

**Custom hooks:** state + module-level cache. See `lib/useFavorites.ts:6-18` (global `cachedFavorites` to skip `JSON.parse` on every mount) and `lib/api.ts:4-15` (`cachedDemoMode`). Hooks return objects, not tuples — e.g. `{ favorites, toggle, isFavorite, count }` (`lib/useFavorites.ts:38`).

**Props typed inline:** `function Layout({ children, hideSearch }: { children: React.ReactNode; hideSearch?: boolean })` (`components/Layout.tsx:9`). For multi-prop components a separate `type Foo = {...}` is used.

**Heavy deps lazy-loaded:** Recharts is imported via `next/dynamic` with `ssr: false` (`pages/dashboard/admin.tsx:9-14`). `mockData.ts` is dynamic-imported only when demo mode is active (`lib/api.ts:48`).

## CSS / Styling Approach

**Stack:** Tailwind 3.4 (`package.json:28`) with `@tailwindcss/postcss` 4.2 driver (`package.json:20`). PostCSS + autoprefixer.

> The "Tailwind 4" mention in the upgrade context refers to the **PostCSS plugin v4**; the actual Tailwind compiler in `tailwind.config.js` is still v3-style (`tailwind.config.js:1`, classic JS config with `content`, `theme.extend`, etc.). No `@theme` block, no CSS-first config. Treat this as Tailwind 3 semantics.

**Three-way mix in every component:**

1. **Tailwind utility classes** for layout, spacing, typography:
   `className="min-h-screen flex flex-col items-center justify-center px-4"` (`components/BetaGate.tsx:115`)

2. **Inline `style={{}}` for brand colors** — hex values are hardcoded inline rather than expressed via Tailwind tokens:
   `style={{ color: '#222' }}` (`components/BetaGate.tsx:120`)
   `style={{ background: '#FEF3E8', border: '1px solid #F5882A' }}` (`components/BetaGate.tsx:128`)
   `style={{ borderColor: '#EBEBEB' }}` (`components/Layout.tsx:40`)

3. **Custom `@layer components` classes** in `styles/globals.css:17-77` for repeated buttons/cards: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-coral`, `.card`, `.glass`. Use these for buttons; do not redefine.

**Brand palette is declared twice:**
- In `tailwind.config.js:9-124` as named scales: `caribe`, `turquesa`, `ambar`, `coral`, `arena`, `verde`, `oscuro`, plus aliases `primary/secondary/accent/brand/sand/palm/ocean`.
- In real code as inline hex strings (`#F5882A`, `#C9A05C`, `#2D6A4F`, `#0D5C8A`, `#222222`, `#717171`, `#EBEBEB`).

The Tailwind named scales are mostly **unused at the component level**. The actual styling reaches for inline hex. New components should keep this convention until/unless a token sweep happens.

**Fonts:** loaded via Google Fonts CSS `@import` in `styles/globals.css:1`. Two families: `DM Sans` (sans, default body) and `Cormorant Garamond` (display). Set in `tailwind.config.js:125-128` and applied via inline `fontFamily: '"DM Sans", sans-serif'` at component level (`components/Logo.tsx:19`, `components/BetaGate.tsx:120`).

**Scoped styles via `<style jsx>{...}</style>`:** the pearl logo animations live inside `components/Logo.tsx:25-97`. Use this only for component-local CSS that genuinely cannot be Tailwind-ified (3D radial gradients, keyframes).

## Comment Style

**Spanish (informal Colombian) is the default for inline comments** explaining intent and "why":
- `// Cache global del estado demo — evita leer localStorage en cada request` (`lib/api.ts:3`)
- `// Demo mode: carga dinamica de mockData SOLO si estamos en demo.` (`lib/api.ts:45-46`)
- `// Modo demo instantaneo: no llamamos al backend para permitir cambio` (`components/BetaGate.tsx:84-85`)
- `// Debounce de busqueda — evita filtrar en cada tecla (300ms)` (`pages/explorar.tsx:44`)
- `// Auto-refresh cada 60s (antes 30s) — reduce carga y re-renders del chart` (`pages/dashboard/admin.tsx:39`)

**English comments appear** only for short technical notes or when describing English-named pieces:
- `// Demo users — match seed data` (`components/BetaGate.tsx:16`)
- `// Hard navigation forces AuthProvider to re-read localStorage on remount,` (`components/BetaGate.tsx:96-97`)
- `// Single date form` / `// Bulk form` (`pages/dashboard/operator/tours/[id]/disponibilidad.tsx:26,31`)

**No accents in comments / log strings.** The codebase deliberately strips tildes from comments and many UI strings (`carga dinamica`, `navegacion`, `confirmacion`) because of recurring encoding issues (see commit `2a2b881` — "correccion de tildes"). Keep this convention: **no accented characters in comments**, but UI-visible Spanish copy in JSX *does* use accents (`'Cargando...'`, `'Iniciar sesión'`).

**JSDoc:** rare. One example: `/** Redirect to login if not authenticated */` on `useRequireAuth` (`lib/auth.tsx:88`). Do not introduce JSDoc as a project-wide convention.

## Error Handling Patterns

**API layer (`lib/api.ts`):**
- Custom `ApiError extends Error` (`lib/api.ts:20-26`) carries `response: { data, status }` so callers can read backend error payloads via the same shape Axios used to expose. This is **the** project error contract.
- `request()` throws `ApiError` for non-2xx (`lib/api.ts:71-76`); 2xx always returns `{ data, status }` (`lib/api.ts:77`).
- Body parsing tolerates non-JSON: `try { data = JSON.parse(text); } catch { data = text; }` (`lib/api.ts:69`).

**Page-level pattern** — try/catch with `err: any`, read `err.response?.data?.message`, fallback to a Spanish UI string:
```tsx
// pages/login.tsx:32-40
try {
  const user = await login(loginEmail, loginPassword);
  navigateByRole(user.role);
} catch (err: any) {
  setError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
}
```

**Silent-catch fire-and-forget** for non-critical fetches:
```tsx
// components/Layout.tsx:28
api.get('/notifications/count').then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
```
This pattern (`.catch(() => {})`) is used for telemetry-style or supplementary UI (notifications count, gallery prefetch). Acceptable for now; flagged in `CONCERNS.md`.

**localStorage parsing** is always wrapped:
```tsx
// components/BetaGate.tsx:25-32
try {
  const stored = localStorage.getItem(BETA_KEY);
  if (!stored) return false;
  const parsed = JSON.parse(stored);
  return parsed?.betaMode === true && !!parsed?.role;
} catch { return false; }
```

**`console.log` policy:** zero `console.log/warn/error` in app code (Grep result: 0 matches outside `node_modules`). Keep it that way.

## Async Patterns

**Native `fetch` only** — Axios is gone. The custom `request()` helper in `lib/api.ts:39-78`:
- Builds URL via `buildUrl(path, params)` with `URLSearchParams` (`lib/api.ts:28-37`)
- Auto-attaches `Authorization: Bearer <token>` if `turescol_token` is in localStorage (`lib/api.ts:55-58`)
- Auto-stringifies body to JSON
- Returns the **Axios-shaped** envelope `{ data, status }` so existing `const { data } = await api.get(...)` callsites keep working
- Throws `ApiError` with `.response.data.message` for server errors

**Default API export:** `api.get / api.post / api.put / api.delete` (`lib/api.ts:80-85`). Use these. Do not call `fetch` directly from components.

**Demo-mode interception:** at the top of every `request()` call, if `isDemoModeFast()` returns true, the helper dynamically imports `lib/mockData.ts` and returns a mocked response after a 120ms artificial delay (`lib/api.ts:47-52`). This is critical: the dynamic import keeps the 29 KB mock bundle out of production paths. Don't statically import `mockData`.

**Promise.all for parallel loads:**
```tsx
// pages/explorar.tsx:35-42
Promise.all([
  getTours({ sortBy: 'rating', limit: '100' }),
  getCategories(),
]).then(...).catch(() => {}).finally(() => setLoading(false));
```

**Debouncing via setTimeout in useEffect** (`pages/explorar.tsx:45-48`) — no debounce library.

## ESLint Flat Config

**File:** `eslint.config.mjs:1-10` (ES modules, ESLint 9 flat config). Currently minimal:

```js
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
];

export default config;
```

- ESLint **9.39.4** (`package.json:25`)
- `eslint-config-next` **16.2.4** (`package.json:26`) provides `core-web-vitals` preset (Next 16 + React + a11y + perf rules)
- No project-specific overrides yet. No Prettier integration. No import-order plugin.
- **TypeScript-aware linting is implicit** through the Next preset; there's no `@typescript-eslint` block in this config.

## Linter Scripts

**`package.json:5-11`:**
- `npm run dev` — `next dev`
- `npm run build` — `next build`
- `npm run start` — `next start`
- `npm run lint` — `eslint .` (no `--fix` flag, no path filter)
- `npm run analyze` — `next build --experimental-analyze` (Next 16 bundle analyzer)

**Missing:** no `typecheck`, no `format`, no `lint:fix`. To verify types, run `npx tsc --noEmit` manually. No pre-commit hooks (no Husky / lint-staged in deps).

---

*Convention analysis: 2026-04-25*
