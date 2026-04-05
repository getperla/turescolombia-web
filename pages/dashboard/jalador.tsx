import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import Layout from '../../components/Layout';

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  confirmed: 'bg-primary-100 text-primary-700',
  pending: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const JaladorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/jalador');
        setData(data);
      } catch {
        setError('No se pudo cargar el dashboard. Verifica que hayas iniciado sesion como jalador.');
      }
    };
    load();
  }, []);

  if (error) return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-primary-500 hover:underline">Volver al inicio</Link>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    </Layout>
  );

  const { jalador, sales, commissions, rating, recentBookings } = data;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-md">
            {jalador.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-700">{jalador.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span className="badge bg-amber-100 text-amber-600">
                {jalador.badge?.replace('_', ' ').toUpperCase()}
              </span>
              <span>📍 {jalador.zone}</span>
              <span>⭐ {jalador.score}</span>
              <span className="font-mono text-primary-500 bg-primary-50 px-2 py-0.5 rounded">🏷️ {jalador.refCode}</span>
            </div>
          </div>
        </div>

        {/* Link compartible — el arma del jalador */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-gray-900 mb-2">🔗 Tu link de ventas</h3>
          <p className="text-sm text-gray-500 mb-3">Comparte este link con tus clientes. Cuando reserven, tu comision se genera automaticamente.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-4 py-3 rounded-xl text-sm font-mono text-primary-600 border border-primary-100 truncate">
              {typeof window !== 'undefined' ? window.location.origin : ''}/j/{jalador.refCode}/tours
            </code>
            <button
              onClick={() => {
                const url = `${window.location.origin}/j/${jalador.refCode}/tours`;
                navigator.clipboard.writeText(url);
                alert('Link copiado!');
              }}
              className="shrink-0 bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-3 rounded-xl transition-all"
            >
              Copiar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Tambien puedes compartir un tour especifico: /j/{jalador.refCode}/nombre-del-tour</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 text-center border border-primary-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-primary-100 rounded-xl flex items-center justify-center text-xl">📊</div>
            <div className="text-2xl font-bold text-primary-600">{sales.today}</div>
            <div className="text-sm text-gray-400">Ventas hoy</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-green-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center text-xl">📈</div>
            <div className="text-2xl font-bold text-secondary-500">{sales.week}</div>
            <div className="text-sm text-gray-400">Ventas semana</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-amber-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-amber-100 rounded-xl flex items-center justify-center text-xl">🗓️</div>
            <div className="text-2xl font-bold text-amber-600">{sales.month}</div>
            <div className="text-sm text-gray-400">Ventas mes</div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center border border-red-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-red-100 rounded-xl flex items-center justify-center text-xl">⭐</div>
            <div className="text-2xl font-bold text-red-500">{rating.average?.toFixed(1) || '0'}</div>
            <div className="text-sm text-gray-400">{rating.totalReviews} resenas</div>
          </div>
        </div>

        {/* Commissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-secondary-700 mb-2">Comisiones pendientes</h3>
            <div className="text-2xl font-bold text-amber-600">${Number(commissions.pending).toLocaleString()}</div>
            <div className="text-sm text-gray-400">{commissions.pendingCount} transacciones</div>
          </div>
          <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-secondary-700 mb-2">Total ganado</h3>
            <div className="text-2xl font-bold text-secondary-500">${Number(commissions.totalEarned).toLocaleString()}</div>
            <div className="text-sm text-gray-400">Pagado: ${Number(commissions.totalPaid).toLocaleString()}</div>
          </div>
        </div>

        {/* Recent sales */}
        <h3 className="text-lg font-bold text-secondary-700 mb-3">Ultimas ventas</h3>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50 text-left text-sm text-primary-700">
                <th className="px-4 py-3 border-b border-primary-100 font-semibold">Codigo</th>
                <th className="px-4 py-3 border-b border-primary-100 font-semibold">Tour</th>
                <th className="px-4 py-3 border-b border-primary-100 font-semibold">Turista</th>
                <th className="px-4 py-3 border-b border-primary-100 font-semibold">Estado</th>
                <th className="px-4 py-3 border-b border-primary-100 font-semibold text-right">Total</th>
                <th className="px-4 py-3 border-b border-primary-100 font-semibold text-right">Enviar</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings?.map((b: any) => {
                const phone = b.tourist?.user?.phone?.replace(/\D/g, '') || '';
                const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
                const whatsappMsg = [
                  `Hola ${b.tourist?.user?.name}! Tu reserva con TuresColombia esta confirmada`,
                  ``,
                  `*${b.tour?.name}*`,
                  `Fecha: ${new Date(b.tourDate).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
                  `Hora de salida: ${b.tour?.departureTime || ''}`,
                  `Punto de encuentro: ${b.tour?.departurePoint || ''}`,
                  `Total: $${Number(b.totalAmount).toLocaleString()} COP`,
                  ``,
                  `Codigo de reserva: *${b.bookingCode}*`,
                  ``,
                  `Presenta este mensaje el dia del tour.`,
                  `Gracias por confiar en TuresColombia!`,
                ].join('\n');
                const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(whatsappMsg)}`;

                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-primary-600">{b.bookingCode}</td>
                    <td className="px-4 py-3 text-sm font-medium">{b.tour?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{b.tourist?.user?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusStyles[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-primary-600">
                      ${Number(b.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {phone ? (
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                          title="Enviar confirmacion por WhatsApp">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Sin tel</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default JaladorDashboard;
