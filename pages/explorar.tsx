import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { getTours, getCategories, Tour, Category } from '../lib/api';
import Layout from '../components/Layout';

const categoryIcons: Record<string, string> = {
  playas: '🏖️',
  ciudad: '🏛️',
  aventura: '⛰️',
  nautico: '⛵',
  fiesta: '🎉',
  naturaleza: '🌿',
  multidia: '🏕️',
};

type Props = { tours: Tour[]; categories: Category[] };

export default function Explorar({ tours: initialTours, categories }: Props) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectCategory = async (catId: number | null) => {
    setActiveCategory(catId);
    setLoading(true);
    try {
      const params: Record<string, string> = { sortBy: 'rating', limit: '20' };
      if (catId) params.categoryId = String(catId);
      const res = await getTours(params);
      setTours(res.data || []);
    } catch {}
    setLoading(false);
  };

  return (
    <Layout>
      <Head><title>Explorar tours en Santa Marta — TuresColombia</title></Head>

      {/* Categories bar — Airbnb style */}
      <div className="sticky top-16 md:top-20 z-40 bg-white border-b" style={{ borderColor: '#EBEBEB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => selectCategory(null)}
              className="flex flex-col items-center gap-1 shrink-0 pb-2 transition-all"
              style={{ borderBottom: !activeCategory ? '2px solid #222222' : '2px solid transparent', opacity: !activeCategory ? 1 : 0.6 }}
            >
              <span className="text-xl">🌍</span>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#222222' }}>Todos</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className="flex flex-col items-center gap-1 shrink-0 pb-2 transition-all"
                style={{ borderBottom: activeCategory === cat.id ? '2px solid #222222' : '2px solid transparent', opacity: activeCategory === cat.id ? 1 : 0.6 }}
              >
                <span className="text-xl">{categoryIcons[cat.slug] || '🎯'}</span>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#222222' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tour grid — Airbnb cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="animate-pulse">
                <div className="rounded-xl h-64 mb-3" style={{ background: '#F0F0F0' }}></div>
                <div className="h-4 rounded w-3/4 mb-2" style={{ background: '#F0F0F0' }}></div>
                <div className="h-3 rounded w-1/2" style={{ background: '#F0F0F0' }}></div>
              </div>
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏝️</div>
            <p className="text-lg font-semibold" style={{ color: '#222222' }}>No hay tours en esta categoria</p>
            <p className="text-sm mt-1" style={{ color: '#717171' }}>Intenta con otra categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tours.map((tour) => (
              <Link key={tour.id} href={`/tour/${tour.slug}`} className="group">
                {/* Image */}
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-3">
                  {tour.coverImageUrl ? (
                    <img src={tour.coverImageUrl} alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}></div>
                  )}
                  {/* Favorite heart */}
                  <button className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center" onClick={(e) => e.preventDefault()}>
                    <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  {tour.isFeatured && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'white', color: '#222222' }}>
                      Destacado
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: '#222222' }}>{tour.name}</h3>
                    {tour.avgRating > 0 && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <svg className="w-3.5 h-3.5" fill="#222222" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span className="text-sm font-medium" style={{ color: '#222222' }}>{tour.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#717171' }}>{tour.operator.companyName}</p>
                  <p className="text-sm" style={{ color: '#717171' }}>{tour.duration} · {tour.departurePoint}</p>
                  <div className="mt-1.5">
                    <span className="font-semibold text-sm" style={{ color: '#222222' }}>${tour.priceAdult.toLocaleString()} COP</span>
                    <span className="text-sm" style={{ color: '#717171' }}> / persona</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const [toursRes, categories] = await Promise.all([
      getTours({ sortBy: 'rating', limit: '20' }),
      getCategories(),
    ]);
    return { props: { tours: toursRes.data || [], categories: categories || [] } };
  } catch {
    return { props: { tours: [], categories: [] } };
  }
};
