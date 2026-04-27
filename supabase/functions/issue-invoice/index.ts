// Edge Function: issue-invoice
// Plan 4: compliance-dian-rnt-habeas-data (CMP-01)
// Created: 2026-04-27
//
// Procesa la cola pending_invoices: para cada booking pagado, emite factura DIAN via Alegra.
//
// Schedule: pg_cron cada 5 minutos invoca esta funcion via HTTP.
// (Alternativa: cron interno con Deno scheduler — pero mantenemos pg_cron para consistencia con commission-release.)
//
// Idempotencia: el row de pending_invoices se mueve a 'processing' via FOR UPDATE SKIP LOCKED.
// Si la Edge Function falla a mitad, otra ejecucion puede tomarlo de nuevo (status quedo en processing,
// pero el cron de retry lo retoma cuando next_attempt_at <= now).
//
// Deploy:
//   supabase functions deploy issue-invoice --no-verify-jwt
// Schedule (despues de deploy):
//   SELECT cron.schedule('issue-invoice', '*/5 * * * *',
//     $$ SELECT net.http_post('https://<project>.supabase.co/functions/v1/issue-invoice') $$);

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALEGRA_USER = Deno.env.get('ALEGRA_USER') ?? '';
const ALEGRA_API_KEY = Deno.env.get('ALEGRA_API_KEY') ?? '';

const ALEGRA_API_BASE = 'https://api.alegra.com/api/v1';
const BATCH_SIZE = 10;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE env vars no configurados');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface PendingInvoiceRow {
  id: string;
  booking_id: string;
  attempts: number;
  max_attempts: number;
  provider: string;
}

interface BookingForInvoice {
  id: string;
  tour_id: string;
  operator_id: string;
  tourist_id: string;
  subtotal: number;
  platform_fee: number;
  party_size: number;
  total_amount: number;
}

interface OperatorComplianceRow {
  rut_number: string | null;
  rnt_holder_name: string | null;
}

interface AlegraResponse {
  id?: number | string;
  pdfUrl?: string;
  stamp?: { cufe?: string };
  message?: string;
  error?: string;
}

function calculateBackoffSeconds(attempts: number): number {
  // 1min, 5min, 25min, 2h, 10h
  return Math.min(60 * Math.pow(5, attempts), 12 * 60 * 60);
}

async function emitOneInvoice(row: PendingInvoiceRow): Promise<{ success: boolean; error?: string }> {
  // 1) Cargar booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, tour_id, operator_id, tourist_id, subtotal, platform_fee, party_size, total_amount')
    .eq('id', row.booking_id)
    .single();

  if (bookingErr || !booking) {
    return { success: false, error: `Booking ${row.booking_id} no encontrado: ${bookingErr?.message}` };
  }

  const b = booking as BookingForInvoice;

  // 2) Cargar compliance del operador (necesitamos su RUT para Modelo B)
  const { data: compliance } = await supabase
    .from('operators_compliance')
    .select('rut_number, rnt_holder_name')
    .eq('operator_id', b.operator_id)
    .single();

  const c = compliance as OperatorComplianceRow | null;

  if (!c?.rut_number) {
    return { success: false, error: `Operador ${b.operator_id} sin RUT en operators_compliance` };
  }

  // 3) Cargar email del turista (para enviar factura)
  // Nota: en Phase 1 esto vendra de Render legacy. Despues de Phase 2 vendra de Supabase.
  // Por ahora dejamos un placeholder.
  const touristEmail = 'placeholder@turista.local'; // TODO: integrar con tourist_id lookup

  // 4) Llamar Alegra
  const authToken = btoa(`${ALEGRA_USER}:${ALEGRA_API_KEY}`);
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    date: today,
    dueDate: today,
    client: {
      identification: c.rut_number,
      name: c.rnt_holder_name ?? 'Operador',
      email: touristEmail,
    },
    items: [
      {
        name: `Tour reserva ${b.id}`,
        price: b.subtotal,
        quantity: 1,
        tax: [],
      },
    ],
    stamp: { generateStamp: true },
    metadata: {
      booking_id: b.id,
      issuer_type: 'operator',
    },
  };

  try {
    const res = await fetch(`${ALEGRA_API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as AlegraResponse;

    if (!res.ok || !data.id || !data.pdfUrl) {
      return {
        success: false,
        error: data.error ?? data.message ?? `Alegra HTTP ${res.status}`,
      };
    }

    // 5) Marcar como issued en pending_invoices
    await supabase
      .from('pending_invoices')
      .update({
        status: 'issued',
        alegra_invoice_id: String(data.id),
        invoice_pdf_url: data.pdfUrl,
        error: null,
      })
      .eq('id', row.id);

    // 6) Actualizar el booking con la factura
    await supabase
      .from('bookings')
      .update({
        invoice_id: String(data.id),
        invoice_pdf_url: data.pdfUrl,
      })
      .eq('id', b.id);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { success: false, error: message };
  }
}

serve(async () => {
  const start = Date.now();

  // 1) Reclamar batch (esto los marca status='processing' y attempts++)
  const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_invoices', {
    p_limit: BATCH_SIZE,
  });

  if (claimError) {
    return new Response(JSON.stringify({ ok: false, error: claimError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = (claimed ?? []) as PendingInvoiceRow[];

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, elapsed_ms: Date.now() - start }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const result = await emitOneInvoice(row);

    if (result.success) {
      success++;
    } else {
      failed++;
      const isPermanentFail = row.attempts + 1 >= row.max_attempts;
      const backoff = calculateBackoffSeconds(row.attempts);

      await supabase
        .from('pending_invoices')
        .update({
          status: isPermanentFail ? 'failed' : 'pending',
          error: result.error ?? 'unknown',
          next_attempt_at: new Date(Date.now() + backoff * 1000).toISOString(),
        })
        .eq('id', row.id);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      claimed: rows.length,
      success,
      failed,
      elapsed_ms: Date.now() - start,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
