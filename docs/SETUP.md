# Setup de infraestructura — La Perla

Este archivo documenta los pasos de configuracion **manuales** que NO viven
en codigo (cosas que se configuran via Supabase Dashboard, Vercel, Wompi).

Cada vez que un nuevo dev clona el repo, o cuando se monta produccion en
otro proyecto Supabase, hay que correr esta lista en orden.

> ⚠️ Si haces un cambio que requiere setup manual nuevo (un bucket, una
> env var, una integracion), agregalo aqui en el mismo PR. No dejes
> "infra implicit".

---

## 1. Variables de entorno

Variables requeridas en `.env.local` (dev) y en Vercel (prod):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Wompi (sandbox o produccion)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_INTEGRITY_KEY=test_integrity_...

# Sitio
NEXT_PUBLIC_SITE_URL=https://tourmarta-web.vercel.app

# Modo agente IA (default: mock — cero costo)
# AGENT_LIVE=true        # solo si quieres pegar a Claude API real
# ANTHROPIC_API_KEY=sk-ant-...

# Modo de la plataforma (afecta is_demo flag en sales)
LAPERLA_MODE=production   # o 'demo' para testing
```

`.env.example` en el repo tiene la version sin secretos.

---

## 2. Supabase

### 2.1 Aplicar migrations

Las migrations estan en `supabase/migrations/`, numeradas `NNNN_descripcion.sql`.
Aplicalas en orden via Supabase Dashboard → SQL Editor → New Query → pegar
el contenido del archivo → Run.

**Migrations actuales:**
- `0001_tours_for_agente.sql` — tabla `tours`
- `0002_sales_commissions.sql` — tablas `sales`, `sale_items`, `commissions`
- `0003_jalador_ratings.sql` — tabla `jalador_ratings` + RPC `get_jalador_rating`
- `9999_reset_demo_data.sql` — opcional, limpia datos demo

Las migrations son **idempotentes** (`CREATE TABLE IF NOT EXISTS`, etc.) — se
pueden re-aplicar sin romper nada.

### 2.2 Authentication → URL Configuration

Para que los emails de confirmacion lleven al dominio correcto (no a
localhost), configurar:

- **Site URL:** `https://tourmarta-web.vercel.app` (el dominio de produccion)
- **Redirect URLs** (allowlist):
  - `https://tourmarta-web.vercel.app/**`
  - `https://tourmarta-web-*.vercel.app/**` (previews)
  - `http://localhost:3000/**` (dev local)

### 2.3 Storage → bucket `avatars`

Para fotos de perfil de jaladores. Crear el bucket asi:

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `avatars`
3. **Public bucket**: ✅ (lectura publica — los avatares se muestran sin auth)
4. **File size limit**: `2 MB` (defensa en profundidad — el cliente ya hace
   resize a 400x400 webp antes de subir, pero limitar aqui previene abuso
   si alguien bypassa el cliente)
5. **Allowed MIME types**: `image/jpeg, image/png, image/webp`
6. Click **Create bucket**

Despues, en **Policies** del bucket:

| Policy | Target | Definition |
|---|---|---|
| `avatars_read_public` | SELECT | `true` (cualquiera lee) |
| `avatars_write_own` | INSERT, UPDATE | `auth.uid()::text = (storage.foldername(name))[1]` (cada user solo escribe en su carpeta `<uid>/...`) |
| `avatars_delete_own` | DELETE | `auth.uid()::text = (storage.foldername(name))[1]` |

Naming convention de archivos: `<user_uid>/<timestamp>.webp`. El frontend
sube ahi y la URL publica queda como
`https://xxx.supabase.co/storage/v1/object/public/avatars/<user_uid>/<file>.webp`.

### 2.4 Realtime publication

Si recreas el proyecto, la publication `supabase_realtime` ya existe por
default en Supabase. Las migrations 0002 y 0003 ya hacen `ADD TABLE` a
esa publication, asi que no hay que tocar nada manualmente.

---

## 3. Vercel

### 3.1 Project settings

- **Framework Preset**: Next.js (auto-detect)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Node Version**: 20.x o superior

### 3.2 Environment Variables

Pega las del paso 1 en Project Settings → Environment Variables.
Marca cada una para todos los environments (Production, Preview, Development).

### 3.3 Deployment Protection

- Production: **Disabled** (sitio publico)
- Preview: opcional — si pones password, los QA tools (Cowork) necesitan el
  bypass token. Recomendado: dejarlo deshabilitado mientras estamos en
  testing.

---

## 4. Wompi (Pagos)

### 4.1 Sandbox (default actual)

Las llaves del paso 1 con prefijo `pub_test_` y `prv_test_` son sandbox.

Webhook URL para events de pago (configurar en Wompi Dashboard cuando se
active payment confirmation real):

```
https://tourmarta-web.vercel.app/api/wompi/webhook
```

### 4.2 Produccion

Cambiar prefijo a `pub_prod_` y `prv_prod_` cuando:
- KYC del operador (jvergelamaris) este aprobado en Wompi
- Tengamos cuenta bancaria validada
- Hayamos probado al menos 3 transacciones sandbox end-to-end

---

## 5. Verificacion post-setup

Despues de aplicar todo, smoke test:

1. `npm run dev` — el sitio levanta sin errores
2. Registrate como jalador con un email nuevo
3. Confirma el email — el link debe ir a tu dominio, no a localhost
4. Aterrizas en `/dashboard/jalador` con tu refCode `PED-XXXX...`
5. (Opcional) Inserta una review dummy via SQL Editor:
   ```sql
   insert into public.jalador_ratings (jalador_user_id, tourist_id, sale_id, rating, comment)
   values (
     '<uid_jalador>',
     '<uid_tourist>',
     '<sale_id_de_paid>',
     5,
     'Excelente atencion, super recomendado'
   );
   ```
6. Recarga el dashboard — el badge de rating debe mostrar `⭐ 5.0 (1 reseña)`

---

## 6. Notas para Cowork (QA agente)

Cuando se te pide configurar algo en Supabase Dashboard, **siempre** chequea
contra este archivo primero. Si lo que te piden no esta aqui, pregunta antes
de tocar — puede ser que sea setup nuevo que aun no se documento.

Nunca borres datos de produccion sin confirmacion explicita del owner.
