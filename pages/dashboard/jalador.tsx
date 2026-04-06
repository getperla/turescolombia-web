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

        {/* KPIs compactos */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { value: sales.today, label: 'Hoy' },
            { value: sales.week, label: 'Semana' },
            { value: sales.month, label: 'Mes' },
            { value: `$${Number(commissions.pending).toLocaleString()}`, label: 'Pendiente' },
          ].map((kpi, i) => (
            <div key={i} className="text-center py-3 rounded-xl" style={{ background: '#F7F7F7' }}>
              <div className="text-lg font-bold" style={{ color: '#222' }}>{kpi.value}</div>
              <div className="text-xs" style={{ color: '#717171' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tours disponibles para vender — ordenados por precio mayor a menor */}
        <h2 className="font-bold text-lg mb-4" style={{ color: '#222' }}>Tours para vender</h2>
        <div className="space-y-3">
          {tours.map((tour) => (
            <Link key={tour.id} href={`/tour/${tour.slug}`} className="flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-sm" style={{ borderColor: '#EBEBEB' }}>
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                {tour.coverImageUrl ? (
                  <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>{tour.name}</div>
                <div className="text-xs" style={{ color: '#717171' }}>{tour.duration} · {tour.departurePoint}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm" style={{ color: '#222' }}>${tour.priceAdult.toLocaleString()}</div>
                <div className="text-xs" style={{ color: '#F5882A' }}>Comision 20%</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default JaladorDashboard;
