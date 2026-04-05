import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useRequireAuth } from '../lib/auth';
import { getMyBookings, cancelBooking, createReview, Booking } from '../lib/api';

const statusLabels: Record<string, { label: string; style: string; emoji: string }> = {
  pending: { label: 'Pendiente', style: 'bg-gray-100 text-gray-600', emoji: '⏳' },
  confirmed: { label: 'Confirmada', style: 'bg-primary-100 text-primary-700', emoji: '✅' },
  in_progress: { label: 'En curso', style: 'bg-amber-100 text-amber-600', emoji: '🚀' },
  completed: { label: 'Completada', style: 'bg-green-100 text-green-700', emoji: '🎉' },
  cancelled: { label: 'Cancelada', style: 'bg-red-100 text-red-600', emoji: '❌' },
  refunded: { label: 'Reembolsada', style: 'bg-purple-100 text-purple-700', emoji: '💸' },
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

  useEffect(() => {
    if (!authorized) return;
    loadBookings();
  }, [authorized]);

  const loadBookings = async () => {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch {
      setError('No se pudieron cargar las reservas');
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelId || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await cancelBooking(cancelId, cancelReason);
      setCancelId(null);
      setCancelReason('');
      loadBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cancelar');
    }
    setCancelLoading(false);
  };

  const handleReview = async () => {
    if (!reviewBooking) return;
    setReviewLoading(true);
    setReviewMsg('');
    try {
      await createReview({
        bookingId: reviewBooking.id,
        tourRating,
        jaladorRating: reviewBooking.refCode ? jaladorRating : undefined,
        tourComment: tourComment || undefined,
      });
      setReviewMsg('Resena enviada correctamente');
      setReviewBooking(null);
      setTourRating(5);
      setJaladorRating(5);
      setTourComment('');
      loadBookings();
    } catch (err: any) {
      setReviewMsg(err.response?.data?.message || 'Error al enviar resena');
    }
    setReviewLoading(false);
  };

  if (!authorized) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-secondary-700 mb-6">Mis Reservas</h1>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}
        {reviewMsg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 border border-green-100">✅ {reviewMsg}</div>}

        {loading ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Cargando...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-3">🏝️</div>
            <p className="text-gray-600 text-lg mb-3">No tienes reservas todavia</p>
            <Link href="/tours" className="btn-primary inline-block">Explorar tours</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const s = statusLabels[b.status] || statusLabels.pending;
              const canCancel = ['pending', 'confirmed'].includes(b.status);
              const canReview = b.status === 'completed' && !b.review;

              return (
                <div key={b.id} className="card p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/tour/${b.tour.slug}`} className="font-bold text-gray-900 hover:text-primary-600 transition-colors">
                          {b.tour.name}
                        </Link>
                        <span className={`badge ${s.style}`}>{s.emoji} {s.label}</span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>{new Date(b.tourDate).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div>Salida: {b.tour.departureTime} desde {b.tour.departurePoint}</div>
                        <div>{b.numAdults} adulto(s){b.numChildren > 0 ? `, ${b.numChildren} nino(s)` : ''}</div>
                        <div className="text-xs text-gray-400">
                          {b.tour.operator.companyName} &middot; Codigo: <span className="font-mono bg-gray-50 px-1 rounded">{b.bookingCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-xl font-bold text-primary-600">${Number(b.totalAmount).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        QR: <span className="font-mono bg-gray-50 px-1 rounded">{b.qrCode}</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {canReview && (
                          <button onClick={() => setReviewBooking(b)} className="text-sm btn-sand px-3 py-1.5">
                            ⭐ Dejar resena
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={() => setCancelId(b.id)} className="text-sm border-2 border-red-200 text-red-600 font-medium px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors">
                            Cancelar
                          </button>
                        )}
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
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cancelar reserva</h2>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Razon de cancelacion</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input mb-4"
              rows={3}
              placeholder="Por que deseas cancelar?"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCancelId(null); setCancelReason(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium">
                Volver
              </button>
              <button onClick={handleCancel} disabled={cancelLoading || !cancelReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors font-medium">
                {cancelLoading ? 'Cancelando...' : 'Confirmar cancelacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-secondary-700 mb-1">⭐ Dejar resena</h2>
            <p className="text-sm text-gray-400 mb-4">{reviewBooking.tour.name}</p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Calificacion del tour</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setTourRating(star)}
                    className={`text-3xl transition-all duration-200 hover:scale-110 ${star <= tourRating ? 'text-amber-400' : 'text-gray-200'}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>

            {reviewBooking.refCode && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Calificacion del jalador</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setJaladorRating(star)}
                      className={`text-3xl transition-all duration-200 hover:scale-110 ${star <= jaladorRating ? 'text-amber-400' : 'text-gray-200'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comentario (opcional)</label>
              <textarea value={tourComment} onChange={(e) => setTourComment(e.target.value)} className="input" rows={3} placeholder="Cuenta tu experiencia..." />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setReviewBooking(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium">
                Cancelar
              </button>
              <button onClick={handleReview} disabled={reviewLoading}
                className="btn-primary disabled:opacity-50">
                {reviewLoading ? 'Enviando...' : 'Enviar resena'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
