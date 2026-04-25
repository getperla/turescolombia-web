# Stack Research

**Domain:** Marketplace de turismo informal digitalizado (Colombia / Santa Marta) — pagos en COP, app movil, growth de jaladores, marketplace v2
**Researched:** 2026-04-25
**Confidence:** HIGH (Wompi, Sentry, testing) / MEDIUM (mobile decision, push) / MEDIUM-LOW (search engine — depende de scale real post-launch)

---

## Tabla resumen — decisiones rapidas

| Area | Recomendacion | Confianza | Costo |
|------|--------------|-----------|-------|
| Wompi prod | Web Checkout redirect (server-side integrity) + webhook validator | HIGH | 2.99% + IVA por transaccion |
| Mobile | **Expo SDK 55 + React Native 0.83** | MEDIUM-HIGH | Gratis (EAS Free tier ok hasta build 30/mes) |
| Monitoring | **@sentry/nextjs ^10.50.0** | HIGH | Gratis 5K errores/mes |
| Search v1 | **Supabase pg_trgm + tsvector** (catalogo < 1000) | MEDIUM | Incluido |
| Search v2 | Migrar a **Typesense Cloud** si > 5K tours o typo-tolerance critica | MEDIUM | $29/mes |
| Push (web) | **Web Push API + service worker propio** | MEDIUM | Gratis |
| Push (mobile) | **Expo Push Notifications** (gratis, escala con FCM/APNs) | HIGH | Gratis hasta 600 msg/sec |
| Imagenes | **Mantener Vercel + Supabase Storage** (no mover) | HIGH | Free tier alcanza fase 1 |
| Testing | **Vitest 3 + Playwright 1.50+ + Testing Library** | HIGH | Gratis |

---

## Recommended Stack

### Core Technologies (additions to existing Next 16 + Supabase + Wompi)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@sentry/nextjs` | `^10.50.0` (Apr 2026) | Error tracking + performance | Unica integracion Next 16 / Turbopack mantenida oficialmente. Setup limpio con `instrumentation.ts`. 5K errores gratis cubren launch beta. |
| `expo` | `~55.0.0` (Feb 2026, RN 0.83) | Mobile app cross-platform | Stack ya es React + TS. SDK 55 trae New Architecture obligatoria, Hermes v1, AI Agent Skills oficiales para Claude Code. EAS Update permite OTA sin pasar por App Store. |
| `vitest` | `^3.0.0` | Unit + integration tests | Browser-native, ESM-first, compatible con Next 16 + Turbopack sin Jest fricciones. Watch mode 10x mas rapido que Jest. |
| `@playwright/test` | `^1.50.0` | E2E tests | Standard de facto para Next.js E2E (incluso recomendado por Next docs). Cubre Server Components que Vitest no puede testear. |
| `web-push` (opcional fase 1) | `^3.6.7` | Push notifications web | Estandar W3C, sin vendor lock-in. Funciona en iOS 16.4+ si app esta agregada a home screen. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | `^16.0.0` | Component testing | Cualquier test de componente que use hooks/props |
| `@testing-library/jest-dom` | `^6.0.0` | DOM matchers (`toBeInTheDocument`) | Junto con Vitest |
| `@testing-library/user-event` | `^14.5.0` | Simular interaccion realista | Tests de formularios (login, booking, registro jalador) |
| `msw` | `^2.6.0` | Mock Service Worker para tests | Mockear Supabase + legacy API en integration tests sin tocar red |
| `jsdom` | `^25.0.0` | DOM env para Vitest | Default en `vitest.config.ts` cuando no se usa browser mode |
| `expo-notifications` | viene con Expo SDK 55 | Push para mobile | App movil (jalador, operador) |
| `expo-router` | `~4.0.0` (compatible SDK 55) | File-based routing en RN | Si se elige Expo, router-by-files mantiene mental model parecido a Next |
| `crypto` (Node builtin) | — | SHA256 para integrity Wompi | Calcular signature del checkout server-side (NUNCA en cliente) |
| `pg_trgm` (Postgres extension) | viene con Supabase | Fuzzy search nombres de tour | Search v1 (catalogo < 1000) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest UI | Watch mode visual | `npm i -D @vitest/ui` — interfaz para ver tests en navegador |
| Playwright Codegen | Grabar tests E2E | `npx playwright codegen localhost:3000` — genera codigo viendo browser real |
| Sentry CLI | Subir source maps + crear releases | Vercel integration lo hace automatico, no se necesita CLI manual |
| EAS CLI | Build + submit para iOS/Android | `npm i -g eas-cli`. EAS Free permite 30 builds/mes (alcanza para iteracion beta) |

---

## 1. Wompi production integration — DEEP DIVE

**Decision:** Mantener arquitectura actual de redirect (`getWompiCheckoutUrl()` en `lib/wompi.ts`), pero agregar:

1. **Server-side endpoint para generar integrity signature** — actualmente esta hardcodeado el sandbox key en cliente, lo cual NO sirve en produccion porque el integrity secret debe firmarse server-side.
2. **Webhook receiver** en `pages/api/webhooks/wompi.ts` que valide `X-Event-Checksum`.
3. **Sacar el `SANDBOX_KEY` hardcoded** de `lib/wompi.ts:18` — en prod debe venir solo de env.

### Como funciona en produccion (validado contra docs oficiales)

| Concepto | Sandbox | Production |
|----------|---------|------------|
| Public key prefix | `pub_test_` / `pub_stagtest_` | `pub_prod_` |
| Private key prefix | `prv_test_` | `prv_prod_` |
| Integrity secret prefix | `test_integrity_` | `prod_integrity_` |
| Events secret prefix | `test_events_` | `prod_events_` |
| Checkout URL | `https://checkout.wompi.co/p/?...` (mismo) | `https://checkout.wompi.co/p/?...` (mismo) |
| API base | `https://sandbox.wompi.co/v1/` | `https://production.wompi.co/v1/` |

### Integrity signature — formula exacta

**Concatenacion (sin separadores):** `<reference><amount-in-cents><currency><integrity-secret>`

Si se usa `expiration-time`: `<reference><amount-in-cents><currency><expiration-date><integrity-secret>`

Hash: SHA256, hex, lowercase.

**CRITICO:** Esto debe pasarse al checkout via parametro `&signature:integrity=<hash>` y debe calcularse en un endpoint Next API (server-side) — NUNCA exponer el `integrity_secret` al cliente.

### Webhook validation — formula exacta

Header: `X-Event-Checksum`

Algoritmo: SHA256 del concatenado de:
- valores de `signature.properties` (en el orden del array, accediendo por dot-notation: `transaction.id`, `transaction.status`, `transaction.amount_in_cents`)
- `+ timestamp` (Unix integer del campo `timestamp` del payload)
- `+ events_secret`

Si el hash calculado coincide con `X-Event-Checksum`, el evento es valido.

### Eventos que Wompi envia

- `transaction.updated` — cada cambio de estado: `APPROVED | DECLINED | VOIDED | ERROR | PENDING`
- `nequi_token.updated` — Nequi (relevante porque jaladores y turistas locales usan Nequi masivamente)
- `bancolombia_transfer_token.updated` — PSE Bancolombia

### Gotchas confirmados

| Gotcha | Impacto | Mitigacion |
|--------|---------|------------|
| Redirect-url **NO** es fuente de verdad | Usuario puede cerrar tab y la booking queda colgada | Booking se confirma SOLO via webhook, no via `pages/pago-resultado.tsx` |
| URLs de eventos por ambiente separadas | Mezclar prod/sandbox = data corrupta | Configurar dos URLs distintas en dashboard de Wompi |
| Acceptance tokens caducan en ~30 min | Si checkout demora, falla | El widget/checkout web ya los maneja; solo importa si se va a API directa |
| COP no usa decimales | $50.000 COP = `5000000` (en cents) | Multiplicar siempre por 100 antes de mandar |
| Wompi cobra 2.99% + IVA | Margen del fee de La Perla afectado | El fee de La Perla debe ser >= 5% para que sobre algo despues de Wompi |

### Cambios concretos en codigo

```
lib/wompi.ts:                  remover SANDBOX_KEY hardcoded
pages/api/wompi/sign.ts:       NUEVO — calcula integrity signature server-side
pages/api/webhooks/wompi.ts:   NUEVO — recibe + valida X-Event-Checksum
                                       — actualiza booking status en DB
pages/pago-resultado.tsx:      mostrar "verificando con Wompi" hasta que webhook llegue;
                                no dar booking por confirmada solo por redirect
```

**Confidence:** HIGH (formulas validadas directo en docs.wompi.co, no de memoria)

---

## 2. Mobile decision — Expo SDK 55 (recomendado)

**Verdict: Expo + React Native.** Sigue los criterios reales del proyecto:

| Criterio | Expo/RN | Flutter | PWA reforzada |
|----------|---------|---------|---------------|
| Reutilizacion de codigo TS/React existente | ALTA (logica de `lib/`, hooks, validaciones se portan) | NULA (Dart) | TOTAL (es la web) |
| Curva para 1 dev TS+Next | Baja | Alta (Dart + nuevo paradigma) | Cero |
| APK size en bajo gama Android | ~8MB hello-world (Hermes) | ~5.6MB hello-world | 0MB (instala desde browser) |
| Cold start low-end | ~350ms (RN+Hermes 0.83) | ~250ms | depende del navegador |
| iOS push sin friccion | Si (APNs via Expo) | Si | Solo si user agrega a home screen + iOS 16.4+ |
| OTA updates sin App Store | Si (EAS Update) | No nativo (necesita Shorebird) | Trivial (es web) |
| Tiempo a primer build | 1-2 dias | 1-2 semanas | horas |
| Distribucion en Play/App Store | Si | Si | TWA en Play (no App Store) |

**Razon de fondo:** Para 1 dev con stack TS+React, Expo permite reutilizar `lib/api.ts`, `lib/wompi.ts`, validaciones, tipos, e incluso copiar componentes de UI (con Native equivalents). Flutter requiere reescritura completa en Dart — bloqueador para equipo de 1.

**Sub-decision: Expo SDK 55, no SDK 54.**
- SDK 55 (Feb 2026) es el ultimo con AI Agent Skills oficiales para Claude Code (relevante para tu workflow).
- New Architecture obligatoria — eso simplifica decisiones futuras.
- React Native 0.83 + Hermes v1 = mejor performance en bajo gama.

**Sub-decision: NO empezar con PWA reforzada como sustituto.**
- iOS Push solo funciona si el usuario agrega manualmente a home screen — friccion altisima para jaladores en Santa Marta.
- En LATAM hay 30% de desconfianza en apps que se instalan desde browser (Accenture 2025) — Play Store da legitimidad.
- TWA en Play Store es opcion intermedia pero pierde push iOS y Apple ya no admite PWA standalone en EU.

**Plan de transicion:**
1. PWA basica AHORA (manifest + service worker + Web Push para web) — costo cero.
2. Mobile app con Expo SDK 55 a partir de mes 3 (despues de marketplace v2).
3. Reusar `lib/wompi.ts` (logica) en RN — checkout web abre en `WebView` o redirige a navegador del sistema.

**Que NO hacer:**
- NO usar React Native CLI puro (sin Expo) — la productividad de 1 dev se hunde.
- NO usar Capacitor / Ionic — el bundle es pesado y la integracion con APIs nativas es peor.
- NO Flutter — no hay reuso del codebase actual.

**Confidence:** MEDIUM-HIGH. La unica fuente de duda es el budget de App Store ($99/ano) + Apple Developer Program y el tiempo de aprobacion (1-2 semanas la primera vez).

---

## 3. Monitoring — @sentry/nextjs v10

**Verdict: Sentry, no alternativa.**

| Opcion | Por que (no) |
|--------|--------------|
| **Sentry** | Unica con soporte oficial Next 16 + Turbopack. Source maps automaticos via Vercel integration. Free tier suficiente para launch beta. |
| Datadog | Overkill, $15/host/mes minimo, no free tier real para errors. |
| LogRocket | Session replay caro, no esta optimizado para Next 16 server actions. |
| Vercel Analytics + Logs | Insuficiente — no tiene stack traces ni grouping de errores. |
| Highlight.io | Open source, pero menos integraciones; el equipo es 1 dev — no hay tiempo para self-host. |

### Setup minimo Next 16

```
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Genera:
- `instrumentation-client.ts` — init cliente
- `sentry.server.config.ts` — init server
- `sentry.edge.config.ts` — init edge runtime
- `next.config.js` wrapping con `withSentryConfig`

### Free tier limits (verificar al setup)

- 5,000 errores/mes
- 10,000 performance units/mes
- 50 session replays/mes
- 1 project, 1 user
- 30 dias retention

**Para launch beta de La Perla:** alcanza sin esfuerzo. Si llega a > 5K errores/mes, primero hay que arreglar los errores, no pagar Sentry.

**Plan de upgrade:** si crece, Team plan $26/mes da 50K errors. Pero antes de pagar, configurar `tracesSampleRate: 0.1` (10% sample) y filtrar errores benignos con `beforeSend`.

**Confidence:** HIGH (validado en docs Sentry + GitHub releases — v10.50.0 publicado 2026-04-23).

---

## 4. Search para marketplace v2

**Verdict v1 (catalogo < 1000 tours): Supabase pg_trgm + tsvector.**

### Por que NO Algolia / Typesense / MeiliSearch en v1

- Catalogo es < 1000 items. Buscar en Postgres es < 50ms con indices apropiados.
- Cada nuevo backend = nuevo punto de fallo + sync issues (Postgres → search engine).
- Algolia: costoso ($500/mes minimo en plan estandar para producto serio).
- Typesense Cloud: $29/mes minimo. Bueno cuando crezca, no ahora.
- MeiliSearch self-hosted: requiere VPS, monitoring, backups — overkill para 1 dev.

### Setup pg_trgm en Supabase

```sql
create extension if not exists pg_trgm;

create index tours_name_trgm_idx on tours using gin (name gin_trgm_ops);
create index tours_description_trgm_idx on tours using gin (description gin_trgm_ops);

-- tsvector para full-text en espanol
alter table tours add column search_tsv tsvector
  generated always as (
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
  ) stored;

create index tours_search_tsv_idx on tours using gin (search_tsv);
```

### Cuando migrar a Typesense Cloud ($29/mes)

- > 5,000 tours O
- typo-tolerance se vuelve critica (turistas escriben "tairona" buscando "Tayrona") — pg_trgm lo maneja parcialmente con similitud, no perfecto O
- queries con filtros complejos (precio + zona + rating + fecha) tardan > 200ms

**Trigger explicito:** medir p95 latency con Sentry. Si > 500ms en `/explorar`, evaluar migracion.

**Confidence:** MEDIUM. La duda es si los turistas tipean con tildes ("tayrona" vs "tairona") — pg_trgm maneja bien similitud, pero no es perfecto en espanol con stopwords.

---

## 5. Notifications

### Web (jalador en navegador, dashboard operador)

**Verdict: Web Push API + service worker propio + Supabase como trigger.**

```
pages/api/notifications/subscribe.ts  — registra PushSubscription en Supabase
public/sw.js                          — service worker que recibe push
lib/notifications.ts                  — cliente: register SW + ask permission
supabase/functions/send-push/         — edge function que envia a endpoints Web Push
```

### Mobile (cuando exista app)

**Verdict: Expo Push Notifications (gratis, ilimitado hasta 600 msg/sec).**

- Wraps APNs (iOS) + FCM (Android) — un solo API
- Token de Expo, no manejas certificados de Apple
- Integra con Supabase Edge Functions facilmente

### Por que NO OneSignal en fase 1

- $9/mes minimo a partir de 10K subscribers — fee inutil cuando empezas
- Su valor es analytics + segmentation; en fase 1 son overkill
- Vendor lock-in: migrar despues es doloroso

### Cuando considerar OneSignal

- Cuando equipo de marketing/CRM exista (no hay actualmente, La Perla es 1 dev)
- Cuando se requieran A/B tests de copy en notificaciones
- Cuando subscribers > 50K y hay valor en analytics agregado

**Confidence:** MEDIUM. Web Push en iOS solo funciona en home-screen apps — para iOS la app movil es el camino real, no PWA.

---

## 6. Image hosting — mantener Vercel + Supabase Storage

**Verdict: NO mover. La arquitectura actual es correcta.**

### Como esta hoy

- `next.config.js` whitelist: `images.unsplash.com`, `*.supabase.co`
- `<Image>` de Next con `images.formats: ['avif', 'webp']` y 60-day cache
- Imagenes de tours subidas a Supabase Storage; demo usa Unsplash

### Free tier alcanza para fase 1

| Limit | Vercel Hobby | Supabase Free |
|-------|--------------|---------------|
| Image transformations/mes | 5,000 | (Supabase no transforma — sirve raw) |
| Image cache reads/mes | 300,000 | — |
| Image cache writes/mes | 100,000 | — |
| Storage | — | 1 GB |
| Bandwidth | — | 5 GB cached + 5 GB uncached/mes |

Con ~17 tours actuales y galleries de 5-10 imagenes, esto es < 200 imagenes optimizadas = lejos del limit.

### Cuando upgradear

- Vercel Pro ($20/mes): cuando trafico organico llega a > 50K visitors/mes (cada vista de tour consume cache reads)
- Supabase Pro ($25/mes): cuando catalogo > 100 operadores subiendo galleries propias (storage > 1GB)

### Optimizaciones gratuitas para retrasar upgrade

1. Comprimir imagenes antes de subir a Supabase (operador upload flow → resize en cliente)
2. Setear `<Image priority>` solo en hero del tour, lazy en el resto
3. Limitar gallery a 10 imagenes max por tour (no 30)

**Confidence:** HIGH

---

## 7. Testing — minimum viable stack

**Verdict: Vitest 3 (unit + integration) + Playwright (E2E). NO Jest.**

### Por que NO Jest

- Jest 30 + ESM + Next 16 + Turbopack = configuracion fragil con `transformIgnorePatterns` y `swc-jest`
- Vitest es ESM-first, trabaja con TS sin compilacion extra
- Vitest watch mode 5-10x mas rapido en mismas pruebas

### Por que Vitest + Playwright (no solo Playwright)

- E2E (Playwright) toma 10-30s por test, no escalan a 100+
- Unit tests (Vitest) corren en < 1s todos juntos
- TDD real solo es viable con Vitest; Playwright es para criticos del negocio

### Setup

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw \
  @playwright/test playwright

npx playwright install --with-deps chromium
```

### Estructura propuesta

```
__tests__/
├── unit/
│   ├── lib/wompi.test.ts        — calc integrity signature
│   ├── lib/api.test.ts          — request wrapper, demo mode short-circuit
│   └── lib/auth.test.tsx        — useAuth hook
├── integration/
│   └── api/webhooks/wompi.test.ts — webhook validation con payload real
├── e2e/
│   ├── booking.spec.ts          — flujo completo: explorar → tour → pago
│   ├── jalador-magic.spec.ts    — magic-login + redirect a dashboard
│   └── admin-approval.spec.ts   — admin aprueba operador
vitest.config.ts
playwright.config.ts
```

### Coverage targets realistas (no 80% de golpe)

| Fase | Target |
|------|--------|
| Pre-launch (esta semana) | E2E del flujo critico booking → pago. Solo eso. |
| Estabilizacion (semanas 1-3) | + integration tests de Wompi webhook. |
| Crecimiento (mes 2) | + unit tests de `lib/*` (logica de negocio). 50% coverage. |
| Marketplace v2 (mes 3-4) | 80% coverage de `lib/`, E2E de search + reviews. |

**No buscar 80% el primer mes** — la inversion de testear codigo legacy supera el valor; testear lo nuevo y los criticos.

**Confidence:** HIGH

---

## Installation (todo el stack nuevo de una)

```bash
# Monitoring
npm install @sentry/nextjs

# Testing
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw \
  @playwright/test playwright
npx playwright install --with-deps chromium

# Mobile (cuando llegue la fase, en proyecto separado /apps/mobile)
npm create expo-app@latest laperla-app -- --template blank-typescript
cd laperla-app
npx expo install expo-notifications expo-router

# Web push (fase 1, opcional pero recomendado)
npm install web-push
npm install -D @types/web-push
```

---

## Alternatives Considered

| Recomendado | Alternativa | Cuando preferir alternativa |
|-------------|-------------|----------------------------|
| Expo SDK 55 | Flutter 3.32 | Si el equipo creciera a 3+ devs y hubiera tiempo de re-aprender Dart. Hoy: NO. |
| Expo SDK 55 | React Native CLI puro | Si se necesitan modulos nativos no soportados por Expo (raro). Hoy: NO. |
| Expo SDK 55 | Capacitor (web → native wrapper) | Si la web app fuera ya 100% mobile-first y solo necesitaras shell de app store. Hoy: NO (la web no esta optimizada para movil aun). |
| Sentry | Highlight.io (open source) | Si privacy es critica y hay infra para self-host. Hoy: NO (1 dev, no hay infra). |
| Supabase pg_trgm | Typesense Cloud | Cuando catalogo > 5K items o typo-tolerance critica. Migrar en marketplace v3. |
| Supabase pg_trgm | Algolia | Solo si hay budget > $500/mes y necesitas search-as-a-service multi-region. Hoy: NO. |
| Vitest | Jest 30 | Si el ecosistema de tests existente fuera Jest puro y migrar costara 1 semana. Aqui: NO (zero coverage). |
| Web Push + Expo Push | OneSignal | Cuando equipo de marketing exista y subscribers > 50K. Hoy: NO. |
| Vercel + Supabase Storage | Cloudinary | Si necesitas transformaciones complejas (face detect, AR filters). Hoy: NO. |
| Vercel + Supabase Storage | Cloudflare R2 + Images | Cuando bandwidth > 250GB/mes y Supabase Pro no es suficiente. Probable mes 6+. |

---

## What NOT to Use

| Avoid | Por que | Use Instead |
|-------|---------|-------------|
| Hardcoded `SANDBOX_KEY` en `lib/wompi.ts:18` | En prod, expone que el codigo no fue limpiado; mantenibilidad | Solo `process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY` con fallback `''` |
| Calcular integrity signature en cliente | Expone `integrity_secret` = catastrofe de seguridad | Endpoint Next API server-side `/api/wompi/sign` |
| Confiar en `redirect_url` para confirmar pago | Wompi explicitamente dice "do not use as validation" | Webhook `transaction.updated` con validacion de checksum |
| Algolia plan Standard ($500/mes) | Overkill total para < 5K items | pg_trgm en Supabase, gratis |
| Jest 30 + Next 16 | Friccion con Turbopack + ESM, lento | Vitest 3 |
| OneSignal en fase 1 | $9/mes minimo, lock-in | Web Push API estandar + Expo Push (gratis) |
| Flutter | No reuso de logica TypeScript existente, equipo de 1 | Expo SDK 55 |
| PWA como sustituto de app movil | Push iOS roto sin home-screen install, desconfianza usuarios LATAM | PWA basica + Expo app nativa |
| Datadog | $15/host/mes, free tier no aplica a errors | Sentry |
| LogRocket | Session replay no critico fase 1, caro | Sentry replays (50/mes free) |
| Cloudinary | Sobre-engineering para gallery de tours | Vercel Image + Supabase Storage |
| Self-hosted MeiliSearch | Requiere VPS + monitoring + backups | pg_trgm primero, Typesense Cloud despues |

---

## Stack Patterns by Variant

**Si la beta cierra exitosa (mes 1) y hay > 100 jaladores activos:**
- Subir a Vercel Pro ($20/mes) — proteger contra cold starts
- Subir a Supabase Pro ($25/mes) — daily backups + 100GB storage
- Empezar app mobile con Expo SDK 55

**Si el catalogo crece > 1000 tours en mes 4:**
- Migrar search a Typesense Cloud ($29/mes) — sync via Supabase trigger
- Indexar reviews tambien (no solo tours)

**Si se vuelve necesario sponsorear ranking/destacados:**
- Agregar `featured_score` y `paid_promotion_until` columns
- Logica de ranking en Postgres (no en search engine) para evitar gaming

**Si Apple rechaza la app por temas de pagos in-app:**
- Wompi Web Checkout via `WebView` o `Linking.openURL` (browser externo) — Apple permite pagos externos para servicios reales (tours), no virtual goods
- Documentar el flujo en App Store review notes en espanol

---

## Version Compatibility

| Package A | Compatible With | Notas |
|-----------|-----------------|-------|
| `next@16.2.4` | `@sentry/nextjs@^10.50.0` | Requiere `instrumentation.ts` (no `_app.ts` setup) |
| `next@16.2.4` | `@sentry/nextjs >=10.43.0` | Soporte Turbopack stable |
| `expo@~55.0.0` | `react-native@0.83.x` | New Architecture obligatoria |
| `expo@~55.0.0` | `react@19.0.0` | NO React 18 — incompatible |
| `vitest@^3` | `@vitejs/plugin-react@^4.3` | Plugin react debe ser >=4.3 para Vitest 3 |
| `@playwright/test@1.50` | Node >=20 | Ya cumple (Node 24) |
| `@supabase/supabase-js@^2.103` | Postgres `pg_trgm` extension | Habilitar en SQL Editor de Supabase Dashboard |
| Wompi Widget script | Cualquier framework | URL `https://checkout.wompi.co/widget.js` no versionada |

**WARNINGS:**
- React 18.3 actual del proyecto **es incompatible con Expo SDK 55**. Para mobile habra que upgradear web a React 19 antes O mantener app mobile en repo separado con su propia version. **Recomendacion: repo separado** (mantener web estable).
- `tailwindcss@3.4.19` actual + `@tailwindcss/postcss@4.2.2` — ya esta en transicion v3→v4, no tocar en este milestone.

---

## Sources

### Wompi (HIGH confidence — docs oficiales)

- [Widget & Checkout Web | Wompi Docs](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/) — formula integrity, attributes del widget
- [Events | Wompi Docs](https://docs.wompi.co/en/docs/colombia/eventos/) — webhook signature, eventos disponibles
- [Environments and Keys | Wompi Docs](https://docs.wompi.co/en/docs/colombia/ambientes-y-llaves/) — prefijos sandbox/prod, base URLs
- [Acceptance tokens | Wompi Docs](https://docs.wompi.co/en/docs/colombia/tokens-de-aceptacion/) — privacy + personal data tokens
- [API Reference | Wompi Docs](https://docs.wompi.co/en/docs/colombia/referencia/) — POST /transactions con private key

### Sentry (HIGH confidence)

- [Next.js | Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — setup oficial
- [Manual Setup | Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) — `instrumentation.ts` workflow
- [Turbopack support for the Next.js SDK | Sentry Blog](https://blog.sentry.io/turbopack-support-next-js-sdk/) — version >=9.9.0 requerida (v10 ya supera)
- [getsentry/sentry-javascript Releases](https://github.com/getsentry/sentry-javascript/releases) — v10.50.0 publicado 2026-04-23

### Expo / React Native (HIGH confidence)

- [Expo SDK 55 - Expo Changelog](https://expo.dev/changelog/sdk-55) — RN 0.83, Hermes v1, AI Agent Skills
- [Expo SDK 54 - Expo Changelog](https://expo.dev/changelog/sdk-54) — comparacion con 55
- [React Native's New Architecture - Expo Documentation](https://docs.expo.dev/guides/new-architecture/) — obligatoria SDK 55+

### Flutter (para descartar) (MEDIUM)

- [Flutter 3.32 release notes](https://docs.flutter.dev/release/release-notes/release-notes-3.32.0) — Impeller mejoras, hot reload web
- [What's new in Flutter 3.32](https://blog.flutter.dev/whats-new-in-flutter-3-32-40c1086bab6e) — performance metrics

### Search (MEDIUM-HIGH)

- [Postgres Full Text Search vs the rest | Supabase Blog](https://supabase.com/blog/postgres-full-text-search-vs-the-rest) — Supabase recomendando pg_trgm
- [PostgreSQL Full-Text Search vs Dedicated Search Engines | Nomadz](https://nomadz.pl/en/blog/postgres-full-text-search-or-meilisearch-vs-typesense) — comparacion neutral
- [Syncing Supabase with Typesense | Typesense](https://typesense.org/docs/guide/supabase-full-text-search.html) — path de migracion futuro

### Push Notifications (MEDIUM)

- [Using push notifications - Expo Documentation](https://docs.expo.dev/guides/using-push-notifications-services/) — 600 msg/sec limit
- [Sending Push Notifications | Supabase Docs](https://supabase.com/docs/guides/functions/examples/push-notifications) — edge function pattern
- [PWA iOS Limitations and Safari Support [2026] | MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS 16.4+ home screen requirement
- [Firebase FCM vs OneSignal Push: Push Notification Provider Comparison [2026]](https://www.courier.com/integrations/compare/firebase-fcm-vs-onesignal-push) — pricing OneSignal

### Hosting / Imagenes (HIGH)

- [Limits and Pricing for Image Optimization | Vercel](https://vercel.com/docs/image-optimization/limits-and-pricing) — Hobby 5K transformations
- [Pricing & Fees | Supabase](https://supabase.com/pricing) — Free tier 1GB storage / 5GB bandwidth
- [Vercel Pricing 2026: Plans, Costs & Real Usage Fees](https://checkthat.ai/brands/vercel/pricing) — Pro $20/mes

### Testing (HIGH)

- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest) — setup oficial
- [Testing: Playwright | Next.js](https://nextjs.org/docs/pages/guides/testing/playwright) — pages router (lo que usa La Perla)
- [Vitest vs Jest 30: Why 2026 is the Year of Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) — argumentos pro Vitest

---

*Stack research for: La Perla / TourMarta — brownfield Next 16 + Supabase + Wompi expandiendo a mobile + payments-in-prod + growth*
*Researched: 2026-04-25*
*Confidence overall: HIGH para Wompi/Sentry/testing/imagenes; MEDIUM-HIGH para mobile (Expo); MEDIUM para search/push (depende de scale real post-launch)*
