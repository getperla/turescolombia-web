// Supabase admin client (service_role)
// Plan 1: db-foundation-schema-and-rls (SEC-06)
// Created: 2026-04-27
//
// IMPORTANTE: este modulo NUNCA debe importarse desde codigo del cliente.
// El service_role key bypassea RLS y tiene acceso total a la DB.
// Solo usar en:
//   - Edge Functions de Supabase (supabase/functions/*)
//   - API routes de Next.js que necesiten ops privilegiadas
//
// El guard `typeof window !== 'undefined'` no garantiza nada en runtime
// (fetch del key igual sucede en bundle), pero da error temprano en dev.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Devuelve el client admin (service_role) singleton.
 *
 * @throws Error si se llama desde el cliente (window definido)
 * @throws Error si el env var SUPABASE_SERVICE_ROLE_KEY no esta seteado
 */
export function getSupabaseAdmin(): SupabaseClient {
  // Hard guard: tirar inmediatamente si esto se importo en el cliente
  if (typeof window !== 'undefined') {
    throw new Error(
      '[supabase-admin] No se puede usar el service_role en el cliente. ' +
      'Mover esta llamada a una API route, Edge Function, o getServerSideProps.'
    );
  }

  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('[supabase-admin] Falta NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!key) {
    throw new Error(
      '[supabase-admin] Falta SUPABASE_SERVICE_ROLE_KEY. ' +
      'Obtenerlo en Supabase Dashboard > Settings > API > service_role secret'
    );
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}

/**
 * Valida que el ambiente esta seteado correctamente para ops admin.
 * Llamar al boot de Edge Functions para fail-fast si falta config.
 */
export function assertAdminEnvReady(): void {
  if (typeof window !== 'undefined') {
    throw new Error('[supabase-admin] Llamada del cliente prohibida');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL no esta seteado');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY no esta seteado');
  }
}
