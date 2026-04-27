// Health check endpoint
// Plan 5: observability-demo-gate-secrets-backups (OBS-04)
// Created: 2026-04-27
//
// GET /api/health -> { db: 'ok' | 'fail', wompi: 'ok' | 'fail', ts: ISO }
// UptimeRobot apunta aca cada 1 min. Si retorna != 200 dispara alerta.

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface HealthResponse {
  db: 'ok' | 'fail' | 'skipped';
  wompi: 'ok' | 'fail' | 'skipped';
  ts: string;
  uptime_seconds: number;
  version: string;
}

const startedAt = Date.now();

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('placeholder')) return false;

  try {
    const client = createClient(url, key);
    // Query barata: contar webhook_events (tabla que existe siempre post-migration 001)
    const { error } = await client.from('webhook_events').select('event_id', { count: 'exact', head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkWompi(): Promise<boolean> {
  const env = process.env.NEXT_PUBLIC_WOMPI_ENV ?? 'sandbox';
  const baseUrl = env === 'production'
    ? 'https://production.wompi.co/v1/merchants'
    : 'https://sandbox.wompi.co/v1/merchants';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status === 401; // 401 = API responde pero pide auth (OK para healthcheck)
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
): Promise<void> {
  const [dbOk, wompiOk] = await Promise.all([checkSupabase(), checkWompi()]);

  const response: HealthResponse = {
    db: dbOk ? 'ok' : 'fail',
    wompi: wompiOk ? 'ok' : 'fail',
    ts: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  };

  // Si DB esta caida es critico. Si Wompi falla, todavia podemos servir paginas estaticas.
  const overallOk = dbOk;
  res.status(overallOk ? 200 : 503).json(response);
}
