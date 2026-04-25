import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useRequireAuth } from '../lib/auth';
import { getMyBookings, cancelBooking, createReview, Booking } from '../lib/api';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#E07020', bg: '#FEF3E8' },
  confirmed: { label: 'Confirmada', color: '#0D5C8A', bg: '#E8F4FA' },
  in_progress: { label: 'En curso', color: '#F5882A', bg: '#FEF3E8' },
  completed: { label: 'Completada', color: '#2D6A4F', bg: '#E8F5EF' },
  cancelled: { label: 'Cancelada', color: '#CC3333', bg: '#FFF0F0' },
  refunded: { label: 'Reembolsada', color: '#6B5329', bg: '#FAEBD1' },
};

export default function MisReservas() {
  const { authorized } = useRequireAuth(['tourist']);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [tourRating, setTourRating] = useState(5);
  const [jaladorRating, setJaladorRating] = useState(5);
  const [tourComment, setTourComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => { if (authorized) loadBookings(); }, [authorized]);

  const loadBookings = async () => {
    try { setBookings(await getMyBookings()); } catch { setError('No se pudieron cargar las reservas'); }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelId || !cancelReason.trim()) return;
    setCancelLoading(true);
    try { await cancelBooking(cancelId, cancelReason); setCancelId(null); setCancelReason(''); loadBookings(); }
    catch (err: any) { setError(err.response?.data?.message || 'Error al cancelar'); }
    setCancelLoading(false);
  };

  const handleReview = async () => {
    if (!reviewBooking) return;
    setReviewLoading(true); setReviewMsg('');
    try {
      await createReview({ bookingId: reviewBooking.id, tourRating, jaladorRating: reviewBooking.refCode ? jaladorRating : undefined, tourComment: tourComment || undefined });
      setReviewMsg('Resena enviada!'); setReviewBooking(null); setTourRating(5); setJaladorRating(5); setTourComment(''); loadBookings();
    } catch (err: any) { setReviewMsg(err.response?.data?.message || 'Error'); }
    setReviewLoading(false);
  };

  if (!authorized) return null;

  return (
    <Layout>
      <Head><title>Mis Reservas — La Perla</title></Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#0A1628' }}>Mis <span className="italic" style={{ color: '#F5882A' }}>Reservas</span></h1>
        <p className="font-sans text-sm mb-6" style={{ color: '#C9A05C' }}>Tus tours reservados</p>

        {error && <div className="px-4 py-3 rounded-2xl text-sm font-sans mb-4" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>}
        {reviewMsg && <div className="px-4 py-3 rounded-2xl text-sm font-sans mb-4" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>{reviewMsg}</div>}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-card" style={{ background: '#FAEBD1' }}></div>)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-card shadow-card">
            <div className="text-5xl mb-3">🏝️</div>
            <p className="font-display font-bold text-xl" style={{ color: '#0A1628' }}>No tienes reservas todavia</p>
            <p className="font-sans text-sm mt-1 mb-6" style={{ color: '#C9A05C' }}>Explora tours y reserva tu primera aventura</p>
            <Link href="/explorar" className="btn-primary inline-block">Explorar tours</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const s = statusLabels[b.status] || statusLabels.pending;
              const canCancel = ['pending', 'confirmed'].includes(b.status);
              const canReview = b.status === 'completed' && !b.review;
              return (
                <div key={b.id} className="bg-white rounded-card p-5 shadow-card">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/tour/${b.tour.slug}`} className="font-display font-bold hover:underline" style={{ color: '#0A1628' }}>{b.tour.name}</Link>
                        <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div className="text-sm font-sans space-y-1" style={{ color: '#6B5329' }}>
                        <div>📅 {new Date(b.tourDate).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div>⏰ {b.tour.departureTime} · 📍 {b.tour.departurePoint}</div>
                        <div>👥 {b.numAdults} adulto(s){b.numChildren > 0 ? `, ${b.numChildren} nino(s)` : ''}</div>
                        <div className="text-xs" style={{ color: '#C9A05C' }}>Código: <span className="font-mono font-bold">{b.bookingCode}</span></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-xl font-bold font-sans" style={{ color: '#0D5C8A' }}>${Number(b.totalAmount).toLocaleString()}</div>
                      <div className="flex gap-2 justify-end">
                        {canReview && <button onClick={() => setReviewBooking(b)} className="text-sm px-4 py-2 rounded-pill font-sans font-semibold transition-all hover:-translate-y-0.5" style={{ background: '#FEF3E8', color: '#F5882A' }}>⭐ Dejar reseña</button>}
                        {canCancel && <button onClick={() => setCancelId(b.id)} className="text-sm px-4 py-2 rounded-pill font-sans font-semibold transition-all hover:-translate-y-0.5" style={{ background: '#FFF0F0', color: '#CC3333' }}>Cancelar</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-card p-6 w-full max-w-md shadow-glass">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: '#0A1628' }}>Cancelar reserva</h2>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input mb-4" rows={3} placeholder="Por que deseas cancelar?" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCancelId(null); setCancelReason(''); }} className="px-4 py-2 rounded-pill font-sans font-medium" style={{ color: '#6B5329' }}>Volver</button>
              <button onClick={handleCancel} disabled={cancelLoading || !cancelReason.trim()} className="px-4 py-2 rounded-pill font-sans font-semibold text-white disabled:opacity-50" style={{ background: '#CC3333' }}>
                {cancelLoading ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-card p-6 w-full max-w-md shadow-glass">
            <h2 className="font-display font-bold text-lg mb-1" style={{ color: '#0A1628' }}>Dejar reseña</h2>
            <p className="text-sm font-sans mb-4" style={{ color: '#C9A05C' }}>{reviewBooking.tour.name}</p>
            <div className="mb-4">
              <label className="block text-sm font-sans font-medium mb-2" style={{ color: '#6B5329' }}>Calificacion del tour</label>
              <div className="flex gap-1">{[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setTourRating(s)} className="text-3xl transition-all hover:scale-110" style={{ color: s <= tourRating ? '#F5882A' : '#FAEBD1' }}>★</button>
              ))}</div>
            </div>
            {reviewBooking.refCode && (
              <div className="mb-4">
                <label className="block text-sm font-sans font-medium mb-2" style={{ color: '#6B5329' }}>Calificacion del asesor</label>
                <div className="flex gap-1">{[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setJaladorRating(s)} className="text-3xl transition-all hover:scale-110" style={{ color: s <= jaladorRating ? '#F5882A' : '#FAEBD1' }}>★</button>
                ))}</div>
              </div>
            )}
            <textarea value={tourComment} onChange={(e) => setTourComment(e.target.value)} className="input mb-4" rows={3} placeholder="Cuenta tu experiencia..." />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setReviewBooking(null)} className="px-4 py-2 rounded-pill font-sans font-medium" style={{ color: '#6B5329' }}>Cancelar</button>
              <button onClick={handleReview} disabled={reviewLoading} className="btn-primary disabled:opacity-50">
                {reviewLoading ? 'Enviando...' : 'Enviar reseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
