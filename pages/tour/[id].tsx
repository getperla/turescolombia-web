import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getTourBySlug, getTour, getTourReviews, Tour, ReviewItem } from '../../lib/api';
import api from '../../lib/api';
import Layout from '../../components/Layout';

type Props = { tour: Tour };

export default function TourDetail({ tour }: Props) {
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

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  useEffect(() => {
    getTourReviews(tour.id).then(res => {
      setReviews(res.data || []);
      setReviewsTotal(res.total || 0);
    }).catch(() => {});
  }, [tour.id]);

  const totalPrice = (tour.priceAdult * numAdults) + ((tour.priceChild || tour.priceAdult * 0.7) * numChildren);

  const handleBooking = async () => {
    if (!tourDate) { setMessage('Selecciona una fecha'); return; }
    if (!clientName.trim()) { setMessage('Escribe el nombre del cliente'); return; }
    if (!clientPhone.trim()) { setMessage('Escribe el WhatsApp del cliente'); return; }

    setLoading(true);
    setMessage('');
    setBookingResult(null);
    try {
      const { data } = await api.post('/bookings', {
        tourId: tour.id,
        tourDate,
        numAdults,
        numChildren,
        refCode: refCode || undefined,
        clientName: clientName.trim(),
        clientLastName: clientLastName.trim() || undefined,
        clientPhone: clientPhone.trim(),
        clientHotel: clientHotel.trim() || undefined,
      });
      setBookingResult(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al crear la reserva. Inicia sesion primero.');
    }
    setLoading(false);
  };

  return (
    <Layout>
      {/* Hero Image */}
      <div className="relative h-80 md:h-[450px] flex items-center justify-center text-white overflow-hidden">
        {tour.coverImageUrl ? (
          <img src={tour.coverImageUrl} alt={tour.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
        <div className="relative text-center px-4">
          {tour.category && (
            <span className="inline-block mb-3 px-4 py-1.5 text-sm font-sans font-semibold text-white rounded-pill" style={{ background: '#F5882A' }}>
              {tour.category.name}
            </span>
          )}
          <h1 className="font-display font-bold mb-2 drop-shadow-lg" style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}>{tour.name}</h1>
          <div className="flex items-center justify-center gap-4 text-white/70 text-sm font-sans">
            <span>📍 {tour.departurePoint}</span>
            <span>🕐 {tour.duration}</span>
            {tour.avgRating > 0 && <span>⭐ {tour.avgRating.toFixed(1)}</span>}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#FDF3E3"/></svg>
        </div>
      </div>

      {/* Galeria de fotos */}
      {tour.galleryUrls && tour.galleryUrls.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-6">
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {[tour.coverImageUrl, ...tour.galleryUrls].filter(Boolean).map((url, i) => (
              <button
                key={i}
                onClick={() => {
                  const modal = document.getElementById('gallery-modal');
                  const img = document.getElementById('gallery-img') as HTMLImageElement;
                  if (modal && img) { img.src = url!; modal.style.display = 'flex'; }
                }}
                className="shrink-0 rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 cursor-pointer"
                style={{ width: '160px', height: '110px' }}
              >
                <img src={url!} alt={`${tour.name} foto ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal galeria fullscreen */}
      <div id="gallery-modal" className="fixed inset-0 z-50 items-center justify-center p-4" style={{ display: 'none', background: 'rgba(10,22,40,0.95)' }}
        onClick={() => { const m = document.getElementById('gallery-modal'); if (m) m.style.display = 'none'; }}>
        <button className="absolute top-4 right-4 text-white/60 hover:text-white text-3xl font-light z-10" onClick={() => { const m = document.getElementById('gallery-modal'); if (m) m.style.display = 'none'; }}>✕</button>
        <img id="gallery-img" src="" alt="Foto del tour" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left column */}
          <div>
            {/* Rating */}
            {tour.avgRating > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <span className="badge bg-sand-100 text-sand-600 text-sm px-4 py-1.5 flex items-center gap-1">
                  ⭐ {tour.avgRating.toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">
                  {tour.totalReviews} resenas &middot; {tour.totalBookings} reservas
                </span>
              </div>
            )}

            <p className="text-gray-700 text-lg leading-relaxed mb-6">{tour.description}</p>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl mb-6 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">🕐</span>
                <div>
                  <div className="text-xs text-gray-400">Salida</div>
                  <div className="font-semibold text-gray-900 text-sm">{tour.departureTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">🔄</span>
                <div>
                  <div className="text-xs text-gray-400">Retorno</div>
                  <div className="font-semibold text-gray-900 text-sm">{tour.returnTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-palm-100 rounded-lg flex items-center justify-center text-sm">⏱️</span>
                <div>
                  <div className="text-xs text-gray-400">Duracion</div>
                  <div className="font-semibold text-gray-900 text-sm">{tour.duration}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-sand-100 rounded-lg flex items-center justify-center text-sm">👥</span>
                <div>
                  <div className="text-xs text-gray-400">Capacidad</div>
                  <div className="font-semibold text-gray-900 text-sm">{tour.maxPeople} personas</div>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-8 h-8 bg-coral-100 rounded-lg flex items-center justify-center text-sm">📍</span>
                <div>
                  <div className="text-xs text-gray-400">Punto de salida</div>
                  <div className="font-semibold text-gray-900 text-sm">{tour.departurePoint}</div>
                </div>
              </div>
            </div>

            {/* Includes / Excludes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-palm-50 rounded-2xl p-5 border border-palm-100">
                <h3 className="font-bold text-palm-700 mb-3 flex items-center gap-2">✅ Incluye</h3>
                <ul className="space-y-2 text-gray-700">
                  {tour.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-palm-500 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-coral-50 rounded-2xl p-5 border border-coral-100">
                <h3 className="font-bold text-coral-600 mb-3 flex items-center gap-2">❌ No incluye</h3>
                <ul className="space-y-2 text-gray-700">
                  {tour.excludes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-coral-400 mt-0.5 shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {tour.restrictions.length > 0 && (
              <div className="bg-sand-50 border border-sand-200 p-5 rounded-2xl mb-4">
                <h4 className="font-bold text-sand-600 mb-2">⚠️ Restricciones</h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {tour.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {tour.observations && (
              <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl mb-6">
                <h4 className="font-bold text-secondary-600 mb-2">ℹ️ Observaciones</h4>
                <p className="text-gray-600 text-sm">{tour.observations}</p>
              </div>
            )}

            {/* Operator */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">🏢 Operador</h3>
              <p className="text-lg font-bold text-gray-900">{tour.operator.companyName}</p>
              <p className="text-gray-500 text-sm mt-1">⭐ Score: {tour.operator.score} puntos</p>
            </div>
          </div>

          {/* Right column — Booking card */}
          <div className="lg:sticky lg:top-20 self-start">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
              <div className="text-center mb-4 pb-4 border-b border-gray-100">
                <div className="text-sm text-gray-400 mb-1">Desde</div>
                <div className="text-3xl font-extrabold text-primary-500">
                  ${tour.priceAdult.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400"> / adulto</span>
                </div>
                {tour.priceChild && (
                  <div className="text-gray-400 text-sm mt-1">
                    Nino: ${tour.priceChild.toLocaleString()}
                  </div>
                )}
              </div>

              {bookingResult ? (
                /* Resultado exitoso con QR + calendario */
                (() => {
                  const formatDate = (d: string) => {
                    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
                    catch { return d; }
                  };

                  // QR code visual via API gratuita
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingResult.qrCode)}&bgcolor=ffffff&color=0A1628`;

                  // Google Calendar link
                  const calDate = tourDate.replace(/-/g, '');
                  const calStart = `${calDate}T${tour.departureTime.replace(':', '')}00`;
                  const calEnd = `${calDate}T${tour.returnTime.replace(':', '')}00`;
                  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(tour.name + ' - TuresColombia')}&dates=${calStart}/${calEnd}&details=${encodeURIComponent(`Codigo: ${bookingResult.bookingCode}\nPunto de encuentro: ${tour.departurePoint}\nPersonas: ${numAdults} adulto(s)${numChildren > 0 ? `, ${numChildren} nino(s)` : ''}\nTotal: $${totalPrice.toLocaleString()} COP\n\nPresenta tu QR el dia del tour.`)}&location=${encodeURIComponent(tour.departurePoint + ', Santa Marta, Colombia')}`;

                  // Apple Calendar (.ics) link
                  const icsContent = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'BEGIN:VEVENT',
                    `DTSTART:${calStart}`,
                    `DTEND:${calEnd}`,
                    `SUMMARY:${tour.name} - TuresColombia`,
                    `DESCRIPTION:Codigo: ${bookingResult.bookingCode}\\nPunto de encuentro: ${tour.departurePoint}\\nTotal: $${totalPrice.toLocaleString()} COP`,
                    `LOCATION:${tour.departurePoint}, Santa Marta, Colombia`,
                    'END:VEVENT',
                    'END:VCALENDAR',
                  ].join('\r\n');
                  const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

                  // WhatsApp message con QR link y calendario
                  const cleanPhone = clientPhone.replace(/\D/g, '');
                  const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                  const whatsappMsg = [
                    `Hola ${clientName}! Tu reserva con *TuresColombia* esta confirmada ✅`,
                    ``,
                    `🏖️ *${tour.name}*`,
                    `📅 Fecha: ${formatDate(tourDate)}`,
                    `⏰ Hora de salida: ${tour.departureTime}`,
                    `📍 Punto de encuentro: ${tour.departurePoint}`,
                    `👥 Personas: ${numAdults} adulto(s)${numChildren > 0 ? `, ${numChildren} nino(s)` : ''}`,
                    `💰 Total: $${totalPrice.toLocaleString()} COP`,
                    ``,
                    `🎫 Codigo de reserva: *${bookingResult.bookingCode}*`,
                    ``,
                    `📱 Tu codigo QR:`,
                    `${qrImageUrl}`,
                    ``,
                    `📅 Agregar a tu calendario:`,
                    `${googleCalUrl}`,
                    ``,
                    `Presenta este mensaje o tu codigo QR el dia del tour.`,
                    ``,
                    `Gracias por confiar en TuresColombia! 🌴`,
                  ].join('\n');
                  const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(whatsappMsg)}`;

                  return (
                    <div className="text-center">
                      <div className="p-5 mb-4 rounded-card" style={{ background: 'linear-gradient(135deg, #2D6A4F, #00B4CC)' }}>
                        <div className="text-3xl mb-2">✅</div>
                        <h3 className="font-display font-bold text-white text-xl mb-1">Reserva confirmada!</h3>
                        <p className="text-white/80 text-sm font-sans">Codigo: <span className="font-mono font-bold text-white">{bookingResult.bookingCode}</span></p>
                      </div>

                      {/* QR Code visual */}
                      <div className="bg-white rounded-2xl p-4 mb-4 shadow-card">
                        <p className="text-xs font-sans font-semibold uppercase tracking-wider mb-3" style={{ color: '#C9A05C', letterSpacing: '2px' }}>Tu codigo QR</p>
                        <img src={qrImageUrl} alt="QR Code" className="mx-auto mb-2" style={{ width: '160px', height: '160px' }} />
                        <p className="text-xs font-mono" style={{ color: '#6B5329' }}>{bookingResult.bookingCode}</p>
                      </div>

                      {/* Resumen */}
                      <div className="rounded-2xl p-4 mb-4 text-left text-sm space-y-1" style={{ background: '#FDF3E3' }}>
                        <div><span style={{ color: '#C9A05C' }}>Tour:</span> <span className="font-medium" style={{ color: '#0A1628' }}>{tour.name}</span></div>
                        <div><span style={{ color: '#C9A05C' }}>Fecha:</span> <span className="font-medium" style={{ color: '#0A1628' }}>{formatDate(tourDate)}</span></div>
                        <div><span style={{ color: '#C9A05C' }}>Salida:</span> <span className="font-medium" style={{ color: '#0A1628' }}>{tour.departureTime} - {tour.departurePoint}</span></div>
                        <div><span style={{ color: '#C9A05C' }}>Personas:</span> <span className="font-medium" style={{ color: '#0A1628' }}>{numAdults} adulto(s){numChildren > 0 ? `, ${numChildren} nino(s)` : ''}</span></div>
                        <div className="pt-2 border-t mt-2" style={{ borderColor: '#FAEBD1' }}>
                          <span style={{ color: '#C9A05C' }}>Total:</span> <span className="font-bold text-lg" style={{ color: '#0D5C8A' }}>${totalPrice.toLocaleString()} COP</span>
                        </div>
                      </div>

                      {/* Agregar al calendario */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-pill text-sm font-semibold transition-all hover:-translate-y-0.5"
                          style={{ background: '#FDF3E3', color: '#0D5C8A', border: '1.5px solid #FAEBD1' }}>
                          📅 Google Calendar
                        </a>
                        <a href={icsUrl} download={`tour-${bookingResult.bookingCode}.ics`}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-pill text-sm font-semibold transition-all hover:-translate-y-0.5"
                          style={{ background: '#FDF3E3', color: '#0D5C8A', border: '1.5px solid #FAEBD1' }}>
                          🍎 Apple Calendar
                        </a>
                      </div>

                      {/* Boton WhatsApp */}
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-4 px-6 rounded-pill text-lg transition-all hover:-translate-y-0.5 shadow-lg mb-3">
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Enviar confirmacion al cliente
                      </a>

                      <button onClick={() => { setBookingResult(null); setClientName(''); setClientLastName(''); setClientPhone(''); setClientHotel(''); setTourDate(''); }}
                        className="w-full py-3 rounded-pill text-sm font-semibold transition-all" style={{ color: '#0D5C8A', border: '1.5px solid #FAEBD1' }}>
                        Hacer otra reserva
                      </button>
                    </div>
                  );
                })()
              ) : (
                /* Formulario */
                <>
                  <div className="space-y-3 mb-4">
                    {/* Datos del cliente */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos del cliente</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                              placeholder="Nombre" className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                            <input type="text" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)}
                              placeholder="Apellido" className="input" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                          <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="300 000 0000" className="input" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Donde se hospeda?</label>
                          <input type="text" value={clientHotel} onChange={(e) => setClientHotel(e.target.value)}
                            placeholder="Hotel, hostal, Airbnb..." className="input" />
                        </div>
                      </div>
                    </div>

                    {/* Detalles del tour */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del tour *</label>
                      <input type="date" value={tourDate} onChange={(e) => setTourDate(e.target.value)} className="input" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adultos</label>
                        <input type="number" min={1} max={tour.maxPeople} value={numAdults}
                          onChange={(e) => setNumAdults(Math.max(1, Number(e.target.value)))}
                          className="input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ninos</label>
                        <input type="number" min={0} value={numChildren}
                          onChange={(e) => setNumChildren(Math.max(0, Number(e.target.value)))}
                          className="input" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codigo de asesor (opcional)</label>
                      <input type="text" placeholder="ej: PED-0001" value={refCode}
                        onChange={(e) => setRefCode(e.target.value)}
                        className="input" />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Total a pagar</span>
                      <span className="text-2xl font-bold text-primary-500">${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={handleBooking} disabled={loading}
                    className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Procesando...' : 'Reservar ahora'}
                  </button>

                  {message && (
                    <div className={`mt-4 p-4 rounded-xl text-sm ${
                      message.toLowerCase().includes('error')
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      {message}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        {reviews.length > 0 && (
          <section className="mt-12 border-t border-gray-100 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              ⭐ Resenas ({reviewsTotal})
            </h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {review.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{review.author.name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    {review.tourRating && (
                      <div className="ml-auto flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`text-lg ${s <= review.tourRating! ? 'text-sand-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {review.tourComment && (
                    <p className="text-gray-600 text-sm leading-relaxed">{review.tourComment}</p>
                  )}
                  {review.operatorReply && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs text-primary-500 font-semibold mb-1">🏢 Respuesta del operador:</p>
                      <p className="text-gray-600 text-sm">{review.operatorReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const param = context.params?.id as string;
  try {
    const isNumeric = /^\d+$/.test(param);
    const tour = isNumeric ? await getTour(Number(param)) : await getTourBySlug(param);
    return { props: { tour } };
  } catch {
    return { notFound: true };
  }
};
