# State: La Perla

**Project:** La Perla / TourMarta
**Initialized:** 2026-04-25
**Last updated:** 2026-04-27 (Phase 1 scaffold complete)

## Project Reference

**Core Value:** Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.

**Current focus:** Phase 1 (Estabilizacion launch) tiene scaffold completo de los 5 planes en codigo. Falta ejecucion en infra (deploy de migrations a Supabase, deploy de Edge Functions, configurar secrets, npm install de devDeps, smoke test con plata real). Launch del 2026-04-26 NO ocurrio - estamos pre-launch real.

**Source documents:**
- `.planning/PROJECT.md` — domain rules, monetization, scope, constraints
- `.planning/ROADMAP.md` — 4 phases mapped from 88 v1 requirements
- `.planning/REQUIREMENTS.md` — full v1 requirement list with traceability
- `.planning/research/SUMMARY.md` — synthesized research
- `.planning/codebase/` — current state audit (brownfield)
- `.planning/phases/phase-1-estabilizacion-launch/PHASE.md` — fase actual scaffolded

## Current Position

**Milestone:** Estabilizacion + crecimiento + marketplace v2 + mobile (pre-launch real)
**Phase:** 1 (Estabilizacion launch) — scaffold completo, falta integracion
**Plan:** Todos los 5 planes con scaffold de codigo escritos
**Status:** Code scaffolded, ready para integracion infra + smoke tests

**Progress:**
```
Phase 1 ██████████ 5/5 plans scaffolded, 0/5 deployed
Phase 2 ░░░░░░░░░░ 0/0 plans (not planned)
Phase 3 ░░░░░░░░░░ 0/0 plans (not planned)
Phase 4 ░░░░░░░░░░ 0/0 plans (not planned)
Overall: 25% (Phase 1 scaffolded; falta integracion + Phases 2-4)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements total | 88 |
| Mapped to phases | 88 (100%) |
| Phases planned | 1/4 |
| Plans scaffolded | 5/5 (Phase 1) |
| Plans deployed | 0/5 |
| Lines of scaffolded code | ~3,400 (SQL + TS + tests + workflows) |
| Tests written | 4 archivos (RLS, idempotency, state machine, pricing) |
| Migrations | 10 (001-010) |
| Edge Functions | 2 (wompi-webhook, issue-invoice) |
| Coverage actual | 0% (tests escritos pero no ejecutados aun) |

## Accumulated Context

### Decisions Made

| Decision | Rationale | Source |
|----------|-----------|--------|
| 4 macro-phases | Match research SUMMARY.md ordering + traceability | ROADMAP 2026-04-25 |
| DIAN Modelo B | Operador ya tiene RUT, mas simple | research/PITFALLS.md #12 |
| Stack Next 16 + Supabase + Wompi | Recien upgradeado | PROJECT.md |
| Pago instant al jalador en mes 1-3 | Friccion cultural de hold | research/PITFALLS.md #6 |
| Mobile defer a Phase 4 | Necesita data layer consolidado | SUMMARY.md |
| Multinivel referrals defer a v2 | Requiere abogado SuperSociedades | PITFALLS.md #15 |
| Phase 1 decompuesta en 5 planes | Granularidad 3-7d/plan + paralelizable | Phase 1 planning |
| Plan 1 sin negociacion primero | Schema + RLS + CI son fundacion | Phase 1 planning |
| Plan 5 paralelo a Plan 2 | Archivos disjuntos | Phase 1 planning |
| Platform fee default 8% | Medio del rango 5-10% | Phase 1 scaffolding |
| Saldo negativo permitido -$50K COP | Research recomendado | PITFALLS.md #18 |
| Hold-period 24h post-tour | Balance proteccion vs friccion | Plan 3 PLAN.md |
| Migrations 001-010 numeradas | Mas legible que timestamp Supabase | Plan 1 |
| FORCE ROW LEVEL SECURITY | Defensa adicional contra owners | Plan 1 |
| `auth.jwt()->>role` para get_user_role() | Requiere JWT hook en Supabase | Plan 1 |
| Append-only ledger por ausencia de UPDATE policy | RLS = denegado por defecto | Plan 1 |
| SELECT FOR UPDATE en update_booking_status | Previene race conditions concurrentes | Plan 2 |
| pending_invoices con FOR UPDATE SKIP LOCKED | Procesamiento concurrente sin duplicados | Plan 4 |
| Trigger AFTER UPDATE para enqueue invoice | Webhook decoupled, side effects centralizados | Plan 4 |
| Backoff exponencial 5x para Alegra retries | 1m, 5m, 25m, 2h, 10h max 12h | Plan 4 |
| GPG AES256 para backups | Standard fuerte, passphrase via secret | Plan 5 |
| R2 storage para backups | Egress gratis si necesitamos restaurar a multi-destino | Plan 5 |

### Active Todos

**DECISIONES HUMANAS PENDIENTES (bloquean ejecucion / deploy):**
- [ ] Confirmar % platform fee La Perla (recomendado 8% en Plan 3)
- [ ] Confirmar Modelo B factura DIAN
- [ ] Confirmar Alegra como proveedor de facturacion
- [ ] Confirmar hold-p