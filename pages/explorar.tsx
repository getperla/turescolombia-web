import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { getTours, getCategories, Tour, Category } from '../lib/api';
import Layout from '../components/Layout';
import { SkeletonTourGrid } from '../components/Skeleton';
import { useFavorites } from '../lib/useFavorites';

const categoryIcons: Record<string, string> = {
  playas: '🏖️', playa: '🏖️', ciudad: '🏛️', cultural: '🏛️', aventura: '⛰️',
  náutico: '⛵', fiesta: '🎉', naturaleza: '🌿', gastronomia: '🍽️', multidia: '🏕️',
};

const priceRanges = [
  { label: 'Todos', min: 0, max: Infinity },
  { label: 'Hasta $100k', min: 0, max: 100000 },
  { label: '$100k – $200k', min: 100000, max: 200000 },
  { label: '$200k – $500k', min: 200000, max: 500000 },
  { label: '$500k+', min: 500000, max: Infinity },
];

export default function Explorar() {
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState(0);
  const [sortBy, setSortBy] = useState<'rating' | 'price-asc' | 'price-desc'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const { toggle, isFavorite } = useFavorites();

  useEffect(() => {
    Promise.all([
      getTours({ sortBy: 'rating', limit: '100' }),
      getCategories(),
    ]).then(([toursRes, cats]) => {
      setAllTours(toursRes.data || []);
      setCategories(cats || []);
    }).catch((e) => console.error('Failed to load tours/categories:', e)).finally(() => setLoading(false));
  }, []);

  // Debounce de busqueda — evita filtrar en cada tecla (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredTours = useMemo(() => {
    let result = allTours;
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.operator.companyName.toLowerCase().includes(q) ||
        (t.location || '').toLowerCase().includes(q) ||
        (t.departurePoint || '').toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter(t => (t as any).category?.id === activeCategory);
    }
    const range = priceRanges[priceRange];
    result = result.filter(t => t.priceAdult >= range.min && t.priceAdult < range.max);
    // Sort — siempre devolvemos array nuevo para no mutar allTours
    const sorted = [...result];
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.priceAdult - b.priceAdult);
    else if (sortBy === 'price-desc') sorted.sort((a, b) => b.priceAdult - a.priceAdult);
    else sorted.sort((a, b) => b.avgRating - a.avgRating);
    return sorted;
  }, [allTours, debouncedQuery, activeCategory, priceRange, sortBy]);

  return (
    <Layout>
      <Head><title>Tours en Santa Marta — La Perla</title></Head>

      {/* Search bar */}
      <div className="sticky top-16 md:top-20 z-40 bg-white border-b" style={{ borderColor: '#EBEBEB' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar tours, operadores, destinos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full border text-sm"
                style={{ borderColor: '#DDDDDD', color: '#222' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Limpiar busqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#717171' }}>✕</button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-semibold shrink-0"
              style={{ borderColor: showFilters ? '#222' : '#DDDDDD', color: '#222' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-3 pb-1 space-y-3">
              {/* Price range */}
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>Precio</div>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((r, i) => (
                    <button key={i} onClick={() => setPriceRange(i)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{ borderColor: priceRange === i ? '#222' : '#EBEBEB', background: priceRange === i ? '#222' : 'white', color: priceRange === i ? 'white' : '#222' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>Ordenar por</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'rating' as const, label: '⭐ Mejor valorados' },
                    { key: 'price-asc' as const, label: '💰 Precio: menor a mayor' },
                    { key: 'price-desc' as const, label: '💎 Precio: mayor a menor' },
                  ].map(s => (
                    <button key={s.key} onClick={() => setSortBy(s.key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{ borderColor: sortBy === s.key ? '#222' : '#EBEBEB', background: sortBy === s.key ? '#222' : 'white', color: sortBy === s.key ? 'white' : '#222' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="flex items-center gap-6 overflow-x-auto pt-2 scrollbar-hide">
            <button onClick={() => setActiveCategory(null)}
              className="flex flex-col items-center gap-1 shrink-0 pb-1"
              style={{ borderBottom: !activeCategory ? '2px solid #222' : '2px solid transparent', opacity: !activeCategory ? 1 : 0.5 }}>
              <span className="text-lg">🌍</span>
              <span className="text-xs font-semibold" style={{ color: '#222' }}>Todos</span>
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className="flex flex-col items-center gap-1 shrink-0 pb-1"
                style={{ borderBottom: activeCategory === cat.id ? '2px solid #222' : '2px solid transparent', opacity: activeCategory === cat.id ? 1 : 0.5 }}>
                <span className="text-lg">{categoryIcons[cat.slug] || '🎯'}</span>
                <span className="text-xs font-semibold" style={{ color: '#222' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <span className="text-sm" style={{ color: '#717171' }}>
          {loading ? 'Cargando tours...' : `${filteredTours.length} tour${filteredTours.length !== 1 ? 'es' : ''} encontrado${filteredTours.length !== 1 ? 's' : ''}`}
          {searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </span>
      </div>

      {/* Tours grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <SkeletonTourGrid count={8} />
        ) : filteredTours.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🏝️</div>
            <p className="font-semibold mb-1" style={{ color: '#222' }}>No encontramos tours</p>
            <p className="text-sm" style={{ color: '#717171' }}>Intenta con otros filtros o busca algo diferente</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory(null); setPriceRange(0); }}
              className="mt-4 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: '#222', color: 'white' }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTours.map((tour) => (
              <div key={tour.id} className="group relative">
                {/* Favorite button */}
                <button
                  onClick={(e) => { e.preventDefault(); toggle(tour.id); }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm transition-all hover:scale-110"
                  title={isFavorite(tour.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorite(tour.id) ? '#FF385C' : 'none'} stroke={isFavorite(tour.id) ? '#FF385C' : '#222'} strokeWidth={2}>
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
                    {tour.avgRating > 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'white', color: '#222' }}>
                        ★ {tour.avgRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-sm" style={{ color: '#222' }}>{tour.name}</div>
                  <div className="text-xs" style={{ color: '#717171' }}>{tour.operator.companyName} · {(tour as any).duration || '10 horas'}</div>
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
