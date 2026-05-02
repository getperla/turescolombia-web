# Feature Research — La Perla

**Domain:** Multi-sided tourism marketplace for the informal economy (Santa Marta, Colombia)
**Researched:** 2026-04-25
**Confidence:** MEDIUM
- HIGH on table stakes (well-established marketplace patterns from Airbnb / Booking / Uber-style platforms, validated repeatedly across the LatAm market by Rappi / Mercado Libre).
- MEDIUM on differentiators (informed by the brief's reference set + training data, not a fresh field study of Santa Marta's tiquetera economy).
- LOW on regulatory specifics (DIAN / RNT / Wompi KYC mechanics flagged for legal validation before money moves through prod).

Existing build already covers a meaningful chunk of table stakes (catalog, 4 dashboards, magic-login, booking + Wompi sandbox, admin approval flow). Gap analysis below assumes that baseline.

---

## Feature Landscape

### Onboarding — Jalador (CRITICAL — this is the Core Value)

The Core Value in PROJECT.md is "anyone with a phone can sell tours and earn." Friction here = product death. The whole growth stream depends on this funnel.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Magic-link signup via WhatsApp | LatAm default — WhatsApp is the OS of the street economy. Email is second-class for jaladores. | LOW | Already partially built (`pages/login.tsx` magic-login + refCode). Needs hardening: WhatsApp Business API confirmation message instead of just OTP. |
| Phone-only signup (no email required) | 60-70% of jaladores won't have an email they check. Forcing email = drop-off. | LOW | Supabase SMS OTP is in place. Strip email from required fields. |
| `<60s` first-success path | Brief's explicit success metric. Sign up → see first commission link → ready to share. | MEDIUM | Today: signup → dashboard → confusion. Need a "tu primer link de venta" CTA on first login. |
| Pre-filled refCode from inviter link | Existing jaladores recruit new ones; the invite carries attribution. | LOW | Already in `/j/[refCode]/*` routes; extend to signup flow so attribution sticks across the funnel. |
| Cédula (national ID) capture, deferred | Required for payouts and Wompi/DIAN compliance, but blocking signup on it kills conversion. | MEDIUM | Capture on first-payout-request, not on signup. Same pattern Rappi uses for couriers. |
| WhatsApp share button (one-tap to broadcast) | The jalador's actual sales tool is WhatsApp, not the app. | LOW | `wa.me/?text=...` URL with prefilled message + tour link + their refCode. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| "Tu primera venta en 5 minutos" tutorial | Removes paralysis. Non-tech jaladores need a guided rail, not a blank dashboard. | MEDIUM | Inline coach-mark sequence: "compartí este link → cuando alguien compre, ganás $X". Single-screen, dismissible. |
| Hooks at signup: top-3 trending tours auto-recommended | Reduces decision fatigue. Jalador walks out with 3 ready-to-sell links. | LOW | Pull from already-ranked tour list, surface as "comenzá vendiendo estos". |
| Voice-note onboarding (audio explainer) | Literacy levels vary; audio in Costeño Spanish removes a barrier text creates. | MEDIUM | 90-second WhatsApp voice note explaining the model. Cheap content win. |
| Referral multinivel ligero (jalador → jalador, % override on second-level sales) | The PROJECT.md explicitly calls this out. Turns acquisition into a viral loop. | HIGH | OnlyFans / MLM-light pattern. Cap depth at 2 levels to stay clean and avoid pyramid-scheme optics. |
| Live "ganadores hoy" ticker | Social proof of real earnings. Public ranking page already exists; surface live commissions on the landing/onboarding screen. | LOW | Builds on existing `pages/jaladores.tsx` ranking. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full profile builder (bio, photo, "about me", interests) | "Looks professional, like LinkedIn" | Fields nobody fills. Adds 5 screens of friction with zero conversion benefit. | Optional profile fields available later from `pages/perfil.tsx`, never blocking. |
| Email verification step | "Standard auth UX" | Each step drops 20-30% of LatAm informal-sector users. Email is mostly aspirational. | Phone-only auth + verify-on-payout. |
| KYC selfie upload at signup | "Trust + fraud prevention" | Camera permission denial / poor lighting / data plan = drop. Not needed until payout. | Defer to first cash-out request, by which point intent is proven. |
| Mandatory training video | "Quality control" | Jaladores don't watch videos before earning. They watch them after their first sale. | Optional learning hub, gated only by curiosity. |

---

### Onboarding — Operator (Tour Agency)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Tour creation form (photos, price, duration, includes/excludes) | Already built (`pages/dashboard/operator/tours/crear.tsx`). | — | Existing. Needs validation (min 3 photos, min description length) to keep catalog quality. |
| RUT + cámara de comercio capture | Colombian tourism regulation (RNT — Registro Nacional de Turismo) and Wompi merchant KYC require it. | MEDIUM | Required before first payout and before tours go live. Admin reviews in `pages/dashboard/admin.tsx`. |
| <10 min "primer tour publicado" path | PROJECT.md goal. Operator onboarding is not the bottleneck (jalador is), but slow operator onboarding = empty catalog = nothing to sell. | MEDIUM | Pre-filled templates per category ("city walking tour", "tayrona day"), photo bank fallback when operator has none. |
| Bank account / payout method capture | Operators need to receive money. Wompi → bank transfer flow. | MEDIUM | Validate cuenta de ahorros + cédula match. |
| Tour preview before publish | Operator must see what tourist sees before going live. | LOW | Render `pages/tour/[id].tsx` view in "draft" mode. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Photo improvement assistant (auto-crop, brightness boost) | Most operator photos are bad. Better photos = higher conversion = operator earns more = operator stays. | MEDIUM | Sharp/`@vercel/og` server-side processing on upload. Don't reject; improve silently. |
| Suggested price-band ("tours similares en Santa Marta cuestan $X-Y") | Operators chronically misprice — too high = no sales, too low = race-to-bottom. | LOW | Pull market median per category from existing data. |
| Templated cancellation policy picker (Flexible / Moderada / Estricta) | Operators don't write good policies. Templates standardize and reduce disputes. | LOW | Three pre-defined tiers (see Cancellations section below). |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free-form policy text entry | "Operators want flexibility" | Disputes become unresolvable when policies are ambiguous. Refunds become judgment calls. | Three fixed templates only. |
| Multi-location chains / franchise hierarchy | "Some operators have 3 brands" | Edge case. 95% of Santa Marta operators are single-entity. | Let one operator account list multiple tours; defer org structure. |

---

### Reviews & Ratings

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| 5-star rating, post-tour | Universal expectation since Airbnb. Catalog without ratings = sketchy. | LOW | Backend already accepts review POST (`createReview` in `lib/api.ts`); needs UI gate "only after booking marked completed". |
| Verified-only reviews (booking required) | Fake reviews are the #1 trust-killer in LatAm marketplaces (Mercado Libre learned this). | LOW | Tie review to a `bookingId` with `status='completed'`. Reject orphan reviews. |
| Written review (optional) | Stars without text are noise. Text is signal. | LOW | Optional textarea, max 500 chars. |
| Aggregate rating on tour card | Drives click-through on `/explorar`. | LOW | Already a placeholder in tour shape; needs real aggregation. |
| Review moderation queue (admin) | Spam, abuse, retaliation reviews. | MEDIUM | Admin dashboard tab; auto-flag profanity + first-review-from-account. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Bidirectional reviews (operator can rate tourist) | Airbnb pattern. Tourists who flake / no-show get flagged for repeat operators. | MEDIUM | Tourist rating is private to operators (not public on profile). Discourages chargebacks and no-shows. |
| Jalador NPS-of-the-experience (separate from operator quality) | "How was your guide vs how was the tour itself" — separates the two failure modes. | MEDIUM | Two questions, optional second one. Lets the platform fire bad operators while protecting good jaladores attached to them. |
| Photo reviews (tourist uploads from the tour) | Massive conversion lift on similar marketplaces (Booking.com data). | MEDIUM | Compress server-side; moderate. |
| "Reseña fresca" badge for reviews <30 days | Informal market changes fast. Year-old reviews ≠ truth. | LOW | UI affordance only. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Public commenting on reviews (Yelp-style threads) | "More engagement" | Becomes flame-war surface. Operators harass reviewers. | Private operator response (1 reply, displayed under review). |
| Allowing operators to remove reviews | "We're a tourism platform, reputation matters" | Marketplace-of-trust collapses if operators control their own narrative. | Operators can flag for moderation; platform decides. |
| Open-ended review form for non-bookers | "Anyone should be able to share opinions" | Fake review farms. Already a plague on Google Maps for Santa Marta tours. | Booking-gated only. Hard rule. |

---

### Search & Discovery

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Text search by tour name / destination | Baseline. Already exists with debounce in `pages/explorar.tsx`. | — | Existing — extend to operator name + destination keywords. |
| Filter by price range | Universal. | LOW | Range slider; persist in URL params. |
| Filter by date (availability check) | Tourism table stake — "is this tour available next Tuesday?" | HIGH | Requires availability calendar (see Availability section). Can't filter what isn't modeled. |
| Filter by duration (half-day / full-day / multi-day) | Tour-vertical specific. | LOW | Three buckets. |
| Sort by: rating, price asc/desc, popularity | Universal. | LOW | URL-state sort. |
| Filter by category (Tayrona, Sierra Nevada, city, beach, snorkel) | Already in catalog. | — | Existing. |
| Distance / "tours saliendo desde Santa Marta vs Taganga vs Palomino" | Geographic clarity. Tourists don't know the layout. | MEDIUM | Origin-city filter. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| "Available today" / "Available this weekend" quick filters | Tourism is impulsive. The hotel-walking tourist wants now-able tours. | MEDIUM | Depends on availability data; surfaces high-intent inventory. |
| Group-size filter (1, 2, 3-5, 6+, family) | Many tours have group minimums or family discounts. Filtering early avoids the "sorry, minimum 4" rejection. | LOW | Once availability supports min/max group. |
| Map view (tour pins on Santa Marta region) | Geographic context > list. Airbnb proved this. | MEDIUM | Mapbox or Leaflet+OSM (cheaper). Defer if costly. |
| "Tours que recomienda tu jalador" — when arriving via /j/[refCode] | Personalization with no data — the jalador IS the curator. | LOW | Filter explorar by jalador's preferred tours when refCode in session. |
| Saved searches with WhatsApp alert | "Avísame por WhatsApp si abre cupo en Tayrona el 15-mayo" | HIGH | Differentiator vs Booking/Airbnb in this region. Defer to v2 of marketplace. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Faceted search with 15+ filters (Booking-style) | "Power users want options" | Decision paralysis. Catalog is small (<1000 tours), not ecommerce-scale. | 5-7 filters max. |
| AI/ML-powered "personalized recommendations" engine | "Modern UX" | Cold-start nightmare with no user history. Costly. Delivers worse results than "popular tours" baseline. | Sort-by-popularity + jalador's curation does 90% of the job. |
| Real-time search-as-you-type with backend hits | "Snappy UX" | Already debouncing client-side; backend round-trip per keystroke = cost + latency. | Current 300ms debounce is fine. |

---

### Availability Management (Operator Side)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Calendar view per tour (which days bookable) | Existing scaffold (`pages/dashboard/operator/tours/[id]/disponibilidad.tsx`). | — | Existing — needs hardening (silent error on save is a bug, see CONCERNS #7). |
| Per-day cupo / capacity (max group size) | Without this = oversell = walk-up tourist with no spot = brand damage. | MEDIUM | `availability.maxGroupSize` per date. Decrement on confirmed booking. |
| Blackout dates (operator vacations, low season closures) | Standard. | LOW | Multi-select on calendar. |
| Bulk-set availability (apply Mon-Fri, every week, for next 3 months) | Required for usability. Operators won't manually set 90 cells. | MEDIUM | Scaffold exists (`createAvailabilityBulk` in `lib/api.ts`). |
| Real-time decrement on booking + atomic check | Prevents race conditions where two tourists book the last seat. | HIGH | Postgres transaction with `SELECT ... FOR UPDATE` or row-level locking. Wompi confirms before final commit. |
| "Booking cutoff" — N hours before tour start | Without it, tourist books tour starting in 30 min, operator scrambles. | LOW | Per-tour config: "se cierra reserva 4 horas antes". |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Auto-confirm vs request-to-book (per tour) | Some tours need operator approval (multi-day, custom); most should be instant book. | MEDIUM | Per-tour flag. Default: instant book (Airbnb data shows 3x conversion vs request). |
| Weather-conditional availability ("Tayrona only if not raining") | Caribbean reality. Saves disputes. | HIGH | Manual operator toggle for now ("cancelar día por clima"). Don't try to auto-integrate weather APIs in v1. |
| Capacity sharing across tour variants | Operator runs same boat for "snorkel" and "fishing" tours; one boat ≠ two simultaneous bookings. | HIGH | "Resource pool" model. Complex. Defer until 2+ operators ask for it. |
| Sync to Google Calendar (one-way out) | Operator already lives in their phone calendar. | MEDIUM | iCal export endpoint. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Dynamic pricing engine (surge / time-of-day) | "Maximize revenue" | Operator can't operate it manually; auto-pricing erodes trust ("¿por qué hoy es más caro?"). | Fixed price + manual seasonal adjust. |
| Yield-management overbooking (-10% intentional oversell) | "Airlines do it" | Disastrous when it fails on a stranger. Reputational. | Hard cap = stated capacity. |

---

### Payments — Wompi + Split Commissions

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Wompi production keys + live cards | Stream 1 of the milestone. | MEDIUM | Existing sandbox flow in `lib/wompi.ts`. Needs prod env vars + webhook endpoint for confirmation. |
| Webhook confirmation (idempotent) | Polling from browser is unreliable; webhook is the source of truth. CONCERNS.md flags this as untested. | HIGH | New `pages/api/wompi/webhook.ts` endpoint. Must verify signature, be idempotent on `transaction.id`. |
| PSE (transferencia bancaria) + Bancolombia | Card penetration in Colombia is ~50%. PSE covers most of the rest. | MEDIUM | Wompi supports natively; just needs UI option. |
| Nequi / Daviplata wallets | Mass-market LatAm preference, especially among tourists' younger demographics. | MEDIUM | Wompi has Nequi integration. Check Daviplata. |
| Receipt / boleto digital after payment | Existing QR + WhatsApp confirmation. | — | Existing. Add: PDF receipt for tourist email if email provided. |
| Refund flow (operator-triggered, platform-approved) | Required by Colombian consumer protection (Estatuto del Consumidor). | HIGH | Admin tool to issue partial/full refund via Wompi API. Logs reason. |
| Split-payment / commission auto-allocation | The whole monetization model. Operator gets ~75%, jalador gets ~20%, platform gets ~5%. | HIGH | NOT a Wompi-native split (Wompi pays one merchant). Implement as ledger: Wompi pays platform → platform settles to operator + jalador on schedule. |
| Hold period before commission release (3-7 days post-tour) | Standard chargeback / dispute window. Without it, jalador gets paid → tourist disputes → platform absorbs loss. | MEDIUM | T+3 after `bookingStatus = 'completed'`. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Real-time commission visibility for jalador ("$X pendiente, $Y disponible, $Z cobrado") | Uber-driver pattern. Single most motivating dashboard element. | MEDIUM | Three-state ledger view. Already partially scaffolded in `pages/dashboard/jalador.tsx`. |
| Withdraw-on-demand to Nequi | Faster cash-out = stickier jalador. | HIGH | Nequi B2C transfer API + minimum threshold (e.g., $20.000 COP). |
| Daily/weekly earnings summary push (WhatsApp) | "Ganaste $45.000 esta semana, dale otra empujada" — proactive engagement. | MEDIUM | Cron job + WhatsApp Business API. |
| Tourist installments (3, 6, 12 cuotas) | Multi-day Tayrona / Sierra packages cost ~$500K COP+. Cuotas widely expected. | MEDIUM | Wompi supports installment marker; bank handles rest. |
| Cash-on-arrival option (jalador collects, marks paid) | Bridges digital + informal economy. Some tourists won't pay online to a brand they don't know. | HIGH | Risk: jalador pockets cash, marks unpaid. Requires trust score + cap on % of cash bookings per jalador. Defer past v1 of payments. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Crypto payments | "Modern, low-fee" | PROJECT.md explicitly excludes. Adds compliance complexity, tiny user share. | Out of scope. |
| Tipping flow | "Operators / jaladores want tips" | Adds checkout complexity, tiny conversion lift, splits commission math. | Cash tip on the day, off-platform. |
| Multi-currency at checkout (USD for tourists) | "Foreign tourists" | Wompi settles in COP; FX to USD adds layers + costs. Tourist's bank does the conversion. | Display COP only; auto-suggest USD-equivalent text near price. |
| Subscription / membership model for tourists ("La Perla Plus") | "Recurring revenue" | One-shot tourism doesn't fit subscriptions. Distracts from core. | Out of scope. |

---

### Trust & Safety Signals

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| "Operador verificado" badge | Reassures tourist. Booking.com / Airbnb pattern. | LOW | Earned after RNT + cámara de comercio reviewed by admin. |
| Visible refund/cancellation policy on tour page | Required by Estatuto del Consumidor (Ley 1480 / 2011). | LOW | Three-tier picker, displayed clearly. |
| "Reserva protegida por La Perla" microcopy | Buyer protection messaging. | LOW | Icons + 1-line copy near checkout button. |
| HTTPS + lock icon on checkout | Universal trust marker. Already in place. | — | Existing. |
| Customer support contact (WhatsApp) | LatAm tourists DM, they don't open tickets. | LOW | Floating WhatsApp button on key screens. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Jalador rating + sales count visible on referral landing | Jalador "Carlos, 4.8★, 230 ventas" is socially powerful. Existing public ranking page is the seed. | LOW | Already partially there. Surface on `/j/[refCode]/[tour]`. |
| Operator "antiguedad" — años en La Perla | Tenure = trust. | LOW | Show join date. |
| Insurance / refund guarantee microsite ("Si tu tour falla, te devolvemos en 24h") | Differentiates against the "calle" alternative where tourists have zero recourse. | MEDIUM | Page + policy doc. Insurance partner optional for v1. |
| Public dispute resolution timeline ("respondemos a quejas en <24h") | Trust through transparency, not promises. | LOW | One stat on About page. |
| "Confirmado por la operadora" status on booking timeline | Shows the booking is alive on the operator side. Reduces "did they get my reservation?" anxiety. | MEDIUM | Operator must press "confirmar" in dashboard within X hours. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Government / chamber-of-commerce logos slapped on every page | "Looks official" | Brand-cluttering. Some logos legally restricted. | One trust block on About + checkout. |
| Trustpilot / external review widget embed | "Adds credibility" | Sends users off-site. Their reviews fragment from yours. | Build owned reviews well, link to Google reviews if needed. |

---

### Cancellations & Disputes

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Three-tier cancellation policy (Flexible / Moderada / Estricta) | Standardized model from Airbnb. Reduces operator+platform negotiation. | LOW | Operator picks one per tour. |
| Tourist self-service cancellation (within window) | Booking.com baseline. | MEDIUM | UI in `mis-reservas.tsx`. Auto-refund via Wompi. |
| Operator-initiated cancellation (weather, mechanical) | Reality of tour ops. | MEDIUM | Triggers full refund + notification. Counts against operator metrics. |
| Refund timing communicated up-front ("3-5 días hábiles a tu banco") | Sets expectations. Reduces support load. | LOW | Microcopy on cancel screen. |
| Dispute opening (tourist claims tour didn't happen / was misrepresented) | Required by consumer law. | HIGH | Form + admin review queue. SLA: respond <24h. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Auto-refund for operator-canceled tours (no admin step) | Speed = trust. Tourist sees money back the same day. | MEDIUM | Pre-authorized Wompi reverse. |
| "Reagendar" instead of refund (with operator inventory) | Saves the booking, the operator's revenue, and the tourist's plans. | MEDIUM | Show available alternative dates inline. |
| Jalador commission claw-back logic (transparent) | Jalador must understand: "if booking refunded, comisión también". Hidden = mistrust. | LOW | Transparent in jalador dashboard ledger. |

**Cancellation policy tiers (proposed):**

| Tier | Free cancel until | After that |
|------|-------------------|-----------|
| Flexible | 24h before tour | 50% refund up to 6h before, then no refund |
| Moderada | 72h before tour | No refund, but reagendar allowed up to 24h before |
| Estricta | 7 days before tour | No refund, no reagendamiento |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free-form negotiation thread between tourist and operator | "Let them work it out" | Becomes support hell, no audit trail, unenforceable. | Structured cancel/refund/reagendar buttons only. |
| "Insurance fee" upsell on every booking | "Revenue stream" | Looks predatory; airline travel-insurance fatigue. | Build trust into the platform itself, no upsell. |

---

### Mobile & Native App Stream

This is Stream 4 of the milestone. Decisions here cascade into all other features (push notifications need an app, offline tickets need an app, etc.).

#### Table Stakes (in any mobile context — PWA or native)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Click-to-call from tour detail | Tourism is conversational. Tourists call before booking high-ticket multi-day. | LOW | `tel:` link. |
| WhatsApp share-tour button | Already core to jalador flow. Mobile share intent on tourist side too. | LOW | Web Share API + `wa.me` fallback. |
| Add-to-home-screen prompt (PWA) | Cheap engagement win before native ships. | LOW | `manifest.json` already exists; add install prompt. |
| Offline booking ticket / QR | Sierra Nevada / Tayrona / boats = no signal. Tourist needs the QR ticket to enter. | MEDIUM | Service Worker caches ticket page; or `localStorage` snapshot. |
| Mobile-optimized photo gallery | Visual product. Swipeable, full-screen. | LOW | Existing should already handle; verify. |
| Push notifications | "Your tour starts in 3 hours" / "New commission earned." | HIGH | Web Push for PWA; FCM/APNs for native. Server-side queue. |
| Geolocation ("tours cerca de ti") | Tourist standing on the malecón asks "what can I do now?" | MEDIUM | Permission ask, fallback to manual. |
| Native camera for review photo upload | Mobile-first action. | LOW | `<input type="file" accept="image/*" capture>` in PWA; native picker in app. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| WhatsApp-first sharing UX (deep link with prefilled text + emojis) | The viral mechanism is WhatsApp, not the app store. | LOW | Per-platform share text optimized. |
| Jalador "venta del día" widget (home screen) | Glanceable earnings. iOS widget / Android widget. | HIGH | Native-only. Defer to v1.1 of mobile. |
| Operator check-in mode (scan tourist QR on arrival) | Replaces paper tiquetera flow with a QR scan. The full digitalization promise. | MEDIUM | Camera scan + booking lookup. |
| Push for jalador on every commission earned | Dopamine loop. Uber-driver pattern. | MEDIUM | Server-triggered. |
| Bilingual auto-detect (ES default, EN fallback) for foreign tourists | Foreign tourists exist; PROJECT.md keeps EN out of scope for v1 but mobile is where it'll matter first. | MEDIUM | Defer to v2 unless tracking shows >20% non-Spanish traffic. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-app messaging between tourist and operator | "Like Airbnb" | Becomes support burden; spam vector; 24/7 expectation. | WhatsApp deeplink — keeps it where users already are. |
| Social feed / activity stream | "Engagement" | Doesn't fit tourism use case. Booking is intent-driven, not browsy. | Out of scope. |
| In-app augmented reality preview of tour | "Wow factor" | Massive scope, 0.1% conversion lift. | Out of scope. |
| Background location tracking ("track your tour live") | "Safety" | Battery drain, privacy minefield (Android 14 / iOS 17 restrictions), low actual use. | Manual check-in by guide. |

---

### Compliance — Colombia-Specific

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Wompi merchant KYC (cédula, RUT, cuenta bancaria) | Wompi requires it before disbursing. Without it, no real money flows. | MEDIUM | Capture during operator onboarding; submit via Wompi merchant API. |
| RNT (Registro Nacional de Turismo) display per operator | Legally required for tour operators in Colombia (MinCIT regulation). | LOW | Field on operator profile; display on tour page. |
| RUT (Registro Único Tributario) capture | Tax ID for invoicing. | LOW | Required for operator payouts. |
| DIAN-compliant electronic invoicing for platform commission | Colombia mandates factura electrónica from DIAN since 2019. La Perla as the merchant of record needs to issue. | HIGH | Use a DIAN-authorized provider (Siigo, Alegra, Facturación.cloud). Defer v1 if low transaction volume; mandatory at scale. |
| Estatuto del Consumidor compliance (Ley 1480 / 2011) | Refund rights, clear pricing, no misleading copy. | LOW | Visible policies + 5-day "retracto" right where applicable. |
| Habeas Data / data privacy notice (Ley 1581 / 2012) | Required at signup. | LOW | Checkbox + linked policy page. |
| Terms of service + commission breakdown disclosure | Both required for a multi-sided marketplace. | LOW | Visible at signup for jalador and operator. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|-----------|-------|
| Auto-generated factura PDF for operator | Saves operator from manual bookkeeping. Sticky feature. | HIGH | Via Alegra/Siigo API. Defer to v1.x. |
| Tax-withholding calc for jaladores (retención en la fuente) | Tax compliance baked in; jalador doesn't need to track. | HIGH | Defer until volume justifies the legal/accounting overhead. |

#### Anti-Features (legal traps to avoid)

| Pattern | Why Problematic |
|---------|-----------------|
| Treating jaladores as "employees" in copy or contracts | Triggers Colombian labor law (cesantías, prestaciones, ARL). They are independent commission agents — that's the whole model. Legal language must be explicit. |
| Holding tourist funds beyond the strict commission window | Without a fiduciary license / patrimonio autónomo, this is regulated activity. Wompi must remain the merchant of record; La Perla settles within days. |
| "Garantía total / 100% reembolso" guarantees in marketing | Estatuto del Consumidor will hold the platform to literal interpretation. Use "buyer protection" not "guarantee". |
| Cross-border payouts to non-Colombian operators | Out of scope per PROJECT.md, but worth re-flagging as a compliance trap if the temptation arises. |

---

## Feature Dependencies

```
Wompi Production
    └──requires──> Webhook Endpoint (idempotent)
    └──requires──> Operator KYC (RUT + cuenta bancaria)
    └──requires──> Commission Ledger Model
                       └──requires──> Hold Period Logic
                                          └──requires──> Booking Status Machine ('pending' → 'paid' → 'completed')

Reviews (verified)
    └──requires──> Booking Status = 'completed'
                       └──requires──> Booking Status Machine

Search by Date
    └──requires──> Availability Model (per-tour, per-day, with capacity)
                       └──requires──> Atomic Decrement on Booking
                                          └──requires──> Wompi Webhook Confirmation

Cancellations (self-service)
    └──requires──> Refund Flow via Wompi
    └──requires──> Cancellation Policy Tier on Tour
    └──requires──> Booking Status Machine

Push Notifications
    └──requires──> Native App OR PWA Web Push
    └──requires──> Notification Event Model
                       └──requires──> Booking + Commission Lifecycle Events

Jalador Referral Multinivel
    └──requires──> RefCode Attribution Persisted to DB (not just URL)
    └──requires──> Commission Ledger with Override Logic
                       └──requires──> Commission Ledger Model

Auto-confirm vs Request-to-Book
    └──requires──> Booking Status Machine ('pending_operator_confirm' state)
    └──requires──> Operator Notification Channel

QR Check-in (Operator Native App)
    └──requires──> Native App OR mobile-web camera
    └──requires──> Booking QR Already in Flow (✓ exists)

Bilateral Reviews
    └──requires──> Verified Reviews
    └──conflicts──with──> One-shot anonymous review form (mutually exclusive UX)
```

### Dependency Notes

- **Booking Status Machine is the spine.** Reviews, refunds, commissions, push notifications, search-by-date, dispute resolution — all hang off the lifecycle states `pending → paid → confirmed → completed → reviewed` (with side branches to `canceled`, `refunded`, `disputed`). Build this model first, build it right.
- **Wompi webhook precedes everything money-related.** Without idempotent confirmation, the entire payment stream is fragile. CONCERNS.md flags it as untested today.
- **Availability model precedes search-by-date.** Cannot filter on data that doesn't exist. Stream 3 (Marketplace v2) requires the data layer from Stream 1 (stabilization).
- **Native app is parallel-able with marketplace v2** but cannot ship before Wompi production — the app needs real money flowing to be worth the effort.
- **Jalador referral multinivel is the highest-leverage differentiator** but depends on a clean commission ledger; building it on the current hardcoded-20% model would calcify a bad data shape.

---

## MVP Definition (for this milestone — post-launch, T+0 to T+5 months)

### Launch With (Stream 1 — Stabilization, weeks 1-3)

Minimum to make the existing app safely handle real money.

- [ ] **Wompi production keys + webhook endpoint** — without this, no real revenue. P0.
- [ ] **Demo mode banner + token-collision fix** — CONCERNS #1. Required to not poison real signups. P0.
- [ ] **Configurable commission per tour/operator** — current 20% hardcode is calcified. Unblocks negotiation with operators. P0.
- [ ] **Platform fee in checkout math** — La Perla's monetization needs to actually flow. P0.
- [ ] **Booking status machine (real states, not just `pending`/`confirmed`)** — spine for everything else. P0.
- [ ] **Sentry / error tracking** — observability. PROJECT.md explicit ask. P0.
- [ ] **Replace 15× silent `.catch(() => {})`** — CONCERNS #7. Operator can't see save failures = lost inventory. P0.
- [ ] **TuresColombia → La Perla brand strings in WhatsApp messages** — CONCERNS #9. Customer-facing brand bug. P0.
- [ ] **`priceChild ?? priceAdult * 0.7` (nullish coalescing fix)** — CONCERNS #10. Money bug. P0.
- [ ] **Brand check on package.json + DEV access removed from login** — CONCERNS #1, #8. P0.

### Add After Validation (Stream 2 — Growth, weeks 4-7)

Acquisition + onboarding push.

- [ ] **Jalador <60s onboarding redesign** — Core Value execution. P1.
- [ ] **First-link CTA + 3-tour starter pack** — drop-off recovery. P1.
- [ ] **Jalador share-to-WhatsApp button** (per tour, per refCode) — viral mechanism. P1.
- [ ] **Real-time commission ledger** (pending / available / paid) — Uber-driver dashboard. P1.
- [ ] **Operator "<10 min publish" flow** — fill the catalog faster. P1.
- [ ] **Photo improvement assistant (auto-crop/brighten)** — catalog quality. P2.
- [ ] **Live "ganadores hoy" ticker** on landing — social proof. P2.
- [ ] **Voice-note onboarding (Costeño Spanish)** — content win. P2.

### Add After Validation (Stream 3 — Marketplace v2, weeks 6-10)

Once growth pipes are warm, deepen the marketplace mechanics.

- [ ] **Availability model + per-day capacity + atomic decrement** — unblocks date-filter, oversell prevention. P1.
- [ ] **Verified reviews (5-star + optional text)** — trust foundation. P1.
- [ ] **Filter-by-date + "available today/this weekend"** — high-intent surface. P1.
- [ ] **Cancellation policies (3 tiers) + self-service cancel + refund-via-Wompi** — required by law and trust. P1.
- [ ] **Jalador ranking + sales count visible publicly** — already partial, complete it. P1.
- [ ] **Bidirectional review (operator rates tourist privately)** — abuse prevention. P2.
- [ ] **Photo reviews** — conversion lift. P2.
- [ ] **Auto-confirm vs request-to-book per tour** — operator UX. P2.
- [ ] **Hold period before commission release (T+3 to T+7)** — chargeback protection. P1.
- [ ] **Dispute open + admin queue** — required by consumer law. P1.
- [ ] **Map view of tours** — deferred unless analytics show list-view confusion. P3.

### Add After Validation (Stream 4 — Native App, months 3-5)

- [ ] **Stack decision: React Native vs Flutter vs hardened PWA** — depends on dev capacity. PWA is the bootstrap-friendly default for a 1-dev team. P1.
- [ ] **Push notifications (commission earned, booking confirmed)** — engagement loop. P1.
- [ ] **Offline ticket / QR (cached service worker)** — Tayrona / Sierra reality. P1.
- [ ] **Operator QR check-in mode** — replaces tiquetera physical flow, the original product promise. P1.
- [ ] **Geolocation "tours cerca de ti"** — high-intent walk-up moment. P2.
- [ ] **Jalador home-screen widget (native only)** — engagement. P3.
- [ ] **Background sync for poor-signal areas** — graceful degradation. P3.

### Future Consideration (v2+ — post this milestone)

- [ ] **Jalador referral multinivel (2-level deep, capped)** — high-impact viral mechanism. Defer because it requires clean ledger + clear legal language to avoid pyramid optics. P2.
- [ ] **Tourist installments (cuotas)** — high ticket-size lift; needs Wompi installment integration. P2.
- [ ] **Withdraw-on-demand to Nequi for jaladores** — stickiness. P2.
- [ ] **Cash-on-arrival flow** — bridges digital/informal; risk-managed. P3.
- [ ] **Auto-generated DIAN factura electrónica** — required at scale, deferred at low volume. P2 when volume justifies.
- [ ] **WhatsApp alert for saved searches** — differentiator vs OTAs in this region. P3.
- [ ] **Bilingual EN/ES auto-detect** — only if foreign-traffic share crosses a threshold. P3.
- [ ] **Weather-conditional auto-cancel + reagendar** — Caribbean reality. P3.

---

## Feature Prioritization Matrix

Selected high-impact items only — not the entire backlog above.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wompi production + webhook | HIGH | MEDIUM | P0 |
| Demo mode banner + token-collision fix | HIGH | LOW | P0 |
| Booking status machine | HIGH | MEDIUM | P0 |
| Configurable commission | HIGH | LOW | P0 |
| Platform fee in checkout math | HIGH | LOW | P0 |
| Replace silent catches | HIGH | LOW | P0 |
| Jalador <60s onboarding | HIGH | MEDIUM | P1 |
| First-link CTA + starter tours | HIGH | LOW | P1 |
| WhatsApp share button (jalador) | HIGH | LOW | P1 |
| Real-time commission ledger | HIGH | MEDIUM | P1 |
| Verified reviews | HIGH | MEDIUM | P1 |
| Availability + per-day capacity | HIGH | HIGH | P1 |
| Filter-by-date | HIGH | MEDIUM | P1 |
| Cancellation policies (3 tiers) | HIGH | MEDIUM | P1 |
| Hold period for commissions | MEDIUM | LOW | P1 |
| Operator KYC (RUT + cuenta) | HIGH | MEDIUM | P1 |
| Push notifications (mobile) | HIGH | HIGH | P1 |
| Operator QR check-in | HIGH | MEDIUM | P1 |
| Offline ticket | MEDIUM | MEDIUM | P1 |
| Photo improvement assistant | MEDIUM | MEDIUM | P2 |
| Voice-note onboarding | MEDIUM | LOW | P2 |
| Bidirectional reviews | MEDIUM | MEDIUM | P2 |
| Auto-confirm vs request-to-book | MEDIUM | MEDIUM | P2 |
| Photo reviews | MEDIUM | MEDIUM | P2 |
| Jalador referral multinivel | HIGH | HIGH | P2 |
| Withdraw-on-demand to Nequi | MEDIUM | HIGH | P2 |
| Tourist installments | MEDIUM | MEDIUM | P2 |
| DIAN factura electrónica | MEDIUM (at scale) | HIGH | P2 (deferred to scale) |
| Map view of tours | LOW | MEDIUM | P3 |
| Saved searches with WhatsApp alert | MEDIUM | HIGH | P3 |
| Cash-on-arrival flow | MEDIUM | HIGH | P3 |
| Bilingual EN/ES | LOW (v1) | MEDIUM | P3 |

---

## Competitor Feature Analysis

| Feature | Airbnb | Booking.com | Rappi (LatAm context) | Uber (driver side) | La Perla approach |
|---------|--------|-------------|----------------------|---------------------|-------------------|
| Onboarding signup | Email + phone, 5+ steps | Email + card | Phone-first, fast | Phone-first, fast | **Phone-only via WhatsApp magic-link, <60s, defer KYC** |
| Reviews | Bidirectional verified | Verified, one-way | Verified per order | Bidirectional verified | **Verified bidirectional (operator rating of tourist private)** |
| Commission visibility for sellers | Host dashboard, monthly | Hotel manager portal, monthly | Courier wallet, real-time | Driver app, real-time | **Real-time, three-state ledger (pending/available/paid), Uber pattern** |
| Cancellation tiers | Flexible/Moderate/Strict/Long-term | Flexible/Non-refundable mixed | Per-restaurant policy | N/A | **Three tiers (Flexible/Moderada/Estricta), policy templates only** |
| Search filters | 30+ facets | 50+ facets | Cuisine + price | N/A | **5-7 filters max, mobile-first, date+price+rating+duration+category** |
| Availability calendar | Per-night, capacity 1-N | Per-night, capacity per room | Per-product stock | N/A | **Per-day, per-tour capacity, atomic decrement** |
| Instant book vs request | Both, host's choice | Mostly instant | Always instant | Always instant | **Instant by default, request-to-book flag for multi-day tours** |
| Payment methods | Cards + PayPal + region-specific | Cards + bank + region-specific | Cards + cash + Nequi + PSE | Cards + cash | **Cards + PSE + Nequi/Daviplata via Wompi; defer cash-on-arrival** |
| Trust signals | Verified ID + Superhost | Genius levels + scoring | Rating + delivery time | Star rating + acceptance | **Operador verificado badge + jalador rating + RNT display + buyer protection messaging** |
| In-app messaging | Yes (host↔guest) | Yes (limited) | Yes (courier↔customer) | Yes (driver↔rider) | **Out of scope — WhatsApp deeplink instead** |
| Native app | Yes, both | Yes, both | Yes, both | Yes, both | **Stream 4: PWA-hardened first, native after validation** |
| Compliance | Per-country tax + ID | Per-country tax + ID | Per-country tax + cédula | Per-country tax + cédula | **Wompi KYC + RNT display + DIAN factura at scale + Habeas Data notice** |

---

## Sources

- `.planning/PROJECT.md` — La Perla product brief (validated requirements, monetization model, scope boundaries).
- `.planning/codebase/STRUCTURE.md` — current implementation surface area (HIGH confidence — direct file inspection).
- `.planning/codebase/CONCERNS.md` — current gaps and risks informing prioritization (HIGH confidence — fresh audit).
- Reference marketplaces named in the brief (Airbnb, Booking.com, Rappi, Mercado Libre, Toast, Square, OnlyFans creator, Uber driver) — pattern matching from training data, MEDIUM confidence on specific behaviors, HIGH confidence on category-level patterns.
- Colombian regulatory context (DIAN factura electrónica, Estatuto del Consumidor Ley 1480, Habeas Data Ley 1581, RNT requirement for operators, Wompi merchant KYC) — LOW-to-MEDIUM confidence; **flag for legal validation before money moves through prod**, particularly DIAN electronic invoicing thresholds and the precise treatment of jalador commission income for retención en la fuente.
- LatAm informal-economy onboarding patterns (phone-first, WhatsApp-OS, defer-KYC) — informed by Rappi courier flow and Mercado Libre seller onboarding as benchmark; MEDIUM confidence.

**Open questions to resolve before / during implementation:**

1. Exact platform fee % (PROJECT.md says 5-10%, needs nailing down per operator-negotiation reality).
2. Hold-period length (T+3 vs T+7 vs match-Wompi-chargeback-window — needs Wompi terms read).
3. Whether referral multinivel is legally distinguishable from a pyramid scheme in Colombian law (Superintendencia de Sociedades has been active here — needs legal review before shipping).
4. DIAN factura volume threshold — when is electronic invoicing required vs nice-to-have for a marketplace operating as merchant of record.
5. Wompi split-payment vs ledger-and-disburse — does Wompi natively support multi-recipient on a single transaction, or must the platform aggregate and re-disburse? Architecturally significant.

---

*Feature research for: La Perla — multi-sided tourism marketplace, informal economy, Santa Marta Colombia*
*Researched: 2026-04-25*
