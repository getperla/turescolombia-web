import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { getTours, Tour } from '../lib/api';
import Layout from '../components/Layout';
import { useFavorites } from '../lib/useFavorites';

export default function Favoritos() {
  const { favorites, toggle, isFavorite } = useFavorites();
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTours({ limit: '100' })
      .then(res => setAllTours(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const favTours = allTours.filter(t => favorites.includes(t.id));

  return (
    <Layout>
      <Head><title>Mis Favoritos — La Perla</title></Head>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-bold text-xl mb-1" style={{ color: '#222' }}>Mis Favoritos</h1>
        <p className="text-sm mb-6" style={{ color: '#717171' }}>
          {favorites.length === 0 ? 'Aún no tienes tours guardados' : `${favorites.length} tour${favorites.length !== 1 ? 'es' : ''} guardado${favorites.length !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="rounded-xl h-48 mb-2" style={{ background: '#F0F0F0' }}></div>
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: '#F0F0F0' }}></div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">❤️</div>
            <p className="font-semibold text-lg mb-2" style={{ color: '#222' }}>Guarda tus tours favoritos</p>
            <p className="text-sm mb-6" style={{ color: '#717171' }}>Toca el corazón en cualquier tour para guardarlo aquí</p>
            <Link href="/explorar" className="inline-block px-6 py-3 rounded-full text-sm font-semibold text-white" style={{ background: '#222' }}>
              Explorar tours
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favTours.map(tour => (
              <div key={tour.id} className="group relative">
                <button
                  onClick={() => toggle(tour.id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm transition-all hover:scale-110"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF385C" stroke="#FF385C" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <Link href={`/tour/${tour.slug}`} className="block">
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-2">
                    {tour.coverImageUrl ? (
                      <Image src={tour.coverImageUrl} alt={tour.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full" style={{ background: '#F0F0F0' }}></div>
                    )}
                  </div>
                  <div className="font-semibold text-sm" style={{ color: '#222' }}>{tour.name}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{tour.operator.companyName}</div>
                  <div className="mt-1">
                    <span className="font-semibold text-sm" style={{ color: '#222' }}>${tour.priceAdult.toLocaleString()}</span>
                    <span className="text-xs" style={{ color: '#717171' }}> / persona</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
