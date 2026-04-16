import { createClient } from '@supabase/supabase-js';

// Para activar Supabase:
// 1. Ve a https://supabase.com y crea un proyecto (gratis)
// 2. Copia la URL y la Anon Key del dashboard
// 3. Ponlas en tus variables de entorno (Vercel o .env.local)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}
