import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Image from 'next/image';
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

type ActionMsg = { kind: 'success' | 'error'; text: string } | null;

// Labels legibles para los status que entrega el backend.
const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  pending_review: 'En revisión',
  suspended: 'Suspendido',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  in_progress: 'En curso',
  refunded: 'Reembolsada',
  rejected: 'Rechazado',
};

export default function AdminDashboard() {
  const { authorized, loading: authLoading } = useRequireAuth(['admin']);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<ActionMsg>(null);
  const [listError, setListError] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<'jalador' | 'operator' | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  // Lock global: si hay acción en proceso, deshabilita todos los botones de
  // acción para que el doble-click no dispare la misma operación 2 veces.
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.get('/dashboard/admin').then(r => setData(r.data)).catch(() => setData(null));
    api.get('/notifications').then(r => { setNotifications(r.data || []); setUnread((r.data || []).filter((n: any) => !n.isRead).length); }).catch((e) => console.error('Failed to load notifications:', e));
  }, []);

  // Auto-refresh cada 60s — reduce carga y re-renders del chart.
  useEffect(() => { if (authorized) { refresh(); const iv = setInterval(refresh, 60000); return () => clearInterval(iv); } }, [authorized, refresh]);

  const loadList = useCallback(async (type: Tab) => {
    setLoading(true);
    setList([]);
    setListError('');
    try {
      let result: any;
      if (type === 'jaladores') { result = (await api.get('/users/jaladores')).data; setList(Array.isArray(result) ? result : result?.data || []); }
      else if (type === 'operators') { result = (await api.get('/users/operators')).data; setList(Array.isArray(result) ? result : result?.data || []); }
      else if (type === 'tours') { result = (await api.get('/tours', { params: { limit: '100' } })).data; setList(Array.isArray(result) ? result : result?.data || []); }
      else if (type === 'bookings') { result = (await api.get('/bookings/operator')).data; setList(Array.isArray(result) ? result : result?.data || []); }
    } catch {
      setListError('No se pudo conectar al servidor. Verifica que el backend este corriendo.');
    }
    setLoading(false);
  }, []);

  const openTab = useCallback((t: Tab) => {
    setTab(t);
    setActionMsg(null);
    setListError('');
    if (!['dashboard', 'reports', 'notifications'].includes(t)) loadList(t);
  }, [loadList]);

  // Auto-clear del mensaje a los 4s — evita banners pegados que confunden
  // entre operaciones consecutivas.
  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(null), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const doAction = useCallback(async (action: string, id: number) => {
    if (processingAction !== null) return;
    setProcessingAction(`${action}-${id}`);
    setActionMsg(null);
    try {
      if (action === 'approve-jalador') await api.post(`/admin/jaladores/${id}/approve`);
      else if (action === 'approve-operator') await api.post(`/admin/operators/${id}/approve`);
      else if (action === 'suspend') await api.post(`/admin/users/${id}/suspend`);
      else if (action === 'reactivate') await api.post(`/admin/users/${id}/reactivate`);
      else if (action === 'approve-tour') await api.post(`/admin/tours/${id}/approve`);
      else if (action === 'reject-tour') await api.post(`/admin/tours/${id}/reject`);
      setActionMsg({ kind: 'success', text: 'Hecho' });
      loadList(tab);
      refresh();
    } catch (e: any) {
      setActionMsg({ kind: 'error', text: e.response?.data?.message || 'Error al procesar la acción' });
    }
    setProcessingAction(null);
  }, [tab, loadList, refresh, processingAction]);

  const markAllRead = async () => {
    await api.post('/notifications/read-all'); refresh();
  };

  const openEditJalador = (j: any) => {
    setEditType('jalador');
    setEditItem(j);
    setEditForm({
      name: j.user?.name || '',
      email: j.user?.email || '',
      phone: j.user?.phone || '',
      bio: j.bio || '',
      zone: j.zone || '',
      languages: (j.languages || []).join(', '),
      bankName: j.bankName || '',
      bankAccount: j.bankAccount || '',
      nequiPhone: j.nequiPhone || '',
      payoutMethod: j.payoutMethod || '',
    });
  };

  const openEditOperator = (op: any) => {
    setEditType('operator');
    setEditItem(op);
    setEditForm({
      name: op.user?.name || '',
      email: op.user?.email || '',
      phone: op.user?.phone || '',
      companyName: op.companyName || '',
      rntNumber: op.rntNumber || '',
    });
  };

  const saveEdit = async () => {
    if (!editItem || !editType) return;
    setEditSaving(true);
    try {
      if (editType === 'jalador') {
        await api.put(`/admin/jaladores/${editItem.id}`, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || undefined,
          bio: editForm.bio,
          zone: editForm.zone,
          languages: editForm.languages.split(',').map(l => l.trim()).filter(Boolean),
          bankName: editForm.bankName || undefined,
          bankAccount: editForm.bankAccount || undefined,
          nequiPhone: editForm.nequiPhone || undefined,
          payoutMethod: editForm.payoutMethod || undefined,
        });
      } else {
        await api.put(`/admin/operators/${editItem.id}`, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || undefined,
          companyName: editForm.companyName,
          rntNumber: editForm.rntNumber || undefined,
        });
      }
      setActionMsg({ kind: 'success', text: 'Actualizado' });
      setEditItem(null);
      setEditType(null);
      loadList(tab);
    } catch (e: any) {
      setActionMsg({ kind: 'error', text: e.response?.data?.message || 'Error al guardar' });
    }
    setEditSaving(false);
  };

  // Escapa correctamente segun RFC 4180: si el valor contiene comma, newline,
  // o quote, lo envuelve en quotes y duplica los quotes internos.
  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const header = keys.map(escapeCSV).join(',');
    const body = rows.map(r => keys.map(k => escapeCSV(r[k])).join(',')).join('\r\n');
    const csv = `${header}\r\n${body}`;
    // BOM UTF-8 para que Excel reconozca tildes y eñes correctamente.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Liberar memoria — el blob ya no se necesita despues del download.
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // Chart data from bookings breakdown — memoizado para evitar recrear array en cada render.
  // Debe estar antes del early-return para respetar Rules of Hooks.
  const chartData = useMemo(
    () => data?.bookingsByStatus?.map((s: any) => ({ name: s.status, count: s.count })) || [],
    [data?.bookingsByStatus]
  );

  // Top tours ordenados — copia con [...list] para no mutar el state.
  const topTours = useMemo(
    () => [...list].sort((a: any, b: any) => (b.totalBookings || 0) - (a.totalBookings || 0)).slice(0, 10),
    [list]
  );

  if (authLoading || !authorized) return null;

  const cards = [
    { key: 'jaladores' as Tab, label: 'Jaladores', value: data?.totalJaladores ?? '-', icon: '💰', color: '#F5882A' },
    { key: 'operators' as Tab, label: 'Operadores', value: data?.totalOperators ?? '-', icon: '🏢', color: '#2D6A4F' },
    { key: 'tours' as Tab, label: 'Tours', value: data?.activeTours ?? '-', icon: '🏖️', color: '#0D5C8A' },
    { key: 'bookings' as Tab, label: 'Reservas', value: data?.totalBookings ?? '-', icon: '📋', color: '#FF5F5F' },
    { key: 'reports' as Tab, label: 'Reportes', value: '📊', icon: '📊', color: '#717171' },
  ];

  const badge = (status: string | null | undefined) => {
    const s = status ?? 'pending';
    const m: Record<string, { bg: string; c: string }> = {
      active: { bg: '#E8F5EF', c: '#2D6A4F' }, pending: { bg: '#FEF3E8', c: '#F5882A' },
      pending_review: { bg: '#FEF3E8', c: '#F5882A' }, suspended: { bg: '#FFF0F0', c: '#CC3333' },
      confirmed: { bg: '#E8F4FA', c: '#0D5C8A' }, completed: { bg: '#E8F5EF', c: '#2D6A4F' },
      cancelled: { bg: '#FFF0F0', c: '#CC3333' }, in_progress: { bg: '#FEF3E8', c: '#E07020' },
      rejected: { bg: '#FFF0F0', c: '#CC3333' },
    };
    const style = m[s] || m.pending;
    const label = STATUS_LABELS[s] || s;
    return <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: style.bg, color: style.c }}>{label}</span>;
  };

  const isProcessing = (action: string, id: number) => processingAction === `${action}-${id}`;

  return (
    <Layout>
      <Head><title>Admin — La Perla</title></Head>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header con campana */}
        <div className="flex items-center justify-between mb-6 gap-3">
          {tab === 'dashboard' ? (
            <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel Admin</h1>
          ) : (
            <button onClick={() => openTab('dashboard')} className="flex items-center gap-2 font-bold text-xl" style={{ color: '#222' }}>
              ← {tab === 'jaladores' ? 'Jaladores' : tab === 'operators' ? 'Operadores' : tab === 'tours' ? 'Tours' : tab === 'bookings' ? 'Reservas' : tab === 'reports' ? 'Reportes' : 'Notificaciones'}
            </button>
          )}
          <div className="flex items-center gap-3">
            {actionMsg && (
              <span
                className="text-xs px-3 py-1.5 rounded font-semibold"
                style={
                  actionMsg.kind === 'success'
                    ? { background: '#E8F5EF', color: '#2D6A4F' }
                    : { background: '#FFF0F0', color: '#CC3333' }
                }
              >
                {actionMsg.kind === 'success' ? '✓ ' : '⚠️ '}{actionMsg.text}
              </span>
            )}
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
                    <div className="text-xl font-bold" style={{ color: '#222' }}>${Number(data.gmv ?? 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs" style={{ color: '#717171' }}>Revenue (20%)</div>
                    <div className="text-xl font-bold" style={{ color: '#F5882A' }}>${Number(data.platformRevenue ?? 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <div className="text-xs" style={{ color: '#717171' }}>Comisiones Jaladores</div>
                    <div className="text-xl font-bold" style={{ color: '#2D6A4F' }}>${Number(data.jaladorCommissions ?? 0).toLocaleString()}</div>
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

        {/* Error message */}
        {listError && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2" style={{ background: '#FFF0F0', color: '#CC3333' }}>
            <span>⚠️</span> {listError}
            <button onClick={() => loadList(tab)} className="ml-auto text-xs font-semibold underline">Reintentar</button>
          </div>
        )}

        {/* === JALADORES === */}
        {tab === 'jaladores' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: '#717171' }}>{list.length} jaladores</span>
              <button onClick={() => exportCSV(list.map(j => ({ nombre: j.user?.name ?? '', email: j.user?.email ?? '', zona: j.zone ?? '', ventas: j.totalSales ?? 0, score: j.score ?? 0, estado: j.status ?? '', codigo: j.refCode ?? '' })), 'jaladores')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#F5882A' }}>{j.user?.name?.charAt(0) ?? '?'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{j.user?.name ?? 'Sin nombre'} <span className="font-mono text-xs" style={{ color: '#717171' }}>{j.refCode ?? ''}</span></div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{j.user?.email ?? '—'} · {j.zone || '-'} · {j.totalSales ?? 0} ventas · Score {j.score ?? 0}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(j.status)}
                  <Btn label="Editar" bg="#F7F7F7" c="#222" onClick={() => openEditJalador(j)} disabled={processingAction !== null} />
                  {j.status === 'pending' && <Btn label={isProcessing('approve-jalador', j.id) ? '…' : 'Aprobar'} bg="#2D6A4F" onClick={() => doAction('approve-jalador', j.id)} disabled={processingAction !== null} />}
                  {j.status === 'active' && <Btn label={isProcessing('suspend', j.user?.id) ? '…' : 'Suspender'} bg="#FFF0F0" c="#CC3333" onClick={() => doAction('suspend', j.user?.id)} disabled={processingAction !== null} />}
                  {j.status === 'suspended' && <Btn label={isProcessing('reactivate', j.user?.id) ? '…' : 'Reactivar'} bg="#E8F5EF" c="#2D6A4F" onClick={() => doAction('reactivate', j.user?.id)} disabled={processingAction !== null} />}
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
              <button onClick={() => exportCSV(list.map(o => ({ empresa: o.companyName ?? '', email: o.user?.email ?? '', rnt: o.rntNumber ?? '', tours: o.totalTours ?? 0, score: o.score ?? 0, aprobado: o.isApproved ? 'si' : 'no' })), 'operadores')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((op: any) => (
              <div key={op.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#2D6A4F' }}>{op.companyName?.charAt(0) ?? '?'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{op.companyName ?? 'Sin nombre'}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{op.user?.email ?? '—'} · RNT: {op.rntNumber || 'N/A'} · {op.totalTours ?? 0} tours</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(op.isApproved ? 'active' : 'pending')}
                  <Btn label="Editar" bg="#F7F7F7" c="#222" onClick={() => openEditOperator(op)} disabled={processingAction !== null} />
                  {!op.isApproved && <Btn label={isProcessing('approve-operator', op.id) ? '…' : 'Aprobar'} bg="#2D6A4F" onClick={() => doAction('approve-operator', op.id)} disabled={processingAction !== null} />}
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
              <button onClick={() => exportCSV(list.map(t => ({ nombre: t.name ?? '', operador: t.operator?.companyName ?? '', precio: t.priceAdult ?? 0, reservas: t.totalBookings ?? 0, rating: t.avgRating ?? 0, estado: t.status ?? '' })), 'tours')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                  {t.coverImageUrl ? <Image src={t.coverImageUrl} alt={t.name ?? 'Tour'} fill sizes="48px" className="object-cover" /> : <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{t.name ?? 'Sin nombre'}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>
                    {t.operator?.companyName ?? 'Sin operador'} · ${Number(t.priceAdult ?? 0).toLocaleString()} · {t.totalBookings ?? 0} reservas · ★{Number(t.avgRating ?? 0).toFixed(1)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {badge(t.status)}
                  {t.status === 'pending_review' && <>
                    <Btn label={isProcessing('approve-tour', t.id) ? '…' : 'Aprobar'} bg="#2D6A4F" onClick={() => doAction('approve-tour', t.id)} disabled={processingAction !== null} />
                    <Btn label={isProcessing('reject-tour', t.id) ? '…' : 'Rechazar'} bg="#FFF0F0" c="#CC3333" onClick={() => doAction('reject-tour', t.id)} disabled={processingAction !== null} />
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
              <button onClick={() => exportCSV(list.map(b => ({ codigo: b.bookingCode ?? '', tour: b.tour?.name ?? '', cliente: b.tourist?.user?.name ?? '', fecha: b.tourDate ?? '', monto: b.totalAmount ?? 0, estado: b.status ?? '' })), 'reservas')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Exportar CSV</button>
            </div>
            {loading ? <Skeleton /> : list.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 p-3 mb-2 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{b.tour?.name ?? 'Tour eliminado'}</div>
                  <div className="text-xs truncate" style={{ color: '#717171' }}>{b.bookingCode ?? '—'} · {b.tourist?.user?.name ?? 'Cliente'} · {new Date(b.tourDate).toLocaleDateString('es-CO')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm" style={{ color: '#222' }}>${Number(b.totalAmount ?? 0).toLocaleString()}</div>
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
                {topTours.map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F7F7F7' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: i < 3 ? '#F5882A' : '#EBEBEB', color: i < 3 ? 'white' : '#222' }}>{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold truncate" style={{ color: '#222' }}>{t.name ?? 'Sin nombre'}</span>
                    <span className="text-sm" style={{ color: '#717171' }}>{t.totalBookings ?? 0} reservas</span>
                    <span className="text-sm font-bold" style={{ color: '#0D5C8A' }}>${Number(t.priceAdult ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {list.length === 0 && <button onClick={() => loadList('tours')} className="text-sm underline" style={{ color: '#0D5C8A' }}>Cargar datos</button>}
            </div>

            {/* Revenue summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>GTV Total</div>
                <div className="text-2xl font-bold" style={{ color: '#222' }}>${Number(data.gmv ?? 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>Revenue Plataforma</div>
                <div className="text-2xl font-bold" style={{ color: '#F5882A' }}>${Number(data.platformRevenue ?? 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
                <div className="text-xs" style={{ color: '#717171' }}>Comisiones Jaladores</div>
                <div className="text-2xl font-bold" style={{ color: '#2D6A4F' }}>${Number(data.jaladorCommissions ?? 0).toLocaleString()}</div>
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
                  <div className="font-semibold text-sm" style={{ color: '#222' }}>{n.title ?? 'Notificación'}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{n.body ?? ''}</div>
                  <div className="text-xs mt-1" style={{ color: '#B0B0B0' }}>{n.createdAt ? new Date(n.createdAt).toLocaleString('es-CO') : ''}</div>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: '#FF5F5F' }}></div>}
              </div>
            ))}
          </>
        )}
        {/* === MODAL EDICION === */}
        {editItem && editType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => { if (!editSaving) { setEditItem(null); setEditType(null); } }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#EBEBEB' }}>
                <h2 className="font-bold text-lg" style={{ color: '#222' }}>
                  Editar {editType === 'jalador' ? 'Jalador' : 'Operador'}
                </h2>
                <button onClick={() => { setEditItem(null); setEditType(null); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#717171' }}>✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Datos de usuario */}
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#717171' }}>Datos personales</div>
                <EditField label="Nombre" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                <EditField label="Email" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} type="email" />
                <EditField label="Telefono" value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} type="tel" placeholder="+57 300 000 0000" />

                {/* Campos de jalador */}
                {editType === 'jalador' && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>Perfil de Jalador</div>
                    <EditField label="Bio" value={editForm.bio} onChange={v => setEditForm({ ...editForm, bio: v })} textarea />
                    <EditField label="Zona de trabajo" value={editForm.zone} onChange={v => setEditForm({ ...editForm, zone: v })} placeholder="Centro Historico, Taganga..." />
                    <EditField label="Idiomas (separados por coma)" value={editForm.languages} onChange={v => setEditForm({ ...editForm, languages: v })} placeholder="Espanol, Ingles" />

                    <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>Datos de pago</div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Metodo de pago</label>
                      <select value={editForm.payoutMethod} onChange={e => setEditForm({ ...editForm, payoutMethod: e.target.value })} className="input">
                        <option value="">Seleccionar</option>
                        <option value="bank_transfer">Transferencia bancaria</option>
                        <option value="nequi">Nequi</option>
                        <option value="daviplata">Daviplata</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField label="Banco" value={editForm.bankName} onChange={v => setEditForm({ ...editForm, bankName: v })} />
                      <EditField label="Numero de cuenta" value={editForm.bankAccount} onChange={v => setEditForm({ ...editForm, bankAccount: v })} />
                    </div>
                    <EditField label="Nequi (telefono)" value={editForm.nequiPhone} onChange={v => setEditForm({ ...editForm, nequiPhone: v })} type="tel" />
                  </>
                )}

                {/* Campos de operador */}
                {editType === 'operator' && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>Datos de empresa</div>
                    <EditField label="Nombre de empresa" value={editForm.companyName} onChange={v => setEditForm({ ...editForm, companyName: v })} />
                    <EditField label="Numero RNT" value={editForm.rntNumber} onChange={v => setEditForm({ ...editForm, rntNumber: v })} placeholder="RNT-XXXXX" />
                  </>
                )}
              </div>

              <div className="flex gap-3 p-5 border-t" style={{ borderColor: '#EBEBEB' }}>
                <button onClick={() => { setEditItem(null); setEditType(null); }} className="flex-1 py-3 rounded-lg text-sm font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>Cancelar</button>
                <button onClick={saveEdit} disabled={editSaving} className="flex-1 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#222' }}>
                  {editSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function EditField({ label, value, onChange, type, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className="input" rows={3} placeholder={placeholder} />
      ) : (
        <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} className="input" placeholder={placeholder} />
      )}
    </div>
  );
}

function Skeleton() { return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#F0F0F0' }}></div>)}</div>; }
function Btn({ label, bg, c, onClick, disabled }: { label: string; bg: string; c?: string; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="text-xs px-2.5 py-1 rounded-lg font-semibold disabled:opacity-50" style={{ background: bg, color: c || 'white' }}>{label}</button>;
}
