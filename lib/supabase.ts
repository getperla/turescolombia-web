import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Para activar Supabase:
// 1. Ve a https://supabase.com y crea un proyecto (gratis)
// 2. Copia la URL y la Anon Key del dashboard
// 3. Ponlas en tus variables de entorno (Vercel o .env.local)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback URLs validos solo para que createClient no explote en build/SSR
// cuando las env vars no estan seteadas. Las llamadas reales solo se hacen
// si isSupabaseConfigured() devuelve true.
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY,
);

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}
