import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import { getJaladorRanking, Jalador } from '../lib/api';

type Props = {
  jaladores: Jalador[];
};

const badgeColors: Record<string, string> = {
  new_seller: 'bg-gray-100 text-gray-600',
  verified: 'bg-primary-100 text-primary-700',
  featured: 'bg-purple-100 text-purple-700',
  top_seller: 'bg-amber-100 text-amber-600',
  elite: 'bg-amber-200 text-amber-600',
  multilingual: 'bg-green-100 text-green-700',
};

const badgeLabels: Record<string, string> = {
  new_seller: '🆕 Nuevo',
  verified: '✅ Verificado',
  featured: '⭐ Destacado',
  top_seller: '🔥 Top Ventas',
  elite: '👑 Elite',
  multilingual: '🌍 Multilingue',
};

const rankEmojis = ['🥇', '🥈', '🥉'];

export default function JaladoresPage({ jaladores }: Props) {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-500 text-white py-14 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-20 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-20 w-60 h-60 bg-secondary-400/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            Jaladores Certificados
          </h1>
          <p className="text-lg text-primary-100">
            Asesores turisticos digitales verificados en toda Colombia. Tu guia hacia la mejor experiencia.
          </p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 left-0 w-full">
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#FAFCFE"/>
        </svg>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {jaladores.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-3">🏝️</div>
            <p className="text-gray-500 text-lg">No hay jaladores disponibles en este momento</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6 font-medium">{jaladores.length} jaladores en ranking</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jaladores.map((j, index) => (
                <div key={j.id} className={`card p-6 relative ${
                  index < 3 ? 'ring-2 ring-primary-200 shadow-md' : ''
                }`}>
                  {/* Ranking badge */}
                  {index < 3 && (
                    <div className="absolute top-4 right-4 text-2xl">
                      {rankEmojis[index]}
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-md">
                      {j.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{j.user.name}</h3>
                      <span className={`badge ${badgeColors[j.badge] || 'bg-gray-100 text-gray-600'}`}>
                        {badgeLabels[j.badge] || j.badge}
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  {j.bio && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{j.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-3 mb-4 border border-primary-100">
                    <div>
                      <div className="text-lg font-bold text-primary-600">{j.score.toFixed(0)}</div>
                      <div className="text-xs text-gray-400">Score</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary-600">{j.totalSales}</div>
                      <div className="text-xs text-gray-400">Ventas</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary-600">{j.yearsExperience}</div>
                      <div className="text-xs text-gray-400">Anos exp.</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {j.zone && (
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{j.zone}</span>
                      </div>
                    )}
                    {j.languages.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span>🌍</span>
                        <span>{j.languages.join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span>🏷️</span>
                      <span className="font-mono text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded">{j.refCode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const jaladores = await getJaladorRanking();
    return { props: { jaladores: jaladores || [] } };
  } catch {
    return { props: { jaladores: [] } };
  }
};
