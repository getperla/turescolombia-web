// Tests de aislamiento por tenant via RLS
// Plan 1: db-foundation-schema-and-rls (SEC-04, SEC-05)
// Created: 2026-04-27
//
// Verifica que un usuario no puede ver/modificar data de otro usuario.
// Estos tests usan dos clients Supabase con JWT distintos y validan que
// las policies de 002_enable_rls.sql funcionan correctamente.
//
// IMPORTANTE: estos tests requieren que Supabase este corriendo (local o staging)
// con las migrations 001-003 aplicadas. En CI se debe levantar `supabase start`
// antes de ejecutar.

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Skip estos tests si no hay Supabase configurado (ej: PR sin secrets)
const skipIfNoSupabase = !SUPABASE_URL || SUPABASE_URL.includes('placeholder')
  ? it.skip
  : it;

describe('RLS: aislamiento por tenant', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userIdA: string;
  let userIdB: string;

  beforeAll(async () => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
      console.warn('Supabase no configurado, tests RLS skipped');
      return;
    }

    // Crear dos usuarios distintos para simular dos operadores
    // En CI esto deberia ir a una DB de testing dedicada
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON);
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON);

    const emailA = `test-a-${Date.now()}@laperla.test`;
    const emailB = `test-b-${Date.now()}@laperla.test`;
    const password = 'test-password-123-secure';

    const { data: a } = await clientA.auth.signUp({ email: emailA, password });
    const { data: b } = await clientB.auth.signUp({ email: emailB, password });

    userIdA = a.user?.id || '';
    userIdB = b.user?.id || '';
  });

  skipIfNoSupabase('audit retorna 0 tablas core sin RLS', async () => {
    const { data, error } = await clientA.rpc('count_unprotected_core_tables');
    expect(error).toBeNull();
    expect(data).toBe(0);
  });

  skipIfNoSupabase('user A no ve bookings de user B', async () => {
    // Como no podemos insertar bookings sin RPC (Plan 2), este test
    // valida que el SELECT retorna [] para un user sin bookings propios.
    // Cuando Plan 2 este listo, agregar setup que inserte bookings via service_role.
    const { data, error } = await clientA.from('bookings').select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  skipIfNoSupabase('user no puede insertar bookings directamente (sin RPC)', async () => {
    const { error } = await clientA.from('bookings').insert({
      tour_id: '00000000-0000-0000-0000-000000000000',
      tourist_id: userIdA,
      operator_id: userIdA,
      total_amount: 100000,
      subtotal: 100000,
      tour_date: '2026-12-31',
    });
    // Esperamos que falle por RLS (sin policy de INSERT)
    expect(error).not.toBeNull();
  });

  skipIfNoSupabase('user no puede insertar entries en commission_ledger directamente', async () => {
    const { error } = await clientA.from('commission_ledger').insert({
      booking_id: '00000000-0000-0000-0000-000000000000',
      jalador_id: userIdA,
      entry_type: 'accrual',
      amount: 20000,
    });
    expect(error).not.toBeNull();
  });

  skipIfNoSupabase('user no puede UPDATE commission_ledger (append-only)', async () => {
    const { error } = await clientA.from('commission_ledger')
      .update({ amount: 999999 })
      .eq('jalador_id', userIdA);
    // Sin policy de UPDATE, RLS bloquea
    expect(error).not.toBeNull();
  });

  skipIfNoSupabase('user no puede DELETE bookings', async () => {
    const { error } = await clientA.from('bookings')
      .delete()
      .eq('tourist_id', userIdA);
    // Sin policy de DELETE, RLS bloquea
    expect(error).not.toBeNull();
  });
});
