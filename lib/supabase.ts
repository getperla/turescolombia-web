import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Para activar Supabase:
// 1. Ve a https://supabase.com y crea un proyecto (gratis)
// 2. Copia la URL y la Anon Key del dashboard
// 3. Ponlas en tus variables de entorno (Vercel o .env.local)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

/**
 * Cliente de Supabase. Si las env vars no estan configuradas, exponemos
 * un cliente con URL placeholder para que createClient() no crashee
 * durante module evaluation. Las llamadas reales fallaran con error de
 * red — eso es esperado en entornos sin configurar.
 *
 * Para gating de features, usar isSupabaseConfigured() antes de llamar.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
