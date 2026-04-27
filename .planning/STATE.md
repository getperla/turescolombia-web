# State: La Perla

**Project:** La Perla / TourMarta
**Initialized:** 2026-04-25
**Last updated:** 2026-04-27

## Project Reference

**Core Value:** Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.

**Current focus:** Phase 1 (Estabilizacion launch) descompuesta en 5 planes ejecutables. Pendiente decisiones humanas (10 items) antes de arrancar Plan 1. Launch beta del 2026-04-26 NO ocurrio — estamos pre-launch, no post-launch.

**Source documents:**
- `.planning/PROJECT.md` — domain rules, monetization, scope, constraints
- `.planning/ROADMAP.md` — 4 phases mapped from 88 v1 requirements
- `.planning/REQUIREMENTS.md` — full v1 requirement list with traceability
- `.planning/research/SUMMARY.md` — synthesized research (stack, features, architecture, pitfalls)
- `.planning/codebase/` — current state audit (brownfield)
- `.planning/phases/phase-1-estabilizacion-launch/PHASE.md` — fase actual planeada

## Current Position

**Milestone:** Post-launch hardening + crecimiento + marketplace v2 + mobile (NOTA: pre-launch real, ver context note arriba)
**Phase:** 1 (Estabilizacion launch) — planeada, no iniciada
**Plan:** None active todavia (5 planes drafted, esperando decisiones humanas)
**Status:** Phase 1 planeada (5 planes), ready to start Plan 1 once human decisions taken

**Progress:**
```
Phase 1 ████░░░░░░ 5/5 plans planeados, 0/5 ejecutados
Phase 2 ░░░░░░░░░░ 0/0 plans
Phase 3 ░░░░░░░░░░ 0/0 plans
Phase 4 ░░░░░░░░░░ 0/0 plans
Overall: 0% (0/4 phases complete)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements total | 88 |
| Mapped to phases | 88 (100%) |
| Phases planned | 1/4 (25%) |
| Phases complete | 0 |
| Plans drafted | 5 (Phase 1) |
| Plans executed | 0 |
| Tests written | 0 (TST-01..06 distribuidos en Plan 1, 2, 5) |
| Coverage | 0% baseline (target 50% by end of Phase 2, 80% by end of Phase 3) |
| Research dimensions | 4 (STACK, FEATURES, ARCHITECTURE, PITFALLS) |
| Pitfalls identified | 20 (with severity + phase mapping) |

## Accumulated Context

### Decisions Made

| Decision | Rationale | Source |
|----------|-----------|--------|
| 4 macro-phases (no split into 2a/2b) | Match research SUMMARY.md ordering rationale + REQUIREMENTS traceability already mapped | ROADMAP creation 2026-04-25 |
| Granularity standard | 4 macro-phases mapping a 88 requirements give natural decomposition; finer grain happens at plan-phase level | config.json |
| DIAN Modelo B (operador factura turista, La Perla factura fee) | Mas simple para arrancar; operador ya tiene NIT/RUT | research/PITFALLS.md #12 |
| Stack actual se mantiene (Next 16 + Supabase + Wompi + TS 5.5) | Recien upgradeado, cambiar stack ahora pierde trabajo | PROJECT.md Key Decisions |
| Pago instant al jalador en mes 1-3 (no hold-period) | Friccion cultural de hold = abandono mes 2 | research/PITFALLS.md #6 |
| Mobile defer a Phase 4 (mes 3-5) | Necesita data layer consolidado (Phase 2) + web bug-free P0 antes de native | research/SUMMARY.md ordering |
| Multinivel referrals defer a v2 | Requiere ledger limpio + abogado SuperSociedades especialista | research/PITFALLS.md #15 |
| **Phase 1 decompuesta en 5 planes (no 3, no 7)** | 5 planes balancean granularidad (3-7 dias por plan) con paralelizabilidad (Plan 5 corre paralelo a 2-4) | Phase 1 planning 2026-04-27 |
| **Plan 1 (db-foundation) sin negociacion primero** | Schema + RLS + CI son fundacion; sin esto los otros planes construyen sobre arena | Phase 1 planning 2026-04-27 |
| **Plan 5 (observability) puede correr paralelo a Plan 2** | Toca archivos disjuntos; cuando Plan 2 prueba con plata real, Sentry ya captura | Phase 1 planning 2026-04-27 |

### Active Todos

**DECISIONES HUMANAS PENDIENTES (bloquean ejecucion de Phase 1):**
- [ ] Confirmar % platform fee La Perla (recomendado 8%)
- [ ] Confirmar Modelo B factura DIAN
- [ ] Confirmar Alegra como proveedor de facturacion (vs Siigo)
- [ ] Confirmar hold-period jalador 24h (vs instant 0h)
- [ ] Confirmar saldo negativo permitido del jalador hasta -$50K COP
- [ ] Verificar estado de cuenta Wompi prod (KYC aprobado? events_secret en mano?)
- [ ] Contactar abogado especialista para T&C jalador
- [ ] Decidir quien hace primera prueba con plata real ($5K COP)
- [ ] Confirmar Supabase Edge Functions como host del webhook (vs Vercel API route)
- [ ] Confirmar Supa