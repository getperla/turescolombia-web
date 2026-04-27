// Sentry server config (Node.js runtime: SSR, API routes, getServerSideProps)
// Plan 5: observability-demo-gate-secrets-backups (OBS-01, OBS-02)
// Created: 2026-04-27

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

interface SentryEvent {
  request?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    data?: unknown;
  };
  user?: { email?: string; ip_address?: string };
  extra?: Record<string, unknown>;
}

const PII_FIELD_PATTERN = /(email|phone|tel|cedula|cc|nit|rut|password|token|cookie|cvv|card|account|authorization)/i;

function scrubObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubObject);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELD_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    beforeSend(event: SentryEvent): SentryEvent | null {
      if (event.request) {
        if (event.request.cookies) event.request.cookies = { '[REDACTED]': 'true' };
        if (event.request.headers) {
          event.request.headers = scrubObject(event.request.headers) as Record<string, string>;
        }
        if (event.request.data) event.request.data = scrubObject(event.request.data);
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>;
      return event;
    },
  });
}
