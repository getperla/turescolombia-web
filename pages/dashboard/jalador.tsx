import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import LinkPreviewModal from '../../components/LinkPreviewModal';
import { shareLink, copyText } from '../../lib/share';
import { Tour } from '../../lib/api';

const JaladorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
  const [previewTour, setPreviewTour] = useState<Tour | null>(null);

  useEffect(() => {
    api.get('/dashboard/jalador').then(r => setData(r.data)).catch(() => setError('Inicia sesion como jalador.'));
    api.get('/tours', { params: { sortBy: 'price', order: 'desc', limit: '50' } }).then(r => {
      const sorted = (r.data?.data || []).sort((a: Tour, b: Tour) => b.priceAdult - a.priceAdult);
      setTours(sorted);
    }).catch((e) => console.error('Failed to load tours:', e));
  }, []);

  const showToast = (msg: string) => setToast({ msg, visible: true });

  if (error) return (
    <Layout><div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <p className="font-semibold text-lg mb-4" style={{ color: '#222' }}>{error}</p>
      <Link href="/login?role=jalador" className="btn-primary inline-block">Iniciar sesion</Link>
    </div></Layout>
  );

  if (!data) return (
    <Layout><div className="max-w-5xl mx-auto py-8 px-4">
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-xl" style={{ background: '#F0F0F0' }}></div>
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: '#F0F0F0' }}></div>)}</div>
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: '#F0F0F0' }}></div>)}
      </div>
    </div></Layout>
  );

  const { jalador, sales, commissions } = data;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const jaladorFirstName = jalador?.user?.name?.split(' ')[0] || '';

  const buildWaMessage = (tour: Tour, tourUrl: string): string => {
    const greeting = jaladorFirstName
      ? `Hola! Soy ${jaladorFirstName}, tu jalador de confianza en Santa Marta`
      : 'Hola! Te comparto este tour';
    const desc = (tour as any).shortDescription || '';
    return [
      `${greeting} 🏖`,
      '',
      `🌴 *${tour.name}*`,
      desc,
      '',
      `💰 $${tour.priceAdult.toLocaleString()} COP por persona`,
      `⏰ ${tour.duration}`,
      `📍 Sale desde: ${tour.departurePoint}`,
      '',
      '✅ Cupos garantizados',
      '✅ Pago seguro online',
      '',
      '👉 Reserva conmigo aqui:',
      tourUrl,
      '',
      '_Cualquier pregunta, escribeme!_',
    ].filter(Boolean).join('\n');
  };

  const handleShareTour = async (tour: Tour, tourUrl: string) => {
    const text = buildWaMessage(tour, tourUrl);
    await shareLink({ title: tour.name, text, url: tourUrl });
    // Nota: si el OS abre share nativo, no mostramos toast (el OS ya da feedback).
    // Solo mostramos toast si fallamos al fallback de WhatsApp directo.
  };

  const handleCopyTourLink = async (tourUrl: string) => {
    const ok = await copyText(tourUrl);
    showToast(ok ? '✓ Link copiado' : 'No se pudo copiar');
  };

  const handleCopyMyLink = async () => {
    const myUrl = `${baseUrl}/j/${jalador.refCode}/tours`;
    const ok = await copyText(myUrl);
    showToast(ok ? '✓ Tu link de ventas copiado' : 'No se pudo copiar');
  };

  return (
    <Layout>
      <Head><title>Mi Panel — Jalador</title></Head>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Link de ventas */}
        <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: '#F7F7F7', border: '1px solid #EBEBEB' }}>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold mb-1" style={{ color: '#717171' }}>Tu link de ventas — {jalador.refCode}</div>
            <code className="text-sm block truncate" style={{ color: '#222' }}>{baseUrl}/j/{jalador.refCode}/tours</code>
          </div>
          <button
            onClick={handleCopyMyLink}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#F5882A', color: 'white' }}
          >
            Copiar
          </button>
        </div>

        {/* Tarjeta motivacional — comisiones ganadas */}
        <div className="relative rounded-2xl p-5 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #F5882A 0%, #E07020 100%)' }}>
          <div className="absolute top-0 right-0 text-6xl opacity-10">🎉</div>
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-1">¡Vas muy bien {jaladorFirstName || 'crack'}!</div>
            <div className="text-2xl font-bold text-white mb-1">Te has ganado ${Number(commissions.pending).toLocaleString()}</div>
            <div className="text-xs text-white/90">en comisiones este mes 💰 Sigue así</div>
          </div>
        </div>

        {/* KPIs compactos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: sales.today, label: 'Ventas hoy', icon: '🔥' },
            { value: sales.week, label: 'Esta semana', icon: '📈' },
            { value: sales.month, label: 'Este mes', icon: '⭐' },
          ].map((kpi, i) => (
            <div key={i} className="text-center py-3 rounded-xl border" style={{ borderColor: '#EBEBEB' }}>
              <div className="text-xs mb-0.5">{kpi.icon}</div>
              <div className="text-lg font-bold" style={{ color: '#222' }}>{kpi.value}</div>
              <div className="text-xs" style={{ color: '#717171' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tours disponibles para vender — ordenados por precio mayor a menor */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg" style={{ color: '#222' }}>Tours para vender</h2>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: '#FEF3E8', color: '#F5882A' }}>{tours.length} disponibles</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tours.map((tour) => {
            const commission = Math.round(tour.priceAdult * 0.20);
            const tourUrl = `${baseUrl}/j/${jalador.refCode}/${tour.slug}`;
            return (
              <div key={tour.id} className="rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow" style={{ borderColor: '#EBEBEB' }}>
                <Link href={`/tour/${tour.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {tour.coverImageUrl ? (
                      <Image src={tour.coverImageUrl} alt={tour.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>
                    )}
                    {/* Badge comisión - lo más importante para el jalador */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg" style={{ background: '#2D6A4F' }}>
                      💰 Ganas ${commission.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base mb-1 line-clamp-1" style={{ color: '#222' }}>{tour.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#717171' }}>
                      <span>⏱️ {tour.duration}</span>
                      <span>·</span>
                      <span className="truncate">📍 {tour.departurePoint}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs" style={{ color: '#717171' }}>Precio público</div>
                        <div className="font-bold text-lg" style={{ color: '#222' }}>${tour.priceAdult.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </Link>
                {/* Botones de acción */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={(e) => { e.preventDefault(); handleShareTour(tour, tourUrl); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#25D366' }}
                    aria-label={`Compartir ${tour.name}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12a9 9 0 1116.24 5.39L21 22l-4.65-1.71A9 9 0 013 12zm9-7a7 7 0 100 14 7 7 0 100-14zm5 11l-1 .3-3.5-1A4.99 4.99 0 0110 12V8h2v3.59l3 1.62L17 16z" opacity=".95"/></svg>
                    Compartir
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setPreviewTour(tour); }}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: '#EBEBEB', color: '#222' }}
                    title="Ver vista previa del link"
                    aria-label={`Vista previa del link de ${tour.name}`}
                  >
                    👁
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleCopyTourLink(tourUrl); }}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: '#EBEBEB', color: '#222' }}
                    title="Copiar link"
                    aria-label={`Copiar link de ${tour.name}`}
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Toast
        message={toast.msg}
        visible={toast.visible}
        onHide={() => setToast({ msg: '', visible: false })}
      />

      {previewTour && (
        <LinkPreviewModal
          visible={!!previewTour}
          onClose={() => setPreviewTour(null)}
          tour={previewTour}
          url={`${baseUrl}/j/${jalador.refCode}/${previewTour.slug}`}
        />
      )}
    </Layout>
  );
};

export default JaladorDashboard;
