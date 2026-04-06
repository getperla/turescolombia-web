import { useState, useEffect } from 'react';
import Head from 'next/head';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import { useRequireAuth } from '../../lib/auth';

type Tab = 'dashboard' | 'jaladores' | 'operators' | 'tours' | 'bookings';

export default function AdminDashboard() {
  const { authorized } = useRequireAuth(['admin']);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (authorized) api.get('/dashboard/admin').then(r => setData(r.data)).catch(() => {});
  }, [authorized]);

  const loadList = async (type: Tab) => {
    setListLoading(true);
    try {
      if (type === 'jaladores') { setList((await api.get('/users/jaladores')).data || []); }
      else if (type === 'operators') { setList((await api.get('/users/operators')).data || []); }
      else if (type === 'tours') { setList((await api.get('/tours', { params: { limit: '100' } })).data?.data || []); }
      else if (type === 'bookings') { setList((await api.get('/bookings/operator')).data || []); }
    } catch {}
    setListLoading(false);
  };

  const openTab = (t: Tab) => { setTab(t); setMsg(''); if (t !== 'dashboard') loadList(t); };

  const doAction = async (action: string, id: number) => {
    setActionLoading(true); setMsg('');
    try {
      if (action === 'approve-jalador') await api.post(`/admin/jaladores/${id}/approve`);
      else if (action === 'approve-operator') await api.post(`/admin/operators/${id}/approve`);
      else if (action === 'suspend') await api.post(`/admin/users/${id}/suspend`);
      else if (action === 'reactivate') await api.post(`/admin/users/${id}/reactivate`);
      else if (action === 'approve-tour') await api.post(`/admin/tours/${id}/approve`);
      else if (action === 'reject-tour') await api.post(`/admin/tours/${id}/reject`);
      setMsg('Accion completada');
      loadList(tab);
      api.get('/dashboard/admin').then(r => setData(r.data)).catch(() => {});
    } catch (e: any) { setMsg(e.response?.data?.message || 'Error'); }
    setActionLoading(false);
  };

  if (!authorized) return null;

  const cards = [
    { key: 'jaladores' as Tab, label: 'Jaladores', value: data?.totalJaladores ?? '-', icon: '💰', color: '#F5882A' },
    { key: 'operators' as Tab, label: 'Operadores', value: data?.totalOperators ?? '-', icon: '🏢', color: '#2D6A4F' },
    { key: 'tours' as Tab, label: 'Tours', value: data?.activeTours ?? '-', icon: '🏖️', color: '#0D5C8A' },
    { key: 'bookings' as Tab, label: 'Reservas', value: data?.totalBookings ?? '-', icon: '📋', color: '#FF5F5F' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      active: { bg: '#E8F5EF', color: '#2D6A4F' }, pending: { bg: '#FEF3E8', color: '#F5882A' },
      confirmed: { bg: '#E8F4FA', color: '#0D5C8A' }, completed: { bg: '#E8F5EF', color: '#2D6A4F' },
      cancelled: { bg: '#FFF0F0', color: '#CC3333' }, in_progress: { bg: '#FEF3E8', color: '#E07020' },
      suspended: { bg: '#FFF0F0', color: '#CC3333' },
    };
    const s = map[status] || map.pending;
    return <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: s.bg, color: s.color }}>{status}</span>;
  };

  return (
    <Layout>
      <Head><title>Admin — La Perla</title></Head>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {tab === 'dashboard' ? (
            <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel de Administracion</h1>
          ) : (
            <button onClick={() => openTab('dashboard')} className="flex items-center gap-2 font-bold text-xl hover:opacity-70" style={{ color: '#222' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {tab === 'jaladores' ? 'Jaladores' : tab === 'operators' ? 'Operadores' : tab === 'tours' ? 'Tours' : 'Reservas'}
            </button>
          )}
          {msg && <span className="text-sm px-3 py-1 rounded-lg" style={{ background: msg.includes('Error') ? '#FFF0F0' : '#E8F5EF', color: msg.includes('Error') ? '#CC3333' : '#2D6A4F' }}>{msg}</span>}
        </div>

        {/* === DASHBOARD === */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {cards.map(c => (
                <button key={c.key} onClick={() => openTab(c.key)}
                  className="text-left p-5 rounded-xl border transition-all hover:shadow-md active:scale-95" style={{ borderColor: '#EBEBEB' }}>
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-xs mt-1" style={{ color: '#717171' }}>{c.label}</div>
                </button>
              ))}
            </div>
            {data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat label="GTV Total" value={`$${Number(data.gmv || 0).toLocaleString()}`} />
                <Stat label="Revenue Plataforma (20%)" value={`$${Number(data.platformRevenue || 0).toLocaleString()}`} color="#F5882A" />
                <Stat label="Comisiones Jaladores" value={`$${Number(data.jaladorCommissions || 0).toLocaleString()}`} color="#2D6A4F" />
              </div>
            )}
          </>
        )}

        {/* === JALADORES === */}
        {tab === 'jaladores' && (
          <List loading={listLoading} empty="No hay jaladores">
            {list.map((j: any) => (
              <Row key={j.id}
                avatar={j.user?.name?.charAt(0)} avatarBg="#F5882A"
                title={j.user?.name || 'Sin nombre'}
                subtitle={`${j.user?.email} · ${j.zone || 'Sin zona'} · ${j.totalSales} ventas · ${j.refCode}`}
                right={<>
                  {statusBadge(j.status)}
                  {j.status === 'pending' && <ActionBtn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-jalador', j.id)} disabled={actionLoading} />}
                  {j.status === 'active' && <ActionBtn label="Suspender" bg="#FFF0F0" color="#CC3333" onClick={() => doAction('suspend', j.user?.id)} disabled={actionLoading} />}
                </>}
              />
            ))}
          </List>
        )}

        {/* === OPERADORES === */}
        {tab === 'operators' && (
          <List loading={listLoading} empty="No hay operadores">
            {list.map((op: any) => (
              <Row key={op.id}
                avatar={op.companyName?.charAt(0)} avatarBg="#2D6A4F"
                title={op.companyName}
                subtitle={`${op.user?.email} · RNT: ${op.rntNumber || 'N/A'} · ${op.totalTours} tours · Score: ${op.score}`}
                right={<>
                  {statusBadge(op.isApproved ? 'active' : 'pending')}
                  {!op.isApproved && <ActionBtn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-operator', op.id)} disabled={actionLoading} />}
                </>}
              />
            ))}
          </List>
        )}

        {/* === TOURS === */}
        {tab === 'tours' && (
          <List loading={listLoading} empty="No hay tours">
            {list.map((t: any) => (
              <Row key={t.id}
                image={t.coverImageUrl}
                title={t.name}
                subtitle={`${t.operator?.companyName} · $${t.priceAdult?.toLocaleString()} · ${t.totalBookings} reservas · ★${t.avgRating?.toFixed(1)}`}
                right={<>
                  {statusBadge(t.status)}
                  {t.status === 'pending_review' && <>
                    <ActionBtn label="Aprobar" bg="#2D6A4F" onClick={() => doAction('approve-tour', t.id)} disabled={actionLoading} />
                    <ActionBtn label="Rechazar" bg="#FFF0F0" color="#CC3333" onClick={() => doAction('reject-tour', t.id)} disabled={actionLoading} />
                  </>}
                </>}
              />
            ))}
          </List>
        )}

        {/* === RESERVAS === */}
        {tab === 'bookings' && (
          <List loading={listLoading} empty="No hay reservas">
            {list.map((b: any) => (
              <Row key={b.id}
                title={`${b.tour?.name || 'Tour'}`}
                subtitle={`${b.bookingCode} · ${b.tourist?.user?.name || 'Cliente'} · ${new Date(b.tourDate).toLocaleDateString('es-CO')} · $${Number(b.totalAmount).toLocaleString()}`}
                right={statusBadge(b.status)}
              />
            ))}
          </List>
        )}
      </div>
    </Layout>
  );
}

// === Componentes helper ===
function Stat({ label, value, color = '#222' }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: '#F7F7F7' }}>
      <div className="text-xs mb-1" style={{ color: '#717171' }}>{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function List({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode }) {
  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#F0F0F0' }}></div>)}</div>;
  const items = Array.isArray(children) ? children : [children];
  if (items.length === 0) return <div className="text-center py-12 text-sm" style={{ color: '#717171' }}>{empty}</div>;
  return <div className="space-y-2">{children}</div>;
}

function Row({ avatar, avatarBg, image, title, subtitle, right }: { avatar?: string; avatarBg?: string; image?: string; title: string; subtitle: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
      {image ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"><img src={image} alt="" className="w-full h-full object-cover" /></div>
      ) : avatar ? (
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: avatarBg || '#222' }}>{avatar}</div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{title}</div>
        <div className="text-xs truncate" style={{ color: '#717171' }}>{subtitle}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </div>
  );
}

function ActionBtn({ label, bg, color, onClick, disabled }: { label: string; bg: string; color?: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 transition-all"
      style={{ background: bg, color: color || 'white' }}>
      {label}
    </button>
  );
}
