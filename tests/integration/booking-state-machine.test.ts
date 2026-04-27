// Tests de la state machine de bookings
// Plan 2: wompi-prod-webhook-idempotente (BKG-01, BKG-04)
// Created: 2026-04-27
//
// Valida que update_booking_status:
//   - Acepta transiciones validas (pending->paid, paid->confirmed, etc.)
//   - Rechaza transiciones invalidas (pending->completed directo)
//   - Es idempotente (llamar 2 veces con mismo target no duplica side effects)
//   - Crea entries en booking_status_history correctamente

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const skipIfNoSetup = !SUPABASE_URL || SUPABASE_URL.includes('placeholder') || !SUPABASE_SERVICE_ROLE_KEY
  ? it.skip
  : it;

describe('State machine: update_booking_status', () => {
  let admin: SupabaseClient;
  let bookingId: string;

  beforeAll(() => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) return;
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  beforeEach(async () => {
    if (!admin) return;
    const wompiReference = `TEST-SM-${Date.now()}-${Math.random()}`;
    const { data } = await admin.rpc('create_booking', {
      p_tour_id: '00000000-0000-0000-0000-000000000001',
      p_tourist_id: '00000000-0000-0000-0000-000000000002',
      p_operator_id: '00000000-0000-0000-0000-000000000003',
      p_jalador_id: '00000000-0000-0000-0000-000000000004',
      p_jalador_ref_id: 'JREFSM',
      p_subtotal: 100000,
      p_tour_date: '2026-12-31',
      p_party_size: 1,
      p_party_children: 0,
      p_wompi_reference: wompiReference,
    });
    bookingId = data as string;
  });

  skipIfNoSetup('transicion valida pending -> paid funciona', async () => {
    const { data, error } = await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'paid',
      p_actor_role: 'wompi-webhook',
      p_reason: 'test transition',
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  skipIfNoSetup('transicion invalida pending -> completed se rechaza', async () => {
    const { error } = await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'completed',
      p_actor_role: 'system',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain('Transicion invalida');
  });

  skipIfNoSetup('transicion idempotente (mismo target 2 veces) no falla', async () => {
    await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'paid',
      p_actor_role: 'wompi-webhook',
    });
    const { data, error } = await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'paid',
      p_actor_role: 'wompi-webhook',
    });
    expect(error).toBeNull();
    expect(data).toBe(false); // false = no se cambio nada
  });

  skipIfNoSetup('flujo feliz completo pending->paid->confirmed->completed->reviewed', async () => {
    const flow: Array<'paid' | 'confirmed' | 'completed' | 'reviewed'> = [
      'paid', 'confirmed', 'completed', 'reviewed',
    ];

    for (const status of flow) {
      const { error } = await admin.rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_to_status: status,
        p_actor_role: 'system',
      });
      expect(error, `transition to ${status}`).toBeNull();
    }

    const { data: history } = await admin
      .from('booking_status_history')
      .select('to_status')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const statuses = (history ?? []).map((h) => h.to_status);
    expect(statuses).toEqual(['pending', 'paid', 'confirmed', 'completed', 'reviewed']);
  });

  skipIfNoSetup('paid -> refunded crea reversal en ledger', async () => {
    await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'paid',
    });

    const { data: ledgerBefore } = await admin
      .from('commission_ledger')
      .select('entry_type, amount')
      .eq('booking_id', bookingId);
    const accruals = (ledgerBefore ?? []).filter((e) => e.entry_type === 'accrual');
    expect(accruals.length).toBe(1);

    await admin.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_to_status: 'refunded',
      p_reason: 'Refund test',
    });

    const { data: ledgerAfter } = await admin
      .from('commission_ledger')
      .select('entry_type, amount')
      .eq('booking_id', bookingId);
    const reversals = (ledgerAfter ?? []).filter((e) => e.entry_type === 'reversal');
    expect(reversals.length).toBe(1);
  });
});
