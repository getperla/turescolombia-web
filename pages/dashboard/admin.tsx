import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';

const AdminDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/admin');
        setData(data);
      } catch {
        setError('No se pudo cargar el dashboard admin. Verifica que hayas iniciado sesion como admin.');
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

  const { users, tours, bookings, revenue, disputes, pendingApprovals } = data;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-secondary-700 mb-6">Panel de Administracion</h1>

        {/* Pending alerts */}
        {(pendingApprovals.operators > 0 || pendingApprovals.jaladores > 0 || pendingApprovals.tours > 0 || disputes.open > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <h3 className="font-bold text-amber-600 mb-2">Acciones pendientes</h3>
            <ul className="space-y-1.5 text-sm">
              {pendingApprovals.operators > 0 && <li className="text-amber-600">{pendingApprovals.operators} operadores por aprobar</li>}
              {pendingApprovals.jaladores > 0 && <li className="text-amber-600">{pendingApprovals.jaladores} jaladores por aprobar</li>}
              {pendingApprovals.tours > 0 && <li className="text-amber-600">{pendingApprovals.tours} tours por revisar</li>}
              {disputes.open > 0 && <li className="text-red-600 font-medium">{disputes.open} disputas abiertas</li>}
            </ul>
          </div>
        )}

        {/* Revenue KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-400 mb-1">GMV Total</div>
            <div className="text-xl font-bold text-gray-900">${Number(revenue.gmvTotal).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
            <div className="text-sm text-gray-400 mb-1">GMV Este Mes</div>
            <div className="text-xl font-bold text-secondary-500">${Number(revenue.gmvMonth).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-primary-100 shadow-sm">
            <div className="text-sm text-gray-400 mb-1">Revenue Plataforma</div>
            <div className="text-xl font-bold text-primary-600">${Number(revenue.platformRevenue).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
            <div className="text-sm text-gray-400 mb-1">Reservas Hoy</div>
            <div className="text-xl font-bold text-amber-600">{bookings.today}</div>
          </div>
        </div>

        {/* General metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{users.total}</div>
            <div className="text-sm text-gray-400">Usuarios</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{users.operators}</div>
            <div className="text-sm text-gray-400">Operadores</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{users.jaladores}</div>
            <div className="text-sm text-gray-400">Jaladores</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{tours.active}</div>
            <div className="text-sm text-gray-400">Tours activos</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{bookings.total}</div>
            <div className="text-sm text-gray-400">Reservas</div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
