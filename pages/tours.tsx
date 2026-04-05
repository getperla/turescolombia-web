import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Layout from '../components/Layout';
import { getTours, getCategories, Tour, Category } from '../lib/api';

type Props = {
  tours: Tour[];
  categories: Category[];
  total: number;
  initialCategory: number | null;
};

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
    try {
      const res = await getTours(params);
      setTours(res.data || []);
      setTotalCount(res.total || 0);
    } catch {}
    setLoading(false);
  };

  const applyFilters = (newPage = 1) => {
    const params: Record<string, string> = { sortBy, limit: String(limit), offset: String((newPage - 1) * limit) };
    if (search) params.search = search;
    if (categoryId) params.categoryId = String(categoryId);
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    setPage(newPage);
    fetchTours(params);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(1); };

  const selectCategory = (id: number | null) => {
    setCategoryId(id);
    const params: Record<string, string> = { sortBy, limit: String(limit), offset: '0' };
    if (id) params.categoryId = String(id);
    if (search) params.search = search;
    setPage(1);
    fetchTours(params);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary-500 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Tours en Colombia</h1>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tours..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-lg outline-none"
            />
            <button type="submit" className="btn-white px-6">Buscar</button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filtros — simple */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
              <h3 className="font-bold text-gray-900 mb-3">Filtros</h3>

              <div className="mb-5">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Categoria</h4>
                <div className="space-y-1">
                  <button onClick={() => selectCategory(null)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${!categoryId ? 'bg-primary-500 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => selectCategory(cat.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${categoryId === cat.id ? 'bg-primary-500 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Precio (COP)</h4>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="input text-sm py-2" />
                  <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="input text-sm py-2" />
                </div>
              </div>

              <div className="mb-5">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Ordenar</h4>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input text-sm py-2">
                  <option value="rating">Mejor valorados</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="newest">Mas recientes</option>
                </select>
              </div>

              <button onClick={() => applyFilters(1)} className="w-full btn-primary text-sm py-2">Aplicar</button>
            </div>
          </aside>

          {/* Tours */}
          <div className="flex-1">
            <p className="text-gray-500 text-sm mb-4">{totalCount} tours encontrados</p>

            {loading ? (
              <p className="text-center py-12 text-gray-400">Cargando...</p>
            ) : tours.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No se encontraron tours</p>
                <p className="text-gray-400 text-sm mt-1">Intenta con otros filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {tours.map((tour) => (
                  <Link key={tour.id} href={`/tour/${tour.slug}`} className="card group">
                    <div className="h-44 relative overflow-hidden">
                      {tour.coverImageUrl ? (
                        <img src={tour.coverImageUrl} alt={tour.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-primary-500"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="text-white font-bold text-sm drop-shadow">{tour.name}</h3>
                      </div>
                      {tour.avgRating > 0 && (
                        <div className="absolute top-2 right-2 bg-sand-400 text-gray-900 text-xs font-bold px-2 py-1 rounded">
                          ★ {tour.avgRating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-gray-500 text-sm line-clamp-2 mb-2">{tour.shortDescription || tour.description.substring(0, 80)}</p>
                      <div className="text-xs text-gray-400 mb-3">{tour.duration} · {tour.departurePoint}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-primary-500">${tour.priceAdult.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">{tour.operator.companyName}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => applyFilters(page - 1)} disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">Anterior</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => applyFilters(p)}
                    className={`px-4 py-2 rounded-lg text-sm ${page === p ? 'bg-primary-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{p}</button>
                ))}
                <button onClick={() => applyFilters(page + 1)} disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
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
    return { props: { tours: toursRes.data || [], total: toursRes.total || 0, categories: categories || [], initialCategory: categoryId } };
  } catch {
    return { props: { tours: [], total: 0, categories: [], initialCategory: null } };
  }
};
