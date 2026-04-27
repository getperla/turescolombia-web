// PriceBreakdown component - desglose visible al turista en checkout
// Plan 3: commissions-ledger-cron-platform-fee (COM-08)
// Created: 2026-04-27
//
// Muestra el desglose tour + fee La Perla + total.
// Usado en pages/tour/[id].tsx y pages/j/[refCode]/[tour].tsx antes del boton "Pagar".

import type { PriceBreakdown } from '../lib/pricing';
import { formatCop } from '../lib/pricing';

interface PriceBreakdownProps {
  breakdown: PriceBreakdown;
  /** Si true, muestra los detalles internos (jalador/operador). Solo para admin. */
  showInternalSplit?: boolean;
  /** Etiqueta personalizada para el subtotal (ej: "Tour Tayrona Día Completo") */
  itemLabel?: string;
}

export default function PriceBreakdown({
  breakdown,
  showInternalSplit = false,
  itemLabel = 'Subtotal del tour',
}: PriceBreakdownProps): JSX.Element {
  return (
    <div
      data-testid="price-breakdown"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Desglose
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-700">{itemLabel}</dt>
          <dd className="font-medium tabular-nums">{formatCop(breakdown.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-700">
            Fee de servicio (La Perla)
            <span className="ml-1 text-xs text-gray-400">
              ({Math.round((breakdown.platformFee / Math.max(breakdown.subtotal, 1)) * 100)}%)
            </span>
          </dt>
          <dd className="font-medium tabular-nums">{formatCop(breakdown.platformFee)}</dd>
        </div>

        {showInternalSplit ? (
          <>
            <div className="border-t border-dashed border-gray-200 pt-2 text-xs text-gray-500">
              Distribución interna (visible solo en admin):
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <dt>Para el jalador</dt>
              <dd className="tabular-nums">{formatCop(breakdown.jaladorAmount)}</dd>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <dt>Para el operador</dt>
              <dd className="tabular-nums">{formatCop(breakdown.operatorAmount)}</dd>
            </div>
          </>
        ) : null}

        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base">
          <dt className="font-semibold text-gray-900">Total a pagar</dt>
          <dd className="font-bold tabular-nums text-gray-900">{formatCop(breakdown.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
