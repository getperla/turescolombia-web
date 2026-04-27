// BetaBanner - banner persistente NO dismissable cuando demo mode esta activo
// Plan 5: observability-demo-gate-secrets-backups (SEC-01)
// Created: 2026-04-27
//
// Solo visible cuando:
//   - NEXT_PUBLIC_BETA_MODE === '1'
//   - localStorage tiene un beta token activo
//
// Usado en Layout.tsx (envuelve toda la app).

import { useEffect, useState } from 'react';
import { isBetaActive } from './BetaGate';

export default function BetaBanner(): JSX.Element | null {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    const betaModeEnabled = process.env.NEXT_PUBLIC_BETA_MODE === '1';
    if (!betaModeEnabled) {
      setShow(false);
      return;
    }
    setShow(isBetaActive());
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="beta-banner"
      className="sticky top-0 z-50 w-full bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow"
    >
      ⚠ MODO DEMO — Los pagos NO son reales y los datos pueden borrarse en cualquier momento
    </div>
  );
}
