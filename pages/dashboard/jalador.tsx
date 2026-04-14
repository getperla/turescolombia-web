import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import { Tour } from '../../lib/api';

const JaladorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    api.get('/dashboard/jalador').then(r => setData(r.data)).catch(() => setError('Inicia sesion como jalador.'));
    api.get('/tours', { params: { sortBy: 'price', order: 'desc', limit: '50' } }).then(r => {
      const sorted = (r.data?.data || []).sort((a: Tour, b: Tour) => b.priceAdult - a.priceAdult);
      setTours(sorted);
    }).catch(() => {});
  }, []);

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
          <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/j/${jalador.refCode}/tours`); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: linkCopied ? '#222' : '#F5882A', color: 'white' }}>
            {linkCopied ? '✓' : 'Copiar'}
          </button>
        </div>

        {/* Tarjeta motivacional — comisiones ganadas */}
        <div className="relative rounded-2xl p-5 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #F5882A 0%, #E07020 100%)' }}>
          <div className="absolute top-0 right-0 text-6xl opacity-10">🎉</div>
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-1">¡Vas muy bien {data?.jalador?.user?.name?.split(' ')[0] || 'crack'}!</div>
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
            const waMsg = `🏖 *${tour.name}*\n\n${(tour as any).shortDescription || ''}\n\n💰 $${tour.priceAdult.toLocaleString()} COP\n⏰ ${tour.duration}\n📍 ${tour.departurePoint}\n\n👉 Reserva conmigo aquí:\n${tourUrl}\n\n_La Perla — Tours verificados_`;
            return (
              <div key={tour.id} className="rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow" style={{ borderColor: '#EBEBEB' }}>
                <Link href={`/tour/${tour.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {tour.coverImageUrl ? (
                      <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover" />
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
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#25D366' }}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Compartir
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(tourUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: '#EBEBEB', color: '#222' }}
                    title="Copiar link"
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default JaladorDashboard;
