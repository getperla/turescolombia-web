import Image from 'next/image';
import { Btn, Skeleton, StatusBadge, exportCSV } from './shared';

type Props = {
  list: any[];
  loading: boolean;
  onAction: (action: string, id: number) => void;
};

export default function AdminTabTours({ list, loading, onAction }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm" style={{ color: '#717171' }}>
          {list.length} tours
        </span>
        <button
          onClick={() =>
            exportCSV(
              list.map((t) => ({
                nombre: t.name,
                operador: t.operator?.companyName,
                precio: t.priceAdult,
                reservas: t.totalBookings,
                rating: t.avgRating,
                estado: t.status,
              })),
              'tours',
            )
          }
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: '#F7F7F7', color: '#222' }}
        >
          Exportar CSV
        </button>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        list.map((t: any) => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3 mb-2 rounded-xl border"
            style={{ borderColor: '#EBEBEB' }}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
              {t.coverImageUrl ? (
                <Image src={t.coverImageUrl} alt={t.name} fill sizes="48px" className="object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: '#F0F0F0' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>
                {t.name}
              </div>
              <div className="text-xs truncate" style={{ color: '#717171' }}>
                {t.operator?.companyName} · ${t.priceAdult?.toLocaleString()} · {t.totalBookings}{' '}
                reservas · ★{t.avgRating?.toFixed(1)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={t.status} />
              {t.status === 'pending_review' && (
                <>
                  <Btn label="Aprobar" bg="#2D6A4F" onClick={() => onAction('approve-tour', t.id)} />
                  <Btn
                    label="Rechazar"
                    bg="#FFF0F0"
                    c="#CC3333"
                    onClick={() => onAction('reject-tour', t.id)}
                  />
                </>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
