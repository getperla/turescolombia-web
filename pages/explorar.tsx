import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { getTours, getCategories, Tour, Category } from '../lib/api';
import Layout from '../components/Layout';

type Props = {
  tours: Tour[];
  categories: Category[];
};

export default function Explorar({ tours, categories }: Props) {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden text-white py-20 md:py-28 px-4" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="glass inline-block px-5 py-2 text-sm font-sans font-medium mb-8 tracking-wider uppercase" style={{ letterSpacing: '3px', fontSize: '11px' }}>
            Santa Marta · Tayrona · Sierra Nevada
          </div>
          <h1 className="font-display font-bold mb-6 leading-tight" style={{ fontSize: 'clamp(36px, 7vw, 72px)' }}>
            Descubre el
            <br />
            <span className="italic" style={{ color: '#F5882A' }}>Caribe colombiano</span>
          </h1>
          <p className="font-sans text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto leading-relaxed" style={{ fontWeight: 300 }}>
            Tours verificados en los destinos mas increibles de Colombia.
            Reserva facil, paga seguro, vive al maximo.
          </p>
          <Link href="/tours" className="btn-primary text-lg">
            Ver todos los tours
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0,50 C360,80 720,20 1080,50 C1260,65 1380,40 1440,50 L1440,80 L0,80 Z" fill="#FDF3E3"/>
          </svg>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Categorias */}
        {categories.length > 0 && (
          <section className="mb-14">
            <h2 className="section-title mb-2">Que quieres vivir?</h2>
            <p className="section-subtitle mb-6">Escoge una aventura y empieza a sonar</p>
            <div className="flex gap-3 overflow-x-auto pb-3">
              {categories.map((cat, i) => {
                const colors = ['#0D5C8A', '#F5882A', '#2D6A4F', '#00B4CC', '#FF5F5F', '#0A4A6F', '#E07020'];
                return (
                  <Link key={cat.id} href={`/tours?categoryId=${cat.id}`}
                    className="shrink-0 px-6 py-3 text-white text-sm font-semibold transition-all hover:-translate-y-1"
                    style={{ background: colors[i % colors.length], borderRadius: '50px' }}>
                    {cat.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Tours populares */}
        <section className="mb-14">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="section-title">Tours <span className="italic" style={{ color: '#F5882A' }}>populares</span></h2>
              <p className="section-subtitle">Los favoritos de nuestros viajeros</p>
            </div>
            <Link href="/tours" className="text-sm font-semibold flex items-center gap-1 transition-colors hover:-translate-y-0.5" style={{ color: '#0D5C8A' }}>
              Ver todos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {tours.map((tour) => (
              <Link key={tour.id} href={`/tour/${tour.slug}`} className="card group">
                <div className="h-52 relative overflow-hidden">
                  {tour.coverImageUrl ? (
                    <img src={tour.coverImageUrl} alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-hero-dark"></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <h4 className="text-white font-display font-bold text-lg drop-shadow-lg">{tour.name}</h4>
                  </div>
                  {tour.category && (
                    <div className="absolute top-4 left-4">
                      <span className="badge text-white" style={{ background: '#F5882A' }}>{tour.category.name}</span>
                    </div>
                  )}
                  {tour.avgRating > 0 && (
                    <div className="absolute top-4 right-4 bg-white text-oscuro-500 text-xs font-bold px-2.5 py-1 rounded-pill shadow-sm">
                      {tour.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-sm line-clamp-2 mb-4 leading-relaxed" style={{ color: '#6B5329' }}>
                    {tour.shortDescription || tour.description.substring(0, 90) + '...'}
                  </p>
                  <div className="text-xs mb-4 flex items-center gap-3" style={{ color: '#C9A05C' }}>
                    <span>{tour.duration}</span><span>·</span><span>{tour.departurePoint}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: '#FAEBD1' }}>
                    <div>
                      <span className="text-xs" style={{ color: '#C9A05C' }}>Desde</span>
                      <span className="block text-xl font-bold" style={{ color: '#0D5C8A' }}>${tour.priceAdult.toLocaleString()}</span>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-pill font-medium" style={{ background: '#FDF3E3', color: '#6B5329' }}>
                      {tour.operator.companyName}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Por que TuresColombia */}
        <section className="rounded-card p-8 md:p-12 mb-14 text-white" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-center mb-10">
            Por que <span className="italic" style={{ color: '#F5882A' }}>TuresColombia</span>?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="glass w-16 h-16 mx-auto mb-3 flex items-center justify-center text-2xl">🛡</div>
              <div className="text-2xl font-bold" style={{ color: '#00B4CC' }}>100%</div>
              <div className="text-white/50 text-sm mt-1">Pago seguro</div>
            </div>
            <div>
              <div className="glass w-16 h-16 mx-auto mb-3 flex items-center justify-center text-2xl">✓</div>
              <div className="text-2xl font-bold" style={{ color: '#00B4CC' }}>17+</div>
              <div className="text-white/50 text-sm mt-1">Tours verificados</div>
            </div>
            <div>
              <div className="glass w-16 h-16 mx-auto mb-3 flex items-center justify-center text-2xl">📱</div>
              <div className="text-2xl font-bold" style={{ color: '#00B4CC' }}>QR</div>
              <div className="text-white/50 text-sm mt-1">Comprobante digital</div>
            </div>
            <div>
              <div className="glass w-16 h-16 mx-auto mb-3 flex items-center justify-center text-2xl">★</div>
              <div className="text-2xl font-bold" style={{ color: '#00B4CC' }}>4.7</div>
              <div className="text-white/50 text-sm mt-1">Rating promedio</div>
            </div>
          </div>
        </section>

        {/* CTA Jaladores */}
        <section className="relative overflow-hidden rounded-card p-8 md:p-12 text-white text-center mb-4" style={{ background: 'linear-gradient(135deg, #F5882A, #FF5F5F)' }}>
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-3">
            Quieres ganar dinero vendiendo tours?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto leading-relaxed font-sans" style={{ fontWeight: 300 }}>
            Registrate como Asesor y gana mas del 20% de comision por cada venta.
          </p>
          <Link href="/register" className="btn-white inline-block text-lg">
            Registrarme como Asesor
          </Link>
        </section>
      </main>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const [toursRes, categories] = await Promise.all([
      getTours({ sortBy: 'rating', limit: '6' }),
      getCategories(),
    ]);
    return { props: { tours: toursRes.data || [], categories: categories || [] } };
  } catch {
    return { props: { tours: [], categories: [] } };
  }
};
