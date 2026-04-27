# Plan 1: db-foundation-schema-and-rls

**Phase:** 1 (Estabilizacion launch)
**Status:** Not started
**Estimated effort:** 4-5 dias
**Depends on:** Nothing (primer plan)
**Created:** 2026-04-27

## Goal

Dejar montado el schema base de Supabase (`bookings`, `commissions`, `commission_ledger`, `webhook_events`, `booking_status_history`) con RLS activo por defecto y testing infra (Vitest + Playwright + GitHub Actions) corriendo en CI antes de que cualquier otro plan toque codigo de plata. Sin esto, los demas planes construyen sobre arena.

## Requirements covered (10)

BKG-01, BKG-03, COM-01, COM-03, COM-04, SEC-04, SEC-05, SEC-06, TST-01, TST-06

## Deliverables

### Migrations
- `supabase/migrations/001_init_schema.sql`
  - Tabla `bookings` con `status` enum (`pending`, `paid`, `confirmed`, `completed`, `canceled`, `refunded`, `disputed`, `reviewed`)
  - Tabla `booking_status_history(booking_id, from_status, to_status, changed_at, changed_by)`
  - Tabla `commissions(tour_id, jalador_pct, platform_pct, operator_pct, effective_from)`
  - Tabla `commission_ledger(id, booking_id, jalador_id, entry_type ENUM('accrual','release','reversal'), amount, created_at)`
  - Tabla `webhook_events(event_id PK, checksum, received_at, processed_at, payload jsonb)`
- `supabase/migrations/002_enable_rls.sql`
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en TODAS las tablas
  - Policies por rol (tourist, jalador, operator, admin)
- `supabase/migrations/003_audit_helpers.sql`
  - View `rls_audit` que retorna tablas sin RLS

### Testing infra
- `vitest.config.ts`
- `playwright.config.ts`
- `tests/setup.ts`
- `tests/rls/tenant-isolation.test.ts` — operador A consulta bookings de B y verifica `[]`
- `.github/workflows/ci.yml` — `tsc --noEmit` + `eslint` + `vitest run` + `playwright test` en cada PR

### Lib
- `lib/supabase-admin.ts` — client `service_role` SOLO para Edge Functions (con guard de `typeof window === 'undefined'`)

## Success Criteria

1. `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` retorna `0`.
2. `vitest run` corre verde en CI con minimo 1 test de RLS por tabla nueva.
3. GitHub Action bloquea merge si tsc/eslint/vitest fallan.
4. `service_role` key NO aparece en grep del cliente: `grep -r SUPABASE_SERVICE_ROLE_KEY pages/ components/ lib/` solo en `lib/supabase-admin.ts`.
5. Migracion corre limpia en Supabase Pro y en CI con `supabase db reset`.

## Test Gates

Minimo 4 tests RLS verdes en CI (1 por rol critico) + smoke test que toda migracion aplica clean.

## Key Risks

- **CRITICAL #10** RLS leak entre tenants → mitigado por ENABLE RLS por defecto + tests automatizados de aislamiento en CI + audit periodico via `rls_audit` view
- **CRITICAL #19** Backups no probados → este plan no lo resuelve directamente pero deja el schema en orden para que Plan 5 (backups) opere sobre fundacion estable

## Implementation Notes

- Empezar con `supabase init` si no esta hecho ya en el repo. Si la carpeta `supabase/` no existe, crear estructura.
- `bookings.status` enum debe matchear el state machine que define Plan 2 — coordinar antes de freezear.
- RLS policies deben ser permissive primero, restrictive solo donde haga sentido. Test antes de marcar done.
- `commission_ledger` es append-only conceptualmente. Aunque PostgreSQL no impide UPDATEs, dejar comentario en schema y revisar via RLS que solo `service_role` puede mutar.
- `webhook_events.payload` jsonb — incluir indice GIN solo si los queries lo requieren (probable en Plan 2 para debugging).

## Open Questions

- Estructura exacta del enum `entry_type` del ledger: `accrual`, `release`, `reversal` cubre el caso base. Para Phase 3 (cancelaciones) habra `partial_refund_release` y `dispute_hold`. Decision: dejarlo abierto en Phase 1 con CHECK constraint en string, migrar a enum solo si performance lo pide.

## Definition of Done

- [ ] 3 migrations corren clean en local + CI
- [ ] RLS audit view retorna 0 tablas
- [ ] 4+ tests RLS verdes
- [ ] CI workflow gate bloqueante
- [ ] `lib/supabase-admin.ts` con guard server-only
- [ ] PR mergeada a `main`
- [ ] Smoke test: levantar `supabase db reset` desde cero y verificar todo aplica

---
*Plan 1 creado: 2026-04-27*
