import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';

const statusStyles: Record<string, string> = {
  confirmed: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-amber-100 text-amber-600',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const OperatorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/operator');
        setData(data);
      } catch {
        setError('No se pudo cargar el dashboard. Verifica que hayas iniciado sesion como operador.');
      }
    };
    load();
  }, []);

  if (error) return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-primary-500 hover:underline">Volver al inicio</Link>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    </Layout>
  );

  const { operator, tours, today, revenue, rating, pendingBookings } = data;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-700">{operator.companyName}</h1>
          <p className="text-gray-400 text-sm mt-1">
            RNT: {operator.rntNumber} {operator.rntVerified ? '✅ Verificado' : '⏳ Pendiente'} &middot; Score: {operator.score}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 text-center border border-primary-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-primary-100 rounded-xl flex items-center justify-center text-xl">🏖️</div>
            <div className="text-2xl font-bold text-primary-600">{tours.active}</div>
            <div className="text-sm text-gray-400">Tours activos</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-green-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center text-xl">💰</div>
            <div className="text-2xl font-bold text-secondary-500">${Number(revenue.netRevenue).toLocaleString()}</div>
            <div className="text-sm text-gray-400">Ingresos netos</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-amber-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-amber-100 rounded-xl flex items-center justify-center text-xl">⏳</div>
            <div className="text-2xl font-bold text-amber-600">{pendingBookings}</div>
            <div className="text-sm text-gray-400">Reservas pendientes</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-red-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-red-100 rounded-xl flex items-center justify-center text-xl">⭐</div>
            <div className="text-2xl font-bold text-red-500">{rating.average?.toFixed(1) || '0'}</div>
            <div className="text-sm text-gray-400">{rating.totalReviews} resenas</div>
          </div>
        </div>

        {/* Today's bookings */}
        <h3 className="text-lg font-bold text-secondary-700 mb-3">
          Reservas de hoy ({today.bookings?.length || 0} reservas, {today.totalGuests} personas)
        </h3>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-6 shadow-sm">
          {today.bookings?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-primary-50 text-left text-sm text-primary-700">
                  <th className="px-4 py-3 border-b border-primary-100 font-semibold">Tour</th>
                  <th className="px-4 py-3 border-b border-primary-100 font-semibold">Salida</th>
                  <th className="px-4 py-3 border-b border-primary-100 font-semibold">Turista</th>
                  <th className="px-4 py-3 border-b border-primary-100 font-semibold text-center">Personas</th>
                  <th className="px-4 py-3 border-b border-primary-100 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {today.bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{b.tour?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{b.tour?.departureTime}</td>
                    <td className="px-4 py-3 text-sm">{b.tourist?.user?.name}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium">{b.numAdults + b.numChildren}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusStyles[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">🏝️</div>
              <p className="text-gray-400">No hay reservas para hoy</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button className="btn-primary">
            Escanear QR
          </button>
          <Link href="/dashboard/operator/tours" className="btn-outline">
            Gestionar tours
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default OperatorDashboard;
