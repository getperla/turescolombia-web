# Architecture Research

**Domain:** Tourism marketplace (Colombia, B2C2C — turistas / jaladores / operadores / admin)
**Researched:** 2026-04-25
**Confidence:** HIGH (current codebase auditado) / MEDIUM (recomendaciones target — verificadas con docs oficiales recientes)

---

## TL;DR para roadmap

| Pregunta | Respuesta corta |
|---------|-----------------|
| Data layer | **Migrar todo a Supabase** progresivamente. Render API muere. |
| Pagos Wompi | **Webhook en Supabase Edge Function**, no en Vercel ni en cliente. |
| Comisiones | **3 tablas:** `bookings`, `commission_ledger`, `payouts`. Release en `T+24h post-tour-date`. |
| Mobile + Web | **Monorepo con Turborepo + pnpm workspaces.** Shared `@laperla/types` package. Cliente mobile usa Supabase JS SDK directo (mismo backend). |
| Realtime | **Supabase Realtime para jalador dashboard + bookings.** Web Push (PWA) + Expo Notifications para móvil. NO polling. |
| Search | **Postgres FTS + GIN + extensión `unaccent`** con dictionary `spanish`. Free, < 10k tours, sobra. |
| Boundaries | Monolito Next.js para UI. Edge Functions Supabase para webhooks/payouts/PDF. Resend (email) y wa.me deeplinks (no WhatsApp Business API en v1). |
| Caching | Vercel ISR para `/explorar` y `/tour/[slug]`. Sin Redis en v1. |
| Deploy | Vercel (web), EAS Build (mobile), Supabase (db + edge). |
| Observability | **Sentry** (free dev tier 5k errors) + Vercel Analytics + Supabase logs nativos. |

**Secuencia de migración recomendada (informa fases del roadmap):**

1. **Fase 1 — Estabilización Wompi prod** (semanas 1-3 post-launch). Webhook endpoint primero, antes de tocar data layer.
2. **Fase 2 — Migración data layer Render → Supabase** (semanas 4-7). Bloqueante para v2 marketplace y mobile.
3. **Fase 3 — Marketplace v2 features** (semanas 6-10, paralelo parcial con Fase 2 al final). Search + filters + reviews + availability.
4. **Fase 4 — Mobile** (mes 3-5). Solo cuando data layer ya esté en Supabase (compartir SDK).

Hacer Mobile antes de migrar data layer = duplicar trabajo de cliente HTTP contra Render. **No.**

---

## Standard Architecture (target post-migración)

### System Overview

```
                          ┌────────────────────────────────────────────┐
                          │              CLIENT TIER                    │
                          │                                             │
                          │  ┌──────────────────┐   ┌─────────────────┐│
                          │  │  Next.js 16 Web  │   │  Expo RN Mobile ││
                          │  │   (Vercel)       │   │   (iOS+Android) ││
                          │  └────────┬─────────┘   └────────┬────────┘│
                          └───────────┼───────────────────────┼────────┘
                                      │                       │
                                      │   Supabase JS SDK     │
                                      │   (auth + data + RT)  │
                                      ▼                       ▼
                          ┌────────────────────────────────────────────┐
                          │          SUPABASE BACKEND TIER              │
                          ├────────────────────────────────────────────┤
                          │                                             │
                          │  ┌─────────────┐  ┌──────────────────────┐ │
                          │  │   Auth      │  │  Edge Functions      │ │
                          │  │ (JWT + RLS) │  │  - wompi-webhook     │ │
                          │  └──────┬──────┘  │  - commission-release│ │
                          │         │         │  - send-email        │ │
                          │  ┌──────▼──────┐  │  - generate-ticket   │ │
                          │  │  Postgres   │◄─┤  - whatsapp-deeplink │ │
                          │  │  + RLS      │  └──────┬───────────────┘ │
                          │  │  + GIN/FTS  │         │                  │
                          │  │  + pg_cron  │         │                  │
                          │  └──────┬──────┘         │                  │
                          │         │                │                  │
                          │  ┌──────▼──────┐  ┌──────▼─────┐            │
                          │  │  Storage    │  │  Realtime  │            │
                          │  │  (images)   │  │  (channels)│            │
                          │  └─────────────┘  └────────────┘            │
                          └────────────────────────────────────────────┘
                                      │                       │
                                      ▼                       ▼
                          ┌──────────────┐         ┌──────────────────┐
                          │   Wompi      │         │  Resend (email)  │
                          │  webhook in  │         │  Sentry (errors) │
                          │  redirect out│         │  wa.me deeplink  │
                          └──────────────┘         └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Next.js Web** | Render UI (turista, jalador, operador, admin), SSR para SEO en `/explorar` y `/tour/[slug]`, client-side dashboards | Pages Router (mantener), ISR donde aplique |
| **Expo Mobile** | UI nativa para jalador (foco principal) y turista. Push notifs, share-to-WhatsApp. | Expo SDK 52+, mismo Supabase JS SDK |
| **Supabase Auth** | Único IdP. Email/password, Google OAuth, SMS OTP. Emite JWT con `role` en claims. | `auth.users` + `public.profiles` extension |
| **Supabase Postgres** | Dato canónico. Tours, bookings, comisiones, reviews, availability. RLS por rol. | Schema migrations vía Supabase CLI |
| **Supabase Realtime** | Push en vivo a dashboards (nueva venta del jalador, nuevo booking del operador). | `postgres_changes` + broadcast channels |
| **Supabase Edge Functions** | Trabajo server-side autenticado o externo. Webhook Wompi, release de comisiones (cron), envío de email, render de PDF/QR. | Deno runtime, deploy via CLI |
| **Supabase Storage** | Imágenes de tours, avatars, PDF tickets generados. | Buckets con RLS policies |
| **Vercel** | CDN + hosting Next.js. Edge runtime para `/api/og` (mantener). | No webhooks aquí — se mueven a Supabase |
| **Wompi** | Procesador de pagos. Checkout web + webhook events. | Mantener tal cual; webhook ahora apunta a Supabase Edge |
| **Resend** | Transactional email (confirmación booking, reset password). | Free tier 3k emails/month es suficiente para launch |
| **Sentry** | Error tracking web + mobile. | Free tier 5k errors/month |
| **wa.me** | Deeplinks para compartir en WhatsApp (no WhatsApp Business API en v1). | Strings concatenados, sin SDK |

---

## Recommended Project Structure (target — monorepo)

```
laperla/                              # repo nuevo (rename de tourmarta-web)
├── apps/
│   ├── web/                          # Next.js 16 (mover lo que hoy esta en tourmarta-web/)
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
│   └── mobile/                       # Expo SDK 52 (Fase 4)
│       ├── app/
│       └── components/
├── packages/
│   ├── types/                        # @laperla/types — shared TS types
│   │   ├── tour.ts
│   │   ├── booking.ts
│   │   ├── commission.ts
│   │   └── user.ts
│   ├── db/                           # @laperla/db — Supabase client + queries
│   │   ├── client.ts                 # createClient wrapper
│   │   ├── queries/
│   │   │   ├── tours.ts
│   │   │   ├── bookings.ts
│   │   │   └── commissions.ts
│   │   └── types.gen.ts              # supabase gen types typescript
│   ├── ui/                           # opcional — solo si web y mobile pueden compartir
│   └── config/                       # tsconfig, eslint shared
├── supabase/
│   ├── migrations/                   # SQL versionado
│   │   ├── 20260501_initial.sql
│   │   ├── 20260510_commissions.sql
│   │   └── 20260520_search.sql
│   ├── functions/                    # Edge Functions (Deno)
│   │   ├── wompi-webhook/
│   │   ├── commission-release/
│   │   ├── send-booking-email/
│   │   └── generate-ticket/
│   └── seed.sql
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Structure Rationale

- **`apps/web` y `apps/mobile`:** clientes UI separados que comparten `packages/*`. Evita el waterfall típico de "ahora reescribimos todos los queries para mobile".
- **`packages/types`:** TS puro (zero runtime), exportado por web y mobile. Genera desde el schema de Supabase con `supabase gen types typescript --project-id ...` y commit. Cualquier cambio de schema se ve compile-time.
- **`packages/db`:** wrappers de queries. La regla es: cliente NO escribe `supabase.from(...)` directo, llama a `getTours()`, `createBooking()`, etc. Esto permite cambiar implementación (RPC vs query directo, RLS vs Edge Function) sin tocar UI.
- **`supabase/`:** está en el root, no dentro de `apps/web`. Es infraestructura compartida.
- **`supabase/functions/`:** carpeta por función. Cada Edge Function se deploya independiente (`supabase functions deploy wompi-webhook`).
- **No empezar con monorepo si Fase 4 (mobile) se mueve.** Hacer la conversión a monorepo justo antes de mobile (no antes). Un dev solo no necesita Turborepo para correr una sola app.

---

## Data Layer Consolidation — la decisión más grande

### Las 3 opciones evaluadas

| Opción | Trabajo (1 dev) | Riesgo | Escalabilidad | Costo mensual |
|--------|----------------|--------|---------------|---------------|
| A. Mantener dual (Supabase auth + Render data) | Bajo (status quo) | **ALTO** — token mismatch ya documentado en INTEGRATIONS.md, dos backends que mantener, dos auth sources | Mala — cada feature nueva toca dos sistemas | Render Free → $7/mo + Supabase Free |
| B. Todo a Supabase | Medio (4-6 semanas dedicadas) | Medio — migración de data, escribir RLS policies | **Buena** — un solo backend, RLS hace 80% de la auth, Realtime y Storage gratis | Supabase Free → $25/mo Pro cuando justifique |
| C. Backend nuevo (NestJS / Hono / Go) | **Alto (8-12 semanas)** | Alto — reescribir todo, más infra que mantener | Excelente largo plazo | $7-20/mo Render/Fly + Supabase Free |

### Recomendación: **Opción B — Todo a Supabase**

**Por qué:**

1. **1 dev solo.** Cada hora gastada en infra es hora no gastada en producto. Supabase elimina: server, deploy, auth backend, file storage, realtime infra, cron (`pg_cron`), migrations tooling. Todo en un dashboard.
2. **RLS reemplaza ~80% del código de auth/authorization.** El backend Render hoy tiene `if (req.user.role === 'operator' && booking.operatorId === req.user.id)` en cada handler. RLS policy hace eso en SQL una vez.
3. **Realtime gratis.** Reemplaza polling de jalador dashboard sin escribir código.
4. **Token mismatch desaparece.** Hoy Supabase emite JWT que Render rechaza (documentado en INTEGRATIONS.md). Si Supabase es backend, Supabase es la única fuente de verdad de auth.
5. **Mobile shared SDK.** `@supabase/supabase-js` corre igual en web y RN. Fase 4 hereda.

**Por qué NO Opción C (backend nuevo):**
- 8-12 semanas para un dev solo es la mitad del milestone macro. Esa inversión se justifica solo si Supabase tiene un blocker fundamental — no lo tiene a esta escala.
- Las razones típicas para irse de Supabase (Postgres scaling extremo, queries complejas que RLS limita, costo del Pro tier > $200/mo) no aplican a < 10k bookings/mes.

### Migration path Render → Supabase (cuándo cambia qué)

```
Estado actual           Fase 1 (3 sem)        Fase 2 (4-7 sem)        Fase 3 (6-10 sem)
─────────────────       ─────────────────     ─────────────────       ─────────────────
Supabase: auth          Supabase: auth        Supabase: auth          Supabase: auth
Render: data            Render: data          Render: legacy read     Render: shutdown
Wompi: client           Wompi: webhook        Wompi: webhook          Wompi: webhook
                        en Supabase Edge      en Supabase Edge        en Supabase Edge
                                              Supabase: tours,        Supabase: ALL
                                              bookings (writes)        + search v2
```

**Estrategia de cutover por dominio (no big bang):**

1. **Tours catalog (read-heavy, easy):** export de Render → import a Supabase. Endpoint `getTours()` cambia primero porque es solo lectura, no rompe writes.
2. **Bookings (writes — cuidado):** período de doble-escritura: cuando se crea booking, se escribe a ambos backends durante 1 semana. Comparar consistencia. Cortar Render writes cuando todo OK.
3. **Reviews, availability, jaladores, operators:** uno por uno, mismo patrón.
4. **Auth profile data:** `users` table en Supabase ya existe (lo crea Auth). Poblar `public.profiles` con FK a `auth.users.id`.

**Trampa documentada:** Supabase deprecó (March 2026) el acceso al endpoint OpenAPI con anon key. Esto NO afecta el SDK normal, solo el endpoint `/rest/v1/` para tooling externo. ([Supabase changelog](https://supabase.com/changelog))

---

## Architectural Patterns

### Pattern 1: Single Source of Truth para Auth (RLS-first)

**What:** Toda authorization vive en Postgres como RLS policies. La UI no decide qué se puede leer; pregunta y la DB filtra.

**When:** Siempre que hay multi-tenancy o roles. Acá hay 4 roles (`tourist`, `jalador`, `operator`, `admin`).

**Trade-offs:**
- Pro: imposible olvidar un check de auth en un endpoint nuevo (no hay endpoints — hay queries directos).
- Pro: un solo lugar para auditar permisos.
- Con: SQL policies son más difíciles de testear que TS handlers. Mitigar con `pgTAP` o smoke tests por rol.
- Con: queries con RLS pueden ser lentos si las policies hacen subqueries pesados. Mitigar con índices y `SECURITY DEFINER` functions para casos hot.

**Example RLS para `bookings`:**

```sql
-- Bookings: turista ve solo las suyas, jalador las que vendio, operador las de sus tours, admin todo
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tourists_own_bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jaladores_own_sales" ON bookings
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM jaladores WHERE id = bookings.jalador_id)
  );

CREATE POLICY "operators_their_tours" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = bookings.tour_id
        AND tours.operator_id = (SELECT id FROM operators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_all_bookings" ON bookings
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin'
  );
```

### Pattern 2: Edge Function for Webhooks (NO Vercel API routes)

**What:** Wompi webhook → Supabase Edge Function → mutación en Postgres. NO Vercel.

**When:** Cualquier inbound webhook que tenga que escribir data canónica.

**Trade-offs:**
- Pro: Edge Function corre cerca de la DB (misma región Supabase). Webhook idempotency check es un upsert en una tabla de eventos — `1 RTT` vs `2-3 RTT` desde Vercel.
- Pro: si data layer es Supabase, no tiene sentido que Vercel haga de proxy a Supabase. Es un hop extra.
- Pro: el webhook secret de Wompi vive solo en Supabase (no expuesto en Vercel envvars).
- Con: Deno runtime — algunas libs de Node no funcionan, pero para Wompi (REST + crypto.subtle) sobra.
- Con: cold starts en Edge Functions. Mitigable con `pg_cron` keep-alive ping si se vuelve un problema (no en v1).

**Example (Wompi event handling):**

```typescript
// supabase/functions/wompi-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const event = await req.json()
  const signature = req.headers.get('x-event-checksum')

  // 1. Verify signature (Wompi: SHA256 of properties + timestamp + secret)
  if (!verifyWompiSignature(event, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role bypassea RLS
  )

  // 2. Idempotency check — Wompi entrega at-least-once
  const { error: dupErr } = await supabase
    .from('webhook_events')
    .insert({ id: event.signature.checksum, raw: event })
  if (dupErr?.code === '23505') return new Response('Already processed', { status: 200 })

  // 3. Mutate booking status based on event
  if (event.event === 'transaction.updated') {
    const { reference, status } = event.data.transaction
    await supabase.from('bookings')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('payment_reference', reference)
  }

  return new Response('OK', { status: 200 })
})
```

### Pattern 3: Commission Ledger (immutable + double-entry-ish)

**What:** Cada booking que llega a `payment_status: APPROVED` genera N filas inmutables en `commission_ledger`. Refunds generan filas inversas. Nunca se hace UPDATE a un ledger entry — solo INSERT.

**When:** Cualquier sistema de plata multi-actor. Acá: jalador 20%, operador ~70%, La Perla ~10%.

**Trade-offs:**
- Pro: auditoría perfecta. "Por qué este jalador recibió $X en abril" es un SUM con WHERE date.
- Pro: refunds, disputas, cancelaciones se modelan como entries adicionales — no hay edge cases raros de "actualizar la comisión".
- Con: queries para "balance actual" son `SUM(amount)` no `SELECT balance`. Mitigable con materialized view si hace falta.
- Con: más rows en DB. A escala 100k bookings/mes son 300k ledger rows — Postgres se ríe de eso.

**Schema:**

```sql
CREATE TABLE commission_ledger (
  id            BIGSERIAL PRIMARY KEY,
  booking_id    BIGINT NOT NULL REFERENCES bookings(id),
  beneficiary   TEXT NOT NULL CHECK (beneficiary IN ('jalador','operator','platform')),
  beneficiary_id BIGINT,                            -- null para platform
  entry_type    TEXT NOT NULL CHECK (entry_type IN ('accrual','release','reversal')),
  amount_cop    BIGINT NOT NULL,                    -- COP en centavos para evitar floats
  status        TEXT NOT NULL DEFAULT 'pending',    -- pending | released | reversed
  release_at    TIMESTAMPTZ,                        -- cuando se vuelve cobrable
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ledger_beneficiary ON commission_ledger(beneficiary, beneficiary_id, status);
CREATE INDEX idx_ledger_release ON commission_ledger(release_at) WHERE status = 'pending';
```

### Pattern 4: Cron via `pg_cron` (no extra infra)

**What:** Tareas periódicas (release de comisiones T+24h, recordatorios pre-tour, expiración de availability) corren como `pg_cron` jobs en Postgres directamente.

**When:** Cualquier cosa que sea "every X minutes hacer Y" si Y es una mutación SQL.

**Trade-offs:**
- Pro: cero infra extra. No hay GitHub Actions cron, no hay Vercel cron jobs, no hay servidor.
- Pro: el job tiene acceso DB directo, no hay auth dance.
- Con: limitado a SQL. Si el job tiene que llamar APIs externas, llamar una Edge Function desde el cron (`pg_net.http_post`). Está bien soportado.

**Example — release de comisión cuando pasa el tour:**

```sql
-- Job que corre cada hora y libera comisiones de tours que ya ocurrieron
SELECT cron.schedule(
  'release-commissions',
  '0 * * * *',  -- cada hora en punto
  $$
  UPDATE commission_ledger SET status = 'released'
  WHERE status = 'pending'
    AND release_at <= now()
    AND entry_type = 'accrual';
  $$
);
```

### Pattern 5: Repository Wrapper (no llamar SDK directo desde UI)

**What:** Los componentes nunca llaman `supabase.from('tours')...`. Llaman `getTours(filters)` exportado por `packages/db`.

**When:** Siempre. Es la regla.

**Why:** Permite cambiar implementación. Si mañana queremos meter cache, retries, logging, swap a RPC — un solo lugar. Hoy `lib/api.ts` hace esto bien con la legacy API; mantener el patrón con Supabase.

**Example:**

```typescript
// packages/db/queries/tours.ts
import { supabase } from '../client'
import type { Tour } from '@laperla/types'

export async function getTours(filters?: {
  category?: string
  zone?: string
  q?: string
}): Promise<Tour[]> {
  let query = supabase
    .from('tours')
    .select('*, operator:operators(*), category:categories(*)')
    .eq('status', 'active')

  if (filters?.category) query = query.eq('category_slug', filters.category)
  if (filters?.zone) query = query.eq('zone', filters.zone)
  if (filters?.q) query = query.textSearch('search_vector', filters.q, { type: 'websearch', config: 'spanish' })

  const { data, error } = await query
  if (error) throw new Error(`getTours failed: ${error.message}`)
  return data ?? []
}
```

---

## Data Flow

### Request Flow — Booking creation (canonical)

```
[Turista hace click "Reservar"]
    │
    ▼
[Next.js client] → createBooking() en packages/db
    │                          │
    │                          ▼
    │              [Supabase RPC: create_booking]   ← function SECURITY DEFINER
    │                          │                       valida disponibilidad
    │                          ▼                       y crea booking + commission accruals
    │              [Postgres]  → INSERT bookings + commission_ledger
    │                          │
    │                          ▼
    │              [Realtime broadcast] → operador y jalador ven el booking en sus dashboards
    │
    ▼
[Wompi checkout redirect]
    │
    ▼
[Usuario paga en Wompi]
    │
    ▼ (al volver, Wompi tambien hace POST asincrono al webhook)
    │
    ├──► [pago-resultado.tsx — UI]: muestra estado optimista
    │
    └──► [Wompi webhook → supabase/functions/wompi-webhook]
                │
                ▼
        [Verify signature] → [Idempotency check] → [UPDATE bookings.payment_status]
                                                          │
                                                          ▼
                                            [Realtime broadcast] → jalador ve venta confirmada
                                                          │
                                                          ▼
                                            [Trigger send-email Edge Function]
                                                          │
                                                          ▼
                                            [Resend API → confirmacion al turista]
```

### State Management (web + mobile)

```
[Server state — Supabase]
    │
    ▼ (TanStack Query subscribe)
[Cache layer]  ← invalidar en mutations
    │
    ▼
[Components] ──► [Mutation via packages/db] ──► [Supabase]
                                                     │
                                                     ▼
                                          [Realtime channel] ──► invalidate cache
```

**Reglas:**
- TanStack Query (`@tanstack/react-query`) para server state. Reemplaza el manual `useEffect(() => api.get(...))` que está hoy en cada dashboard.
- Realtime invalidates queries que escuchan ese evento. Patrón:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('jalador-sales')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookings', filter: `jalador_id=eq.${jaladorId}` },
      () => queryClient.invalidateQueries({ queryKey: ['my-sales'] }))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [jaladorId])
```

- URL state (filtros de búsqueda, pagination) en search params, no en store.
- Form state con React Hook Form (sin Zod en v1 — agregar cuando haya formularios complejos de operador).

### Key Data Flows

1. **Tour publication (operador → catálogo público):**
   `Operator dashboard → packages/db.createTour() → Supabase tours table → ISR revalidate /explorar` (se hace via webhook de Supabase a Vercel: cuando se inserta un tour activo, llamar a `/api/revalidate?path=/explorar`).

2. **Jalador genera link de venta:**
   `j/[refCode]/[tourSlug] → SSR fetch tour + jalador → render con QR + WhatsApp share button`.
   El `refCode` se persiste en cookie de 30 días y se attachea al booking automáticamente.

3. **Search (post Fase 3):**
   `Cliente: q="rodadero" → Supabase RPC search_tours(q) → GIN index hit → results`.
   Usa `tsvector` con `unaccent` + `spanish` config para que "rodadero" matchee "Rodadero".

4. **Commission release:**
   `pg_cron → UPDATE ledger SET status='released' WHERE release_at <= now() → vista materializada o query agg da el balance al jalador en su dashboard`.

5. **Push notification jalador:**
   `Booking nuevo → Realtime channel postgres_changes → web: toast + sound; mobile: Supabase Edge Function llama a Expo Push API → notif al device`.

---

## Payment Architecture (Wompi)

### Decisión: Edge Function intermediary, NO frontend SDK directo, NO Render

**Tiers evaluados:**

| Where | Cliente paga | Status check | Webhook | Veredicto |
|-------|--------------|--------------|---------|-----------|
| Frontend SDK directo (hoy) | UI redirect a checkout | Cliente hace GET a Wompi public API | NADIE — solo polling | **NO en prod**. Sin webhook = pagos APPROVED no se reflejan si el cliente cierra el browser. |
| Vercel Edge Function | UI redirect | Cliente o webhook | Vercel `/api/wompi-webhook` | **NO recomendado.** Hop extra a Supabase, secret en otra plataforma. |
| Render backend | UI redirect | Webhook | Render `/api/wompi-webhook` | **NO**, Render se va. |
| **Supabase Edge Function** | UI redirect | Webhook canónico | `supabase/functions/wompi-webhook` | **SÍ.** Mismo lugar que la DB. |

### Webhook flow para Wompi

[Wompi Events docs](https://docs.wompi.co/en/docs/colombia/eventos/) — eventos importantes para La Perla:

- `transaction.updated` — cambio de estado de transacción (APPROVED, DECLINED, VOIDED)

**Signature verification (Wompi spec):**
SHA256 sobre concatenación de:
1. Valores de campos en `signature.properties` (en orden, en string)
2. Timestamp del evento
3. Secret de eventos del comercio (variable de entorno, no la public key)

```typescript
// supabase/functions/wompi-webhook/verify.ts
import { crypto } from 'https://deno.land/std/crypto/mod.ts'

export async function verifyWompiSignature(event: any, providedChecksum: string): Promise<boolean> {
  const secret = Deno.env.get('WOMPI_EVENTS_SECRET')!
  const props = event.signature.properties as string[]

  // Concatenate field values in order
  const concatenated = props
    .map(p => p.split('.').reduce((obj, k) => obj?.[k], event.data))
    .join('') + event.timestamp + secret

  const buf = new TextEncoder().encode(concatenated)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return hashHex === providedChecksum
}
```

**Idempotency strategy (exactly-once processing):**

Webhooks llegan **at-least-once** ([webhook processing best practices](https://dev.to/whoffagents/webhook-processing-at-scale-idempotency-signature-verification-and-async-queues-45b3)). Estrategia:

```sql
CREATE TABLE webhook_events (
  id          TEXT PRIMARY KEY,           -- el checksum del evento (único garantizado por Wompi)
  source      TEXT NOT NULL,              -- 'wompi'
  raw         JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);
```

En la Edge Function:
```ts
const { error } = await supabase.from('webhook_events').insert({
  id: event.signature.checksum,
  source: 'wompi',
  raw: event
})
if (error?.code === '23505') {
  // duplicate key — ya procesamos
  return new Response('OK (duplicate ignored)', { status: 200 })
}
// proceder con el side-effect (mutar booking)
```

PRIMARY KEY constraint hace exactly-once a costo cero.

**Testing:** Wompi sandbox permite triggear eventos manualmente desde el dashboard. Smoke test antes de mover a prod.

### Storage / vault de claves Wompi

| Variable | Visibilidad | Donde |
|----------|-------------|-------|
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Pública (en cliente) | Vercel envvars |
| `NEXT_PUBLIC_WOMPI_ENV` | Pública | Vercel envvars |
| `WOMPI_EVENTS_SECRET` | **Secreto** | Supabase Edge Functions secrets (`supabase secrets set`) |
| `WOMPI_PRIVATE_KEY` | Secreto (si se usa para crear tokens server-side) | Supabase Edge Functions secrets |

`SANDBOX_KEY` hardcoded en `lib/wompi.ts:18` es key pública de Wompi (publicada en sus docs, no es secreto), pero **igual hay que removerlo** — un fallback hardcoded enmascara configuraciones rotas. Hacer `isWompiConfigured()` retornar false y mostrar banner si no hay key.

---

## Commission Flow — modelo completo

### Reglas de negocio (de PROJECT.md)

- Jalador gana **20% del precio del tour** (configurable post-launch).
- La Perla gana **5-10% de la venta bruta** (a definir, default 10% en research).
- Operador gana el **resto** (~70-75% según %).
- Comisión se **acredita (accrual)** cuando `payment_status = APPROVED`.
- Comisión se **libera (release)** **24h después de la fecha del tour** (no del pago — del servicio prestado). Esto da ventana para no-shows, reclamos y refunds.
- Refund / cancelación dispara **reversal entries** que cancelan los accruals.

### Schema completo

```sql
-- 1. Bookings — datos del booking
CREATE TABLE bookings (
  id                BIGSERIAL PRIMARY KEY,
  booking_code      TEXT UNIQUE NOT NULL,           -- LP-XXXXX
  user_id           UUID REFERENCES auth.users(id),
  tour_id           BIGINT NOT NULL REFERENCES tours(id),
  jalador_id        BIGINT REFERENCES jaladores(id), -- null si reservó directo
  ref_code          TEXT,
  tour_date         DATE NOT NULL,
  num_adults        INT NOT NULL,
  num_children      INT NOT NULL DEFAULT 0,
  unit_price_cop    BIGINT NOT NULL,                -- centavos COP
  total_amount_cop  BIGINT NOT NULL,                -- centavos COP
  status            TEXT NOT NULL DEFAULT 'pending',
  payment_status    TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT UNIQUE,                    -- LP-{base36ts}-{rand}
  qr_code           TEXT,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 2. Ledger — fuente de verdad de comisiones (immutable inserts)
CREATE TABLE commission_ledger (
  id              BIGSERIAL PRIMARY KEY,
  booking_id      BIGINT NOT NULL REFERENCES bookings(id),
  beneficiary     TEXT NOT NULL CHECK (beneficiary IN ('jalador','operator','platform')),
  beneficiary_id  BIGINT,
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('accrual','release','reversal')),
  amount_cop      BIGINT NOT NULL,                  -- positivo = haber, negativo = reversa
  rate_pct        NUMERIC(5,2),                     -- la tasa que aplicó (auditable)
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | released | reversed
  release_at      TIMESTAMPTZ,                      -- cuándo se libera (para accruals)
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Payouts — solicitudes/ejecuciones de pago a beneficiarios (post-MVP)
CREATE TABLE payouts (
  id              BIGSERIAL PRIMARY KEY,
  beneficiary     TEXT NOT NULL,
  beneficiary_id  BIGINT,
  amount_cop      BIGINT NOT NULL,
  method          TEXT NOT NULL,                    -- nequi | bancolombia | daviplata
  status          TEXT NOT NULL DEFAULT 'requested',
  reference       TEXT,
  requested_at    TIMESTAMPTZ DEFAULT now(),
  paid_at         TIMESTAMPTZ
);
```

### Generación de ledger entries (al confirmar pago)

```sql
CREATE OR REPLACE FUNCTION generate_commission_accruals(p_booking_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_booking      bookings%ROWTYPE;
  v_tour         tours%ROWTYPE;
  v_jalador_pct  NUMERIC := 20.0;  -- TODO: leer de tours.jalador_commission_pct
  v_platform_pct NUMERIC := 10.0;  -- TODO: leer de config global
  v_release_at   TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  SELECT * INTO v_tour FROM tours WHERE id = v_booking.tour_id;

  -- Release: 24h despues de la fecha del tour
  v_release_at := (v_booking.tour_date + interval '24 hours')::timestamptz;

  -- Jalador entry (solo si hubo jalador)
  IF v_booking.jalador_id IS NOT NULL THEN
    INSERT INTO commission_ledger (
      booking_id, beneficiary, beneficiary_id, entry_type,
      amount_cop, rate_pct, status, release_at
    ) VALUES (
      p_booking_id, 'jalador', v_booking.jalador_id, 'accrual',
      (v_booking.total_amount_cop * v_jalador_pct / 100)::BIGINT,
      v_jalador_pct, 'pending', v_release_at
    );
  END IF;

  -- Platform entry
  INSERT INTO commission_ledger (
    booking_id, beneficiary, entry_type,
    amount_cop, rate_pct, status, release_at
  ) VALUES (
    p_booking_id, 'platform', 'accrual',
    (v_booking.total_amount_cop * v_platform_pct / 100)::BIGINT,
    v_platform_pct, 'pending', v_release_at
  );

  -- Operator entry (resto)
  INSERT INTO commission_ledger (
    booking_id, beneficiary, beneficiary_id, entry_type,
    amount_cop, rate_pct, status, release_at
  ) VALUES (
    p_booking_id, 'operator', v_tour.operator_id, 'accrual',
    (v_booking.total_amount_cop * (100 - v_jalador_pct - v_platform_pct) / 100)::BIGINT,
    100 - v_jalador_pct - v_platform_pct, 'pending', v_release_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Refund handling (reversal)

Cuando llega evento Wompi `transaction.updated` con status VOIDED después de APPROVED (o un cancel manual):

```sql
-- Insertar entries inversas (negativas) para cancelar los accruals
INSERT INTO commission_ledger (booking_id, beneficiary, beneficiary_id, entry_type, amount_cop, status)
SELECT booking_id, beneficiary, beneficiary_id, 'reversal', -amount_cop, 'released'
FROM commission_ledger
WHERE booking_id = $1 AND entry_type = 'accrual' AND status = 'pending';

-- Marcar los originales
UPDATE commission_ledger SET status = 'reversed'
WHERE booking_id = $1 AND entry_type = 'accrual' AND status = 'pending';
```

### Balance query (vista materializada para dashboard)

```sql
CREATE MATERIALIZED VIEW jalador_balances AS
SELECT
  beneficiary_id AS jalador_id,
  SUM(CASE WHEN status = 'pending' THEN amount_cop ELSE 0 END) AS pending_cop,
  SUM(CASE WHEN status = 'released' THEN amount_cop ELSE 0 END) AS available_cop,
  SUM(amount_cop) AS lifetime_cop
FROM commission_ledger
WHERE beneficiary = 'jalador'
GROUP BY beneficiary_id;

CREATE UNIQUE INDEX ON jalador_balances(jalador_id);

-- Refresh cada hora con pg_cron
SELECT cron.schedule('refresh-balances', '*/15 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY jalador_balances; $$);
```

---

## Mobile + Web Shared Backend

### Decisión: Supabase JS SDK directo en mobile (no GraphQL, no REST custom)

**Por qué:**
- Es exactamente el mismo SDK. `import { createClient } from '@supabase/supabase-js'` corre igual.
- RLS hace toda la authorization. El cliente mobile no puede saltarse policies.
- `packages/db` (con todos los wrappers `getTours`, `createBooking`) se importa desde mobile sin cambios.
- Realtime SDK también compartido.

**Auth token sharing:**
- Mobile: usar [`@supabase/supabase-js` con AsyncStorage](https://supabase.com/docs/reference/javascript/auth-getsession) custom storage adapter. Persiste el JWT igual que localStorage en web.
- Web: igual con `localStorage` (default del SDK).
- Token nunca cruza apps. Cada app loguea su propio device, Supabase mantiene sesión.

**Push notifications:**
- iOS: APNS via Expo Push Service.
- Android: FCM via Expo Push Service.
- Trigger: cuando llega un Realtime event al jalador, una Supabase Edge Function (`send-push`) llama a `https://exp.host/--/api/v2/push/send` con los tokens de devices del jalador.
- Storage de push tokens: tabla `device_tokens (user_id, expo_token, platform, last_seen)`.

### React Native vs Flutter vs PWA decision

| Opción | Pro | Con | Recomendación |
|--------|-----|-----|----------------|
| **React Native (Expo)** | Mismo TS, mismo SDK Supabase, monorepo with web, EAS Build sin Mac, dev solo lo conoce | Bridge JS-native costs, flutter compila nativo | **SÍ** |
| Flutter | Performance superior, single codebase móvil | Dart != TS, no compartir lógica con web, otra toolchain | NO |
| PWA reforzada | Cero código nuevo, instalable | Push notifs limitadas en iOS, no acceso a APIs nativas (camera robusto, share intent), UX se siente web | NO para v1 móvil |

**Stack recomendado:** Expo SDK 52+, React Native 0.76+, NativeWind (Tailwind para RN), Expo Router.

---

## Real-time Architecture

### Supabase Realtime channels

**Cuándo SÍ usar Realtime:**
- Jalador dashboard: nueva venta atribuida → toast + animación de plata + sonido
- Operador dashboard: nuevo booking en sus tours
- Admin: feed de eventos del sistema (opcional)

**Cuándo NO usar Realtime:**
- Cosas que no requieren sub-segundo latency (ej: stats agregados — un refresh cada minuto sobra)
- Listas que no cambian seguido (catálogo público de tours)

### 3 patrones de canales en Supabase

1. **`postgres_changes`** — escucha INSERTs/UPDATEs en una tabla con filtro RLS.
2. **`broadcast`** — pub/sub manual (server emite, clientes escuchan).
3. **`presence`** — quién está online (no necesario v1).

### Push (mobile y web PWA)

**Web Push:**
- `web-push` library en una Edge Function.
- Service worker en Next.js para recibir.
- Subscribe se guarda en tabla `web_push_subscriptions`.

**Mobile Push:**
- Expo Push API. Tokens en `device_tokens`.

**Trigger común:** cuando llega Realtime event al server (vía DB trigger o Edge Function), si el evento es push-worthy (nueva venta, booking confirmado), encolar push notification.

### Polling fallback

Para Android low-end o conexión inestable (tesis del producto: turismo informal en zonas con mala conexión — Tayrona, Sierra Nevada):

- Realtime intenta WebSocket. Si falla, SDK ya hace fallback automático a long-polling.
- Adicionalmente: `useFocusEffect` en mobile invalida queries de TanStack Query cuando la app vuelve a foreground. Esto cubre el caso "estuve sin red 2 horas, vuelvo y todo se actualiza".

### Costo en free tier

[Supabase Realtime pricing](https://supabase.com/docs/guides/realtime/pricing): free tier incluye conexiones concurrentes ilimitadas y 2M mensajes/mes. A escala 1k bookings/día con 4 actores escuchando = ~120k mensajes/mes. **Sobra.**

---

## Search Architecture

### Decisión: Postgres FTS con GIN + `unaccent` + dictionary `spanish`

**Por qué NO Typesense / MeiliSearch / Algolia en v1:**
- < 10k tours esperados en 2 años. Postgres FTS es performante hasta cientos de miles de rows. No hay problema que resolver.
- Self-host MeiliSearch en Render Free = otro servicio que mantener. 1 dev, no.
- Algolia free tier es 10k búsquedas/mes. Funciona pero suma una dependencia.
- Postgres FTS + GIN está incluido. Cero costo, cero infra.

**Cuándo migrar (no en v1):** cuando haya > 50k tours O cuando se necesite typo tolerance avanzado / faceted search complejo. Entonces evaluar [ParadeDB](https://www.paradedb.com/) (extensión Postgres con BM25, evita salir de Postgres) o MeiliSearch.

### Implementación

```sql
-- 1. Habilitar extensión unaccent
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Crear configuración FTS spanish + unaccent
CREATE TEXT SEARCH CONFIGURATION spanish_unaccent (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, spanish_stem;

-- 3. Columna tsvector generada
ALTER TABLE tours ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish_unaccent', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish_unaccent', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('spanish_unaccent', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('spanish_unaccent', coalesce(description, '')), 'C')
  ) STORED;

-- 4. Indice GIN
CREATE INDEX idx_tours_search ON tours USING GIN (search_vector);

-- 5. Query desde el cliente
-- supabase.from('tours').select().textSearch('search_vector', query, { config: 'spanish_unaccent', type: 'websearch' })
```

**Trampa documentada ([Mattermost issue](https://github.com/mattermost/mattermost/issues/22249)):** Si el `default_text_search_config` del proyecto Supabase no es `spanish_unaccent`, asegurar pasar `config: 'spanish_unaccent'` explícito en cada query. Si no, GIN no se usa y el query hace seq scan.

### Filtros adicionales (no requieren FTS)

- Por zona: `tours.zone_slug` indexado
- Por precio: `tours.price_adult_cop` con btree index
- Por duración: `tours.duration_hours` con btree
- Por rating: `tours.avg_rating` con btree
- Por disponibilidad fecha: JOIN con `tour_availability` table

---

## Component Boundaries — qué es servicio vs qué vive en monolito

| Función | Donde | Por qué |
|---------|-------|---------|
| **UI render (web)** | Next.js monolito | Es la UI. Es UN solo lugar. |
| **UI render (mobile)** | Expo monolito | Mismo argumento. |
| **Auth** | Supabase Auth | Servicio externo, gratis. |
| **DB queries (con RLS)** | Cliente → Supabase directo | RLS es el authorization. No necesita backend custom. |
| **DB queries (con lógica compleja)** | RPC functions en Postgres | `create_booking` con validación de stock, `generate_commission_accruals`. SQL es el mejor lenguaje para mutar SQL. |
| **Wompi webhook handler** | Supabase Edge Function | Documented. |
| **Send email (booking confirmation)** | Supabase Edge Function → Resend API | Mantener API key de Resend fuera del cliente. |
| **Generate PDF ticket** | Supabase Edge Function (con `@react-pdf/renderer` o jsPDF en Deno) | El cliente NO genera PDF: tarda mucho, ocupa bundle. |
| **Generate QR code** | Cliente (mobile/web) con `qrcode` lib, O server-side al crear booking | QR es determinístico — generar al crear booking y guardar URL en `bookings.qr_url`. Storage en Supabase. |
| **WhatsApp share deeplinks** | Cliente, string concat | `https://wa.me/?text=${encodeURIComponent(message)}`. Sin SDK. |
| **WhatsApp Business API (envío automatizado)** | **OUT OF SCOPE v1.** | Requiere número verificado, costo, complejidad. Usuarios mandan a mano via deeplink. |
| **Image processing (resize, format)** | Supabase Storage transformations + Next/Image | Supabase tiene transformaciones nativas (`?width=X&format=webp`). Next/Image cachea en CDN Vercel. |
| **Analytics aggregation** | Postgres views + materialized views | `jalador_balances`, `operator_revenue_monthly`, etc. Refresh cada N minutos. No tool externo. |
| **Cron jobs** | `pg_cron` en Postgres | Documented. |
| **Search** | Postgres FTS | Documented. |
| **Sitemap, OG images** | Next.js (mantener) | Ya está bien implementado. |
| **Error tracking** | Sentry (web + mobile) | Servicio externo. |

**Regla general:** algo es un servicio separado solo si:
1. Es código que NO debe correr en el cliente (secret, latencia, bundle size).
2. Postgres no puede hacerlo (lógica imperativa compleja, llamadas HTTP externas).
3. La complejidad operacional es < el valor del separation.

Para 1 dev, default = Edge Function en Supabase. Solo salir de Supabase si hay razón fuerte.

---

## Caching Strategy

### Capas

| Capa | Cuándo | Implementación |
|------|--------|----------------|
| **HTTP cache (browser)** | Imagenes, fuentes, JS bundles | Next.js + Vercel default + `images.minimumCacheTTL` ya configurado |
| **CDN edge cache (Vercel)** | Assets estáticos, ISR pages | Default Vercel |
| **ISR (Next.js)** | `/explorar`, `/tour/[slug]`, sitemap | `revalidate: 300` (5 min) + on-demand revalidate cuando se actualiza el tour |
| **Client query cache** | Queries de TanStack Query | `staleTime: 60_000`, `gcTime: 300_000` |
| **Server function cache** | Edge Functions con resultados pesados | `Deno.openKv()` (KV nativo Deno) si fuera necesario |
| **DB query cache** | Postgres lo hace automático | No tocar |
| **Materialized views** | Aggregates (balances, rankings) | Refresh con `pg_cron` cada 15 min |

### Sin Redis (Upstash) en v1

**Por qué:**
- Otra dep. Otra envvar. Otro dashboard.
- Los casos típicos donde Redis ayuda (rate limiting, session store, queues) están cubiertos:
  - Rate limiting básico: Vercel Edge config + Supabase RLS (`rate_limit` policy).
  - Session: Supabase Auth.
  - Queues: `pg_cron` + tabla `jobs` si llega a hacer falta.

**Cuándo agregar Upstash Redis:** cuando aparezca un cuello de botella concreto. Probable que sea para rate limiting en endpoints públicos cuando el bot traffic empiece. No antes.

### ISR para SEO

`/explorar` y `/tour/[slug]` deben SSR-or-SSG, no CSR como hoy. Hoy son CSR específicamente para que el demo interceptor los maneje. Estrategia post-launch:

```typescript
// pages/tour/[slug].tsx
export async function getStaticProps({ params }) {
  const tour = await getTourBySlug(params.slug)  // direct DB call, server-side
  return { props: { tour }, revalidate: 300 }
}

export async function getStaticPaths() {
  // top 50 tours pre-build, resto on-demand
  const top = await getTopTours(50)
  return {
    paths: top.map(t => ({ params: { slug: t.slug } })),
    fallback: 'blocking'
  }
}
```

Demo mode no se rompe porque `isDemoModeFast()` corre client-side y al detectar demo, refetch el tour del mock al hidratar (con un useEffect). Compatible con SSR.

---

## Deployment Topology

### Stack target

| Layer | Service | Free tier alcanza? |
|-------|---------|---------------------|
| Web hosting | **Vercel Hobby** | Sí, hasta 100GB bandwidth/mes |
| Backend (DB + Auth + Edge + Storage + Realtime) | **Supabase Free** → Pro ($25/mo) cuando justifique | Free hasta 500MB DB, 2GB egress, 1GB storage |
| Mobile builds | **Expo EAS Build Free** (30 builds/mes) → Production tier ($99/mo) | Free para development |
| Mobile distribution | TestFlight (iOS) + Play Console internal track | Sí, free |
| Email | **Resend Free** (3k emails/mo, 100/día) | Sí inicialmente |
| Error tracking | **Sentry Developer** (5k errors/mo) | Sí. Alternativas si se queda corto: PostHog (100k errors/mo free), GlitchTip (open source) |
| Domain | Cloudflare Registrar (~$10/year .com) | n/a |
| Analytics | Vercel Analytics (free tier) | Sí |

**Costo total mensual primeros 3 meses:** $0-10 (solo dominio).
**Cuándo subir a Pro:** Supabase cuando egress > 2GB/mes (probable mes 2-3 post-launch). Vercel solo si > 100GB. Nadie más antes.

### Repo strategy

**Fase 1-3 (web only):** Mantener `tourmarta-web` mono-repo. NO convertir a monorepo todavía — overhead de Turborepo no se justifica con una app.

**Fase 4 (mobile):** Convertir a monorepo Turborepo + pnpm workspaces. [T3 Turbo](https://github.com/t3-oss/create-t3-turbo) es la referencia más limpia para Next.js + Expo + shared TS. ([template Vercel](https://vercel.com/templates/next.js/turborepo-react-native))

**Migration step (no big bang):**
1. Crear `packages/types` y `packages/db`.
2. Mover types y queries actuales a esos packages.
3. Web sigue siendo `apps/web/` pero importa de `@laperla/types`.
4. Cuando inicia mobile, `apps/mobile/` se crea y reusa `packages/*`.

### CI/CD

**Hoy:** Vercel build hooks on push to main. No GitHub Actions.

**Recomendado para Fase 1+:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm tsc --noEmit
      - run: pnpm test          # cuando haya tests
      - run: pnpm build
```

GitHub Actions free para repos públicos / 2000 min/mes para privado. Sobra.

---

## Observability (1-dev minimum)

### Stack mínimo viable

| Need | Tool | Why |
|------|------|-----|
| **Errors (web + mobile)** | Sentry | SDK probado para Next + RN. Free 5k errors/mo. Source maps automáticas. ([Sentry alternatives 2026](https://securityboulevard.com/2026/04/best-sentry-alternatives-for-error-tracking-and-monitoring-2026/)) |
| **Frontend perf (CWV)** | Vercel Analytics (Web Vitals) | Built-in, gratis, suficiente para 1 dev. |
| **API/DB logs** | Supabase Logs (pg_log + edge function logs) | Built-in. Filtrable por nivel. |
| **Synthetic uptime** | UptimeRobot free | 50 monitors gratis. Ping a `/api/health`. |
| **Alerts** | Supabase + Sentry email + Telegram bot custom (opcional) | Sentry manda email en CRITICAL errors. Para Wompi failures, agregar webhook a Telegram. |

### Lo que NO hace falta

- APM (Datadog, New Relic). Overkill para 1 dev y el costo es alto.
- Centralized logging (Logtail, Papertrail). Supabase logs alcanza.
- Tracing distribuido (Honeycomb, Tempo). 2 servicios (Vercel + Supabase) — los logs casan.

### Health check endpoint

```typescript
// pages/api/health.ts (Next.js api route)
export default async function handler(req, res) {
  const checks = {
    db: false,
    auth: false,
    timestamp: new Date().toISOString()
  }
  try {
    const { error } = await supabase.from('tours').select('id').limit(1)
    checks.db = !error
  } catch {}
  try {
    const { data } = await supabase.auth.getSession()
    checks.auth = !!data
  } catch {}
  const allOk = Object.values(checks).filter(v => typeof v === 'boolean').every(Boolean)
  res.status(allOk ? 200 : 503).json(checks)
}
```

UptimeRobot pingea cada 5 min. SMS si falla 3 veces seguidas.

### Sentry setup específico para Pages Router

```bash
npx @sentry/wizard@latest -i nextjs
```

Importante: configurar `tunnelRoute: '/monitoring'` para evitar que ad-blockers bloqueen el SDK (un porcentaje real de usuarios tiene uBlock).

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| **0-1k bookings/mes (launch)** | Stack actual. Free tiers. Postgres con `db.t3.micro` Supabase Free aguanta. |
| **1k-10k bookings/mes (mes 6-12)** | Subir a Supabase Pro ($25). Vercel Pro si bandwidth lo justifica. Considerar materialized views para dashboards. |
| **10k-100k bookings/mes (año 2)** | Postgres > db.t3.small. Connection pooling con pgBouncer (Supabase ya lo provee). Considerar mover search a MeiliSearch o ParadeDB BM25. Posible CDN tier-2 (Cloudflare delante de Vercel). |
| **100k+ bookings/mes** | Conversation diferente. Probable: dedicated Postgres, read replicas, Redis para hot paths, search engine externo, posiblemente moverse de Vercel a Cloudflare Workers + Hyperdrive. **No optimizar para esto en 2026.** |

### "Qué se rompe primero"

1. **Egress de Supabase Free (2GB/mes).** Imágenes de tours y avatars suben rápido. Mitigación: habilitar Storage transformations agresivas (resize a thumbnails), Vercel Image cache TTL 60 días.
2. **Connections concurrentes a Postgres.** Cada usuario activo con realtime mantiene una conexión. Mitigación: `supabase.removeChannel` al unmount religiosamente. Pool con pgBouncer transactional.
3. **Vercel function execution time.** Edge runtime tiene 30s timeout. Webhook handler debe ser rápido (ya lo es: insert + update + done < 100ms).

---

## Anti-Patterns (qué NO hacer)

### Anti-Pattern 1: Backend BFF intermedio entre Next.js y Supabase

**What:** Crear `pages/api/tours.ts` que llama a Supabase y retorna al cliente.

**Why wrong:** Es un proxy sin valor. Pierde RLS (el endpoint ahora corre con service_role o anon, no con el JWT del usuario). Doblas latencia. Doblas el código a mantener.

**Do this instead:** Cliente llama a Supabase directo via SDK. RLS hace el authorization. Si necesitas server-side (SEO), llama Supabase desde `getStaticProps` / `getServerSideProps` con el anon key.

### Anti-Pattern 2: Token Wompi public key hardcoded

**What:** `lib/wompi.ts:18` hoy: `const SANDBOX_KEY = 'pub_stagtest_...'` como fallback.

**Why wrong:** Esconde estado broken (env var ausente sigue "funcionando" con sandbox), confunde producción vs dev, y publica en el bundle una key que aunque sea pública, asocia el negocio con tests de Wompi.

**Do this instead:** `isWompiConfigured()` retorna false si no hay env var, UI muestra "Pagos en mantenimiento", monitoring alerta.

### Anti-Pattern 3: Polling cada 5s para "real-time"

**What:** `setInterval(() => api.get('/bookings/my'), 5000)` para que el jalador vea su comisión en vivo.

**Why wrong:** Polling cada 5s = 17,280 requests/día por jalador online. Con 50 jaladores activos = 800k req/día solo para esto. Free tier muere.

**Do this instead:** Realtime channel `postgres_changes` filtrado a `jalador_id=eq.${jaladorId}`. Una conexión, mensajes solo cuando hay cambios reales.

### Anti-Pattern 4: localStorage como source of truth para auth (estado actual)

**What:** Hoy tres backends escriben a `turescol_token`, y el cliente lee de ahí asumiendo que el token es válido.

**Why wrong:** Tokens expiran. localStorage no sabe. Resultado: el cliente hace requests con token expirado, recibe 401, se queda en estados raros.

**Do this instead:** Supabase SDK maneja refresh automático (`autoRefreshToken: true`). Confiar en `supabase.auth.getSession()` no en localStorage manual. La key `turescol_token` legacy se mantiene durante migración pero NO se usa para tomar decisiones de auth.

### Anti-Pattern 5: Webhook handler que hace cosas pesadas síncrono

**What:** Webhook recibe transaction → hace 5 queries → llama Resend → llama Expo Push → responde 200.

**Why wrong:** Si Resend falla, Wompi reintenta el webhook (porque no hay 200), pero el booking ya se actualizó. Doble email. O peor: si tarda > 15s, Wompi considera fallido.

**Do this instead:** Webhook hace lo mínimo (verify, idempotency check, mutate booking, respond 200). Side effects (email, push) se disparan de DB triggers o pg_cron jobs separados, con su propia idempotency.

### Anti-Pattern 6: Mobile app que llama una "API" custom diferente a la web

**What:** "Hagamos un endpoint REST custom para móvil porque es más simple".

**Why wrong:** Doblas el backend. Bug en business logic se arregla en 2 sitios. Auth diferente. Es exactamente el problema de tener Render + Supabase hoy, multiplicado.

**Do this instead:** Mobile usa el mismo Supabase SDK + mismo `packages/db`. Si hay diferencia, vive en `apps/mobile/queries/` no en otro backend.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notas |
|---------|---------------------|-------|
| **Wompi** | Frontend redirect (checkout) + Edge Function webhook (server) | Documented. Verify signature SHA256, idempotency con webhook_events table. |
| **Supabase** | JS SDK directo desde web y mobile, Edge Functions para server work | Auth, DB, Storage, Realtime, Edge — todo un servicio. |
| **Resend** | API call desde Supabase Edge Function (`fetch('https://api.resend.com/emails')`) | API key en Edge secrets. NO en cliente. |
| **Expo Push** | API call desde Supabase Edge Function | Tokens en `device_tokens` table. |
| **Sentry** | SDK en web (Next.js) y mobile (RN). DSN público OK. | Source maps suben en build. |
| **wa.me deeplinks** | String concat en cliente | Sin SDK. Usuarios mandan manualmente. |
| **Vercel Analytics** | Auto-inyectado por Vercel | n/a |
| **UptimeRobot** | Pings al `/api/health` | Configuración solo en su dashboard. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web` ↔ Supabase | HTTPS + WebSocket (Realtime) | Vía `packages/db`. Nunca `supabase.from()` directo en componentes. |
| `apps/mobile` ↔ Supabase | HTTPS + WebSocket | Mismo SDK. Mismo `packages/db`. |
| `apps/web` ↔ `apps/mobile` | **Ninguna.** | Comparten DB pero no se hablan. |
| `Edge Function` ↔ Postgres | Service role (bypassea RLS) o user JWT (respeta RLS) | Decisión por función: webhook usa service role; función a nombre del usuario usa el JWT del request. |
| `Postgres` ↔ Edge Function (cron-triggered) | `pg_net.http_post` desde pg_cron | Patrón para cuando un cron tiene que llamar API externa. |
| `Wompi` → `Edge Function (webhook)` | HTTPS POST, Wompi-signed | Verify signature, idempotency. |

---

## Migration Path Summary (informa roadmap)

### Fase 1 — Estabilización (semanas 1-3 post-launch 26 abril)

**Objetivo:** Wompi prod no se cae. Demo mode protegido. Observabilidad mínima.

1. Crear Supabase Edge Function `wompi-webhook`. Configurar Wompi para enviar a su URL prod.
2. Implementar verify signature + idempotency table.
3. Sentry instalado, source maps, alerts a email.
4. UptimeRobot apuntando a `/api/health`.
5. Demo mode: gate por env var `NEXT_PUBLIC_DEMO_AVAILABLE` + banner visible cuando activo.
6. Comisión configurable por tour: agregar columna `tours.jalador_commission_pct` con default 20.

**No tocar todavía:** data layer (sigue Render), mobile, search.

### Fase 2 — Data Layer Migration (semanas 4-7)

**Objetivo:** Render API muere. Supabase es la única fuente de verdad de data.

1. Schema completo en Supabase con migrations (`tours`, `bookings`, `commission_ledger`, `payouts`, `reviews`, `tour_availability`, `users/profiles`, etc).
2. RLS policies para los 4 roles.
3. Wrappers en `packages/db` (o `lib/queries/` si aún no es monorepo).
4. Cutover por dominio: catalog (lectura) → bookings (writes con doble escritura 1 sem) → resto.
5. ISR en `/explorar` y `/tour/[slug]`.
6. Realtime channel para jalador dashboard.
7. Resend integrado para confirmación de booking.

### Fase 3 — Marketplace v2 (semanas 6-10, paralelo final con Fase 2)

**Objetivo:** Búsqueda + reviews + availability + cancelaciones.

1. Postgres FTS spanish_unaccent + GIN index. Filtros por zona, precio, duración, rating.
2. Sistema de reviews verificadas (RLS: solo si `bookings.status = 'completed'` para ese tour).
3. Tabla `tour_availability` con cupos por fecha. RPC `create_booking` valida stock.
4. Cancelaciones: políticas por tour. Reversal entries en ledger.
5. Ranking de jaladores: materialized view refrescada cada hora.

### Fase 4 — Mobile (mes 3-5)

**Objetivo:** App móvil iOS+Android para jalador (foco) y turista.

1. **Convertir repo a monorepo Turborepo + pnpm workspaces.** `apps/web`, `apps/mobile`, `packages/types`, `packages/db`.
2. Crear `apps/mobile` con Expo SDK 52+, NativeWind, Expo Router.
3. Mismo `packages/db` (Supabase JS SDK funciona en RN con AsyncStorage adapter).
4. Push notifications: Expo Push tokens en `device_tokens` + Edge Function `send-push`.
5. Compartir tour: native share intent.
6. Modo offline: TanStack Query con `persistQueryClient` (cache en AsyncStorage).
7. EAS Build para iOS+Android. TestFlight + Play Console internal.

---

## Confidence Assessment

| Decisión | Confianza | Por qué |
|----------|-----------|---------|
| Migrar todo a Supabase | HIGH | Probado pattern, docs oficiales, casos similares (T3 Turbo, varios marketplaces). Único punto de duda: si surge una query que RLS hace lenta, hay escape hatches (RPC con SECURITY DEFINER, materialized views). |
| Webhook Wompi en Supabase Edge | HIGH | Patrón documentado en [Supabase Stripe webhooks guide](https://supabase.com/docs/guides/functions/examples/stripe-webhooks), Wompi sigue mismo modelo HTTP. |
| Commission ledger pattern | HIGH | Patrón estándar de fintech. Inmutable + reversal entries es la forma probada. |
| Postgres FTS en lugar de search engine externo | HIGH para v1 (< 10k tours). MEDIUM para escala. | A escala, ParadeDB o MeiliSearch pueden ser mejores. v1 no llega a esa escala. |
| Realtime sin polling fallback | HIGH | SDK ya tiene fallback automático. |
| Monorepo Turborepo para mobile | HIGH | T3 Turbo y templates Vercel oficiales lo usan. Una decisión deferred a Fase 4. |
| Sentry como error tracking | HIGH | Free tier alcanza. Si no, alternativas open-source documentadas. |
| Comisión release T+24h post-tour | MEDIUM | Política de negocio que debe validarse con jaladores reales. Técnicamente trivial cambiar. |
| `pg_cron` para todos los crons | HIGH | Probado en Supabase. Si falla un job, monitoring + retry trivial. |

---

## Sources

- [Wompi Events docs](https://docs.wompi.co/en/docs/colombia/eventos/) — webhook signature verification spec
- [Wompi Widget & Checkout](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Edge Functions overview](https://supabase.com/docs/guides/functions)
- [Supabase Stripe webhooks example](https://supabase.com/docs/guides/functions/examples/stripe-webhooks) — patrón aplicable a Wompi
- [Supabase RLS for multi-tenant](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Webhook idempotency at scale](https://dev.to/whoffagents/webhook-processing-at-scale-idempotency-signature-verification-and-async-queues-45b3)
- [Postgres FTS docs (text search indexes)](https://www.postgresql.org/docs/current/textsearch-indexes.html)
- [PostgreSQL unaccent + Spanish FTS](https://enzedonline.com/en/tech-blog/how-to-add-unaccent-support-in-postgresql-search/)
- [Turborepo + Next.js + Expo template (Vercel)](https://vercel.com/templates/next.js/turborepo-react-native)
- [T3 Turbo (Next + Expo monorepo)](https://github.com/t3-oss/create-t3-turbo)
- [Expo monorepos guide](https://docs.expo.dev/guides/monorepos/)
- [Sentry alternatives 2026](https://securityboulevard.com/2026/04/best-sentry-alternatives-for-error-tracking-and-monitoring-2026/)
- [Supabase Pricing 2026](https://supabase.com/pricing)
- [Next.js 16 proxy.ts auth migration](https://medium.com/@securestartkit/next-js-proxy-ts-auth-migration-guide-ff7489ec8735)

Local references:
- `.planning/codebase/ARCHITECTURE.md` — current state
- `.planning/codebase/INTEGRATIONS.md` — current backends and tokens
- `.planning/codebase/STACK.md` — current stack
- `.planning/PROJECT.md` — domain rules and roadmap inputs
- `lib/api.ts` — current data layer (HTTP client wrapper)
- `lib/supabase.ts` — current Supabase client
- `lib/wompi.ts` — current Wompi integration (referenced; not re-read since INTEGRATIONS.md cubre)

---

*Architecture research for: La Perla / TourMarta — tourism marketplace, brownfield, 1-dev team, 4-5 month roadmap*
*Researched: 2026-04-25*
