# UptimeRobot setup

> **Plan 5: observability-demo-gate-secrets-backups (OBS-04)**
> Created: 2026-04-27

UptimeRobot monitorea que la app y el webhook esten arriba 24/7 y notifica
si caen mas de 2 minutos. Free tier permite 50 monitores con check cada 5 min.

## Monitores a configurar

### 1. Homepage
- **Type**: HTTPS
- **URL**: `https://tourmarta-web.vercel.app/`
- **Interval**: 5 min
- **Expected**: 200 OK
- **Alert contacts**: WhatsApp (via Twilio) + email

### 2. API Health
- **Type**: HTTPS Keyword
- **URL**: `https://tourmarta-web.vercel.app/api/health`
- **Interval**: 5 min
- **Keyword**: `"db":"ok"`
- **Expected**: keyword presente
- **Alert contacts**: WhatsApp + email + Sentry alert

### 3. Wompi webhook (Edge Function)
- **Type**: HTTPS POST con body de health-ping
- **URL**: `https://<project>.supabase.co/functions/v1/wompi-webhook`
- **Interval**: 5 min
- **Expected**: 200 (incluso con duplicate flag)
- **Notes**: enviar payload sintetico que el endpoint reconozca como ping
  (pendiente implementar handler en wompi-webhook para health-pings)

## Alertas

- **Down > 2 min**: enviar WhatsApp + email
- **Up after down**: enviar email confirmando recovery
- **SSL expiry < 14 dias**: enviar email semanal

## Setup paso a paso

1. Crear cuenta en https://uptimerobot.com
2. Settings -> My Settings -> Alert Contacts:
   - Email principal
   - WhatsApp via Twilio (requiere Twilio account, ~$20/mes)
3. Add New Monitor para cada uno de los 3 arriba
4. Verificar que "Status Page" publica esta habilitado (opcional pero util)
5. Documentar URL del status page en este archivo cuando este listo
