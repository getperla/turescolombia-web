import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useRequireAuth } from '../../../lib/auth';
import api, { Tour } from '../../../lib/api';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  paused: 'bg-orange-100 text-orange-700',
  archived: 'bg-red-100 text-red-700',
};

export default function OperatorTours() {
  const { authorized } = useRequireAuth(['operator']);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTours = async () => {
    try {
      const { data } = await api.get('/tours', { params: { myTours: 'true' } });
      setTours(data.data || data || []);
    } catch (e) { console.error('Failed to load operator tours:', e); }
    setLoading(false);
  };

  useEffect(() => {
    if (!authorized) return;
    loadTours();
  }, [authorized]);

  if (!authorized) return null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Tours</h1>
            <Link href="/dashboard/operator" className="text-sm text-brand-500 hover:underline">&larr; Volver al dashboard</Link>
          </div>
          <Link href="/dashboard/operator/tours/crear" className="btn-primary">
            + Crear tour
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400 py-8">Cargando tours...</p>
        ) : tours.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-2">No tienes tours creados</p>
            <Link href="/dashboard/operator/tours/crear" className="btn-primary inline-block">Crear tu primer tour</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tours.map((tour) => (
              <div key={tour.id} className="card p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{tour.name}</h3>
                      <span className={`badge ${statusStyles[tour.status] || 'bg-gray-100 text-gray-600'}`}>
                        {tour.status}
                      </span>
                      {tour.isFeatured && <span className="badge bg-accent-500 text-white">Destacado</span>}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {tour.shortDescription || tour.description.substring(0, 100)}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>COP {tour.priceAdult.toLocaleString()}/adulto</span>
                      <span>{tour.duration}</span>
                      <span>{tour.departurePoint}</span>
                      <span>{tour.totalBookings} reservas</span>
                      {tour.avgRating > 0 && <span>Rating: {tour.avgRating.toFixed(1)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/dashboard/operator/tours/${tour.id}/disponibilidad`}
                      className="text-sm border border-brand-500 text-brand-500 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                      Disponibilidad
                    </Link>
                    <Link href={`/dashboard/operator/tours/${tour.id}/editar`}
                      className="text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors">
                      Editar
                    </Link>
                    <Link href={`/tour/${tour.slug}`}
                      className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                      Ver
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
