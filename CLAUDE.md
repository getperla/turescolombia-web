# TourMarta (La Perla)

Marketplace turístico para Santa Marta y la región Caribe. Conecta turistas, **jaladores** (vendedores de campo) y **operadores turísticos**.

UX de referencia: Airbnb. Operador ancla: CaribbeanWorld.

**Filosofía central:** simplicidad máxima. Muchos usuarios (jaladores, turistas) tienen baja alfabetización digital. Si una pantalla necesita explicación, está mal hecha.

## Stack

- **Next.js 16** con **Pages Router** + React 18 + TypeScript
- Tailwind CSS 3
- ESLint 9 (flat config)
- Auth + DB: **Supabase**
- Pagos: **Wompi** (Colombia) / fallback PayU planeado
- Deploy: **Vercel** (proyecto `tourmarta-web`, dominio `tourmarta-web.vercel.app`)
- Idioma de UI: **Español** (Colombia)

> **Nota sobre routing:** El brief original mencionaba App Router. El repo usa Pages Router. Migración a App Router está pendiente como fase aparte — no asumir que existe `app/` ni que aplican convenciones de Server Components. Hoy todo es client-side render con `getServerSideProps` cuando hace falta.

## Roles del sistema

- **Turista** — descubre y reserva tours. UX tipo Airbnb.
- **Jalador** — vendedor de calle. Usa el celular en la playa/centro. Comparte links, gana comisión por reserva.
- **Operador** — empresa que opera el tour (ej. CaribbeanWorld). Sube tours, gestiona cupos.
- **Admin** — panel interno. CRUD completo, reportes, notificaciones en tiempo real.

## Estructura de comisiones

Tres vías: **operador / plataforma / jalador**. Cualquier cambio en cálculo de comisión es crítico — pedir confirmación antes de tocar.

> Hoy el frontend tiene 20% hardcoded como fallback (`pages/dashboard/jalador.tsx`). El cálculo real debería venir del backend. Confirmar antes de cambiar.

## Sistema visual — "Tropical Editorial"

- Tipografías: **Cormorant Garamond** (display, importada de Google Fonts) + **DM Sans** (UI/texto)
- Paleta: tonos tropicales editoriales (definidos en `styles/globals.css` y `tailwind.config.js`)
- Mobile-first siempre. La mayoría de tráfico es desde celular.
- Open Graph meta tags obligatorios en cualquier página compartible (los jaladores comparten por WhatsApp).

## Comandos

```bash
npm run dev        # desarrollo local (Turbopack)
npm run build      # build de producción (debe pasar antes de mergear)
npm run lint       # ESLint flat config
npm run analyze    # bundle analyzer nativo de Turbopack
```

> No hay setup de tests todavía. Si se agrega (vitest/jest + Playwright), documentar acá.

## Convenciones

- **Pages Router**: cada archivo en `pages/` es una ruta. Client-side por default. Usar `getServerSideProps`/`getStaticProps` cuando se necesite SSR/SSG.
- **Sin estilos inline.** Usar utilidades de Tailwind. Excepción tolerada: colores con valores exactos del brand vía `style={{}}` cuando Tailwind no los tiene.
- **Textos de UI en español.** Sin jerga técnica visible al usuario.
- **Cualquier flujo de jalador debe ser usable con una sola mano y sin instrucciones.**
- **OG tags obligatorios** en páginas públicas (preview en WhatsApp).
- **`next/image`** para todas las imágenes (no `<img>`). Excepción: lightbox con aspect ratio dinámico.
- **Validar boundaries:** errores de red se loguean a `console.error`, nunca se silencian.

## Auth

- 100% Supabase (`supabase.auth`).
- Login: email/password + Google OAuth + phone OTP por SMS.
- El `AuthProvider` (`lib/auth.tsx`) se suscribe a `supabase.auth.onAuthStateChange` globalmente.
- Roles se guardan en `user_metadata.role`.
- **No hay backend de auth propio** — eliminado en Fase 1.

## Datos

- **Hoy (Fase 1):** lecturas/escrituras de tours, bookings, reviews, dashboards van al backend REST en `NEXT_PUBLIC_API_URL` vía `lib/api.ts` (wrapper de fetch).
- **Plan (Fase 2):** migrar a queries directas de Supabase (`supabase.from(...).select()`). Bloqueado hasta tener el schema definitivo.

## No hacer

- **No agregar dependencias nuevas sin preguntar primero.**
- **No tocar el cálculo de comisiones sin confirmación explícita.**
- **No cambiar el sistema de diseño** (tipografías, paleta) sin discutirlo.
- **No asumir que el usuario sabe usar la app** — siempre validar el flujo en mobile real.
- **No introducir capa beta/demo/mock.** Fue eliminada deliberadamente; los errores reales deben ser visibles.
- **No silenciar errores en `catch {}`.** Mínimo `console.error`.

## Contexto extra

- Repo y desarrollo principalmente desde PC `djpuntomarino` (ASUS TUF) vía Tailscale + VS Code Remote Tunnel.
- Acceso móvil: vscode.dev / Termius por SSH desde iPhone.
- Tooling de Claude Code: GSD (`get-shit-done-cc`) instalado en `.claude/` (gitignoreado, cada dev instala con `npx get-shit-done-cc@latest --claude --local`).

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=<URL del backend REST>     # mientras dure Fase 1
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=<llave Wompi>      # opcional; sin ella, los pagos muestran error claro
NEXT_PUBLIC_WOMPI_ENV=sandbox | production
NEXT_PUBLIC_SITE_URL=https://tourmarta-web.vercel.app  # opcional, usado en sitemap
```
