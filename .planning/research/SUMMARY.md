# Project Research Summary — La Perla

**Project:** La Perla / TourMarta
**Domain:** Multi-sided tourism marketplace for the informal economy (Santa Marta, Colombia)
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH overall

## Executive Summary

La Perla digitaliza el turismo informal samario — turistas, jaladores (vendedores comisionistas en la calle), operadores y plataforma. Es un marketplace de 4 actores con modelo de comision (~20% jalador, ~10% La Perla, resto operador), pagos en COP via Wompi, y un codebase brownfield post-launch (Next 16 + Supabase auth + Render legacy data + Wompi sandbox). El core value es **"cualquiera con un celular puede ganar plata vendiendo tours"** — todo lo demas es secundario.

**Recomendacion sintetizada:** las 4 dimensiones de research convergen en una misma direccion estrategica: **consolidar todo el backend en Supabase** (auth + data + Edge Functions + Realtime + Storage + cron), llevar Wompi a produccion con webhook idempotente en Edge Function (no en Vercel), implementar un commission ledger inmutable, y posponer mobile (Expo SDK 55) hasta despues de la migracion del data layer. NO construir backend custom, NO usar Algolia/Typesense en v1, NO Flutter, NO PWA-as-mobile-substitute, NO in-app messaging (WhatsApp deeplinks). El equipo es 1 dev — cada hora de infra es hora no gastada en producto.

**Riesgos principales:** (1) Wompi SANDBOX_KEY hardcoded en `lib/wompi.ts:18` y demo mode sin gate de env son bugs latentes pre-launch; (2) compliance colombiano (DIAN factura electronica, RNT, Habeas Data, multinivel-vs-piramide) son timeline-relevantes, no post-launch nice-to-haves; (3) cold-start del lado equivocado (operadores antes que jaladores) es la #1 causa de muerte de marketplaces — empezar con manual matchmaking estilo Airbnb 2008; (4) burnout single-dev en mes 3-4 segun YC patterns. Mitigacion: ledger + RLS + Edge Function webhook desde Fase 1, integrar Alegra/Siigo desde Fase 1, validar referido multinivel con abogado antes de lanzar.

## Key Findings

### Recommended Stack

Stack actual (Next 16 + React 18 + Tailwind 4 + Supabase + Wompi + TS 5.5) **se mantiene**. El research de stack agrega 5 piezas necesarias y descarta alternativas costosas/complejas. Costo total mes 1-3: $0-10 (solo dominio); upgrade a Supabase Pro ($25/mes) cuando egress > 2GB.

**Core technologies (additions):**
- `@sentry/nextjs ^10.50.0` — error tracking. Unica integracion oficial Next 16 + Turbopack mantenida. Free tier 5K errores/mes.
- `expo ~55.0.0` (RN 0.83, Hermes v1) — mobile cross-platform. **NO Flutter** (no reuso TS), **NO PWA-as-substitute** (iOS push roto sin home-screen). Repo separado en Fase 1-3, monorepo Turborepo en Fase 4 (React 18 web vs React 19 mobile = incompatible en mismo workspace).
- `vitest ^3` + `@playwright/test ^1.50` — testing. NO Jest (friccion ESM + Turbopack). Coverage realista: E2E booking critico pre-launch, 50% lib/ mes 2, 80% mes 3-4.
- Postgres extensions: `pg_trgm` + `unaccent` + `tsvector spanish` — search v1. **NO Algolia/Typesense/MeiliSearch** hasta > 5K tours. Migracion path documentado.
- Web Push API + Expo Push Notifications — gratis. **NO OneSignal** ($9/mes minimum + lock-in).
- Resend (email transaccional, 3K free/mes), UptimeRobot (synthetic uptime, 50 monitors free).

**Free tier alcanza:** Vercel Hobby (100GB bandwidth), Supabase Free (500MB DB / 2GB egress / 1GB storage), Sentry Developer, EAS Free (30 builds/mes), Resend Free.

Detalle completo en `.planning/research/STACK.md`.

### Expected Features

10 categorias de features mapeadas; baseline actual ya cubre catalogo + 4 dashboards + magic-login + booking + Wompi sandbox + admin approval. La lista de **anti-features** es agresiva por diseno — cada una tiene rationale documentado.

**Must have v1 (table stakes):**
- Wompi production keys + webhook idempotente + PSE + Nequi/Daviplata
- Booking status machine real (`pending → paid → confirmed → completed → reviewed`, con ramas `canceled/refunded/disputed`) — la spina dorsal de todo
- Configurable commission per tour/operator (sacar el 20% hardcoded)
- Platform fee in checkout math (5-10% sobre venta bruta)
- Demo mode banner + env gate + token-collision fix
- Reviews verificadas (booking-gated, 5-star + texto opcional)
- Availability per-day + per-tour capacity + atomic decrement
- Cancellation policies 3 tiers (Flexible / Moderada / Estricta)
- Operator KYC (RUT + cuenta + RNT validado contra API MinCIT)
- DIAN factura electronica (modelo B: operador factura turista, La Perla solo factura fee al operador)
- Habeas Data: politica publicada + checkbox NO pre-marcado + RNBD
- Real-time commission ledger para jalador (pending / available / paid)
- Hold period T+24h post-tour-date (no T+pago)
- Phone-only signup jalador < 60s, defer KYC al primer payout

**Should have (differentiators v1.x):**
- Jalador share-to-WhatsApp button con prefilled text + refCode
- Live "ganadores hoy" ticker (social proof)
- Voice-note onboarding en costeño spanish
- Photo improvement assistant para operadores
- Bidirectional reviews (operador rate turista privado)
- Auto-confirm vs request-to-book per tour
- Operator QR check-in mode (reemplaza tiquetera fisica — cumple la promesa original)

**Defer (v2+, explicito):**
- Jalador referral multinivel — alta palanca pero requiere ledger limpio + validacion legal SuperSociedades. **NUNCA** sin abogado.
- DIAN factura completa (PDF descargable retroactivo) — al cruzar volumen umbral
- Tourist installments (cuotas Wompi)
- Withdraw-on-demand a Nequi
- Map view (solo si analytics muestran confusion en list-view)
- Saved searches con WhatsApp alert
- Bilingual EN/ES (solo si > 20% trafico no-spanish)
- Cash-on-arrival (riesgo fraud, defer)

**Anti-features explicitos (NO construir):**
- In-app messaging tourist↔operator → WhatsApp deeplink, no chat propio
- Full profile builder con bio/foto/about — friccion sin conversion
- KYC selfie at signup — diferir a primer payout
- AI/ML personalized recommendations cold-start — sort-by-popularity + curacion del jalador hace 90%
- Dynamic pricing / surge — operador no lo opera, erosiona trust
- Yield-management overbooking — desastroso reputacionalmente
- Crypto payments — explicit out of scope
- Multi-currency checkout (USD) — tourist's bank hace FX
- Subscription "La Perla Plus" — tourism es one-shot
- Free-form cancellation policy text — disputas inresolubles
- Public review threading (Yelp-style) — flame wars
- AR previews / background location tracking / social feed

Detalle en `.planning/research/FEATURES.md`.

### Architecture Approach

Arquitectura target: **monolito Next.js para UI + Supabase end-to-end para backend + Edge Functions para webhooks/cron/email**. RLS-first authorization (4 roles: tourist/jalador/operator/admin). Repo `tourmarta-web` se mantiene Fase 1-3; conversion a monorepo Turborepo + pnpm workspaces solo cuando arranca Fase 4 (mobile). Backend legacy Render se apaga en Fase 2.

**Major components:**
1. **Next.js Web (Vercel Hobby)** — UI 4 roles, SSR para SEO en `/explorar` y `/tour/[slug]` con ISR `revalidate: 300`, client-side dashboards via TanStack Query.
2. **Supabase Postgres + RLS + GIN/FTS + pg_cron** — fuente unica de verdad. RLS reemplaza ~80% del codigo de auth/authorization. `pg_cron` reemplaza GitHub Actions cron / Vercel cron.
3. **Supabase Edge Functions (Deno)** — `wompi-webhook` (verify signature + idempotency table), `commission-release` (cron T+24h), `send-booking-email` (Resend), `generate-ticket` (PDF QR), `send-push` (Expo Push).
4. **Supabase Realtime** — jalador dashboard (nueva venta), operador dashboard (nuevo booking). NO polling cada 5s.
5. **Commission ledger inmutable** — 3 tablas (`bookings`, `commission_ledger`, `payouts`). INSERT-only con `entry_type IN ('accrual','release','reversal')`. Materialized view `jalador_balances` refrescada cada 15min via pg_cron.
6. **Repository wrapper `packages/db`** — UI nunca llama `supabase.from()` directo. Llama `getTours()`, `createBooking()`. Permite swap de implementacion sin tocar UI.

**Data flow critico (booking → pago):** Cliente → `createBooking()` → RPC `create_booking` (SECURITY DEFINER) valida stock + crea booking + accruals → Wompi checkout redirect → usuario paga → Wompi POST async al webhook (Supabase Edge) → verify signature + idempotency check → UPDATE booking.payment_status → Realtime broadcast → trigger `send-booking-email`. **El redirect URL NUNCA es fuente de verdad** — solo el webhook.

**Anti-patterns explicitos:** NO BFF intermedio Next.js↔Supabase (pierde RLS, dobla latencia). NO webhook handler que hace cosas pesadas sincronas (debe responder 200 en < 3s, side effects via DB triggers o cron). NO mobile API custom diferente a la web. NO localStorage como source-of-truth de auth (confiar en `supabase.auth.getSession()`).

Detalle en `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls (Top 10 con severity + fase)

| # | Pitfall | Severity | Fase | Prevention |
|---|---------|----------|------|------------|
| 1 | Wompi sin idempotencia de webhook (doble booking, doble comision, doble factura) | CRITICAL | STAB | Tabla `webhook_events` con UNIQUE constraint en checksum, validar `X-Event-Checksum` antes de cualquier side effect, transaccion atomica, respond < 3s |
| 2 | Demo mode filtrado a usuarios reales post-launch (token `beta-demo-token` se queda forever) | CRITICAL | STAB | Banner persistente no-dismissable + env gate `NEXT_PUBLIC_BETA_MODE`, `lib/auth.tsx` limpia token en signIn, telemetry de hits en prod, remover botones DEV de login |
| 3 | RLS bug que filtra data entre tenants (operador A ve bookings de B; `service_role` key en API route) | CRITICAL | STAB | `ENABLE ROW LEVEL SECURITY` por defecto, tests automatizados de aislamiento por tenant en CI, audit `rowsecurity = false` debe ser 0, policies versionadas |
| 4 | DIAN factura electronica omitida (sancion COP $200K-$1M por factura no emitida + auditoria) | CRITICAL | STAB | Decidir Modelo A vs B (recomendado B: operador factura turista, La Perla solo fee), integrar Alegra/Siigo desde STAB, RUT actualizado |
| 5 | Cold-start equivocado (operadores antes que jaladores → catalogo zombie) | CRITICAL | STAB+GROW | 3-5 operadores hand-picked + 50+ jaladores activos antes de abrir publicacion libre. Manual matchmaking estilo Airbnb 2008 + Rappi. Subsidio primera venta jalador. |
| 6 | Atribucion jalador disputable (cookie expira / cross-device) | CRITICAL | STAB+GROW | Cookie `lp_ref` con expiracion 30 dias, last-touch attribution en T&C, capturar `ref` como NOT NULL en `bookings.jalador_ref_id`, anti-collusion checks |
| 7 | Backups Supabase no probados / no PITR en free tier | CRITICAL | STAB | Upgrade Supabase Pro $25/mes, pg_dump propio semanal a S3/R2, restore mensual probado, soft delete por default, permissions split |
| 8 | RNT operador ignorado (multa hasta 100 SMLMV, denuncia gremio) | HIGH | STAB | Validacion contra API MinCIT (`rntsiturweb.mincit.gov.co`) en onboarding bloqueante, re-validacion anual, disclaimer legal en footer |
| 9 | Habeas Data violation (jalador usa datos para spam, sancion SIC) | HIGH | STAB | Politica publicada `/politica-de-datos`, checkbox consentimiento NO pre-marcado, RNBD ante SIC, jalador firma confidencialidad, logs de acceso, principio de minimizacion |
| 10 | Multinivel jalador → jalador interpretado como piramide (Ley 1700/2013, SuperSociedades activa) | HIGH | GROW | Sin entrada paga, 1 nivel max (no 5), comision con tope temporal (3-6 meses), validar con abogado especialista ANTES de shipping |

**Otros pitfalls relevantes (full list en PITFALLS.md):**
- WhatsApp numero baneado por spam (HIGH, STAB+GROW): `wa.me` para confirmaciones manual-iniciadas; broadcasts solo via Cloud API oficial verificada
- Postgres FTS sin `unaccent` (HIGH, MKT2): habilitar extension + config `spanish_unaccent` con stemming
- Supabase free-tier connection pool exhaustion (HIGH, STAB→GROW): pooler URL en transaction mode, monitor `pg_stat_activity`
- Jalador hold-period resistance (HIGH, GROW): pago instant en mes 1-3, switch a hold despues de 50+ jaladores
- Single-dev burnout mes 3-4 (HIGH, ALL): hard cap 60h/sem, FAQ + WhatsApp templates desde sem 1, outsource contabilidad
- Native antes de web stable + App Store rejection Wompi WebView (HIGH, MOB): cero P0 abiertos > 30 dias seguidos antes de ship native; carta Wompi a la mano
- Bundle pesado en Android low-end Moto E / Samsung A03 (HIGH, STAB+MOB): budget < 150KB JS gzipped, Lighthouse mobile slow 4G > 80 bloqueante en CI
- Refund-after-payout (HIGH, STAB): saldo negativo del jalador permitido hasta -$50K, fondo de garantia 5%
- Comision hardcoded 20% (MEDIUM, STAB): tabla `commissions` editable via admin UI

Detalle (20 pitfalls) en `.planning/research/PITFALLS.md`.

## Implications for Roadmap

Las 4 dimensiones de research convergen en **una secuencia obligada de 4 fases**. Cualquier otro ordenamiento (mobile antes de data layer, marketplace v2 antes de Wompi prod, etc.) introduce duplicacion de trabajo o exposicion legal.

### Phase 1: Estabilizacion launch (semanas 1-3 post-launch)

**Rationale:** Wompi en produccion sin webhook idempotente = bonkruptcy o demanda. Demo mode con token-collision sin gate = data poisoning. RLS gaps = leak entre operadores. DIAN omitido = sancion. Estos NO son nice-to-haves — son bloqueadores de operacion legal con dinero real.

**Delivers:** Wompi prod operativo, observabilidad minima, compliance baseline, backup story.

**Owns from each dimension:**
- **STACK:** Sentry setup (instrumentation.ts, source maps via Vercel integration, scrub PII), Vitest 3 + Playwright E2E del flow booking critico, Resend integrado.
- **FEATURES:** Wompi prod keys + webhook + PSE + Nequi, booking status machine, configurable commission, platform fee math, demo mode banner+gate, replace 15× silent catches, brand strings WhatsApp, `priceChild ?? priceAdult * 0.7` fix, DEV access removed, operator KYC capture (RUT + cuenta + RNT), DIAN integration via Alegra/Siigo (Modelo B), Habeas Data politica + checkbox + RNBD.
- **ARCHITECTURE:** Edge Function `wompi-webhook` con verify SHA256 + tabla `webhook_events` (PRIMARY KEY = checksum), commission ledger schema (3 tablas), RPC `create_booking` SECURITY DEFINER, columna `tours.jalador_commission_pct` default 20.
- **PITFALLS addressed:** #1 Wompi idempotencia, #2 demo mode, #3 RLS, #4 DIAN, #7 backups (upgrade Supabase Pro), #9 Habeas Data.

**Critical gates antes de declarar fase OK:**
- E2E test booking → pago real (no sandbox) verde
- Webhook duplicado test verde (1 sola booking, 1 sola comision)
- Audit RLS: `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity = false` returns 0
- Restore mensual probado en instancia secundaria
- Banner demo mode renderiza si `isBetaActive() && NODE_ENV === 'production'`

### Phase 2: Data Layer Migration (semanas 4-7)

**Rationale:** Render legacy + Supabase auth split tiene token mismatch documentado en `INTEGRATIONS.md` — cada feature nueva toca 2 sistemas, bug surface = 2x. Bloqueante para Marketplace v2 (necesita schema completo) y Mobile (necesita un solo SDK). NO se construye backend custom (8-12 semanas de 1 dev no se justifican).

**Delivers:** Render API apagado, Supabase como fuente unica de verdad de data, Realtime para dashboards, ISR para SEO.

**Owns from each dimension:**
- **STACK:** TanStack Query, Supabase Realtime SDK, Resend, supabase CLI para migrations versionadas.
- **FEATURES:** real-time commission ledger view (3-state: pending/available/paid), jalador share-to-WhatsApp button, "ganadores hoy" ticker, first-link CTA + 3-tour starter pack, `<60s` jalador onboarding redesign, `<10min` operator publish flow.
- **ARCHITECTURE:** schema completo en Supabase con migrations (`tours`, `bookings`, `commission_ledger`, `payouts`, `reviews`, `tour_availability`, `users/profiles`), RLS policies para 4 roles, wrappers en `lib/queries/` (precursor de `packages/db`), cutover por dominio (catalog read → bookings con doble-escritura 1 sem → resto), ISR `/explorar` + `/tour/[slug]`, Realtime channel jalador con filter `jalador_id=eq.${id}`, materialized view `jalador_balances` refrescada cada 15min via pg_cron, Resend Edge Function para confirmacion booking.
- **PITFALLS addressed:** #5 cold-start (manual matchmaking estilo Airbnb 2008 mientras se migra), #6 atribucion jalador con cookie `lp_ref` 30 dias persistida en `bookings.jalador_ref_id`, hold-period resistance (pago instant mes 1-3, hold despues), WhatsApp ban (wa.me para manual, NO broadcasts desde server), connection pool (pooler URL transaction mode), burnout mitigation (FAQ + templates).

### Phase 3: Marketplace v2 (semanas 6-10, parcial overlap final con Fase 2)

**Rationale:** Una vez data layer limpio, deepening del marketplace es directo. Reviews/availability/cancelaciones requieren booking status machine (Fase 1) + ledger (Fase 1) + schema completo (Fase 2). Search con `unaccent` requiere extension SQL (Fase 2).

**Delivers:** Search potente, reviews verificadas, availability con cupos, cancelaciones self-service.

**Owns from each dimension:**
- **STACK:** Postgres FTS + `pg_trgm` + `unaccent` + GIN, NO migrar a Typesense/Algolia hasta > 5K tours.
- **FEATURES:** verified reviews (5-star + text optional, booking-gated), bidirectional reviews (operador rate turista privado), photo reviews, filter by date / "available today" / "available this weekend", duration / group-size / origin-city filters, 3-tier cancellation policies + self-service cancel + refund-via-Wompi, hold period T+24h post-tour-date release via pg_cron, dispute open + admin queue, jalador public ranking + sales count, auto-confirm vs request-to-book per tour, "operador verificado" badge tras RNT review, photo improvement assistant.
- **ARCHITECTURE:** `CREATE TEXT SEARCH CONFIGURATION spanish_unaccent`, columna `tsvector` generated stored, GIN index, RPC `search_tours(q)`. Tabla `tour_availability` con cupos por fecha + atomic decrement en RPC `create_booking`. Reversal entries en ledger para refunds. Materialized view ranking jaladores refrescada cada hora.
- **PITFALLS addressed:** operador malo (refund 100% inmediato + suspension automatica > 5% no-show + fondo garantia 10-20% primeros 5 tours), FTS sin unaccent, refund-after-payout (saldo negativo permitido hasta -$50K).

### Phase 4: Mobile (mes 3-5)

**Rationale:** App movil necesita backend consolidado (Fase 2) + data real con dinero fluyendo (Fase 1). Lanzar antes = 3 codebases sin web estable + bugs P0 multiplicados x3. Apple review puede demorar 1-2 semanas adicionales. Empezar con Android (Play Store horas vs Apple dias).

**Delivers:** App iOS+Android para jalador (foco) + turista, push notifications, offline tickets, QR check-in.

**Owns from each dimension:**
- **STACK:** Expo SDK 55 + React Native 0.83 + Hermes v1 + NativeWind + Expo Router. EAS Build Free (30 builds/mes). React 18 incompatible con Expo SDK 55 → **monorepo se inicia AQUI** (apps/web React 18, apps/mobile React 19, comparten `packages/types` + `packages/db`). NO Flutter, NO RN CLI puro, NO Capacitor.
- **FEATURES:** push notifications (commission earned, booking confirmed, tour starts in 3h), offline ticket / QR (cached service worker), operator QR check-in mode (cumple promesa original de digitalizar tiquetera), geolocation "tours cerca de ti", PWA basica primero (manifest + sw + install prompt), Web Share API + wa.me fallback, click-to-call from tour detail.
- **ARCHITECTURE:** Convertir `tourmarta-web` → `laperla/` monorepo Turborepo + pnpm workspaces (`apps/web`, `apps/mobile`, `packages/types`, `packages/db`, `packages/config`, `supabase/`). Mismo Supabase JS SDK con AsyncStorage adapter custom. Push tokens en tabla `device_tokens (user_id, expo_token, platform, last_seen)`. Edge Function `send-push` llama `https://exp.host/--/api/v2/push/send`. TanStack Query con `persistQueryClient` para offline.
- **PITFALLS addressed:** native antes de web stable (gate: cero P0 abiertos > 30 dias seguidos), bundle pesado low-end (Lighthouse mobile slow 4G > 80 bloqueante en CI, test real en Moto E COP $300K en escritorio).

### Phase Ordering Rationale

- **Wompi prod webhook ANTES de migrar data layer:** porque la webhook architecture (Edge Function + idempotency table) ya define el contrato con Supabase. Migrar data layer despues solo agrega rows a `webhook_events`, no reescribe.
- **Data layer ANTES de marketplace v2:** todos los features de v2 (search FTS, reviews verified, availability con stock atomic, cancellations) requieren schema canonico en Supabase. Construir search sobre Render legacy = trabajo descartable.
- **Data layer ANTES de mobile:** Supabase JS SDK corre identico en RN. Si mobile arranca antes, hay que escribir cliente HTTP para Render (codigo que se descarta en Fase 2).
- **Compliance (DIAN/RNT/Habeas Data) en Fase 1, NO post-launch:** Wompi reporta a DIAN en tiempo real; cruzas data sin facturas = sancion automatica. RNT es bloqueador legal, no cosmetico.
- **Multinivel referrals defer a Fase post-3:** requiere ledger limpio (Fase 1+2) + abogado especialista. Construirlo sobre 20% hardcoded = calcificar bad data shape.

### Research Flags

**Phases que necesitan research-phase deeper durante planning:**
- **Phase 1 — Wompi production:** verificar formula de signature integrity contra docs.wompi.co AL MOMENTO (cambian sin aviso), validar URL de webhook por ambiente (mezclar prod/sandbox = data corrupta), confirmar cobertura PSE Bancolombia + Nequi en Wompi Colombia 2026, leer Wompi terms para hold-period chargeback window real.
- **Phase 1 — DIAN factura electronica:** decidir Modelo A vs B con contador colombiano, verificar pricing actual Alegra/Siigo/Facture (varia mucho), confirmar RUT responsabilidades de La Perla S.A.S.
- **Phase 3 — Cancellation/refund flow Wompi reverse:** validar API de refund Wompi para refunds parciales, confirmar evento `transaction.refunded` o si es solo `transaction.updated` con status VOIDED.
- **Phase 4 — Apple App Store review:** preparar carta Wompi explicando que tours son servicios fisicos (exempt de IAP 30%), tener screenshots de WebView, anticipar guideline 3.1.1 rejection.

**Phases con patrones estandar (research baseline suficiente):**
- **Phase 2 — Data layer Supabase:** patron Stripe-webhook + RLS multi-tenant + repository wrapper estan documentados oficial; ejecutar segun docs.
- **Phase 3 — Postgres FTS spanish_unaccent:** patron documentado en docs PostgreSQL + Supabase.
- **Phase 3 — Reviews verified:** patron Airbnb/Booking standard, RLS-gated por `bookings.status = 'completed'`.

**Decisiones que requieren research adicional CON FUENTE NO TECNICA:**
- Multinivel jalador → jalador legalidad (abogado SuperSociedades especialista, NO research web)
- Hold period jalador resistance real (validacion con jaladores reales en mes 1-2, NO suposicion)
- Foreign tourist traffic % (analytics post-launch, decide Bilingual EN/ES)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Wompi formulas validadas en docs.wompi.co directos; Sentry v10.50.0 publicado 2026-04-23; Expo SDK 55 changelog verificado; testing stack es industria standard. Unica duda media: search engine threshold real (depende de scale post-launch). |
| Features | MEDIUM | Tabla stakes HIGH (patron Airbnb/Booking/Rappi/Mercado Libre); diferenciadores MEDIUM (training data + brief, no field study Santa Marta); compliance LOW-MEDIUM (regulacion colombiana evoluciona, **flag para legal review pre-prod**). |
| Architecture | HIGH | Patron Supabase end-to-end documentado oficial; webhook idempotency + ledger inmutable son fintech standard; T3 Turbo + Vercel template para monorepo Next+Expo es referencia; RLS multi-tenant validado. Unica duda media: politica T+24h post-tour requiere validacion con jaladores reales (tecnicamente trivial cambiar). |
| Pitfalls | MEDIUM-HIGH | Wompi gotchas y RLS patterns HIGH; Airbnb EJ-incident y Rappi cold-start HIGH; YC burnout patterns MEDIUM (timeline mes-specifico); pricing exacto WhatsApp Cloud API + Alegra/Siigo MEDIUM (revalidar antes de Fase 1); Apple review-cycle MEDIUM (varia historicamente). |

**Overall confidence:** MEDIUM-HIGH. Las decisiones tecnicas estan ancladas en docs oficiales; las decisiones de producto en patrones replicados de marketplaces probados; las decisiones de compliance requieren validacion legal antes de produccion (NO post-launch).

### Gaps to Address

**Business decisions pending (NO tecnicas):**
- Platform fee % exacto (PROJECT.md dice 5-10%, validar contra Wompi 2.99% + IVA + DIAN factura cost para que sobre margen)
- Hold-period exacto T+24h vs T+72h vs match-Wompi-chargeback-window (necesita Wompi terms read + jalador validation)
- Referral multinivel: 1 nivel vs 2 niveles? % override exacto? duracion override (3 vs 6 meses)? — **abogado SuperSociedades antes de cualquier decision**

**Technical decisions pending:**
- Wompi split-payment vs ledger-and-disburse: ¿Wompi soporta multi-recipient nativo en transaccion o La Perla agrega y re-disburse? Architecturalmente significativo. Validar con Wompi sales antes de Fase 1.
- DIAN factura volumen threshold: ¿cuando es electronic invoicing legalmente requerido vs nice-to-have para marketplace operando como merchant of record? Contador colombiano.
- Cookie attribution domain: ¿`lp_ref` con `Domain=.tourmarta.co` para subdomains o solo apex? Decision dependiente de subdomain strategy.

**Legal decisions pending (BLOQUEANTES, NO defer):**
- DIAN factura Modelo A (La Perla factura turista, paga operador con factura propia) vs Modelo B (operador factura turista, La Perla solo factura fee al operador). **Recomendado B por simplicidad** pero validar con contador.
- Multinivel referral programa legal vs piramide ilegal — **abogado SuperSociedades especialista, NO ChatGPT, NO research web**
- Treatment de jalador: independent commission agent (correcto) vs employee (trigger labor law). Lenguaje T&C debe ser explicito.
- Habeas Data RNBD registro ante SIC + politica publicada antes de cualquier indexacion publica

**Validation pending durante implementacion:**
- Operadores reales aceptan modelo B factura electronica?
- Jaladores reales toleran hold-period despues de mes 3?
- Tourist conversion delta entre instant-book vs request-to-book per tour?
- Catalogo crece > 5K tours en mes 6 → trigger evaluacion Typesense?
- Bandwidth Supabase > 2GB/mes → trigger Pro upgrade?

## Sources

### Primary (HIGH confidence)
- `docs.wompi.co` (Eventos, Widget & Checkout, Ambientes y Llaves, API Reference)
- `docs.expo.dev/changelog/sdk-55`
- `docs.sentry.io/platforms/javascript/guides/nextjs/`
- `supabase.com/docs/guides/functions/examples/stripe-webhooks`
- `supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac`
- `supabase.com/docs/guides/realtime/pricing`
- `postgresql.org/docs/current/textsearch-indexes.html`
- `vercel.com/templates/next.js/turborepo-react-native`
- `rntsiturweb.mincit.gov.co`
- Ley 1581/2012 (Habeas Data Colombia), Ley 1700/2013 (multinivel), Ley 1480/2011 (Estatuto del Consumidor), DIAN resolution 042/2020

### Secondary (MEDIUM confidence)
- Brian Chesky writings sobre Airbnb early days + EJ incident 2011
- Press articles colombianos 2015-2017 sobre Rappi cold-start
- SIC sancion Rappi 2020 por Habeas Data
- YC essays on solo-founder burnout windows
- WhatsApp Cloud API pricing Meta para Colombia 2025-2026
- Alegra/Siigo pricing API REST factura electronica
- Apple App Store Review Guidelines 3.1.1 / 3.1.5

### Tertiary (LOW confidence — requiere validacion)
- Hold-period jalador cultural acceptance
- DIAN Modelo A vs B optimo para marketplace tourism
- Multinivel jalador → jalador estructura legal especifica
- Wompi split-payment native vs ledger-and-disburse
- Connection pool exhaustion exact threshold en Supabase Free

### Local references
- `.planning/PROJECT.md` — domain rules, monetization, scope, constraints
- `.planning/codebase/CONCERNS.md` — bugs latentes
- `.planning/codebase/STRUCTURE.md` — current implementation surface
- `.planning/codebase/INTEGRATIONS.md` — current backends, token mismatch documented
- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` — full research detail

---
*Research completed: 2026-04-25*
*Ready for roadmap: yes*
