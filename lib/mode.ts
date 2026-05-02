// Single source of truth para el modo demo/produccion de La Perla.
//
// Una sola variable controla todo: LAPERLA_MODE.
//   - 'production' → pagos reales, Claude API real, sales no marcadas como demo
//   - cualquier otro valor (incluyendo undefined) → modo demo, sin costo
//
// LAPERLA_MODE es server-only (NO usar NEXT_PUBLIC_) — el cliente no necesita
// saber el modo, solo recibe respuestas.

export type Mode = 'demo' | 'production';

export function getMode(): Mode {
  return process.env.LAPERLA_MODE === 'production' ? 'production' : 'demo';
}

export const isDemo = (): boolean => getMode() === 'demo';
export const isProd = (): boolean => getMode() === 'production';
