// Edge Function: wompi-webhook
// Plan 2: wompi-prod-webhook-idempotente (PAY-02, PAY-05, BKG-02)
// Created: 2026-04-27
//
// Recibe eventos de Wompi (transaction.updated) y los procesa de forma idempotente.
//
// Flujo:
//   1. Validar X-Event-Checksum (HMAC SHA256 con events_secret)
//   2. INSERT en webhook_events ON CONFLICT DO NOTHING (idempotency gate)
//   3. Si conflict (evento duplicado): retornar 200 sin side effects
//   4. Si nuevo: llamar RPC apropiado segun event.data.transaction.status
//   5. Marcar processed_at en webhook_events
//   6. Responder 200 < 3 segundos
//
// Deploy:
//   supabase functions deploy wompi-webhook --no-verify-jwt
//   (no-verify-jwt porque Wompi no envia JWT, validamos por checksum)
//
// URL final del webhook:
//   https://<project>.supabase.co/functions/v1/wompi-webhook
//   (configurar este URL en https://comercios.wompi.co > Eventos)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.3';

interface WompiEvent {
  event: string;
  data: {
    transaction: {
      id: string;
      status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR';
      reference: string;
      amount_in_cents: number;
      currency: string;
      payment_method_type?: string;
      customer_email?: string;
    };
  };
  sent_at: string;
  timestamp: number;
  signature?: {
    checksum: string;
    properties: string[];
  };
  environment: 'test' | 'production';
}

interface WebhookResponse {
  ok: boolean;
  message?: string;
  duplicate?: boolean;
  booking_id?: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WOMPI_EVENTS_SECRET = Deno.env.get('WOMPI_EVENTS_SECRET') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Deno permite throw aqui; serve() todavia no se inicio
  throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
}

if (!WOMPI_EVENTS_SECRET) {
  console.error('[wompi-webhook] WARNING: WOMPI_EVENTS_SECRET no configurado. La validacion de checksum se saltara (INSEGURO).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Valida el checksum HMAC SHA256 contra el events_secret.
 * Formato segun Wompi:
 *   data = signature.properties.map(prop => getNestedValue(event, prop)).join('')
 *   data = data + event.timestamp + WOMPI_EVENTS_SECRET
 *   checksum = SHA256(data)
 *
 * Ver: https://docs.wompi.co/docs/colombia/eventos/
 */
async function validateChecksum(event: WompiEvent): Promise<boolean> {
  if (!WOMPI_EVENTS_SECRET) return true; // Skip si no hay secret (dev)
  if (!event.signature) return false;

  const properties = event.signature.properties;
  const concatenatedValues = properties
    .map((path) => getNestedValue(event, path))
    .join('');

  const stringToHash = `${concatenatedValues}${event.timestamp}${WOMPI_EVENTS_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex === event.signature.checksum;
}

function getNestedValue(obj: unknown, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  return current === null || current === undefined ? '' : String(current);
}

/**
 * Procesa un evento de Wompi llamando a los RPCs correspondientes.
 * Esta funcion debe ser idempotente por si misma (defense in depth).
 */
async function processWompiEvent(event: WompiEvent): Promise<{ booking_id?: string; error?: string }> {
  const tx = event.data.transaction;

  // Buscar booking por wompi_reference (debe existir, fue creado en /api/bookings/create)
  const { data: bookings, error: findError } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('metadata->>wompi_reference', tx.reference)
    .limit(1);

  if (findError) {
    return { error: `Error buscando booking: ${findError.message}` };
  }

  if (!bookings || bookings.length === 0) {
    return { error: `Booking con reference ${tx.reference} no existe` };
  }

  const booking = bookings[0];
  const targetStatus =
    tx.status === 'APPROVED' ? 'paid' :
    tx.status === 'DECLINED' ? 'canceled' :
    tx.status === 'VOIDED' ? 'canceled' :
    null;

  if (!targetStatus) {
    // PENDING o ERROR: no cambiar estado
    return { booking_id: booking.id };
  }

  const { error: rpcError } = await supabase.rpc('update_booking_status', {
    p_booking_id: booking.id,
    p_to_status: targetStatus,
    p_actor_role: 'wompi-webhook',
    p_reason: `Wompi tx ${tx.id} status=${tx.status}`,
  });

  if (rpcError) {
    return { booking_id: booking.id, error: `RPC error: ${rpcError.message}` };
  }

  return { booking_id: booking.id };
}

serve(async (req) => {
  const start = Date.now();

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: WompiEvent;
  try {
    event = await req.json() as WompiEvent;
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1) Validar checksum
  const checksumOk = await validateChecksum(event);
  if (!checksumOk) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid checksum' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2) Idempotency gate: INSERT ON CONFLICT DO NOTHING
  const eventId = `wompi-${event.data.transaction.id}-${event.timestamp}`;
  const checksumValue = event.signature?.checksum ?? 'no-signature';

  const { error: insertError } = await supabase
    .from('webhook_events')
    .insert({
      event_id: eventId,
      provider: 'wompi',
      checksum: checksumValue,
      payload: event,
    });

  // Postgres unique violation = 23505. Si conflict, es duplicado: retornar 200 sin procesar.
  const isDuplicate = insertError?.code === '23505';

  if (isDuplicate) {
    const elapsed = Date.now() - start;
    const response: WebhookResponse = { ok: true, duplicate: true, message: `Already processed in ${elapsed}ms` };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (insertError) {
    console.error('[wompi-webhook] Error inserting webhook_event:', insertError);
    return new Response(JSON.stringify({ ok: false, message: 'DB error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3) Procesar evento
  const result = await processWompiEvent(event);

  // 4) Marcar processed_at (best-effort; no bloquea response)
  await supabase
    .from('webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      error: result.error ?? null,
    })
    .eq('event_id', eventId);

  const elapsed = Date.now() - start;

  // Si hubo error en procesamiento pero el evento esta registrado, retornar 200 igual
  // para que Wompi no reintente. El error queda en webhook_events.error para debugging.
  // (Si fuera un error transient real, podriamos retornar 500 para que Wompi reintente.)
  const response: WebhookResponse = {
    ok: !result.error,
    booking_id: result.booking_id,
    message: result.error ?? `Processed in ${elapsed}ms`,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
