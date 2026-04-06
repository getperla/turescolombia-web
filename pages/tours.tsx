import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { getTours, getCategories, Tour, Category } from '../lib/api';

type Props = { tours: Tour[]; categories: Category[]; total: number; initialCategory: number | null };

export default function ToursPage({ tours: initialTours, categories, total, initialCategory }: Props) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(initialCategory);
  const [sortBy, setSortBy] = useState('rating');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
  const limit = 12;

  const fetchTours = async (params: Record<string, string>) => {
    setLoading(true);
    try { const res = await getTours(params); setTours(res.data || []); setTotalCount(res.total || 0); } catch {}
    setLoading(false);
  };

  const applyFilters = (newPage = 1) => {
    const params: Record<string, string> = { sortBy, limit: String(limit), offset: String((newPage - 1) * limit) };
    if (search) params.search = search;
    if (categoryId) params.categoryId = String(categoryId);
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    setPage(newPage); fetchTours(params);
  };

  const selectCategory = (id: number | null) => {
    setCategoryId(id);
    const params: Record<string, string> = { sortBy, limit: String(limit), offset: '0' };
    if (id) params.categoryId = String(id);
    if (search) params.search = search;
    setPage(1); fetchTours(params);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Layout>
      <Head><title>Tours en Colombia — TuresColombia</title></Head>

      {/* Header */}
      <section className="text-white py-12 px-4" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-6">
            Tours en <span className="italic" style={{ color: '#F5882A' }}>Colombia</span>
          </h1>
          <form onSubmit={(e) => { e.preventDefault(); applyFilters(1); }} className="max-w-2xl mx-auto flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tours..."
              className="flex-1 px-5 py-3.5 rounded-pill text-sm outline-none font-sans" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} />
            <button type="submit" className="btn-primary px-6">Buscar</button>
          </form>
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto mt-6 justify-center pb-2">
            <button onClick={() => selectCategory(null)} className={!categoryId ? 'chip-active' : 'chip-inactive'} style={!categoryId ? {} : { color: 'white', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              Todos
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => selectCategory(cat.id)}
                className={categoryId === cat.id ? 'chip-active' : 'chip-inactive'}
                style={categoryId !== cat.id ? { color: 'white', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' } : {}}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filtros */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="bg-white rounded-card p-5 shadow-card sticky top-20">
              <h3 className="font-display font-bold mb-4" style={{ color: '#0A1628' }}>Filtros</h3>
              <div className="mb-5">
                <h4 className="text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: '#C9A05C', letterSpacing: '1.5px' }}>Precio (COP)</h4>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="input text-sm py-2" />
                  <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="input text-sm py-2" />
                </div>
              </div>
              <div className="mb-5">
                <h4 className="text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: '#C9A05C', letterSpacing: '1.5px' }}>Ordenar</h4>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input text-sm py-2">
                  <option value="rating">Mejor valorados</option>
                  <option value="price">Precio: menor a mayor</option>
                  <option value="newest">Mas recientes</option>
                </select>
              </div>
              <button onClick={() => applyFilters(1)} className="w-full btn-primary text-sm py-2.5">Aplicar</button>
            </div>
          </aside>

          {/* Tours grid */}
          <div className="flex-1">
            <p className="text-sm font-sans mb-5" style={{ color: '#C9A05C' }}>{totalCount} tours encontrados</p>

            {loading ? (
              <p className="text-center py-12 font-sans" style={{ color: '#C9A05C' }}>Cargando...</p>
            ) : tours.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🏝️</div>
                <p className="font-display font-bold text-xl" style={{ color: '#0A1628' }}>No se encontraron tours</p>
                <p className="font-sans text-sm mt-1" style={{ color: '#C9A05C' }}>Intenta con otros filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {tours.map((tour) => (
                  <Link key={tour.id} href={`/tour/${tour.slug}`} className="card group">
                    <div className="h-48 relative overflow-hidden">
                      {tour.coverImageUrl ? (
                        <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-white font-display font-bold text-base drop-shadow-lg">{tour.name}</h3>
                      </div>
                      {tour.category && (
                        <div className="absolute top-3 left-3">
                          <span className="badge text-white" style={{ background: '#F5882A' }}>{tour.category.name}</span>
                        </div>
                      )}
                      {tour.avgRating > 0 && (
                        <div className="absolute top-3 right-3 bg-white text-xs font-bold px-2 py-1 rounded-pill shadow-sm" style={{ color: '#0A1628' }}>
                          {tour.avgRating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-sm line-clamp-2 mb-3 font-sans" style={{ color: '#6B5329' }}>
                        {tour.shortDescription || tour.description.substring(0, 80) + '...'}
                      </p>
                      <div className="text-xs font-sans mb-3" style={{ color: '#C9A05C' }}>
                        {tour.duration} · {tour.departurePoint}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: '#FAEBD1' }}>
                        <div>
                          <span className="text-xs" style={{ color: '#C9A05C' }}>Desde</span>
                          <span className="block text-lg font-bold" style={{ color: '#0D5C8A' }}>${tour.priceAdult.toLocaleString()}</span>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-pill font-sans" style={{ background: '#FDF3E3', color: '#6B5329' }}>{tour.operator.companyName}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Paginacion */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} onClick={() => applyFilters(i + 1)}
                    className="w-10 h-10 rounded-full font-sans font-semibold text-sm transition-all"
                    style={page === i + 1 ? { background: '#0D5C8A', color: 'white' } : { background: '#FDF3E3', color: '#6B5329' }}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const categoryId = context.query.categoryId ? Number(context.query.categoryId) : null;
  try {
    const params: Record<string, string> = { sortBy: 'rating', limit: '12' };
    if (categoryId) params.categoryId = String(categoryId);
    const [toursRes, categories] = await Promise.all([getTours(params), getCategories()]);
    return { props: { tours: toursRes.data || [], categories: categories || [], total: toursRes.total || 0, initialCategory: categoryId } };
  } catch {
    return { props: { tours: [], categories: [], total: 0, initialCategory: null } };
  }
};
