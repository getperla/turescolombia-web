/**
 * Comision default del jalador. Sirve como fallback cuando el backend
 * NO devuelve un commissionPct propio por tour o por jalador.
 *
 * Cuando el backend retorne commissionPct en la respuesta de /tours o
 * /users/jaladores, USAR ese valor del backend en lugar de este.
 *
 * Cualquier cambio aca afecta directo lo que cobran los jaladores —
 * pedir confirmacion al owner antes de modificar.
 */
export const COMMISSION_RATE = 0.20;

export const calcularComision = (precio: number): number =>
  Math.round(precio * COMMISSION_RATE);
