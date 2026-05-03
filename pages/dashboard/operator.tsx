import { useState, useEffect, useCallback } from 'react';
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

type FlashMsg = { kind: 'success' | 'error'; text: string } | null;

export default function OperatorDashboard() {
  const { authorized, loading: authLoading } = useRequireAuth(['operator']);
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'bookings' | 'tours'>('dashboard');
  const [msg, setMsg] = useState<FlashMsg>(null);
  // Track de qué booking está siendo procesado para deshabilitar botones y
  // evitar doble-click → doble-llamada que crea race conditions en Render.
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadBookings = useCallback(() => {
    api.get('/bookings/operator')
      .then((r) => setBookings(r.data || []))
      .catch((e) => console.error('Failed to load operator bookings:', e));
  }, []);

  const loadDashboard = useCallback(() => {
    api.get('/dashboard/operator')
      .then((r) => setData(r.data))
      .catch((e) => console.error('Failed to load operator dashboard:', e));
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadDashboard();
    loadBookings();
  }, [authorized, loadDashboard, loadBookings]);

  // Auto-clear del mensaje flash a los 4s para que no quede pegado
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const runBookingAction = async (id: number, action: 'confirm' | 'complete') => {
    if (processingId !== null) return; // Lock global mientras hay una en proceso
    setProcessingId(id);
    setMsg(null);
    try {
      await api.post(`/bookings/${id}/${action}`);
      setMsg({ kind: 'success', text: action === 'confirm' ? 'Reserva confirmada' : 'Reserva completada' });
      loadBookings();
      loadDashboard();
    } catch (e: any) {
      setMsg({ kind: 'error', text: e.response?.data?.message || 'Error al procesar la reserva' });
    }
    setProcessingId(null);
  };

  const confirmBooking = (id: number) => runBookingAction(id, 'confirm');
  const completeBooking = (id: number) => runBookingAction(id, 'complete');

  if (authLoading || !authorized) return null;

  const renderBookingRow = (b: any) => {
    const s = statusMap[b.status] || statusMap.pending;
    const tourName = b.tour?.name ?? 'Tour eliminado';
    const touristName = b.tourist?.user?.name ?? 'Cliente';
    const totalAmount = Number(b.totalAmount ?? 0);
    const isProcessing = processingId === b.id;
    return (
      <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{tourName}</div>
          <div className="text-xs truncate" style={{ color: '#717171' }}>
            {b.bookingCode ?? '—'} · {touristName} · {new Date(b.tourDate).toLocaleDateString('es-CO')}
            {typeof b.numAdults === 'number' && ` · ${b.numAdults} adulto(s)`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          <span className="font-bold text-sm" style={{ color: '#222' }}>${totalAmount.toLocaleString()}</span>
          {b.status === 'pending' && (
            <button
              onClick={() => confirmBooking(b.id)}
              disabled={processingId !== null}
              className="text-xs px-2 py-1 rounded font-semibold text-white disabled:opacity-50"
              style={{ background: '#2D6A4F' }}
            >
              {isProcessing ? '…' : 'Confirmar'}
            </button>
          )}
          {(b.status === 'confirmed' || b.status === 'in_progress') && (
            <button
              onClick={() => completeBooking(b.id)}
              disabled={processingId !== null}
              className="text-xs px-2 py-1 rounded font-semibold text-white disabled:opacity-50"
              style={{ background: '#0D5C8A' }}
            >
              {isProcessing ? '…' : 'Completar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Head><title>Panel Operador — La Perla</title></Head>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="font-bold text-xl" style={{ color: '#222' }}>Panel del Operador</h1>
          {msg && (
            <span
              className="text-xs px-3 py-1.5 rounded font-semibold"
              style={
                msg.kind === 'success'
                  ? { background: '#E8F5EF', color: '#2D6A4F' }
                  : { background: '#FFF0F0', color: '#CC3333' }
              }
            >
              {msg.kind === 'success' ? '✓ ' : '⚠️ '}{msg.text}
            </span>
          )}
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
        {tab === 'dashboard' && (
          data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Tours activos', value: data.tours?.active ?? 0 },
                  { label: 'Reservas hoy', value: data.bookings?.today ?? 0 },
                  { label: 'Reservas mes', value: data.bookings?.month ?? 0 },
                  { label: 'Ingresos', value: `$${Number(data.revenue?.total ?? 0).toLocaleString()}` },
                ].map((k, i) => (
                  <div key={i} className="p-4 rounded-xl text-center" style={{ background: '#F7F7F7' }}>
                    <div className="text-xl font-bold" style={{ color: '#222' }}>{k.value}</div>
                    <div className="text-xs" style={{ color: '#717171' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              <h3 className="font-bold mb-3" style={{ color: '#222' }}>Reservas recientes</h3>
              <div className="space-y-2">
                {bookings.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#717171' }}>Aún no hay reservas</p>
                ) : (
                  bookings.slice(0, 10).map(renderBookingRow)
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: '#F0F0F0' }}></div>)}
            </div>
          )
        )}

        {/* Bookings tab */}
        {tab === 'bookings' && (
          <div className="space-y-2">
            {bookings.map(renderBookingRow)}
            {bookings.length === 0 && <p className="text-center py-12 text-sm" style={{ color: '#717171' }}>Sin reservas</p>}
          </div>
        )}

        {/* Tours tab */}
        {tab === 'tours' && (
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/operator/tours/crear" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#F5882A' }}>
              + Crear tour
            </Link>
            <Link href="/dashboard/operator/tours" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#F7F7F7', color: '#222' }}>
              Ver todos mis tours
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
