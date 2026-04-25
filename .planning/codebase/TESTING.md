# Testing Patterns

**Analysis Date:** 2026-04-25

## Honest Assessment

**Coverage level: ZERO.**

There is no test infrastructure in this project. No unit tests, no integration tests, no E2E tests, no visual regression, no CI test job. Launch is tomorrow (2026-04-26) and the only safety net is manual QA + the demo-mode mock layer.

This is a deliberate trade-off given the timeline. It is also a top-priority item for the post-launch backlog (see `CONCERNS.md`).

## Test Framework

**Runner:** None installed.

`package.json:19-30` (devDependencies):
- No `jest`, no `vitest`, no `@testing-library/*`, no `playwright`, no `cypress`, no `mocha`.
- No `@types/jest`, no `ts-jest`, no `jest-environment-jsdom`.

**Assertion library:** None.

**Test config files:** None present (`jest.config.*`, `vitest.config.*`, `playwright.config.*` all absent).

## Run Commands

`package.json:5-11` defines no test script:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "analyze": "next build --experimental-analyze"
}
```

There is no `test`, `test:watch`, `test:coverage`, `test:e2e`, or `test:ci` entry. Running `npm test` would invoke npm's default no-op error.

## Test File Organization

**Location:** N/A — no test files exist in app code.

**Glob results outside `node_modules`:**
- `**/*.test.*` → 0 matches in app code (all hits are inside `node_modules/`).
- `**/*.spec.*` → 0 matches in app code.
- `**/__tests__/**` → 0 matches in app code.

**Naming convention:** Not established. When tests are added, recommended pattern (per `~/.claude/rules/typescript/testing.md`):
- Co-locate as `Component.test.tsx` next to `Component.tsx`, **or**
- Group under `__tests__/` per feature folder.
- E2E tests under `e2e/` at the repo root.

## Test Structure

Not applicable — no suites exist. When the first tests land, they should follow the standard Vitest/Jest shape:

```typescript
describe('Feature', () => {
  beforeEach(() => { /* setup */ });
  it('does X when Y', () => { expect(...).toBe(...); });
});
```

## Mocking

**Framework:** None installed for unit testing.

**De facto runtime mock layer:** `lib/mockData.ts` (29 KB) intercepted by `lib/api.ts:45-52` whenever `localStorage.getItem('turescol_token') === 'beta-demo-token'`. This is **a production demo-mode feature, not a test fixture**, but in practice it is what is currently exercising the UI in lieu of tests.

```typescript
// lib/api.ts:47-52
if (isDemoModeFast()) {
  const { getMockResponse } = await import('./mockData');
  const url = buildUrl(path, config?.params);
  await new Promise((r) => setTimeout(r, 120));
  return { data: getMockResponse(method.toLowerCase(), url) as T, status: 200 };
}
```

When real tests are added, this same `mockData` module can be reused as a fixture source (extract `getMockResponse` cases as factories).

**What to mock (when tests arrive):**
- The `request()` helper in `lib/api.ts:39-78` — intercept at the fetch boundary using MSW or a manual `jest.mock('../lib/api')`.
- `lib/supabase.ts:11` — mock `createClient` since both Supabase and the custom JWT flow can be active depending on env.
- `localStorage` — JSDOM provides it, but expect to seed `turescol_token`, `turescol_user`, `laperla_beta`, `laperla_favorites` per scenario.

**What NOT to mock:**
- Pure utility functions (`buildUrl`, `isDemoModeFast`) — test them directly.
- React hooks like `useFavorites` — render them with `@testing-library/react`'s `renderHook`.

## Fixtures and Factories

**Location:** No formal fixtures directory.

**Source of truth for sample data:** `lib/mockData.ts` (the same file the demo mode uses). It contains hand-curated tours, jaladores, operators, bookings, and reviews matching backend seed data.

When introducing tests, do **not** duplicate this data — re-export typed slices from `mockData.ts` or move the canonical fixtures to `lib/fixtures/` and have `mockData.ts` import them.

## Coverage

**Requirements:** None enforced. The 80% target from `~/.claude/rules/common/testing.md` applies in principle but is currently 0%.

**View coverage:** N/A.

## Test Types

**Unit Tests:**
- Scope: none.
- Highest-leverage targets when work begins: `lib/api.ts` (URL builder, demo-mode toggle, error parsing), `lib/useFavorites.ts` (cache + toggle), `lib/auth.tsx` (`useRequireAuth` redirect logic).

**Integration Tests:**
- Scope: none.
- Targets: `pages/login.tsx` (Supabase + JWT dual path), `pages/explorar.tsx` (filter/sort/debounce), `BetaGate` role-switch flow.

**E2E Tests:**
- Framework: none. Recommendation per `~/.claude/rules/typescript/testing.md` is **Playwright**.
- Critical user flows that need coverage first:
  1. Beta gate role selection → land on correct dashboard.
  2. Tourist explore → tour detail → reservation → Wompi redirect.
  3. Jalador deep link `/j/[refCode]/[tour]` → reservation attribution.
  4. Operator login → create tour → set availability.
  5. Admin login → list jaladores/operators → edit modal.

**Visual Regression:**
- None.
- Per `~/.claude/rules/web/testing.md`, Playwright screenshots at 320 / 768 / 1024 / 1440 would catch most layout regressions, especially relevant given the heavy use of inline hex styles where Tailwind tokens would normally provide consistency guarantees.

**Accessibility Tests:**
- None automated. ESLint provides static a11y rules via `eslint-config-next/core-web-vitals` (`eslint.config.mjs:7`), which is the only current safety net.

## CI Test Configuration

**File:** None discovered.
- No `.github/workflows/`, no `.gitlab-ci.yml`, no `circleci/`, no `azure-pipelines.yml` at the repo root.
- Vercel handles deploy previews on push, but Vercel only runs `next build` (via `package.json:7`); it does not run tests because no test script exists.

**Implication:** the current "CI" is just `next build` succeeding. Type errors fail the build (strict mode), lint errors do **not** fail the build by default in Next 16 unless `eslint.ignoreDuringBuilds` is set explicitly.

## Common Patterns (When Tests Arrive)

**Async testing template:**
```ts
it('throws ApiError on 4xx', async () => {
  await expect(api.get('/missing')).rejects.toBeInstanceOf(ApiError);
});
```

**Error testing template:**
```ts
it('falls back to Spanish message when no err.response.data.message', () => {
  // render login page, mock api.post to throw plain Error, assert UI shows
  // 'Correo o contraseña incorrectos.'
});
```

**Hook testing template:**
```ts
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from '@/lib/useFavorites';

it('toggles tour id in/out of favorites', () => {
  const { result } = renderHook(() => useFavorites());
  act(() => result.current.toggle(42));
  expect(result.current.isFavorite(42)).toBe(true);
});
```

## Recommended First-Test PR (post-launch)

1. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitest/coverage-v8`.
2. Add `vitest.config.ts` with `environment: 'jsdom'` and path alias `@` → repo root (mirror `tsconfig.json:21-25`).
3. Add scripts: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`.
4. First three tests:
   - `lib/api.test.ts` → `buildUrl` URL composition + ApiError shape.
   - `lib/useFavorites.test.ts` → toggle, cache, count.
   - `components/BetaGate.test.tsx` → renders gate when no token, hides gate with token.
5. Add a Playwright smoke test for the beta-gate → tourist dashboard flow before any future deploy.

---

*Testing analysis: 2026-04-25*
