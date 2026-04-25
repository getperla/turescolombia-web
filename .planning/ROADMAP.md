# Roadmap: La Perla — Post-Launch Milestone

**Project:** La Perla / TourMarta
**Milestone:** Post-launch hardening + crecimiento + marketplace v2 + mobile
**Created:** 2026-04-25
**Granularity:** standard (4 macro-phases, brownfield post-launch)
**Coverage:** 88/88 v1 requirements mapped
**Brownfield:** Yes — launch beta `2026-04-26`

## Core Value Reference

**Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.** Cada fase debe acercar el producto a esta promesa o defender la operacion legal/financiera de la plataforma para que la promesa siga siendo cierta.

## Phases

- [ ] **Phase 1: Estabilizacion launch** — Wompi prod + webhook idempotente + booking status machine + commission ledger + compliance baseline + observabilidad + RLS audit + demo gate
- [ ] **Phase 2: Data Layer + Crecimiento** — Migracion Render legacy → Supabase como single source of truth + Realtime + onboarding jalador <60s + share-to-WhatsApp
- [ ] **Phase 3: Marketplace v2** — Search FTS spanish + reviews verificadas + availability con cupos + 3 tiers de cancelacion + dispute queue + ranking
- [ ] **Phase 4: Mobile + PWA hardening** — Monorepo Turborepo + Expo SDK 55 nativa iOS/Android + push + offline ticket + QR check-in + PWA reforzada

## Phase Details

### Phase 1: Estabilizacion launch
**Goal**: La plataforma opera con dinero real en produccion, observable, idempotente y legalmente blindada — Wompi prod, ledger inmutable, compliance baseline DIAN/RNT/Habeas Data, RLS auditado, demo mode gateado.
**Depends on**: Nothing (primera fase post-launch)
**Estimated effort**: 3 semanas (semanas 1-3 post-launch, urgencia maxima)
**Requirements** (41): PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-09, BKG-01, BKG-02, BKG-03, BKG-04, BKG-05, COM-01, COM-02, COM-03, COM-04, COM-05, COM-06, COM-08, CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06, MOB-12, MOB-13, TST-01, TST-02, TST-03, TST-04, TST-06
**Success Criteria** (what must be TRUE):
  1. Un turista puede pagar un tour real con tarjeta/PSE/Nequi y la confirmacion llega solo via webhook server-to-server (no via redirect URL), con un E2E test verde corriendo en CI.
  2. Enviar el mismo evento Wompi dos veces produce exactamente 1 booking, 1 entry en `commission_ledger` y 1 factura DIAN — verificable con test automatizado del webhook.
  3. Un operador autenticado solo ve sus propios bookings/comisiones/tours; intentar consultar data de otro operador retorna vacio. Audit `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` retorna 0.
  4. Cada venta cobrada genera factura electronica DIAN automaticamente (Modelo B: operador factura turista, La Perla factura su fee al operador) via Alegra/Siigo, y el operador esta validado contra API RNT MinCIT antes de poder vender.
  5. En produccion, si `NEXT_PUBLIC_BETA_MODE !== '1'`, el demo mode no se puede activar; si esta activo, banner rojo persistente no-dismissable es visible en cada pagina y `signIn` real limpia cualquier `beta-demo-token` heredado.
  6. Errores en prod son visibles en Sentry con PII scrubbed; uptime homepage + webhook + API health monitoreado por UptimeRobot; backups Supabase Pro PITR + dump propio semanal con restore mensual probado.
**Key Risks** (from PITFALLS.md):
  - CRITICAL #2 Wompi sin idempotencia → tabla `webhook_events` UNIQUE(event_id) + verify `X-Event-Checksum` antes de side effects + responder 200 < 3s
  - CRITICAL #4 Demo mode leak → env gate + banner persistente + token cleanup en signIn
  - CRITICAL #10 RLS leak entre tenants → ENABLE RLS por defecto + tests automatizados de aislamiento en CI + audit periodico
  - CRITICAL #12 DIAN factura electronica omitida → Alegra/Siigo desde dia 1, Modelo B
  - CRITICAL #19 Backups no probados → upgrade Supabase Pro $25/mes + dump propio + restore mensual
  - HIGH #13 RNT operador ignorado → validacion API MinCIT bloqueante en onboarding
  - HIGH #14 Habeas Data → politica + checkbox NO pre-marcado + RNBD ante SIC
  - HIGH #17 Bundle low-end → Lighthouse mobile slow 4G ≥ 80 + bundle JS gzipped < 150KB en catalogo bloqueante en CI
  - HIGH #18 Refund-after-payout → saldo negativo permitido hasta -$50K COP + fondo de garantia 5%
  - MEDIUM #20 Comision hardcoded → tabla `commissions` + admin UI
**Plans**: TBD
**UI hint**: yes

### Phase 2: Data Layer + Crecimiento
**Goal**: Render legacy apagado, Supabase como fuente unica de verdad con Realtime para dashboards y wrappers en `lib/queries/`. Onboarding del jalador en menos de 60 segundos con tools para compartir tours desde el primer minuto.
**Depends on**: Phase 1 (Wompi webhook + ledger + RLS deben existir antes de migrar data; commission ledger UI consume schema canonico)
**Estimated effort**: 4 semanas (semanas 4-7)
**Requirements** (16): COM-07, SEC-07, DAT-01, DAT-02, DAT-03, DAT-04, DAT-05, DAT-06, DAT-07, DAT-08, GRO-01, GRO-02, GRO-03, GRO-04, GRO-05, GRO-06, GRO-07, TST-05
**Success Criteria** (what must be TRUE):
  1. Un jalador nuevo se registra con solo telefono + WhatsApp magic-link en menos de 60 segundos, recibe 3 tours starter pre-cargados y puede generar su primer link compartible a WhatsApp con texto pre-llenado + refCode desde el minuto 1.
  2. Ningun fetch desde el frontend llama a `turescolombia-api.onrender.com` — todas las queries van por wrappers en `lib/queries/` que envuelven Supabase JS SDK; UI nunca llama `supabase.from()` directo.
  3. El dashboard del jalador muestra saldo en 3 estados (pending / available / paid) en tiempo real via Supabase Realtime cuando llega una venta nueva, sin polling, con materialized view `jalador_balances` refrescada cada 15 min.
  4. Una atribucion de jalador via `/j/[refCode]/...` setea cookie `lp_ref` HttpOnly Secure SameSite=Lax que persiste 30 dias y se captura como NOT NULL en `bookings.jalador_ref_id` al pagar; last-touch declarado en T&C.
  5. Un operador puede publicar un tour completo (fotos, precios, disponibilidad inicial) en menos de 10 minutos desde su dashboard, con onboarding paso a paso.
  6. Las paginas `/explorar` y `/tour/[slug]` se renderizan via ISR `revalidate: 300` con data desde Supabase, sin sacrificar SEO.
**Key Risks** (from PITFALLS.md):
  - CRITICAL #5 Cold-start equivocado → manual matchmaking estilo Airbnb 2008: 3-5 operadores hand-picked + 50+ jaladores activos antes de abrir publicacion libre + subsidio primera venta
  - CRITICAL #3 Atribucion disputable → cookie `lp_ref` 30 dias + last-touch en T&C + anti-collusion checks
  - HIGH #6 Jalador hold-period resistance → pago instant en mes 1-3, switch a hold solo despues de 50+ jaladores activos
  - HIGH #7 WhatsApp ban → `wa.me` solo para mensajes jalador-iniciados; broadcasts solo via Cloud API verificada
  - HIGH #9 Connection pool exhaustion → pooler URL transaction mode + cliente singleton modulo-level + monitor `pg_stat_activity` semanal
  - HIGH #11 Single-dev burnout → FAQ + WhatsApp templates desde semana 1 + outsource contabilidad/RNT/DIAN + hard cap 60h/sem
**Plans**: TBD
**UI hint**: yes

### Phase 3: Marketplace v2
**Goal**: El catalogo es discoverable (search FTS spanish con `unaccent`), confiable (reviews verificadas booking-gated, ranking publico), gobernable (3 tiers de cancellation, dispute queue, refund automatico) y operable a escala (availability con stock atomic, sin oversell).
**Depends on**: Phase 2 (schema canonico + RLS completo + Render apagado son prerequisitos para search FTS, reviews verified, tour_availability con cupos, refund flow). Puede arrancar con overlap parcial al final de Phase 2.
**Estimated effort**: 4-5 semanas (semanas 6-10, parcial overlap con Phase 2)
**Requirements** (14): PAY-08, MKT-01, MKT-02, MKT-03, MKT-04, MKT-05, MKT-06, MKT-07, MKT-08, MKT-09, MKT-10, MKT-11, MKT-12, MKT-13
**Success Criteria** (what must be TRUE):
  1. Un turista busca "tairona" en `/explorar` y encuentra "Parque Tayrona Día Completo" (FTS spanish + `unaccent` + GIN index funcionando); puede filtrar por precio, duracion, fecha disponible, group size y zona (Tayrona/Sierra/Centro/Playas) con resultados ranked por similitud + popularidad.
  2. Solo un turista con `bookings.status = 'completed'` puede dejar review (5-star + texto opcional); operador puede dejar review privada del turista (solo admin lo ve); el sistema bloquea reviews de quien no completo el tour.
  3. Un tour con `slots_total = 10` y `slots_remaining = 0` para una fecha rechaza nuevos bookings con error claro; el decremento es atomico en RPC `create_booking` (sin oversell bajo concurrencia).
  4. Un turista puede cancelar self-service segun la policy elegida (Flexible/Moderada/Estricta) y recibe refund automatico via API Wompi; si la comision del jalador ya fue released, se crea reversal entry en ledger; disputes no cubiertas por policy van a admin queue.
  5. El ranking publico de jaladores en `/jaladores` muestra top vendedores ordenados por ventas + score de reputacion, refrescado cada hora via materialized view; operadores con RNT verificado y primera venta exitosa muestran badge "operador verificado".
**Key Risks** (from PITFALLS.md):
  - CRITICAL #5 Operador malo derrumba marca → refund 100% inmediato pagado por La Perla + suspension automatica > 5% no-show + fondo de garantia 10-20% primeros 5 tours
  - HIGH #8 FTS sin `unaccent` → habilitar extension + config `spanish_unaccent` con stemming + trigram fallback `pg_trgm`
  - HIGH #18 Refund-after-payout → reversal entries en ledger + saldo negativo del jalador hasta -$50K + reservas no reembolsables al 50% con descuento
**Plans**: TBD
**UI hint**: yes

### Phase 4: Mobile + PWA hardening
**Goal**: El jalador puede vender desde su celular con UX nativa — app iOS+Android (Expo SDK 55) con push notifications, offline ticket, QR check-in del operador, geolocation opt-in, monorepo Turborepo + pnpm workspaces, PWA reforzada como base.
**Depends on**: Phase 2 (Supabase como SDK unico para web + mobile; sin data layer consolidado, mobile escribiria cliente HTTP descartable). Phase 3 idealmente cerrado para tener web bug-free P0 antes de native (gate: cero P0 abiertos > 30 dias seguidos).
**Estimated effort**: 8-10 semanas (mes 3-5)
**Requirements** (11): MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08, MOB-09, MOB-10, MOB-11
**Success Criteria** (what must be TRUE):
  1. El repo `tourmarta-web` se convirtio a monorepo Turborepo + pnpm workspaces (`apps/web`, `apps/mobile`, `packages/db`, `packages/types`, `packages/config`, `supabase/`) con builds independientes y tipos compartidos.
  2. Un jalador instala la app desde Play Store / App Store, hace login con su mismo telefono (auth compartida via Supabase JS SDK + AsyncStorage adapter) y recibe push notification cuando llega una nueva venta o cuando su comision se libera.
  3. Un turista puede ver su ticket de reserva con QR sin red (TanStack Query persisted + cached service worker); un operador puede escanear el QR del booking, marcar `status = 'completed'` y eso dispara la liberacion de la comision del jalador segun policy.
  4. PWA esta shippeada antes de la app nativa: manifest, service worker, install prompt funcionan en Android Chrome con push via web push; lighthouse mobile slow 4G mantiene score ≥ 80.
  5. Push notifications funcionan en iOS + Android con Edge Function `send-push` invocando Expo Push API y tabla `device_tokens(user_id, expo_token, platform, last_seen)` actualizada en cada login.
**Key Risks** (from PITFALLS.md):
  - HIGH #16 Native antes de web stable + Apple WebView rejection → gate: cero P0 abiertos > 30 dias seguidos antes de submit native + carta de Wompi explicando "tours = servicio fisico exempt de IAP 30%" + empezar con Android (Play Store horas vs Apple dias)
  - HIGH #17 Bundle pesado low-end (Moto E, Samsung A03) → mantener Lighthouse mobile slow 4G ≥ 80 bloqueante en CI + test real en device low-end antes de cada release
  - HIGH #11 Single-dev burnout en mes 3-4 → vacaciones obligatorias 1 dia/sem + 1 sem al mes 3 sin laptop + filter cada feature por "bloquea $1M COP/mes? sino, defer"
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Estabilizacion launch | 0/0 | Not started | - |
| 2. Data Layer + Crecimiento | 0/0 | Not started | - |
| 3. Marketplace v2 | 0/0 | Not started | - |
| 4. Mobile + PWA hardening | 0/0 | Not started | - |

## Coverage Summary

- v1 requirements: 88
- Mapped to phases: 88
- Unmapped: 0
- Distribucion:
  - Phase 1: 46 (41 explicit + MOB-12, MOB-13, TST-01, TST-02, TST-03, TST-04, TST-06 cross-phase testing infra)
  - Phase 2: 18 (16 explicit + COM-07 ledger UI + SEC-07 cookie + TST-05)
  - Phase 3: 14
  - Phase 4: 11

Note: numbers above include cross-phase requirements (MOB-12/13 testing gates, TST-* testing infra) that landed in Phase 1 per traceability table in REQUIREMENTS.md.

## Phase Ordering Rationale

Las 4 dimensiones de research (STACK, FEATURES, ARCHITECTURE, PITFALLS) convergen en esta secuencia obligada:

- **Wompi prod webhook ANTES de migrar data layer:** la webhook architecture (Edge Function + idempotency table) define el contrato con Supabase. Migrar data layer despues solo agrega rows a `webhook_events`, no reescribe.
- **Data layer ANTES de marketplace v2:** todos los features de v2 (search FTS, reviews verified, availability con stock atomic, cancellations) requieren schema canonico en Supabase. Construir search sobre Render legacy = trabajo descartable.
- **Data layer ANTES de mobile:** Supabase JS SDK corre identico en RN. Si mobile arranca antes, hay que escribir cliente HTTP para Render (codigo que se descarta en Fase 2).
- **Compliance (DIAN/RNT/Habeas Data) en Fase 1, NO post-launch:** Wompi reporta a DIAN en tiempo real; cruzas data sin facturas = sancion automatica. RNT es bloqueador legal, no cosmetico.
- **Multinivel referrals defer a v2:** requiere ledger limpio (Phase 1+2) + abogado especialista. Construirlo sobre 20% hardcoded = calcificar bad data shape.

## Evolution

This roadmap evolves at phase transitions. After each phase:
1. Update success criteria status (validated/invalidated)
2. Move requirements from Pending → Done in REQUIREMENTS.md traceability
3. Surface new requirements that emerged → add to REQUIREMENTS.md Active or v2
4. Update Key Decisions in PROJECT.md if any pivot occurred

---
*Roadmap created: 2026-04-25*
*Last updated: 2026-04-25 after initialization*
