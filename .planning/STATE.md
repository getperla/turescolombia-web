# State: La Perla

**Project:** La Perla / TourMarta
**Initialized:** 2026-04-25
**Last updated:** 2026-04-25

## Project Reference

**Core Value:** Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.

**Current focus:** Roadmap recien creado — pendiente plan de Phase 1 (Estabilizacion launch). Launch beta es manana 2026-04-26.

**Source documents:**
- `.planning/PROJECT.md` — domain rules, monetization, scope, constraints
- `.planning/ROADMAP.md` — 4 phases mapped from 88 v1 requirements
- `.planning/REQUIREMENTS.md` — full v1 requirement list with traceability
- `.planning/research/SUMMARY.md` — synthesized research (stack, features, architecture, pitfalls)
- `.planning/codebase/` — current state audit (brownfield)

## Current Position

**Milestone:** Post-launch hardening + crecimiento + marketplace v2 + mobile
**Phase:** None active yet (roadmap drafted, awaiting plan-phase 1)
**Plan:** None active
**Status:** Roadmap created, ready for `/gsd:plan-phase 1`

**Progress:**
```
Phase 1 ░░░░░░░░░░ 0/0 plans
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
| Phases planned | 0 |
| Phases complete | 0 |
| Tests written | 0 (TST-01..06 in Phase 1) |
| Coverage | 0% baseline (target 50% by Phase 2 end, 80% by Phase 3 end) |
| Research dimensions | 4 (STACK, FEATURES, ARCHITECTURE, PITFALLS) |
| Pitfalls identified | 20 (with severity + phase mapping) |

## Accumulated Context

### Decisions Made

| Decision | Rationale | Source |
|----------|-----------|--------|
| 4 macro-phases (no split into 2a/2b) | Match research SUMMARY.md ordering rationale + REQUIREMENTS traceability already mapped | ROADMAP creation 2026-04-25 |
| Granularity standard (not coarse/fine) | 4 macro-phases mapping a 88 requirements give natural decomposition; finer grain happens at plan-phase level (3-5 plans per phase) | config.json |
| DIAN Modelo B (operador factura turista, La Perla factura fee) | Mas simple para arrancar; operador ya tiene NIT/RUT, La Perla solo emite N facturas/mes (1 por operador agregada) | research/PITFALLS.md #12 |
| Stack actual se mantiene (Next 16 + Supabase + Wompi + TS 5.5) | Recien upgradeado por sesion paralela; cambiar stack ahora pierde trabajo de Claude Design + suma riesgo pre-launch | PROJECT.md Key Decisions |
| Pago instant al jalador en mes 1-3 (no hold-period) | Friccion cultural de hold = abandono mes 2; switch a hold solo despues de 50+ jaladores activos con comportamiento medido | research/PITFALLS.md #6 |
| Mobile defer a Phase 4 (mes 3-5) | Necesita data layer consolidado (Phase 2) + web bug-free P0 antes de native | research/SUMMARY.md ordering |
| Multinivel referrals defer a v2 | Requiere ledger limpio + abogado SuperSociedades especialista (no ChatGPT, no research web) | research/PITFALLS.md #15 |

### Active Todos

- [ ] `/gsd:plan-phase 1` — decompose Phase 1 (Estabilizacion launch) into executable plans
- [ ] Validar Wompi signature integrity formula contra docs.wompi.co AL MOMENTO de planning Phase 1
- [ ] Validar Modelo A vs B factura electronica con contador colombiano (research flag)
- [ ] Iniciar tramite numero WhatsApp Business verificado (1-2 semanas de aprobacion)
- [ ] Decidir % platform fee exacto (PROJECT.md dice 5-10%, validar contra Wompi 2.99% + IVA + DIAN factura cost)

### Blockers

Ninguno actualmente. Launch beta procede manana segun lo planeado.

**Risk-watch (no blockers todavia, pero requieren atencion):**
- Wompi keys aun en sandbox (`lib/wompi.ts:18` hardcoded SANDBOX_KEY) — primera tarea de Phase 1
- Demo mode sin env gate y sin banner persistente — primera tarea de Phase 1
- 0% test coverage al iniciar — TST-* requirements en Phase 1

### Session Continuity

**Para reanudar trabajo:**
1. Leer `.planning/PROJECT.md` (core value + constraints)
2. Leer `.planning/ROADMAP.md` (phases + success criteria)
3. Leer `.planning/STATE.md` (este archivo — current position)
4. Si hay phase activa: leer `.planning/phases/{phase-name}/PHASE.md`
5. Si hay plan activo: leer `.planning/phases/{phase}/plans/{plan}/PLAN.md`

**Next command:** `/gsd:plan-phase 1`

---
*State initialized: 2026-04-25 after roadmap creation*
