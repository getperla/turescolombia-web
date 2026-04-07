import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import { useRequireAuth } from '../../lib/auth';

const statusMap: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendiente', bg: '#FEF3E8', color: '#F5882A' },
  confirmed: { label: 'Confirmada', bg: '#E8F4FA', color: '#0D5C8A' },
  in_progress: { label: 'En curso', bg: '#FEF3E8', color: '#E07020' },
  completed: { label: 'Completada', bg: '#E8F5EF', color: '#2D6A4F' },
  cancelled: { label: 'Cancelada', bg: '#FFF0F0', color: '#CC3333' },
};

export default function OperatorDashboard() {
  const { authorized } = useRequireAuth(['operator']);
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'bookings' | 'tours'>('dashboard');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!authorized) return;
    api.get('/dashboard/operator').then(r => setData(r.data)).catch(() => {});
    api.get('/bookings/operator').then(r => setBookings(r.data || [])).catch(() => {});
  }, [authorized]);

  const confirmBooking = async (id: number) => {
    try { await api.post(`/bookings/${id}/confirm`); setMsg('Confirmada'); api.get('/bookings/operator').then(r => setBookings(r.data || [])); } catch (e: any) { setMsg(e.response?.data?.message || 'Error'); }
  };

  const completeBooking = async (id: number) => {
    try { await api.post(`/bookings/${id}/complete`); setMsg('Completada'); api.get('/bookings/operator').then(r => setBookings(r.data || [])); } catch (e: any) { setMsg(e.response?.data?.message || 'Error'); }
  };

  if (!authorized) return null;

  return (
    <Layout>
      <Head><title>Panel Operador — La Perla</title></Head>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel del Operador</h1>
          {msg && <span className="text-xs px-2 py-1 rounded" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>{msg}</span>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
          {[
            { key: 'dashboard', label: 'Resumen' },
            { key: 'bookings', label: 'Reservas' },
            { key: 'tours', label: 'Mis Tours' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="px-4 py-3 text-sm font-semibold transition-all"
              style={{ borderBottom: tab === t.key ? '2px solid #222' : '2px solid transparent', color: tab === t.key ? '#222' : '#717171' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === 'dashboard' && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Tours activos', value: data.tours?.active || 0 },
                { label: 'Reservas hoy', value: data.bookings?.today || 0 },
                { label: 'Reservas mes', value: data.bookings?.month || 0 },
                { label: 'Ingresos', value: `$${Number(data.revenue?.total || 0).toLocaleString()}` },
              ].map((k, i) => (
                <div key={i} className="p-4 rounded-xl text-center" style={{ background: '#F7F7F7' }}>
                  <div className="text-xl font-bold" style={{ color: '#222' }}>{k.value}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Today's bookings */}
            <h3 className="font-bold mb-3" style={{ color: '#222' }}>Reservas recientes</h3>
            <div className="space-y-2">
              {bookings.slice(0, 10).map(b => {
                const s = statusMap[b.status] || statusMap.pending;
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: '#222' }}>{b.tour?.name}</div>
                      <div className="text-xs" style={{ color: '#717171' }}>{b.bookingCode} · {b.tourist?.user?.name} · {new Date(b.tourDate).toLocaleDateString('es-CO')}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      <span className="font-bold text-sm" style={{ color: '#222' }}>${Number(b.totalAmount).toLocaleString()}</span>
                      {b.status === 'pending' && <button onClick={() => confirmBooking(b.id)} className="text-xs px-2 py-1 rounded font-semibold text-white" style={{ background: '#2D6A4F' }}>Confirmar</button>}
                      {(b.status === 'confirmed' || b.status === 'in_progress') && <button onClick={() => completeBooking(b.id)} className="text-xs px-2 py-1 rounded font-semibold text-white" style={{ background: '#0D5C8A' }}>Completar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bookings tab */}
        {tab === 'bookings' && (
          <div className="space-y-2">
            {bookings.map(b => {
              const s = statusMap[b.status] || statusMap.pending;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: '#222' }}>{b.tour?.name}</div>
                    <div className="text-xs" style={{ color: '#717171' }}>{b.bookingCode} · {b.tourist?.user?.name} · {new Date(b.tourDate).toLocaleDateString('es-CO')} · {b.numAdults} adulto(s)</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <span className="font-bold text-sm" style={{ color: '#222' }}>${Number(b.totalAmount).toLocaleString()}</span>
                    {b.status === 'pending' && <button onClick={() => confirmBooking(b.id)} className="text-xs px-2 py-1 rounded font-semibold text-white" style={{ background: '#2D6A4F' }}>Confirmar</button>}
                    {(b.status === 'confirmed' || b.status === 'in_progress') && <button onClick={() => completeBooking(b.id)} className="text-xs px-2 py-1 rounded font-semibold text-white" style={{ background: '#0D5C8A' }}>Completar</button>}
                  </div>
                </div>
              );
            })}
            {bookings.length === 0 && <p className="text-center py-12 text-sm" style={{ color: '#717171' }}>Sin reservas</p>}
          </div>
        )}

        {/* Tours tab */}
        {tab === 'tours' && (
          <div>
            <Link href="/dashboard/operator/tours/crear" className="inline-block mb-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#F5882A' }}>
              + Crear tour
            </Link>
            <Link href="/dashboard/operator/tours" className="inline-block mb-4 ml-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>
              Ver todos mis tours
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
