import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completada', color: '#2D6A4F', bg: '#E8F5EF' },
  confirmed: { label: 'Confirmada', color: '#0D5C8A', bg: '#E8F4FA' },
  pending: { label: 'Pendiente', color: '#E07020', bg: '#FEF3E8' },
  cancelled: { label: 'Cancelada', color: '#CC3333', bg: '#FFF0F0' },
  in_progress: { label: 'En curso', color: '#F5882A', bg: '#FEF3E8' },
};

const JaladorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    api.get('/dashboard/jalador').then(r => setData(r.data)).catch(() => setError('No se pudo cargar el dashboard.'));
  }, []);

  if (error) return (
    <Layout><div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <div className="text-5xl mb-4">😕</div>
      <p className="font-display font-bold text-xl" style={{ color: '#0A1628' }}>No pudimos cargar tu panel</p>
      <p className="font-sans text-sm mt-2" style={{ color: '#C9A05C' }}>{error}</p>
      <Link href="/login?role=jalador" className="btn-primary inline-block mt-6">Iniciar sesion</Link>
    </div></Layout>
  );

  if (!data) return (
    <Layout><div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-card" style={{ background: '#FAEBD1' }}></div>
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-card" style={{ background: '#FAEBD1' }}></div>)}</div>
        <div className="h-48 rounded-card" style={{ background: '#FAEBD1' }}></div>
      </div>
    </div></Layout>
  );

  const { jalador, sales, commissions, rating, recentBookings } = data;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Layout>
      <Head><title>Mi Panel — TuresColombia</title></Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile header */}
        <div className="rounded-card p-6 mb-8 text-white" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-bold shrink-0" style={{ background: 'rgba(245,136,42,0.3)', border: '2px solid rgba(245,136,42,0.5)' }}>
              {jalador.name?.charAt(0)}
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl">{jalador.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-white/60 font-sans">
                <span className="px-2.5 py-0.5 rounded-pill text-xs font-bold" style={{ background: '#F5882A', color: 'white' }}>
                  {jalador.badge?.replace('_', ' ').toUpperCase()}
                </span>
                <span>📍 {jalador.zone}</span>
                <span>⭐ {jalador.score} pts</span>
                <span className="font-mono px-2 py-0.5 rounded-pill" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {jalador.refCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Link compartible */}
        <div className="rounded-card p-5 mb-8" style={{ background: 'linear-gradient(135deg, #F5882A, #FF5F5F)' }}>
          <h3 className="font-display font-bold text-white text-lg mb-2">Tu link de ventas</h3>
          <p className="text-sm text-white/70 font-sans mb-3">Comparte este link y gana comision por cada venta</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-pill text-sm font-mono truncate" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              {baseUrl}/j/{jalador.refCode}/tours
            </code>
            <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/j/${jalador.refCode}/tours`); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
              className="shrink-0 px-5 py-3 rounded-pill font-sans font-bold text-sm transition-all" style={{ background: 'white', color: '#F5882A' }}>
              {linkCopied ? '✓ Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '📊', value: sales.today, label: 'Ventas hoy', color: '#0D5C8A' },
            { icon: '📈', value: sales.week, label: 'Esta semana', color: '#2D6A4F' },
            { icon: '🗓️', value: sales.month, label: 'Este mes', color: '#F5882A' },
            { icon: '⭐', value: rating.average?.toFixed(1) || '0', label: `${rating.totalReviews} resenas`, color: '#FF5F5F' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-card p-5 text-center shadow-card">
              <div className="glass w-12 h-12 mx-auto mb-2 flex items-center justify-center text-xl rounded-full" style={{ background: `${kpi.color}15` }}>{kpi.icon}</div>
              <div className="text-2xl font-bold font-sans" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs font-sans mt-1" style={{ color: '#C9A05C' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Comisiones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold" style={{ color: '#0A1628' }}>Pendientes</h3>
              <span className="badge" style={{ background: '#FEF3E8', color: '#F5882A' }}>{commissions.pendingCount} txs</span>
            </div>
            <div className="text-3xl font-bold font-sans" style={{ color: '#F5882A' }}>${Number(commissions.pending).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold" style={{ color: '#0A1628' }}>Total ganado</h3>
              <span className="badge" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>historico</span>
            </div>
            <div className="text-3xl font-bold font-sans" style={{ color: '#2D6A4F' }}>${Number(commissions.totalEarned).toLocaleString()}</div>
            <div className="text-xs font-sans mt-1" style={{ color: '#C9A05C' }}>Pagado: ${Number(commissions.totalPaid).toLocaleString()}</div>
          </div>
        </div>

        {/* Ventas recientes */}
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: '#0A1628' }}>Ultimas ventas</h3>
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          {/* Mobile: cards / Desktop: table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FDF3E3' }}>
                  {['Codigo', 'Tour', 'Cliente', 'Estado', 'Total', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-sans font-semibold uppercase tracking-wider" style={{ color: '#C9A05C', letterSpacing: '1.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings?.map((b: any) => {
                  const s = statusLabels[b.status] || statusLabels.pending;
                  const phone = b.tourist?.user?.phone?.replace(/\D/g, '') || '';
                  const phoneC = phone.startsWith('57') ? phone : `57${phone}`;
                  const msg = `✅ RESERVA CONFIRMADA\n━━━━━━━━━━━━━━━━━\n\nHola *${b.tourist?.user?.name}*!\n\n🏖 *${b.tour?.name}*\n📅 ${new Date(b.tourDate).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n⏰ Salida: ${b.tour?.departureTime || ''}\n📍 ${b.tour?.departurePoint || ''}\n\n💰 *Total: $${Number(b.totalAmount).toLocaleString()} COP*\n\n━━━━━━━━━━━━━━━━━\n🎫 Reserva: *${b.bookingCode}*\n━━━━━━━━━━━━━━━━━\n\nPresenta este codigo el dia del tour.\n\n_TuresColombia — Tours verificados_`;
                  return (
                    <tr key={b.id} className="border-t" style={{ borderColor: '#FAEBD1' }}>
                      <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: '#0D5C8A' }}>{b.bookingCode}</td>
                      <td className="px-4 py-3 text-sm font-sans font-medium" style={{ color: '#0A1628' }}>{b.tour?.name}</td>
                      <td className="px-4 py-3 text-sm font-sans" style={{ color: '#6B5329' }}>{b.tourist?.user?.name}</td>
                      <td className="px-4 py-3"><span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                      <td className="px-4 py-3 text-sm font-sans font-bold" style={{ color: '#0D5C8A' }}>${Number(b.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {phone ? (
                          <a href={`https://wa.me/${phoneC}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold px-3 py-1.5 rounded-pill transition-all">
                            WhatsApp
                          </a>
                        ) : <span className="text-xs" style={{ color: '#C9A05C' }}>Sin tel</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y" style={{ borderColor: '#FAEBD1' }}>
            {recentBookings?.map((b: any) => {
              const s = statusLabels[b.status] || statusLabels.pending;
              return (
                <div key={b.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-sans font-bold text-sm" style={{ color: '#0A1628' }}>{b.tour?.name}</div>
                      <div className="font-mono text-xs" style={{ color: '#0D5C8A' }}>{b.bookingCode}</div>
                    </div>
                    <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-sans" style={{ color: '#6B5329' }}>{b.tourist?.user?.name}</span>
                    <span className="font-sans font-bold" style={{ color: '#0D5C8A' }}>${Number(b.totalAmount).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default JaladorDashboard;
