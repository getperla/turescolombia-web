// Logica de negocio de ventas y comisiones del agente.
//
// Server-only. Consume Supabase con SERVICE_ROLE_KEY (bypass RLS).
// Nunca llamar desde el cliente — siempre desde un endpoint en pages/api/.
//
// API publica:
//   createSale(input)    — crea sale + sale_items + link de pago
//   confirmSale(saleId)  — marca pagada + genera comision (idempotente)
//   procesarPago(ref)    — chequea pago y, si APPROVED, llama confirmSale

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isDemo } from './mode';
import { createPaymentLink, checkPayment, generateReference } from './payments';
import type { MockTour } from './agente/mock';

const COMMISSION_RATE = 0.2;

export type SaleInput = {
  jaladorRefCode: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  people: number;
  tours: Pick<MockTour, 'id' | 'name' | 'slug' | 'price_adult'>[];
  redirectUrl: string;
};

export type Sale = {
  id: string;
  jalador_ref_code: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  people: number;
  total_cop: number;
  commission_cop: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  payment_reference: string;
  payment_provider: string;
  payment_url: string | null;
  is_demo: boolean;
  created_at: string;
  paid_at: string | null;
};

export type CreateSaleResult = {
  sale: Sale;
  paymentUrl: string;
  reference: string;
};

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas para persistir ventas.',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Crea una venta atomicamente: INSERT en sales + N en sale_items.
 * Si algun paso falla, hace cleanup. Retorna sale completa + URL de pago.
 *
 * is_demo se setea desde getMode() — no se acepta como parametro para
 * evitar que el cliente fuerce ventas demo en produccion.
 */
export async function createSale(input: SaleInput): Promise<CreateSaleResult> {
  const supabase = getSupabase();
  const reference = generateReference();
  const totalCop = input.tours.reduce((acc, t) => acc + t.price_adult * input.people, 0);
  const commissionCop = Math.round(totalCop * COMMISSION_RATE);

  const link = createPaymentLink({
    amountCop: totalCop,
    reference,
    customerName: input.clientName,
    customerPhone: input.clientPhone,
    customerEmail: input.clientEmail || `${input.clientPhone}@laperla.demo`,
    redirectUrl: input.redirectUrl,
    description: `La Perla — ${input.tours.length} tour(s) Santa Marta`,
  });

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      jalador_ref_code: input.jaladorRefCode,
      client_name: input.clientName,
      client_phone: input.clientPhone,
      client_email: input.clientEmail || null,
      people: input.people,
      total_cop: totalCop,
      commission_cop: commissionCop,
      payment_reference: reference,
      payment_provider: link.provider,
      payment_url: link.paymentUrl,
      is_demo: isDemo(),
    })
    .select()
    .single();

  if (saleError || !sale) {
    throw new Error(`No se pudo crear la venta: ${saleError?.message ?? 'unknown'}`);
  }

  const items = input.tours.map((t) => ({
    sale_id: sale.id,
    tour_id: t.id,
    tour_name: t.name,
    tour_slug: t.slug,
    price_cop: t.price_adult,
  }));

  const { error: itemsError } = await supabase.from('sale_items').insert(items);
  if (itemsError) {
    // Cleanup: borra la sale para no dejar orfana
    await supabase.from('sales').delete().eq('id', sale.id);
    throw new Error(`No se pudieron crear los items: ${itemsError.message}`);
  }

  return {
    sale: sale as Sale,
    paymentUrl: link.paymentUrl,
    reference,
  };
}

/**
 * Confirma una venta como pagada y genera la comision asociada.
 *
 * IDEMPOTENTE: si la sale ya esta 'paid' o ya existe commission para
 * ese sale_id, no hace nada y retorna la sale actual. Esto protege
 * contra notificaciones duplicadas de Wompi.
 */
export async function confirmSale(saleId: string): Promise<Sale> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single();

  if (fetchError || !existing) {
    throw new Error(`Venta ${saleId} no encontrada`);
  }

  if (existing.status === 'paid') {
    return existing as Sale;
  }

  const { data: updated, error: updateError } = await supabase
    .from('sales')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', saleId)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  if (updateError) {
    throw new Error(`No se pudo confirmar la venta: ${updateError.message}`);
  }

  // Si updated es null, otro worker confirmo primero. Re-leemos para
  // verificar que efectivamente quedo en 'paid' y continuamos al INSERT
  // de comision (idempotente por sale_id UNIQUE).
  let sale: Sale;
  if (updated) {
    sale = updated as Sale;
  } else {
    const { data: refetch } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();
    if (!refetch || refetch.status !== 'paid') {
      throw new Error(`Venta ${saleId} cambio a estado inesperado durante confirmacion`);
    }
    sale = refetch as Sale;
  }

  // Generar comision (idempotente por sale_id UNIQUE en commissions)
  const { error: commissionError } = await supabase.from('commissions').insert({
    jalador_ref_code: sale.jalador_ref_code,
    sale_id: sale.id,
    amount_cop: sale.commission_cop,
    status: 'available',
    is_demo: sale.is_demo,
  });

  // Si la comision ya existia (race condition), Postgres devuelve unique
  // violation y la ignoramos. Cualquier otro error si lo logueamos.
  if (commissionError && !commissionError.message.includes('duplicate key')) {
    console.error('Error creando comision:', commissionError);
  }

  return sale;
}

/**
 * Chequea el estado de un pago en el proveedor y, si esta APPROVED,
 * confirma la venta y genera la comision. Llamado por:
 *   - El webhook de Wompi (futuro Fase 3)
 *   - El polling desde /pago-resultado tras la redireccion
 */
export async function procesarPago(
  paymentReference: string,
  transactionId: string,
): Promise<{ status: string; sale: Sale | null }> {
  const supabase = getSupabase();

  const { data: sale, error } = await supabase
    .from('sales')
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();

  if (error || !sale) {
    return { status: 'NOT_FOUND', sale: null };
  }

  if (sale.status === 'paid') {
    return { status: 'ALREADY_PAID', sale: sale as Sale };
  }

  const payment = await checkPayment(transactionId);

  if (payment.status === 'APPROVED') {
    const confirmed = await confirmSale(sale.id);
    return { status: 'APPROVED', sale: confirmed };
  }

  return { status: payment.status, sale: sale as Sale };
}
