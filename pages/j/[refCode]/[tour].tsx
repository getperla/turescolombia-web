import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getTourBySlug, getTour, Tour, Jalador } from '../../../lib/api';
import api from '../../../lib/api';
import Layout from '../../../components/Layout';

export default function JaladorTourLink() {
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [jalador, setJalador] = useState<Jalador | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [tourDate, setTourDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientHotel, setClientHotel] = useState('');
  const [message, setMessage] = useState('');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refCode = (router.query.refCode as string) || '';

  // Fetch tour y jalador client-side (para que el mock funcione)
  useEffect(() => {
    const tourParam = router.query.tour as string | undefined;
    if (!tourParam) return;
    const isNumeric = /^\d+$/.test(tourParam);
    const fetcher = isNumeric ? getTour(Number(tourParam)) : getTourBySlug(tourParam);
    fetcher
      .then((t) => setTour(t))
      .catch(() => setNotFound(true));
  }, [router.query.tour]);

  useEffect(() => {
    if (!refCode) return;
    api.get(`/users/jaladores/ref/${refCode}`)
      .then((r) => setJalador(r.data))
      .catch(() => {});
  }, [refCode]);

  if (notFound) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <div className="text-6xl mb-4">🏝️</div>
          <h1 className="font-bold text-3xl mb-2" style={{ color: '#0A1628' }}>
            Playa no <em style={{ color: '#F5882A' }}>encontrada</em>
          </h1>
          <p className="mb-6" style={{ color: '#C9A05C' }}>
            Parece que esta ruta no existe. Pero hay muchos tours increibles esperandote.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/explorar" className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: '#F5882A' }}>Explorar tours</Link>
            <Link href="/" className="px-6 py-3 rounded-lg font-semibold border" style={{ borderColor: '#F5882A', color: '#0D5C8A' }}>Ir al inicio</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!tour) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-56 rounded-xl" style={{ background: '#F0F0F0' }} />
            <div className="h-6 w-1/2 rounded" style={{ background: '#F0F0F0' }} />
            <div className="h-4 w-1/3 rounded" style={{ background: '#F0F0F0' }} />
          </div>
        </div>
      </Layout>
    );
  }

  const totalPrice = (tour.priceAdult * numAdults) + ((tour.priceChild || tour.priceAdult * 0.7) * numChildren);

  const handleBooking = async () => {
    if (!tourDate) { setMessage('Selecciona una fecha'); return; }
    if (!clientName.trim()) { setMessage('Escribe tu nombre'); return; }
    if (!clientPhone.trim()) { setMessage('Escribe tu WhatsApp'); return; }

    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/bookings', {
        tourId: tour.id,
        tourDate,
        numAdults,
        numChildren,
        refCode,
        clientName: clientName.trim(),
        clientLastName: clientLastName.trim() || undefined,
        clientPhone: clientPhone.trim(),
        clientHotel: clientHotel.trim() || undefined,
      });
      setBookingResult(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al crear la reserva.');
    }
    setLoading(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d; }
  };

  return (
    <Layout>
      <Head>
        <title>{tour.name} — Desde ${tour.priceAdult.toLocaleString()} COP | La Perla</title>
        <meta name="description" content={`${tour.shortDescription || tour.description.substring(0, 120)} — Reserva con ${jalador?.user.name || 'La Perla'}`} />
        <meta property="og:title" content={`${tour.name} — $${tour.priceAdult.toLocaleString()} COP | La Perla`} />
        <meta property="og:description" content={`${tour.shortDescription || tour.description.substring(0, 120)} | ${tour.duration} | ${tour.departurePoint}`} />
        <meta property="og:image" content={tour.coverImageUrl || `https://tourmarta-web.vercel.app/api/og?title=${encodeURIComponent(tour.name)}&subtitle=${encodeURIComponent(tour.departurePoint || 'Santa Marta, Colombia')}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="product" />
        <meta property="og:locale" content="es_CO" />
      </Head>

      {/* Hero compacto */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {tour.coverImageUrl ? (
          <img src={tour.coverImageUrl} alt={tour.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-tropical-gradient"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          {tour.category && (
            <span className="inline-block mb-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-medium">
              {tour.category.name}
            </span>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold drop-shadow-lg">{tour.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
            <span>📍 {tour.departurePoint}</span>
            <span>🕐 {tour.duration}</span>
            {tour.avgRating > 0 && <span>⭐ {tour.avgRating.toFixed(1)}</span>}
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Badge del jalador — genera confianza */}
        {jalador && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {jalador.user.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm text-gray-500">Tu asesor turistico</div>
              <div className="font-bold text-gray-900">{jalador.user.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>⭐ {jalador.score} pts</span>
                <span>·</span>
                <span>{jalador.totalSales} ventas</span>
                <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
                  {jalador.badge?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Precio destacado */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-400">Desde</div>
          <div className="text-4xl font-extrabold text-primary-600">
            ${tour.priceAdult.toLocaleString()}
            <span className="text-base font-normal text-gray-400"> COP / persona</span>
          </div>
        </div>

        {/* Descripcion corta */}
        <p className="text-gray-600 leading-relaxed mb-6">{tour.shortDescription || tour.description.substring(0, 200)}</p>

        {/* Detalles del tour */}
        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🕐</span>
            <div><div className="text-gray-400 text-xs">Salida</div><div className="font-semibold">{tour.departureTime}</div></div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🔄</span>
            <div><div className="text-gray-400 text-xs">Retorno</div><div className="font-semibold">{tour.returnTime}</div></div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">⏱️</span>
            <div><div className="text-gray-400 text-xs">Duracion</div><div className="font-semibold">{tour.duration}</div></div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">👥</span>
            <div><div className="text-gray-400 text-xs">Capacidad</div><div className="font-semibold">{tour.maxPeople} personas</div></div>
          </div>
        </div>

        {/* Incluye / No incluye */}
        {tour.includes.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-2">✅ Incluye</h3>
            <ul className="space-y-1">
              {tour.includes.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-primary-500">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bookingResult ? (
          /* Confirmacion */
          (() => {
            const whatsappMsg = [
              `Hola ${clientName}! Tu reserva con TuresColombia esta confirmada`,
              ``,
              `*${tour.name}*`,
              `Fecha: ${formatDate(tourDate)}`,
              `Hora de salida: ${tour.departureTime}`,
              `Punto de encuentro: ${tour.departurePoint}`,
              `Personas: ${numAdults} adulto(s)${numChildren > 0 ? `, ${numChildren} nino(s)` : ''}`,
              `Total: $${totalPrice.toLocaleString()} COP`,
              ``,
              `Codigo de reserva: *${bookingResult.bookingCode}*`,
              ``,
              `Presenta este mensaje el dia del tour.`,
              `Gracias por confiar en TuresColombia!`,
            ].join('\n');
            const cleanPhone = clientPhone.replace(/\D/g, '');
            const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
            const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(whatsappMsg)}`;

            return (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="font-bold text-green-800 text-xl mb-1">Reserva confirmada!</h3>
                  <p className="text-green-700">Codigo: <span className="font-mono font-bold text-lg">{bookingResult.bookingCode}</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left text-sm space-y-1">
                  <div><span className="text-gray-500">Tour:</span> <span className="font-medium">{tour.name}</span></div>
                  <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(tourDate)}</span></div>
                  <div><span className="text-gray-500">Personas:</span> <span className="font-medium">{numAdults} adulto(s){numChildren > 0 ? `, ${numChildren} nino(s)` : ''}</span></div>
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <span className="text-gray-500">Total:</span> <span className="font-bold text-primary-600 text-lg">${totalPrice.toLocaleString()} COP</span>
                  </div>
                </div>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all shadow-lg mb-3">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Enviar confirmacion por WhatsApp
                </a>
                <Link href={`/tour/${tour.slug}`} className="text-sm text-gray-400 hover:text-gray-600">
                  Ver detalles completos del tour
                </Link>
              </div>
            );
          })()
        ) : (
          /* Formulario de reserva — optimizado mobile */
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Reservar este tour</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre" className="input text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input type="text" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)}
                    placeholder="Apellido" className="input text-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu WhatsApp *</label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="300 000 0000" className="input text-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del tour *</label>
                <input type="date" value={tourDate} onChange={(e) => setTourDate(e.target.value)} className="input text-lg" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adultos</label>
                  <input type="number" min={1} max={tour.maxPeople} value={numAdults}
                    onChange={(e) => setNumAdults(Math.max(1, Number(e.target.value)))}
                    className="input text-lg text-center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ninos</label>
                  <input type="number" min={0} value={numChildren}
                    onChange={(e) => setNumChildren(Math.max(0, Number(e.target.value)))}
                    className="input text-lg text-center" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donde te hospedas? (opcional)</label>
                <input type="text" value={clientHotel} onChange={(e) => setClientHotel(e.target.value)}
                  placeholder="Hotel, hostal, Airbnb..." className="input" />
              </div>
            </div>


            <div className="bg-primary-50 border border-primary-200 p-4 rounded-2xl mb-4">
              <div className="flex justify-between items-center">
                <span className="text-primary-700 font-medium">Total</span>
                <span className="text-2xl font-extrabold text-primary-600">${totalPrice.toLocaleString()} COP</span>
              </div>
            </div>

            <button onClick={handleBooking} disabled={loading}
              className="w-full btn-primary text-lg py-4 disabled:opacity-50">
              {loading ? 'Reservando...' : 'Reservar ahora'}
            </button>

            {message && (
              <div className="mt-4 p-4 rounded-2xl text-sm bg-red-50 text-red-600 border border-red-100">
                {message}
              </div>
            )}

            <div className="text-center mt-4 space-y-1">
              <p className="text-xs text-gray-400">Reserva verificada por TuresColombia</p>
              <p className="text-xs text-gray-400">Recibiras confirmacion por WhatsApp</p>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
