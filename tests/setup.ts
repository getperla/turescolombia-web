// Setup global para Vitest
// Plan 1: db-foundation-schema-and-rls (TST-01)
// Created: 2026-04-27
//
// Carga env vars de test, mocks globales, configuracion comun.

import { config } from 'dotenv';
import path from 'path';

// Cargar .env.test si existe, sino .env.local
config({ path: path.resolve(process.cwd(), '.env.test') });
config({ path: path.resolve(process.cwd(), '.env.local') });

// Validar que tenemos los env vars minimos
const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[tests/setup] Falta env var: ${key}. Algunos tests pueden fallar.`);
  }
}

// Setear env de testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_BETA_MODE = '0';
