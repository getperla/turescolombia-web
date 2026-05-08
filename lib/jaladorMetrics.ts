// Metricas de ventas del jalador para el dashboard.
//
// Server-only: consume Supabase con SERVICE_ROLE_KEY para sumar sales sin
// pasar por RLS. Llamar SOLO desde un endpoint de pages/api/.
//
// Decisiones del brief del dashboard del jalador (mayo 2026):
//   - Solo cuenta sales con status='paid' (decision #3)
//   - Rangos calculados en zona horaria America/Bogota (no UTC)
//   - 3 datos por card: count, totalCop, commissionCop (decision #2)
//
// Comision se almacena en commission_cop al momento de crear la sale
// (lib/sales.ts). NO recalculamos aqui — sumamos lo que se persistio.
// Si la tasa de comision cambia en el futuro, las sales viejas mantienen
// su comision original (correcto: el jalador acordo X% al vender).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type MetricsRange = 'today' | 'week' | 'month';

export type JaladorMetrics = {
  count: number;
  totalCop: number;
  commissionCop: number;
};

export type JaladorMetricsBundle = {
  today: JaladorMetrics;
  week: JaladorMetrics;
  month: JaladorMetrics;
};

const TIMEZONE = 'America/Bogota';

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas para leer metricas.',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Calcula el inicio del rango en hora Colombia y lo devuelve como ISO
// timestamp UTC para usar como filtro contra sales.created_at.
//
// Por que: Postgres almacena timestamps en UTC. Si comparamos contra
// "hoy a las 00:00 UTC", una venta hecha a las 11:30pm hora Colombia
// (UTC-5 → 04:30 UTC del dia siguiente) caeria en el dia equivocado.
// Calculamos primero "00:00 hora Bogota" → convertimos a UTC → comparamos.
function getRangeStart(range: MetricsRange): Date {
  const now = new Date();
  // Truco: Intl.DateTimeFormat con timeZone nos da partes de fecha en
  // hora Colombia. Reconstruimos la fecha "local Colombia" y la
  // re-interpretamos como UTC con offset -5.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');

  const year = get('year');
  const month = get('month'); // 1-12
  const day = get('day');

  // "Hoy en Bogota" como Date construido en UTC; ajustamos restando 5h
  // para que represente realmente las 00:00:00 hora Colombia.
  const startOfTodayBogota = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  // Date.UTC(..., 5, 0, 0, 0) representa 05:00 UTC, que es 00:00 en
  // America/Bogota (UTC-5, sin DST en Colombia).

  if (range === 'today') return startOfTodayBogota;

  if (range === 'week') {
    // Lunes-domingo (decision #1). getUTCDay: 0=domingo, 1=lunes, ..., 6=sabado.
    // Queremos retroceder al lunes de esta semana.
    const dow = startOfTodayBogota.getUTCDay();
    const daysSinceMonday = dow === 0 ? 6 : dow - 1; // domingo -> 6, lunes -> 0
    const monday = new Date(startOfTodayBogota);
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    return monday;
  }

  // month: dia 1 del mes calendario actual a las 00:00 hora Colombia
  return new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0));
}

/**
 * Lee metricas para un rango especifico. Si quieres los 3 rangos a la vez,
 * usa getMetricsBundle (hace 1 sola query y suma en cliente).
 */
export async function getMetricsForJalador(
  jaladorRefCode: string,
  range: MetricsRange,
): Promise<JaladorMetrics> {
  const supabase = getSupabase();
  const start = getRangeStart(range).toISOString();

  const { data, error } = await supabase
    .from('sales')
    .select('total_cop, commission_cop')
    .eq('jalador_ref_code', jaladorRefCode)
    .eq('status', 'paid')
    .gte('created_at', start);

  if (error) {
    throw new Error(`No se pudieron leer las metricas: ${error.message}`);
  }

  const rows = data ?? [];
  return {
    count: rows.length,
    totalCop: rows.reduce((acc, r) => acc + (r.total_cop ?? 0), 0),
    commissionCop: rows.reduce((acc, r) => acc + (r.commission_cop ?? 0), 0),
  };
}

/**
 * Lee los 3 rangos en una sola query (filtra por start del mes — el rango
 * mas amplio — y agrupa en cliente). Mas eficiente que 3 queries separadas.
 */
export async function getMetricsBundle(
  jaladorRefCode: string,
): Promise<JaladorMetricsBundle> {
  const supabase = getSupabase();
  const startOfMonth = getRangeStart('month').toISOString();
  const startOfWeek = getRangeStart('week').getTime();
  const startOfToday = getRangeStart('today').getTime();

  const { data, error } = await supabase
    .from('sales')
    .select('total_cop, commission_cop, created_at')
    .eq('jalador_ref_code', jaladorRefCode)
    .eq('status', 'paid')
    .gte('created_at', startOfMonth);

  if (error) {
    throw new Error(`No se pudieron leer las metricas: ${error.message}`);
  }

  const empty: JaladorMetrics = { count: 0, totalCop: 0, commissionCop: 0 };
  const result: JaladorMetricsBundle = {
    today: { ...empty },
    week: { ...empty },
    month: { ...empty },
  };

  for (const row of data ?? []) {
    const ts = new Date(row.created_at).getTime();
    const total = row.total_cop ?? 0;
    const commission = row.commission_cop ?? 0;

    // Mes — siempre cuenta (filtro de query ya lo limito a >= startOfMonth)
    result.month.count += 1;
    result.month.totalCop += total;
    result.month.commissionCop += commission;

    if (ts >= startOfWeek) {
      result.week.count += 1;
      result.week.totalCop += total;
      result.week.commissionCop += commission;
    }

    if (ts >= startOfToday) {
      result.today.count += 1;
      result.today.totalCop += total;
      result.today.commissionCop += commission;
    }
  }

  return result;
}
