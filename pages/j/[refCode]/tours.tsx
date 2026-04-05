import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { getTours, getCategories, Tour, Category, Jalador } from '../../../lib/api';
import api from '../../../lib/api';
import Layout from '../../../components/Layout';

type Props = {
  tours: Tour[];
  categories: Category[];
  jalador: Jalador | null;
  refCode: string;
};

export default function JaladorTours({ tours, categories, jalador, refCode }: Props) {
  return (
    <Layout>
      {/* Header con info del jalador */}
      <div className="bg-tropical-gradient text-white py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {jalador && (
            <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                {jalador.user.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="font-bold">{jalador.user.name}</div>
                <div className="text-xs text-white/70">⭐ {jalador.score} pts · {jalador.totalSales} ventas</div>
              </div>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            Tours disponibles
          </h1>
          <p className="text-white/80">Escoge tu aventura y reserva en 1 minuto</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categorias */}
        {categories.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-4 mb-8">
            {categories.map((cat, i) => {
              const colors = ['bg-primary-500', 'bg-coral-500', 'bg-secondary-500', 'bg-palm-600', 'bg-sand-500', 'bg-primary-600'];
              return (
                <span key={cat.id} className={`shrink-0 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold ${colors[i % colors.length]}`}>
                  {cat.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Grid de tours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map((tour) => (
            <Link key={tour.id} href={`/j/${refCode}/${tour.slug}`} className="card group">
              <div className="h-48 relative overflow-hidden">
                {tour.coverImageUrl ? (
                  <img src={tour.coverImageUrl} alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-tropical-gradient"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h4 className="text-white font-bold text-base drop-shadow-lg">{tour.name}</h4>
                </div>
                {tour.avgRating > 0 && (
                  <div className="absolute top-3 right-3 bg-sand-400 text-gray-900 text-xs font-bold px-2.5 py-1 rounded-xl">
                    ⭐ {tour.avgRating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">{tour.shortDescription || tour.description.substring(0, 80) + '...'}</p>
                <div className="text-xs text-gray-400 mb-3">🕐 {tour.duration} · 📍 {tour.departurePoint}</div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-400">Desde</span>
                    <span className="block text-xl font-bold text-primary-600">${tour.priceAdult.toLocaleString()}</span>
                  </div>
                  <span className="bg-primary-500 text-white text-sm font-bold px-4 py-2 rounded-xl group-hover:bg-primary-600 transition-colors">
                    Reservar
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {tours.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏝️</div>
            <p className="text-gray-500 text-lg">No hay tours disponibles en este momento</p>
          </div>
        )}
      </main>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { refCode } = context.params as { refCode: string };

  try {
    const [toursRes, categories] = await Promise.all([
      getTours({ sortBy: 'rating', limit: '20' }),
      getCategories(),
    ]);

    let jalador: Jalador | null = null;
    try {
      const { data } = await api.get(`/users/jaladores/ref/${refCode}`);
      jalador = data;
    } catch {}

    return { props: { tours: toursRes.data || [], categories: categories || [], jalador, refCode } };
  } catch {
    return { props: { tours: [], categories: [], jalador: null, refCode } };
  }
};
