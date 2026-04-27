// Sentry Edge runtime config (middleware, Edge API routes)
// Plan 5: observability-demo-gate-secrets-backups (OBS-01)
// Created: 2026-04-27
//
// Edge runtime tiene API limitada. Setup minimo: DSN + tracing.

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    debug: false,
  });
}
