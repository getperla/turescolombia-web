import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { getTours, getCategories, Tour, Category } from '../lib/api';
import Layout from '../components/Layout';

const categoryIcons: Record<string, string> = {
  playas: '🏖️', ciudad: '🏛️', aventura: '⛰️', náutico: '⛵', fiesta: '🎉', naturaleza: '🌿', multidia: '🏕️',
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
      const params: Record<string, string> = { sortBy: 'rating', limit: '50' };
      if (catId) params.categoryId = String(catId);
      const res = await getTours(params);
      setTours(res.data || []);
    } catch {}
    setLoading(false);
  };

  return (
    <Layout>
      <Head><title>Tours en Santa Marta — La Perla</title></Head>

      {/* Categories — simple sticky */}
      <div className="sticky top-16 md:top-20 z-40 bg-white border-b" style={{ borderColor: '#EBEBEB' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide">
            <button onClick={() => selectCategory(null)}
              className="flex flex-col items-center gap-1 shrink-0 pb-1"
              style={{ borderBottom: !activeCategory ? '2px solid #222' : '2px solid transparent', opacity: !activeCategory ? 1 : 0.5 }}>
              <span className="text-lg">🌍</span>
              <span className="text-xs font-semibold" style={{ color: '#222' }}>Todos</span>
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => selectCategory(cat.id)}
                className="flex flex-col items-center gap-1 shrink-0 pb-1"
                style={{ borderBottom: activeCategory === cat.id ? '2px solid #222' : '2px solid transparent', opacity: activeCategory === cat.id ? 1 : 0.5 }}>
                <span className="text-lg">{categoryIcons[cat.slug] || '🎯'}</span>
                <span className="text-xs font-semibold" style={{ color: '#222' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tours grid — simple */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="rounded-xl h-48 mb-2" style={{ background: '#F0F0F0' }}></div>
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: '#F0F0F0' }}></div>
                <div className="h-3 rounded w-1/2" style={{ background: '#F0F0F0' }}></div>
              </div>
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-semibold" style={{ color: '#222' }}>No hay tours en esta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tours.map((tour) => (
              <Link key={tour.id} href={`/tour/${tour.slug}`} className="group">
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-2">
                  {tour.coverImageUrl ? (
                    <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>
                  )}
                  {tour.avgRating > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'white', color: '#222' }}>
                      ★ {tour.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="font-semibold text-sm" style={{ color: '#222' }}>{tour.name}</div>
                <div className="text-xs" style={{ color: '#717171' }}>{tour.operator.companyName} · {tour.duration}</div>
                <div className="mt-1">
                  <span className="font-semibold text-sm" style={{ color: '#222' }}>${tour.priceAdult.toLocaleString()}</span>
                  <span className="text-xs" style={{ color: '#717171' }}> / persona</span>
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
    const [toursRes, categories] = await Promise.all([getTours({ sortBy: 'rating', limit: '50' }), getCategories()]);
    return { props: { tours: toursRes.data || [], categories: categories || [] } };
  } catch { return { props: { tours: [], categories: [] } }; }
};
