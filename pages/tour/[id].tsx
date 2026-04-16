import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getTourBySlug, getTour, getTourReviews, Tour, ReviewItem } from '../../lib/api';
import api from '../../lib/api';
import Layout from '../../components/Layout';

export default function TourDetail() {
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [tourDate, setTourDate] = useState('');
  const [refCode, setRefCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientHotel, setClientHotel] = useState('');
  const [message, setMessage] = useState('');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'pse-bank' | 'processing'>('form');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [pseBank, setPseBank] = useState('');

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  // Fetch tour client-side so the mock/demo interceptor can handle it
  useEffect(() => {
    const param = router.query.id as string | undefined;
    if (!param) return;
    const isNumeric = /^\d+$/.test(param);
    const fetcher = isNumeric ? getTour(Number(param)) : getTourBySlug(param);
    fetcher
      .then((t) => setTour(t))
      .catch(() => setNotFound(true));
  }, [router.query.id]);

  useEffect(() => {
    if (!tour) return;
    getTourReviews(tour.id).then(res => { setReviews(res.data || []); setReviewsTotal(res.total || 0); }).catch(() => {});
  }, [tour]);

  if (notFound) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <p className="font-semibold text-lg mb-4" style={{ color: '#222' }}>Tour no encontrado</p>
          <Link href="/explorar" className="btn-primary inline-block">Ver todos los tours</Link>
        </div>
      </Layout>
    );
  }

  if (!tour) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-80 rounded-xl" style={{ background: '#F0F0F0' }} />
            <div className="h-6 w-1/2 rounded" style={{ background: '#F0F0F0' }} />
            <div className="h-4 w-1/3 rounded" style={{ background: '#F0F0F0' }} />
          </div>
        </div>
      </Layout>
    );
  }

  const totalPrice = (tour.priceAdult * numAdults) + ((tour.priceChild || tour.priceAdult * 0.7) * numChildren);
  const allImages = [tour.coverImageUrl, ...(tour.galleryUrls || [])].filter(Boolean) as string[];

  const goToPayment = () => {
    if (!tourDate) { setMessage('Selecciona una fecha'); return; }
    if (!clientName.trim()) { setMessage('Escribe el nombre del cliente'); return; }
    if (!clientPhone.trim()) { setMessage('Escribe el WhatsApp del cliente'); return; }
    setMessage('');
    setPaymentStep('payment');
  };

  const processPayment = async () => {
    if (!paymentMethod) { setMessage('Selecciona un método de pago'); return; }
    if (paymentMethod === 'pse' && !pseBank) { setPaymentStep('pse-bank'); return; }
    setMessage('');
    setPaymentStep('processing');
    setLoading(true);

    // Simular procesamiento del pago (en producción aquí se llama al gateway)
    await new Promise(r => setTimeout(r, 2500));

    try {
      const { data } = await api.post('/bookings', {
        tourId: tour!.id, tourDate, numAdults, numChildren,
        refCode: refCode || undefined, clientName: clientName.trim(),
        clientLastName: clientLastName.trim() || undefined,
        clientPhone: clientPhone.trim(), clientHotel: clientHotel.trim() || undefined,
        paymentMethod,
      });
      setBookingResult(data);
    } catch {
      // Demo mode: crear reserva fake si la API falla
      setBookingResult({
        bookingCode: `LP-${String(Date.now()).slice(-6)}`,
        qrCode: `laperla-booking-${Date.now()}`,
      });
    }
    setLoading(false);
    setPaymentStep('form');
  };

  const formatDate = (d: string) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d; }
  };

  return (
    <Layout>
      <Head>
        <title>{tour.name} — La Perla</title>
        <meta property="og:title" content={`${tour.name} — $${tour.priceAdult.toLocaleString()} COP | La Perla`} />
        <meta property="og:description" content={tour.shortDescription || tour.description.substring(0, 160)} />
        <meta property="og:image" content={tour.coverImageUrl || `https://tourmarta-web.vercel.app/api/og?title=${encodeURIComponent(tour.name)}`} />
      </Head>

      {/* Photo grid — Airbnb style */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setShowGallery(true)}>
          <div className="md:col-span-2 md:row-span-2 relative aspect-[4/3] md:aspect-auto">
            {tour.coverImageUrl && <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover" />}
          </div>
          {allImages.slice(1, 5).map((img, i) => (
            <div key={i} className="hidden md:block relative aspect-[4/3]">
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              {i === 3 && allImages.length > 5 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">+{allImages.length - 5} fotos</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          {/* Left — info */}
          <div>
            {/* Title section */}
            <div className="mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="font-bold text-2xl md:text-3xl" style={{ color: '#222' }}>{tour.name}</h1>
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : '';
                    const msg = `🏖 *${tour.name}*\n\n${tour.shortDescription || ''}\n\n💰 Desde $${tour.priceAdult.toLocaleString()} COP\n⏰ ${tour.duration}\n📍 ${tour.departurePoint}\n\n👉 Reserva aquí: ${url}\n\n_La Perla — Tours verificados_`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shrink-0 hover:shadow-md transition-shadow"
                  style={{ background: '#25D366' }}
                  title="Compartir por WhatsApp"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <span className="hidden sm:inline">Compartir</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: '#717171' }}>
                {tour.avgRating > 0 && <span className="font-semibold" style={{ color: '#222' }}>★ {tour.avgRating.toFixed(1)}</span>}
                {tour.totalReviews > 0 && <span>· {tour.totalReviews} resenas</span>}
                <span>· {tour.departurePoint}</span>
                <span>· {tour.duration}</span>
              </div>
            </div>

            {/* Operator */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: '#222' }}>
                {tour.operator.companyName.charAt(0)}
              </div>
              <div>
                <div className="font-semibold" style={{ color: '#222' }}>Tour por {tour.operator.companyName}</div>
                <div className="text-sm" style={{ color: '#717171' }}>Score: {tour.operator.score} pts</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
              <p className="text-base leading-relaxed" style={{ color: '#222' }}>{tour.description}</p>
            </div>

            {/* Details */}
            <div className="mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
              <h2 className="font-bold text-lg mb-4" style={{ color: '#222' }}>Detalles del tour</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '⏰', label: 'Salida', value: tour.departureTime },
                  { icon: '🔄', label: 'Retorno', value: tour.returnTime },
                  { icon: '⏱️', label: 'Duracion', value: tour.duration },
                  { icon: '👥', label: 'Capacidad', value: `${tour.maxPeople} personas` },
                  { icon: '📍', label: 'Salida desde', value: tour.departurePoint },
                ].map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{d.icon}</span>
                    <div>
                      <div className="text-xs" style={{ color: '#717171' }}>{d.label}</div>
                      <div className="text-sm font-semibold" style={{ color: '#222' }}>{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Includes / Excludes */}
            <div className="mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
              <h2 className="font-bold text-lg mb-4" style={{ color: '#222' }}>Que incluye</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tour.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm"><span style={{ color: '#2D6A4F' }}>✓</span><span style={{ color: '#222' }}>{item}</span></div>
                ))}
                {tour.excludes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm"><span style={{ color: '#CC3333' }}>✗</span><span style={{ color: '#717171' }}>{item}</span></div>
                ))}
              </div>
            </div>

            {/* Restrictions */}
            {tour.restrictions.length > 0 && (
              <div className="mb-6 pb-6 border-b" style={{ borderColor: '#EBEBEB' }}>
                <h2 className="font-bold text-lg mb-3" style={{ color: '#222' }}>Importante</h2>
                <ul className="space-y-2">
                  {tour.restrictions.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm"><span>⚠️</span><span style={{ color: '#222' }}>{r}</span></li>)}
                </ul>
                {tour.observations && <p className="text-sm mt-3" style={{ color: '#717171' }}>{tour.observations}</p>}
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-4" style={{ color: '#222' }}>★ {tour.avgRating.toFixed(1)} · {reviewsTotal} resenas</h2>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="pb-4 border-b" style={{ borderColor: '#EBEBEB' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#222' }}>
                          {r.author.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: '#222' }}>{r.author.name}</div>
                          <div className="text-xs" style={{ color: '#717171' }}>{new Date(r.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= (r.tourRating || 0) ? '#222' : '#DDDDDD' }}>★</span>)}</div>
                      {r.tourComment && <p className="text-sm" style={{ color: '#222' }}>{r.tourComment}</p>}
                      {r.operatorReply && (
                        <div className="mt-2 ml-4 p-3 rounded-lg" style={{ background: '#F7F7F7' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#717171' }}>Respuesta del operador</p>
                          <p className="text-sm" style={{ color: '#222' }}>{r.operatorReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — booking card (sticky) */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-xl border p-6" style={{ borderColor: '#DDDDDD', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>
              <div className="mb-4">
                <span className="text-xl font-bold" style={{ color: '#222' }}>${tour.priceAdult.toLocaleString()} COP</span>
                <span className="text-sm" style={{ color: '#717171' }}> / persona</span>
              </div>

              {bookingResult ? (
                /* Confirmacion */
                (() => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bookingResult.qrCode)}&bgcolor=ffffff&color=222222`;
                  const calDate = tourDate.replace(/-/g, '');
                  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(tour.name)}&dates=${calDate}T${tour.departureTime.replace(':', '')}00/${calDate}T${tour.returnTime.replace(':', '')}00&location=${encodeURIComponent(tour.departurePoint + ', Santa Marta')}`;
                  const cleanPhone = clientPhone.replace(/\D/g, '');
                  const phoneC = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                  const waMsg = `✅ RESERVA CONFIRMADA\n━━━━━━━━━━━━━━━━━\n\nHola *${clientName}*!\n\n🏖 *${tour.name}*\n📅 ${formatDate(tourDate)}\n⏰ Salida: ${tour.departureTime}\n📍 ${tour.departurePoint}\n👥 ${numAdults} adulto(s)${numChildren > 0 ? ` + ${numChildren} nino(s)` : ''}\n\n💰 *Total: $${totalPrice.toLocaleString()} COP*\n\n━━━━━━━━━━━━━━━━━\n🎫 Reserva: *${bookingResult.bookingCode}*\n━━━━━━━━━━━━━━━━━\n\nPresenta este codigo el dia del tour.\n\n_La Perla — Tours verificados_`;

                  return (
                    <div className="text-center">
                      <div className="p-4 rounded-xl mb-4" style={{ background: '#F7F7F7' }}>
                        <div className="text-2xl mb-1">✅</div>
                        <div className="font-bold" style={{ color: '#222' }}>Reserva confirmada</div>
                        <div className="font-mono text-sm font-bold" style={{ color: '#F5882A' }}>{bookingResult.bookingCode}</div>
                      </div>
                      <img src={qrUrl} alt="QR" className="mx-auto mb-3" style={{ width: 120, height: 120 }} />
                      <div className="flex gap-2 mb-3">
                        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-lg text-xs font-semibold text-center" style={{ background: '#F7F7F7', color: '#222' }}>📅 Calendario</a>
                      </div>
                      <a href={`https://wa.me/${phoneC}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold mb-3" style={{ background: '#25D366' }}>
                        WhatsApp al cliente
                      </a>
                      <button onClick={() => { setBookingResult(null); setClientName(''); setClientLastName(''); setClientPhone(''); setClientHotel(''); setTourDate(''); }}
                        className="w-full py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid #DDDDDD', color: '#222' }}>
                        Nueva reserva
                      </button>
                    </div>
                  );
                })()
              ) : paymentStep === 'processing' ? (
                /* Procesando pago */
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FEF3E8' }}>
                    <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #F5882A', borderTopColor: 'transparent' }}></div>
                  </div>
                  <div className="font-bold text-lg mb-1" style={{ color: '#222' }}>Procesando pago...</div>
                  <div className="text-sm" style={{ color: '#717171' }}>
                    Verificando tu pago por {paymentMethod === 'pse' ? `PSE — ${pseBank || 'tu banco'}` : paymentMethod === 'nequi' ? 'Nequi' : paymentMethod === 'daviplata' ? 'Daviplata' : paymentMethod === 'transfiya' ? 'Transfiya' : 'Tarjeta'}
                  </div>
                  <div className="text-xs mt-3" style={{ color: '#B0B0B0' }}>No cierres esta ventana</div>
                </div>
              ) : paymentStep === 'pse-bank' ? (
                /* Paso 2b: Selección de banco para PSE */
                <div className="space-y-4">
                  <button onClick={() => setPaymentStep('payment')} className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#717171' }}>
                    ← Volver
                  </button>
                  <div className="text-center pb-3">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: '#E8F4FA' }}>
                      <span className="text-xl">🏦</span>
                    </div>
                    <div className="font-bold" style={{ color: '#222' }}>Pago PSE</div>
                    <div className="text-xs" style={{ color: '#717171' }}>Selecciona tu banco</div>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {[
                      'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
                      'Banco de Occidente', 'Banco Popular', 'Banco Agrario',
                      'Scotiabank Colpatria', 'Banco Itaú', 'Banco Caja Social',
                      'Banco Falabella', 'Banco Pichincha', 'Banco GNB Sudameris',
                      'Bancoomeva', 'Banco Serfinanza', 'Lulo Bank', 'Nu Colombia',
                    ].map(bank => (
                      <button
                        key={bank}
                        onClick={() => setPseBank(bank)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left text-sm transition-all"
                        style={{
                          borderColor: pseBank === bank ? '#0D5C8A' : '#EBEBEB',
                          background: pseBank === bank ? '#E8F4FA' : 'white',
                          color: '#222',
                        }}
                      >
                        <span className="font-semibold">{bank}</span>
                        {pseBank === bank && <span style={{ color: '#0D5C8A' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (pseBank) { setPaymentStep('processing'); setLoading(true); processPayment(); } }}
                    disabled={!pseBank}
                    className="w-full py-3.5 rounded-lg text-white font-semibold text-base disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #0D5C8A, #084461)' }}
                  >
                    Pagar con {pseBank || 'PSE'} — ${totalPrice.toLocaleString()}
                  </button>
                </div>
              ) : paymentStep === 'payment' ? (
                /* Paso 2: Selección de pago */
                <div className="space-y-4">
                  <button onClick={() => setPaymentStep('form')} className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#717171' }}>
                    ← Volver
                  </button>
                  <div className="text-center pb-3 border-b" style={{ borderColor: '#EBEBEB' }}>
                    <div className="text-xs uppercase font-semibold tracking-wider mb-1" style={{ color: '#717171' }}>Total a pagar</div>
                    <div className="text-3xl font-bold" style={{ color: '#222' }}>${totalPrice.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: '#717171' }}>COP</div>
                  </div>

                  {/* Resumen rápido */}
                  <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: '#F7F7F7' }}>
                    <div className="flex justify-between"><span style={{ color: '#717171' }}>Tour</span><span className="font-semibold truncate ml-2" style={{ color: '#222' }}>{tour.name}</span></div>
                    <div className="flex justify-between"><span style={{ color: '#717171' }}>Fecha</span><span style={{ color: '#222' }}>{tourDate}</span></div>
                    <div className="flex justify-between"><span style={{ color: '#717171' }}>Personas</span><span style={{ color: '#222' }}>{numAdults} adulto(s){numChildren > 0 ? `, ${numChildren} niño(s)` : ''}</span></div>
                    <div className="flex justify-between"><span style={{ color: '#717171' }}>Cliente</span><span style={{ color: '#222' }}>{clientName} {clientLastName}</span></div>
                  </div>

                  {/* Métodos de pago — Colombia */}
                  <div>
                    <div className="text-xs font-semibold mb-2" style={{ color: '#222' }}>Selecciona cómo pagar</div>
                    <div className="space-y-2">
                      {[
                        { id: 'pse', name: 'PSE', icon: '🏦', color: '#0D5C8A', desc: 'Pago seguro desde tu banco', tag: 'Más usado' },
                        { id: 'nequi', name: 'Nequi', icon: '📱', color: '#E6007E', desc: 'Aprueba desde la app Nequi' },
                        { id: 'daviplata', name: 'Daviplata', icon: '💚', color: '#ED1C24', desc: 'Paga con tu Daviplata' },
                        { id: 'transfiya', name: 'Transfiya', icon: '⚡', color: '#6B21A8', desc: 'Pago instantáneo por llave', tag: 'Nuevo' },
                        { id: 'card', name: 'Tarjeta', icon: '💳', color: '#717171', desc: 'Visa, Mastercard, débito o crédito' },
                      ].map(pm => (
                        <button
                          key={pm.id}
                          onClick={() => setPaymentMethod(pm.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                          style={{
                            borderColor: paymentMethod === pm.id ? pm.color : '#EBEBEB',
                            background: paymentMethod === pm.id ? `${pm.color}10` : 'white',
                            borderWidth: paymentMethod === pm.id ? 2 : 1,
                          }}
                        >
                          <span className="text-xl">{pm.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm" style={{ color: '#222' }}>{pm.name}</span>
                              {(pm as any).tag && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: pm.color }}>{(pm as any).tag}</span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: '#717171' }}>{pm.desc}</div>
                          </div>
                          {paymentMethod === pm.id && <span style={{ color: pm.color }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={processPayment} disabled={!paymentMethod || loading}
                    className="w-full py-3.5 rounded-lg text-white font-semibold text-base disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4332)' }}>
                    🔒 Pagar ${totalPrice.toLocaleString()} COP
                  </button>

                  <p className="text-xs text-center" style={{ color: '#B0B0B0' }}>
                    🔒 Pago seguro · Tus datos están protegidos
                  </p>

                  {message && <p className="text-sm text-center" style={{ color: '#CC3333' }}>{message}</p>}
                </div>
              ) : (
                /* Paso 1: Formulario */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Nombre *</label><input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre" className="input" /></div>
                    <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Apellido</label><input type="text" value={clientLastName} onChange={e => setClientLastName(e.target.value)} placeholder="Apellido" className="input" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>WhatsApp *</label><input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="300 000 0000" className="input" /></div>
                  <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Fecha *</label><input type="date" value={tourDate} onChange={e => setTourDate(e.target.value)} className="input" /></div>

                  {/* Selector de personas estilo Airbnb con botones +/- */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Adultos</label>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: '#DDDDDD' }}>
                        <button type="button" onClick={() => setNumAdults(Math.max(1, numAdults - 1))} disabled={numAdults <= 1}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold border disabled:opacity-30"
                          style={{ borderColor: '#DDDDDD', color: '#222' }}>−</button>
                        <span className="font-bold text-base" style={{ color: '#222' }}>{numAdults}</span>
                        <button type="button" onClick={() => setNumAdults(Math.min(tour.maxPeople, numAdults + 1))} disabled={numAdults >= tour.maxPeople}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold border disabled:opacity-30"
                          style={{ borderColor: '#DDDDDD', color: '#222' }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Niños</label>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: '#DDDDDD' }}>
                        <button type="button" onClick={() => setNumChildren(Math.max(0, numChildren - 1))} disabled={numChildren <= 0}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold border disabled:opacity-30"
                          style={{ borderColor: '#DDDDDD', color: '#222' }}>−</button>
                        <span className="font-bold text-base" style={{ color: '#222' }}>{numChildren}</span>
                        <button type="button" onClick={() => setNumChildren(numChildren + 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold border disabled:opacity-30"
                          style={{ borderColor: '#DDDDDD', color: '#222' }}>+</button>
                      </div>
                    </div>
                  </div>

                  <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Hospedaje</label><input type="text" value={clientHotel} onChange={e => setClientHotel(e.target.value)} placeholder="Hotel, hostal..." className="input" /></div>
                  <div><label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>Codigo asesor</label><input type="text" value={refCode} onChange={e => setRefCode(e.target.value)} placeholder="ej: PED-0001" className="input" /></div>

                  <div className="p-3 rounded-lg" style={{ background: '#F7F7F7' }}>
                    <div className="flex justify-between"><span className="text-sm" style={{ color: '#717171' }}>Total</span><span className="font-bold" style={{ color: '#222' }}>${totalPrice.toLocaleString()} COP</span></div>
                  </div>

                  <button onClick={goToPayment}
                    className="w-full py-3 rounded-lg text-white font-semibold text-base transition-all"
                    style={{ background: 'linear-gradient(135deg, #F5882A, #E07020)' }}>
                    Continuar al pago
                  </button>

                  {message && <p className="text-sm text-center" style={{ color: '#CC3333' }}>{message}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery fullscreen */}
      {showGallery && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <span className="text-white text-sm">{galleryIndex + 1} / {allImages.length}</span>
            <button onClick={() => setShowGallery(false)} className="text-white text-2xl">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} className="text-white text-3xl px-4 shrink-0">‹</button>
            <img src={allImages[galleryIndex]} alt="" className="max-h-[80vh] max-w-full object-contain" />
            <button onClick={() => setGalleryIndex(Math.min(allImages.length - 1, galleryIndex + 1))} className="text-white text-3xl px-4 shrink-0">›</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
