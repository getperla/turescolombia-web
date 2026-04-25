# Technology Stack

**Analysis Date:** 2026-04-25

## Languages

**Primary:**
- TypeScript 5.5 — All app code under `pages/`, `components/`, `lib/` (`tsconfig.json:29`)
- TSX (React) — Page and component files

**Secondary:**
- JavaScript — Config files only (`next.config.js`, `postcss.config.js`)
- CSS — Tailwind 4 entry + globals under `styles/`

## Runtime

**Environment:**
- Node.js v24 (per Juanda's environment, not pinned via `.nvmrc`)
- Next.js dev server with Turbopack (default in Next 16) via `next dev` (`package.json:6`)

**Package Manager:**
- npm (no `pnpm-lock.yaml` / `yarn.lock` present)
- `package-lock.json` expected as lockfile

## Frameworks

**Core:**
- **Next.js 16.2.4** — Pages Router (`pages/` directory), Turbopack dev/build (`package.json:14`)
- **React 18.3.0** — Pinned exact (no caret) (`package.json:15`)
- **React DOM 18.3.0** — Same pin (`package.json:16`)

**Styling:**
- **Tailwind CSS 3.4.19** runtime utility set (`package.json:28`)
- **@tailwindcss/postcss 4.2.2** — Tailwind v4 PostCSS plugin pipeline (`package.json:20`). This is the new Tailwind 4 architecture: PostCSS plugin handles tokens/JIT, `tailwindcss` v3 still provides class names during transition.
- **autoprefixer 10.4.27** + **postcss 8.5.8** — Standard PostCSS chain

**Charts / Data Viz:**
- **Recharts 3.8.1** — Dashboard charts (admin/operator/jalador) (`package.json:17`)

**Linting:**
- **ESLint 9.39.4** — Flat config (no `.eslintrc.*`, uses `eslint.config.*`) (`package.json:25`)
- **eslint-config-next 16.2.4** — Next.js rules pinned to framework version (`package.json:26`)

## Key Dependencies

**Auth & Data:**
- **@supabase/supabase-js 2.103.3** — New auth backend (password, OAuth Google, SMS OTP). Replaces legacy auth flows for new users (`package.json:13`, `lib/supabase.ts:1`).

**Payments:**
- No SDK package — **Wompi** integrated via direct REST + checkout URL redirect, no npm dep (`lib/wompi.ts`). Widget script loaded dynamically from `https://checkout.wompi.co/widget.js` (`lib/wompi.ts:62`).

**HTTP:**
- **No axios** — fully replaced by native `fetch` in a custom wrapper at `lib/api.ts:60`. Returns `{ data, status }` to keep call sites compatible with the prior axios shape.

## TypeScript Configuration

**Strictness (`tsconfig.json`):**
- `strict: true` — Full strict mode (`tsconfig.json:11`)
- `forceConsistentCasingInFileNames: true` (`tsconfig.json:12`)
- `noEmit: true` — Next compiles, tsc only type-checks (`tsconfig.json:13`)
- `isolatedModules: true` — Required by SWC/Turbopack (`tsconfig.json:18`)
- `target: es5`, `module: esnext`, `moduleResolution: bundler` (`tsconfig.json:3,15,16`)
- `jsx: react-jsx` — New JSX transform (`tsconfig.json:19`)

**Path aliases:**
- `@/*` → `./*` (project root) (`tsconfig.json:21-25`)

**Build incrementality:**
- `incremental: true` with `tsconfig.tsbuildinfo` committed-but-dirty in repo (`tsconfig.json:20`)

## Build Tooling

**Bundler:**
- **Turbopack** (Next 16 default) for both `next dev` and `next build` (`package.json:6-8`)
- Bundle analysis: `npm run analyze` → `next build --experimental-analyze` (`package.json:10`)

**Next config (`next.config.js`):**
- `reactStrictMode: true` (`next.config.js:3`)
- `compress: true` — gzip/brotli responses (`next.config.js:5`)
- `poweredByHeader: false` (`next.config.js:7`)
- `images.formats: ['image/avif', 'image/webp']` with 60-day cache (`next.config.js:20-22`)
- Allowed remote image hosts: `images.unsplash.com`, `*.supabase.co` (`next.config.js:9-18`)
- `experimental.optimizePackageImports: ['recharts', '@supabase/supabase-js']` — tree-shake heavy deps (`next.config.js:25-27`)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options=SAMEORIGIN, Referrer-Policy, Permissions-Policy (`next.config.js:28-40`)

## Configuration Files

**Project root:**
- `package.json` — Deps + scripts
- `tsconfig.json` — TypeScript config (strict, path aliases)
- `next.config.js` — Next.js config (images, headers, experimental flags)
- `postcss.config.js` — PostCSS pipeline (Tailwind 4 plugin + autoprefixer)
- `.env.example` — Sanitized env var template (NOT secrets)
- `.eslintrc` — Flat config (ESLint 9)

**Generated / committed:**
- `tsconfig.tsbuildinfo` — Incremental TS build cache (currently dirty in working tree)

## Platform Requirements

**Development:**
- Node 20+ (Next 16 requirement)
- Modern browser for dev (Turbopack HMR)
- Git Bash on Windows (per user platform)

**Production:**
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

---

*Stack analysis: 2026-04-25 — Next 16 upgrade reflected, axios removal confirmed, three backends (Supabase + legacy Render + mock) coexist.*
