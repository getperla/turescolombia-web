/**
 * Keys de localStorage usadas en la app. Centralizadas para evitar
 * typos y para poder buscar todos los usos de un slot facil.
 *
 * El prefijo 'turescol_' viene de la marca anterior — lo mantenemos
 * para no invalidar sesiones de usuarios existentes.
 */
export const STORAGE_KEYS = {
  TOKEN: 'turescol_token',
  REFRESH: 'turescol_refresh',
  USER: 'turescol_user',
  BETA: 'laperla_beta',
  FAVORITES: 'laperla_favorites',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
