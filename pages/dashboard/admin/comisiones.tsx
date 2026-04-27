// Admin UI: configurar % comisiones por tour
// Plan 3: commissions-ledger-cron-platform-fee (COM-02)
// Created: 2026-04-27
//
// Permite a un admin editar jalador_pct / platform_pct / operator_pct
// para cualquier tour, sin necesidad de deploy.
//
// Reemplaza el 20% hardcoded historico. Cada cambio crea un nuevo row
// en commissions table con effective_from = now(), preservando historial.
//
// Acceso: solo role='admin' (verificado en useRequireAuth).

import { useState, useEffect, useCallback } from 'react';
import { useRequireAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import PriceBreakdown from '../../../components/PriceBreakdown';
import { calculateBreakdown, type CommissionConfig } from '../../../lib/pricing';

interface TourSummary {
  id: string;
  name: string;
  price_adult: number;
  current_jalador_pct: number;
  current_platform_pct: number;
  current_operator_pct: number;
  effective_from: string | null;
}

interface EditDraft {
  tourId: string;
  jaladorPct: number;
  platformPct: number;
  operatorPct: number;
}

export default function AdminComisiones(): JSX.Element {
  const { user, isLoading: authLoading } = useRequireAuth(['admin']);

  const [tours, setTours] = useState<TourSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadTours = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Asume que existe una view o tabla con los tours + su commission activa
      // En produccion esto seria un RPC o query mas elaborada que junte tours + commissions
      // Por ahora intentamos query directa contra Supabase
      const { data, error: queryError } = await supabase
        .from('tours_with_active_commission')
        .select('*')
        .order('name');

      if (queryError) {
        // Si la view no existe todavia, mostrar mensaje claro al admin
        setError(
          'View tours_with_active_commission no existe. ' +
          'Crear con: CREATE VIEW tours_with_active_commission AS ... (ver Plan 3 docs)',
        );
        setTours([]);
      } else {
        setTours((data ?? []) as TourSummary[]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadTours();
    }
  }, [user, loadTours]);

  const startEdit = (tour: TourSummary): void => {
    setDraft({
      tourId: tour.id,
      jaladorPct: tour.current_jalador_pct ?? 0.20,
      platformPct: tour.current_platform_pct ?? 0.08,
      operatorPct: tour.current_operator_pct ?? 0.72,
    });
  };

  const cancelEdit = (): void => setDraft(null);

  const updatePct = (key: 'jaladorPct' | 'platformPct' | 'operatorPct', value: number): void => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft) return;
    const sum = draft.jaladorPct + draft.platformPct + draft.operatorPct;
    if (Math.abs(sum - 1.0) > 0.0001) {
      setError(`Los porcentajes deben sumar 100% (actual: ${(sum * 100).toFixed(2)}%)`);
      return;
    }

    setSavingId(draft.tourId);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('commissions')
        .insert({
          tour_id: draft.tourId,
          jalador_pct: draft.jaladorPct,
          platform_pct: draft.platformPct,
          operator_pct: draft.operatorPct,
          effective_from: new Date().toISOString(),
        });

      if (insertError) {
        setError(`Error guardando: ${insertError.message}`);
        return;
      }

      setDraft(null);
      await loadTours();
    } finally {
      setSavingId(null);
    }
  };

  if (authLoading) return <div className="p-6">Cargando autenticación...</div>;
  if (!user) return <div className="p-6">No autorizado.</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Configuración de comisiones</h1>
      <p className="mb-6 text-sm text-gray-600">
        Cada cambio crea una entrada nueva con <code>effective_from = ahora</code>. Los bookings pasados conservan
        sus porcentajes históricos.
      </p>

      {error ? (
        <div className="mb-4 rounded border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-gray-500">Cargando tours...</div>
      ) : tours.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No hay tours con configuración de comisión todavía.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tour</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Precio adulto</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Jalador</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">La Perla</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Operador</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tours.map((tour) => {
                const isEditing = draft?.tourId === tour.id;
                const config: CommissionConfig = isEditing && draft
                  ? { jaladorPct: draft.jaladorPct, platformPct: draft.platformPct, operatorPct: draft.operatorPct }
                  : {
                      jaladorPct: tour.current_jalador_pct ?? 0.20,
                      platformPct: tour.current_platform_pct ?? 0.08,
                      operatorPct: tour.current_operator_pct ?? 0.72,
                    };
                const previewBreakdown = calculateBreakdown(tour.price_adult, config);

                return (
                  <tr key={tour.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{tour.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${tour.price_adult.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing && draft ? (
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={draft.jaladorPct}
                          onChange={(e) => updatePct('jaladorPct', Number(e.target.value))}
                          className="w-20 rounded border border-gray-300 p-1 text-right"
                        />
                      ) : (
                        `${(config.jaladorPct * 100).toFixed(0)}%`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing && draft ? (
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={draft.platformPct}
                          onChange={(e) => updatePct('platformPct', Number(e.target.value))}
                          className="w-20 rounded border border-gray-300 p-1 text-right"
                        />
                      ) : (
                        `${(config.platformPct * 100).toFixed(0)}%`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing && draft ? (
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={draft.operatorPct}
                          onChange={(e) => updatePct('operatorPct', Number(e.target.value))}
                          className="w-20 rounded border border-gray-300 p-1 text-right"
                        />
                      ) : (
                        `${(config.operatorPct * 100).toFixed(0)}%`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveDraft()}
                            disabled={savingId === tour.id}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingId === tour.id ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(tour)}
                          className="rounded border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {draft ? (
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Vista previa del breakdown</h2>
          <div className="max-w-md">
            <PriceBreakdown
              breakdown={calculateBreakdown(
                tours.find((t) => t.id === draft.tourId)?.price_adult ?? 0,
                { jaladorPct: draft.jaladorPct, platformPct: draft.platformPct, operatorPct: draft.operatorPct },
              )}
              showInternalSplit
              itemLabel={tours.find((t) => t.id === draft.tourId)?.name ?? 'Tour'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
