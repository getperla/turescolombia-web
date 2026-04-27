// Test de idempotencia del webhook Wompi
// Plan 2: wompi-prod-webhook-idempotente (PAY-02, TST-04)
// Created: 2026-04-27
//
// Valida que enviar el mismo evento Wompi 2 veces produce exactamente:
//   - 1 booking
//   - 1 entry de accrual en commission_ledger
//   - 1 entry en booking_status_history
//
// Como hacerlo:
//   1. Crear booking en estado 'pending' via RPC create_booking
//   2. Construir un evento Wompi sintetico (con event_id fijo)
//   3. POST al endpoint del webhook 2 veces
//   4. Assert sobre conteos en DB

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const WEBHOOK_URL = process.env.WOMPI_WEBHOOK_URL
  ?? `${SUPABASE_URL}/functions/v1/wompi-webhook`;

const skipIfNoSetup = !SUPABASE_URL || SUPABASE_URL.includes('placeholder') || !SUPABASE_SERVICE_ROLE_KEY
  ? it.skip
  : it;

interface SyntheticEvent {
  event: string;
  data: {
    transaction: {
      id: string;
      status: 'APPROVED';
      reference: string;
      amount_in_cents: number;
      currency: string;
    };
  };
  sent_at: string;
  timestamp: number;
  environment: 'test';
}

describe('Webhook Wompi: idempotencia', () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) return;
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  skipIfNoSetup('webhook duplicado no genera 2 entries en commission_ledger', async () => {
    const wompiReference = `TEST-IDEM-${Date.now()}`;

    // 1) Crear booking en pending via RPC
    const { data: bookingId, error: createError } = await admin.rpc('create_booking', {
      p_tour_id: '00000000-0000-0000-0000-000000000001',
      p_tourist_id: '00000000-0000-0000-0000-000000000002',
      p_operator_id: '00000000-0000-0000-0000-000000000003',
      p_jalador_id: '00000000-0000-0000-0000-000000000004',
      p_jalador_ref_id: 'JREF1',
      p_subtotal: 100000,
      p_tour_date: '2026-12-31',
      p_party_size: 2,
      p_party_children: 0,
      p_wompi_reference: wompiReference,
    });

    expect(createError).toBeNull();
    expect(bookingId).toBeDefined();

    // 2) Construir evento sintetico
    const event: SyntheticEvent = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: `wompi-test-${Date.now()}`,
          status: 'APPROVED',
          reference: wompiReference,
          amount_in_cents: 10800000,
          currency: 'COP',
        },
      },
      sent_at: new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
      environment: 'test',
    };

    // 3) POST al webhook 2 veces
    const post = async () =>
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).then((r) => r.json());

    const r1 = await post();
    const r2 = await post();

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Segunda llamada debe identificarse como duplicada
    expect(r2.duplicate).toBe(true);

    // 4) Verificar conteos
    const { data: ledgerEntries } = await admin
      .from('commission_ledger')
      .select('id, entry_type')
      .eq('booking_id', bookingId);

    const accruals = (ledgerEntries ?? []).filter((e) => e.entry_type === 'accrual');
    expect(accruals.length).toBe(1);

    const { data: history } = await admin
      .from('booking_status_history')
      .select('id, to_status')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const paidTransitions = (history ?? []).filter((h) => h.to_status === 'paid');
    expect(paidTransitions.length).toBe(1);

    // Cleanup
    await admin.from('commission_ledger').delete().eq('booking_id', bookingId);
    await admin.from('booking_status_history').delete().eq('booking_id', bookingId);
    await admin.from('bookings').delete().eq('id', bookingId);
  });

  skipIfNoSetup('crear booking con misma wompi_reference 2 veces retorna mismo ID', async () => {
    const wompiReference = `TEST-DEDUPE-${Date.now()}`;
    const params = {
      p_tour_id: '00000000-0000-0000-0000-000000000001',
      p_tourist_id: '00000000-0000-0000-0000-000000000002',
      p_operator_id: '00000000-0000-0000-0000-000000000003',
      p_jalador_id: '00000000-0000-0000-0000-000000000004',
      p_jalador_ref_id: 'JREF2',
      p_subtotal: 50000,
      p_tour_date: '2026-12-31',
      p_party_size: 1,
      p_party_children: 0,
      p_wompi_reference: wompiReference,
    };

    const { data: id1 } = await admin.rpc('create_booking', params);
    const { data: id2 } = await admin.rpc('create_booking', params);

    expect(id1).toBe(id2);

    // Cleanup
    await admin.from('booking_status_history').delete().eq('booking_id', id1);
    await admin.from('bookings').delete().eq('id', id1);
  });
});
