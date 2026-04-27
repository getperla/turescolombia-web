// Pricing module: calculo de breakdown de precios
// Plan 3: commissions-ledger-cron-platform-fee (COM-02, COM-08)
// Created: 2026-04-27
//
// Pure functions - sin DB calls. Testeable directamente.
// Reemplaza el math inline en pages/tour/[id].tsx y pages/j/[refCode]/[tour].tsx
// donde antes el 20% jalador estaba hardcoded.

export interface CommissionConfig {
  jaladorPct: number;     // ej: 0.20 = 20%
  platformPct: number;    // ej: 0.08 = 8% (fee La Perla)
  operatorPct: number;    // ej: 0.72 = 72%
}

export interface PriceBreakdown {
  /** Precio del tour (lo que el operador cobra por ejecutarlo) */
  subtotal: number;
  /** Fee de La Perla (cargado AL TURISTA encima del subtotal) */
  platformFee: number;
  /** Comision del jalador (sale del subtotal del operador) */
  jaladorAmount: number;
  /** Lo que recibe el operador (subtotal - jaladorAmount) */
  operatorAmount: number;
  /** Total que paga el turista (subtotal + platformFee) */
  total: number;
}

export const DEFAULT_COMMISSION: CommissionConfig = {
  jaladorPct: 0.20,
  platformPct: 0.08,
  operatorPct: 0.72,
};

/**
 * Redondea a la centena COP mas cercana hacia arriba (UX de precios "limpios").
 * Ej: 5880 -> 5900, 73523 -> 73600
 */
export function roundToCop(amount: number): number {
  if (amount === 0) return 0;
  return Math.ceil(amount / 100) * 100;
}

/**
 * Calcula el breakdown completo de precios.
 *
 * Modelo:
 *   - El TURISTA paga: subtotal + platformFee
 *   - El OPERADOR recibe: subtotal - jaladorAmount
 *   - El JALADOR recibe: jaladorAmount (% sobre subtotal del operador)
 *   - LA PERLA recibe: platformFee (% sobre subtotal, cargado encima al turista)
 *
 * Validaciones:
 *   - tourPrice debe ser > 0
 *   - Los porcentajes deben sumar ~1.0 (con tolerancia 0.0001)
 */
export function calculateBreakdown(
  tourPrice: number,
  config: CommissionConfig = DEFAULT_COMMISSION,
): PriceBreakdown {
  if (tourPrice < 0) {
    throw new Error(`tourPrice no puede ser negativo, got ${tourPrice}`);
  }

  const sumOfPcts = config.jaladorPct + config.platformPct + config.operatorPct;
  if (Math.abs(sumOfPcts - 1.0) > 0.0001) {
    throw new Error(
      `Los % deben sumar 1.0 (got ${sumOfPcts}). ` +
      `jalador=${config.jaladorPct} + platform=${config.platformPct} + operator=${config.operatorPct}`,
    );
  }

  const subtotal = tourPrice;
  const platformFee = roundToCop(subtotal * config.platformPct);
  const jaladorAmount = roundToCop(subtotal * config.jaladorPct);
  const operatorAmount = subtotal - jaladorAmount;
  const total = subtotal + platformFee;

  return {
    subtotal,
    platformFee,
    jaladorAmount,
    operatorAmount,
    total,
  };
}

/**
 * Calcula precio total para un grupo de turistas con tarifa adulto/nino.
 * Niño paga 70% del precio adulto si priceChild no esta definido.
 *
 * Esto refleja el patch de BKG-05 (commit d133eb6).
 */
export function calculateGroupPrice(
  priceAdult: number,
  partySize: number,
  partyChildren: number,
  priceChild?: number | null,
): number {
  const adults = partySize - partyChildren;
  const childPrice = priceChild ?? Math.round(priceAdult * 0.7);
  return (adults * priceAdult) + (partyChildren * childPrice);
}

/**
 * Formatea un precio en COP con thousand separators y simbolo $.
 * Ej: 108000 -> "$108.000"
 */
export function formatCop(amount: number): string {
  const rounded = Math.round(amount);
  const withCommas = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${withCommas}`;
}
