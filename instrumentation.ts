// Next.js instrumentation hook
// Plan 5: observability-demo-gate-secrets-backups (OBS-01, OBS-02)
// Created: 2026-04-27
//
// Next.js corre este archivo al boot del server (NO en el cliente).
// Carga la config de Sentry segun el runtime (Node.js, Edge, etc.).
//
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
