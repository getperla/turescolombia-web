# Phase 1: Estabilizacion launch

**Project:** La Perla / TourMarta
**Phase:** 1 of 4
**Created:** 2026-04-27
**Status:** Planned (5 plans drafted, 0 executed)
**Estimated effort:** 3 semanas (10-15 dias dev efectivos)
**Brownfield context:** Launch beta del 2026-04-26 NO ocurrio. Estamos pre-launch, no post-launch. Esto baja la urgencia de los demo-leak risks (SEC-01..03) porque aun no hay trafico real, pero sube la urgencia de bloquear lo legal y financiero (Wompi prod + DIAN + RNT) ANTES de abrir la valvula.

## Goal

La plataforma opera con dinero real en produccion, observable, idempotente y legalmente blindada — Wompi prod, ledger inmutable, compliance baseline DIAN/RNT/Habeas Data, RLS auditado, demo mode gateado.

## Phase Reference

- **Source roadmap:** `.planning/ROADMAP.md` (Phase 1 section, lineas 23-47)
- **Source requirements:** `.planning/REQUIREMENTS.md` (41 reqs)
- **Source risks:** `.planning/research/PITFALLS.md` (10 critical/high directamente aplicables)

## Requirements covered (41)

PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-09, BKG-01, BKG-02, BKG-03, BKG-04, BKG-05, COM-01, COM-02, COM-03, COM-04, COM-05, COM-06, COM-08, CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06, MOB-12, MOB-13, TST-01, TST-02, TST-03, TST-04, TST-06

## Success Criteria

1. Un turista puede pagar un tour real con tarjeta/PSE/Nequi y la confirmacion llega solo via webhook server-to-server (no via redirect URL), con un E2E test verde corriendo en CI.
2. Enviar el mismo evento Wompi dos veces produce exactamente 1 booking, 1 entry en `commission_ledger` y 1 factura DIAN — verificable con test automatizado del webhook.
3. Un operador autenticado solo ve sus propios bookings/comisiones/tours; intentar consultar data de otro operador retorna vacio. Audit `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` retorna 0.
4. Cada venta cobrada genera factura electronica DIAN automaticamente (Modelo B: operador factura turista, La Perla factura su fee al operador) via Alegra/Siigo, y el operador esta validado contra API RNT MinCIT antes de poder vender.
5. En produccion, si `NEXT_PUBLIC_BETA_MODE !== '1'`, el demo mode no se puede activar; si esta activo, banner rojo persistente no-dismissable es visible en cada pagina y `signIn` real limpia cualquier `beta-demo-token` heredado.
6. Errores en prod son visibles en Sentry con PII scrubbed; uptime homepage + webhook + API health monitoreado por UptimeRobot; backups Supabase Pro PITR + dump propio semanal con restore mensual probado.

## Plans (5)

| # | Plan | Effort | Depends on | Requirements |
|---|------|--------|-----------|--------------|
| 1 | [db-foundation-schema-and-rls](plans/plan-1-db-foundation-schema-and-rls/PLAN.md) | 4-5d | Nothing | 10 |
| 2 | [wompi-prod-webhook-idempotente](plans/plan-2-wompi-prod-webhook-idempotente/PLAN.md) | 6-7d | Plan 1 | 12 |
| 3 | [commissions-ledger-cron-platform-fee](plans/plan-3-commissions-ledger-cron-platform-fee/PLAN.md) | 4-5d | Plan 1, Plan 2 (70%) | 5 |
| 4 | [compliance-dian-rnt-habeas-data](plans/plan-4-compliance-dian-rnt-habeas-data/PLAN.md) | 5-7d | Plan 2 (final) | 7 |
| 5 | [observability-demo-gate-secrets-backups](plans/plan-5-observability-demo-gate-secrets-backups/PLAN.md) | 4-5d | Plan 1 (CI) | 10 |

**Total:** 23-29 dias (con paralelizacion: 15-18 dias calendario)

## Execution Order

```
Semana 1:        [Plan 1: db-foundation] ─────────┐
                                                  ▼
Semana 1.5-2.5:  [Plan 2: wompi-prod-webhook] ────┐
                                                  │
Semana 2-2.5:           [Plan 5: observability] (paralelo, archivos disjuntos)
                                                  ▼
Semana 2.5-3:    [Plan 3: commissions]  +  [Plan 4: compliance] (paralelos)
```

**Razonamiento del orden:**

1. **Plan 1 primero, sin negociacion.** Schema + RLS + CI son la fundacion. Sin esto, los otros 4 planes construyen tests sobre nada y abren puertas RLS que despues nadie cierra.
2. **Plan 2 segundo** porque el webhook idempotente define el contrato con el ledger. Si COM-* (Plan 3) se construye antes que el webhook, los `accrual` entries no llegan desde donde deben.
3. **Plan 5 (observability) corre en paralelo a Plan 2** porque toca archivos disjuntos (`instrumentation.ts`, `Layout.tsx`, `next.config.js`, workflows de GitHub) y no depende de schema de plata. Beneficio: cuando Plan 2 se prueba con plata real, Sentry ya esta capturando.
4. **Plan 3 y Plan 4 corren en paralelo al final.** Comparten dependencia en Plan 2 pero tocan modulos diferentes. Solo se chocan en `supabase/functions/wompi-webhook/index.ts` — resoluble con merge cuidadoso.
5. **Plan 4 tiene componentes humanos lentos** (radicar RNBD, abogado para T&C, activar Alegra). **Arrancar tramites externos el dia 1 de la fase**, no esperar a llegar al plan.

## Key Risks (cross-plan)

- **CRITICAL #2** Wompi sin idempotencia → mitigado en Plan 2 (`webhook_events UNIQUE(event_id)` + checksum validation)
- **CRITICAL #4** Demo mode leak → mitigado en Plan 5 (env gate + banner persistente + token cleanup)
- **CRITICAL #10** RLS leak entre tenants → mitigado en Plan 1 (RLS por defecto + tests automatizados de aislamiento)
- **CRITICAL #12** DIAN factura omitida → mitigado en Plan 4 (Alegra Modelo B desde dia 1)
- **CRITICAL #19** Backups no probados → mitigado en Plan 5 (Supabase Pro PITR + dump propio + restore mensual)
- **HIGH #13** RNT operador ignorado → mitigado en Plan 4 (validacion API MinCIT bloqueante en onboarding)
- **HIGH #14** Habeas Data → mitigado en Plan 4 (politica + checkbox NO pre-marcado + RNBD ante SIC)
- **HIGH #17** Bundle low-end → mitigado en Plan 5 (Lighthouse CI gate >= 80) y Plan 3 (analyze < 150KB)
- **HIGH #18** Refund-after-payout → mitigado en Plan 3 (saldo negativo permitido hasta -$50K + reversal entries)
- **MEDIUM #20** Comision hardcoded → mitigado en Plan 3 (tabla `commissions` + admin UI)

## Decisiones humanas requeridas ANTES de arrancar

El dev tiene que sentarse 1 hora y resolver esto. Sin estas decisiones, los planes se traban a mitad:

1. **% exacto de platform fee La Perla** — roadmap dice "5-10%". Recomendado: **8%**.
2. **Modelo A vs B factura DIAN** — research recomienda B. Confirmar.
3. **Alegra vs Siigo** — Plan 4 default Alegra (API mas simple, ~$60K COP/mes). Confirmar.
4. **Hold-period jalador en mes 1** — recomendado 24h post-tour. Confirmar o flip a instant 0h.
5. **Saldo negativo permitido del jalador** — research dice -$50K COP. Confirmar.
6. **Wompi prod: tienes ya `events_secret` en mano?** — sin esto Plan 2 slipea 1-2 semanas (KYC Wompi).
7. **Abogado especialista para T&C jalador** — sin contactar en semana 1, Plan 4 slipea.
8. **Quien hace la primera prueba con plata real?** — Plan 2 success criteria #1 requiere $5.000 COP de prueba.
9. **Donde corre Edge Function `wompi-webhook`?** — recomendado Supabase Edge Functions (atomicidad con DB).
10. **Storage de RUT PDF y cuenta bancaria del operador** — recomendado Supabase Storage privado.

## Sub-set MVP pre-launch

Si necesitas lanzar lo minimo viable PRE-launch (primer pago real con un familiar de prueba), el corte es:

### NO NEGOCIABLE (semanas 1-2):
- Plan 1 completo
- Plan 2 completo
- Plan 4 parcial: CMP-02, CMP-03, CMP-05, CMP-06, CMP-07
- Plan 5 parcial: SEC-01, SEC-02, SEC-03, OBS-01, OBS-02, OBS-03

### PUEDE ESPERAR 1-2 semanas POST-launch:
- Plan 3 completo (20% hardcoded ya funciona; platform fee a mano hasta semana 4)
- Plan 4 resto: CMP-01 DIAN automatica (manual via Alegra UI hasta volumen > 30 ventas/mes)
- Plan 5 resto: OBS-04, OBS-05, OBS-06, MOB-12

**Camino critico minimo: 10-12 dias compactos = primera venta real legal cobrable.**

## Progress

| Plan | Status | Started | Completed |
|------|--------|---------|-----------|
| 1. db-foundation-schema-and-rls | Not started | - | - |
| 2. wompi-prod-webhook-idempotente | Not started | - | - |
| 3. commissions-ledger-cron-platform-fee | Not started | - | - |
| 4. compliance-dian-rnt-habeas-data | Not started | - | - |
| 5. observability-demo-gate-secrets-backups | Not started | - | - |

## UI Hint

This phase **does** include UI work (admin commission editor, beta banner, T&C/politica pages, operator onboarding flow). UI safety gate aplica.

---
*Phase 1 planeada: 2026-04-27 (descomposicion autonoma asistida por agente Cowork)*
*Roadmap original: 2026-04-25*
