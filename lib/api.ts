// Barrel re-export. Mantiene compat con imports historicos
// (`import { getTours } from 'lib/api'`). Modulos canonicos viven en
// lib/api/<dominio>.ts.

export { default, ApiError, buildUrl, invalidateDemoModeCache } from './api/client';
export * from './api/tours';
export * from './api/jaladores';
export * from './api/bookings';
export * from './api/profile';

// Re-export de types para call-sites que hacen `import { Tour } from 'lib/api'`.
export type { Tour, Category } from '../types/tour';
export type { Jalador } from '../types/user';
export type { Booking, ReviewData, ReviewItem } from '../types/booking';
