import Head from 'next/head';
import Layout from '../../components/Layout';
import { useRequireAuth } from '../../lib/auth';
import { useAdminPanel } from '../../lib/hooks/useAdminPanel';
import type { AdminTab } from '../../components/admin/shared';
import AdminMetricCards from '../../components/admin/AdminMetricCards';
import AdminTabJaladores from '../../components/admin/AdminTabJaladores';
import AdminTabOperadores from '../../components/admin/AdminTabOperadores';
import AdminTabTours from '../../components/admin/AdminTabTours';
import AdminTabBookings from '../../components/admin/AdminTabBookings';
import AdminTabNotifications from '../../components/admin/AdminTabNotifications';
import AdminEditModal from '../../components/admin/AdminEditModal';

export default function AdminDashboard() {
  const { authorized } = useRequireAuth(['admin']);
  const p = useAdminPanel(authorized);

  if (!authorized) return null;

  const cards: Array<{ key: AdminTab; label: string; value: any; icon: string; color: string }> = [
    { key: 'jaladores', label: 'Jaladores', value: p.data?.totalJaladores ?? '-', icon: '💰', color: '#F5882A' },
    { key: 'operators', label: 'Operadores', value: p.data?.totalOperators ?? '-', icon: '🏢', color: '#2D6A4F' },
    { key: 'tours', label: 'Tours', value: p.data?.activeTours ?? '-', icon: '🏖️', color: '#0D5C8A' },
    { key: 'bookings', label: 'Reservas', value: p.data?.totalBookings ?? '-', icon: '📋', color: '#FF5F5F' },
    { key: 'reports', label: 'Reportes', value: '📊', icon: '📊', color: '#717171' },
  ];

  const tabLabels: Record<AdminTab, string> = {
    dashboard: 'Dashboard',
    jaladores: 'Jaladores',
    operators: 'Operadores',
    tours: 'Tours',
    bookings: 'Reservas',
    reports: 'Reportes',
    notifications: 'Notificaciones',
  };

  return (
    <Layout>
      <Head><title>Admin — La Perla</title></Head>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          {p.tab === 'dashboard' ? (
            <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel Admin</h1>
          ) : (
            <button onClick={() => p.openTab('dashboard')} className="flex items-center gap-2 font-bold text-xl" style={{ color: '#222' }}>
              ← {tabLabels[p.tab]}
            </button>
          )}
          <div className="flex items-center gap-3">
            {p.actionMsg && <span className="text-xs px-2 py-1 rounded" style={{ background: p.actionMsg === 'Error' ? '#FFF0F0' : '#E8F5EF', color: p.actionMsg === 'Error' ? '#CC3333' : '#2D6A4F' }}>{p.actionMsg}</span>}
            <button onClick={() => p.openTab('notifications')} aria-label="Notificaciones" className="relative p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="#222" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {p.unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#FF5F5F', fontSize: '10px' }}>{p.unread}</span>}
            </button>
          </div>
        </div>

        {p.tab === 'dashboard' && (
          <AdminMetricCards data={p.data} chartData={p.chartData} cards={cards} onTabChange={p.openTab} />
        )}

        {p.listError && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2" style={{ background: '#FFF0F0', color: '#CC3333' }}>
            <span>⚠️</span> {p.listError}
            <button onClick={() => p.loadList(p.tab)} className="ml-auto text-xs font-semibold underline">Reintentar</button>
          </div>
        )}

        {p.tab === 'jaladores' && (
          <AdminTabJaladores list={p.list} loading={p.loading} onEdit={p.openEditJalador} onAction={p.doAction} />
        )}
        {p.tab === 'operators' && (
          <AdminTabOperadores list={p.list} loading={p.loading} onEdit={p.openEditOperator} onAction={p.doAction} />
        )}
        {p.tab === 'tours' && (
          <AdminTabTours list={p.list} loading={p.loading} onAction={p.doAction} />
        )}
        {p.tab === 'bookings' && <AdminTabBookings list={p.list} loading={p.loading} />}

        {p.tab === 'notifications' && (
          <AdminTabNotifications notifications={p.notifications} unread={p.unread} onMarkAllRead={p.markAllRead} />
        )}

        {p.editItem && p.editType && (
          <AdminEditModal
            editType={p.editType}
            form={p.editForm}
            saving={p.editSaving}
            onChange={p.setEditForm}
            onClose={p.closeEdit}
            onSave={p.saveEdit}
          />
        )}
      </div>
    </Layout>
  );
}
