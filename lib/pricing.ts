/**
 * Reglas de precio y comision centralizadas.
 *
 * IMPORTANTE: Si el backend retorna estos valores por tour/jalador
 * (commissionPct, priceChild), usar SIEMPRE los valores del backend.
 * Estas constantes son fallback solo para casos donde el dato no llega.
 *
 * Cualquier cambio aca debe coordinarse con el equipo: la comision
 * afecta directo lo que cobran los jaladores y la plataforma.
 */

/** Comision default del jalador sobre el precio adulto. 20%. */
export const COMMISSION_RATE = 0.20;

/** Factor para calcular precio nino cuando el tour no lo especifica. 70%. */
export const CHILD_PRICE_FACTOR = 0.7;

export function calculateCommission(priceAdult: number): number {
  return Math.round(priceAdult * COMMISSION_RATE);
}

export function calculateChildPrice(priceAdult: number, priceChild?: number | null): number {
  if (priceChild != null && priceChild > 0) return priceChild;
  return Math.round(priceAdult * CHILD_PRICE_FACTOR);
}

export function calculateTotalPrice(priceAdult: number, numAdults: number, numChildren: number, priceChild?: number | null): number {
  const childPrice = calculateChildPrice(priceAdult, priceChild);
  return priceAdult * numAdults + childPrice * numChildren;
}
