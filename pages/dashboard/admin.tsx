import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import { useRequireAuth } from '../../lib/auth';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

type Tab = 'dashboard' | 'jaladores' | 'operators' | 'tours' | 'bookings' | 'reports' | 'notifications';

export default function AdminDashboard() {
  const { authorized } = useRequireAuth(['admin']);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    api.get('/dashboard/admin').then(r => setData(r.data)).catch(() => {});
    api.get('/notifications').then(r => { setNotifications(r.data || []); setUnread((r.data || []).filter((n: any) => !n.isRead).length); }).catch(() => {});
  }, []);

  useEffect(() => { if (authorized) { refresh(); const iv = setInterval(refresh, 30000); return () => clearInterval(iv); } }, [authorized, refresh]);

  const loadList = async (type: Tab) => {
    setLoading(true);
    try {
      if (type === 'jaladores') setList((await api.get('/users/jaladores')).data || []);
      else if (type === 'operators') setList((await api.get('/users/operators')).data || []);
      else if (type === 'tours') setList((await api.get('/tours', { params: { limit: '100' } })).data?.data || []);
      else if (type === 'bookings') setList((await api.get('/bookings/operator')).data || []);
    } catch {} setLoading(false);
  };

  const openTab = (t: Tab) => { setTab(t); setActionMsg(''); if (!['dashboard', 'reports', 'notifications'].includes(t)) loadList(t); };

  const doAction = async (action: string, id: number) => {
    setActionMsg('');
    try {
      if (action === 'approve-jalador') await api.post(`/admin/jaladores/${id}/approve`);
      else if (action === 'approve-operator') await api.post(`/admin/operators/${id}/approve`);
      else if (action === 'suspend') await api.post(`/admin/users/${id}/suspend`);
      else if (action === 'reactivate') await api.post(`/admin/users/${id}/reactivate`);
      else if (action === 'approve-tour') await api.post(`/admin/tours/${id}/approve`);
      else if (action === 'reject-tour') await api.post(`/admin/tours/${id}/reject`);
      setActionMsg('Hecho'); loadList(tab); refresh();
    } catch (e: any) { setActionMsg(e.response?.data?.message || 'Error'); }
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all'); refresh();
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
  };

  if (!authorized) return null;

  const cards = [
    { key: 'jaladores' as Tab, label: 'Jaladores', value: data?.totalJaladores ?? '-', icon: '💰', color: '#F5882A' },
    { key: 'operators' as Tab, label: 'Operadores', value: data?.totalOperators ?? '-', icon: '🏢', color: '#2D6A4F' },
    { key: 'tours' as Tab, label: 'Tours', value: data?.activeTours ?? '-', icon: '🏖️', color: '#0D5C8A' },
    { key: 'bookings' as Tab, label: 'Reservas', value: data?.totalBookings ?? '-', icon: '📋', color: '#FF5F5F' },
    { key: 'reports' as Tab, label: 'Reportes', value: '📊', icon: '📊', color: '#717171' },
  ];

  const badge = (status: string) => {
    const m: Record<string, { bg: string; c: string }> = {
      active: { bg: '#E8F5EF', c: '#2D6A4F' }, pending: { bg: '#FEF3E8', c: '#F5882A' },
      confirmed: { bg: '#E8F4FA', c: '#0D5C8A' }, completed: { bg: '#E8F5EF', c: '#2D6A4F' },
      cancelled: { bg: '#FFF0F0', c: '#CC3333' }, in_progress: { bg: '#FEF3E8', c: '#E07020' },
    };
    const s = m[status] || m.pending;
    return <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: s.bg, color: s.c }}>{status}</span>;
  };

  // Chart data from bookings breakdown
  const chartData = data?.bookingsByStatus?.map((s: any) => ({ name: s.status, count: s.count })) || [];

  return (
    <Layout>
      <Head><title>Admin — La Perla</title></Head>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header con campana */}
        <div className="flex items-center justify-between mb-6">
          {tab === 'dashboard' ? (
            <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel Admin</h1>
          ) : (
            <button onClick={() => openTab('dashboard')} className="flex items-center gap-2 font-bold text-xl" style={{ color: '#222' }}>
              ← {tab === 'jaladores' ? 'Jaladores' : tab === 'operators' ? 'Operadores' : tab === 'tours' ? 'Tours' : tab === 'bookings' ? 'Reservas' : tab === 'reports' ? 'Reportes' : 'Notificaciones'}
            </button>
          )}
          <div className="flex items-center gap-3">
            {actionMsg && <span className="text-xs px-2 py-1 rounded" style={{ background: actionMsg === 'Error' ? '#FFF0F0' : '#E8F5EF', color: actionMsg === 'Error' ? '#CC3333' : '#2D6A4F' }}>{actionMsg}</span>}
            {/* Campana */}
            <button onClick={() => { setShowNotifs(!showNotifs); if (tab !== 'notifications') openTab('notifications'); }} className="relative p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="#222" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#FF5F5F', fontSize: '10px' }}>{unread}</span>}
            </button>
          </div>
        </div>

        {/* === DASHBOARD === */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {cards.map(c => (
                <button key={c.key} onClick={() => openTab(c.key)} className="text-left p-4 rounded-xl border hover:shadow-md active:scale-95 transition-all" style={{ borderColor: '#EBEBEB' }}>
                  <div className="text-xl mb-1">{c.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{c.label}</div>
                </button>
              ))}
            </div>

            {data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs" style={{ color: '#717171' }}>GTV Total</div>
                    <div className="text-xl font-bold" style={{ color: '#222' }}>${Number(data.gmv || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs" style={{ color: '#717171' }}>Revenue (20%)</div>
                    <div className="text-xl font-bold" style={{ color: '#F5882A' }}>${Number(data.platformRevenue || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs" style={{ color: '#717171' }}>Comisiones Jaladores</div>
                    <div className="text-xl font-bold" style={{ color: '#2D6A4F' }}>${Number(data.jaladorCommissions || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                  <div className="p-4 rounded-xl mb-6" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs mb-3" style={{ color: '#717171' }}>Reservas por estado</div>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer><BarChart data={chartData}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#F5882A" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* === JALADORES === */}
        {tab === 'jaladores' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{list.length} jaladores</span>
              <button onClick={() => exportCSV(list.map(j => ({ nombre: j.user?.name, email: j.user?.email, zona: j.zone, ventas: j.totalSales, score: j.score, estado: j.status, codigo: j.refCode })), 'jaladores')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#F5882A' }}>{j.user?.name?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{j.user?.name} <span className="font-mono text-xs" style={{ color: '#717171' }}>{j.refCode}</span></div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{j.user?.email} · {j.zone || '-'} · {j.totalSales} ventas · Score {j.score}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(j.status)}
                  {j.status === 'pending' && <Btn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-jalador', j.id)} />}
                  {j.status === 'active' && <Btn label="Suspender" bg="#FFF0F0" c="#CC3333" onClick={() => doAction('suspend', j.user?.id)} />}
                  {j.status === 'suspended' && <Btn label="Reactivar" bg="#E8F5EF" c="#2D6A4F" onClick={() => doAction('reactivate', j.user?.id)} />}
                </div>
              </div>
            ))}
          </>
        )}

        {/* === OPERADORES === */}
        {tab === 'operators' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{list.length} operadores</span>
              <button onClick={() => exportCSV(list.map(o => ({ empresa: o.companyName, email: o.user?.email, rnt: o.rntNumber, tours: o.totalTours, score: o.score, aprobado: o.isApproved })), 'operadores')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((op: any) => (
              <div key={op.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#2D6A4F' }}>{op.companyName?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{op.companyName}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{op.user?.email} · RNT: {op.rntNumber || 'N/A'} · {op.totalTours} tours</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(op.isApproved ? 'active' : 'pending')}
                  {!op.isApproved && <Btn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-operator', op.id)} />}
                </div>
              </div>
            ))}
          </>
        )}

        {/* === TOURS === */}
        {tab === 'tours' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{list.length} tours</span>
              <button onClick={() => exportCSV(list.map(t => ({ nombre: t.name, operador: t.operator?.companyName, precio: t.priceAdult, reservas: t.totalBookings, rating: t.avgRating, estado: t.status })), 'tours')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  {t.coverImageUrl ? <img src={t.coverImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{t.name}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{t.operator?.companyName} · ${t.priceAdult?.toLocaleString()} · {t.totalBookings} reservas · ★{t.avgRating?.toFixed(1)}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(t.status)}
                  {t.status === 'pending_review' && <>
                    <Btn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-tour', t.id)} />
                    <Btn label="Rechazar" bg="#FFF0F0" c="#CC3333" onClick={() => doAction('reject-tour', t.id)} />
                  </>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* === RESERVAS === */}
        {tab === 'bookings' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{list.length} reservas</span>
              <button onClick={() => exportCSV(list.map(b => ({ codigo: b.bookingCode, tour: b.tour?.name, cliente: b.tourist?.user?.name, fecha: b.tourDate, monto: b.totalAmount, estado: b.status })), 'reservas')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{b.tour?.name}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{b.bookingCode} · {b.tourist?.user?.name || 'Cliente'} · {new Date(b.tourDate).toLocaleDateString('es-CO')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm" style={{ color: '#222' }}>${Number(b.totalAmount).toLocaleString()}</div>
                  {badge(b.status)}
                </div>
              </div>
            ))}
          </>
        )}

        {/* === REPORTES === */}
        {tab === 'reports' && data && (
          <>
            {/* Top Tours */}
            <div className="mb-6">
              <h3 className="font-bold text-sm mb-3" style={{ color: '#222' }}>Top Tours por reservas</h3>
              <div className="space-y-2">
                {(list.length ? list : []).sort((a: any, b: any) => (b.totalBookings || 0) - (a.totalBookings || 0)).slice(0, 10).map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: i < 3 ? '#F5882A' : '#EBEBEB', color: i < 3 ? 'white' : '#222' }}>{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold truncate" style={{ color: '#222' }}>{t.name}</span>
                    <span className="text-sm" style={{ color: '#717171' }}>{t.totalBookings} reservas</span>
                    <span className="text-sm font-bold" style={{ color: '#0D5C8A' }}>${t.priceAdult?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {list.length === 0 && <button onClick={() => loadList('tours')} className="text-sm underline" style={{ color: '#0D5C8A' }}>Cargar datos</button>}
            </div>

            {/* Revenue summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>GTV Total</div>
                <div className="text-2xl font-bold" style={{ color: '#222' }}>${Number(data.gmv || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>Revenue Plataforma</div>
                <div className="text-2xl font-bold" style={{ color: '#F5882A' }}>${Number(data.platformRevenue || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>Comisiones Jaladores</div>
                <div className="text-2xl font-bold" style={{ color: '#2D6A4F' }}>${Number(data.jaladorCommissions || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs mb-3" style={{ color: '#717171' }}>Reservas por estado</div>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer><BarChart data={chartData}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#F5882A" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* === NOTIFICACIONES === */}
        {tab === 'notifications' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{notifications.length} notificaciones ({unread} sin leer)</span>
              <button onClick={markAllRead} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Marcar todas como leidas</button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: '#717171' }}>Sin notificaciones</div>
            ) : notifications.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB', background: n.isRead ? 'white' : '#FFFBF5' }}>
                <div className="text-lg shrink-0">
                  {n.type?.includes('booking') ? '📋' : n.type?.includes('sale') ? '💰' : n.type?.includes('review') ? '⭐' : n.type?.includes('commission') ? '💵' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: '#222' }}>{n.title}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{n.body}</div>
                  <div className="text-xs mt-1" style={{ color: '#B0B0B0' }}>{new Date(n.createdAt).toLocaleString('es-CO')}</div>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: '#FF5F5F' }}></div>}
              </div>
            ))}
          </>
        )}
      </div>
    </Layout>
  );
}

function Skeleton() { return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#F0F0F0' }}></div>)}</div>; }
function Btn({ label, bg, c, onClick }: { label: string; bg: string; c?: string; onClick: () => void }) {
  return <button onClick={onClick} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: bg, color: c || 'white' }}>{label}</button>;
}
