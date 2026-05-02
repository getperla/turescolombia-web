import { Skeleton, StatusBadge, exportCSV } from './shared';

type Props = {
  list: any[];
  loading: boolean;
};

export default function AdminTabBookings({ list, loading }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm" style={{ color: '#717171' }}>
          {list.length} reservas
        </span>
        <button
          onClick={() =>
            exportCSV(
              list.map((b) => ({
                codigo: b.bookingCode,
                tour: b.tour?.name,
                cliente: b.tourist?.user?.name,
                fecha: b.tourDate,
                monto: b.totalAmount,
                estado: b.status,
              })),
              'reservas',
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
        list.map((b: any) => (
          <div
            key={b.id}
            className="flex items-center gap-3 p-3 mb-2 rounded-xl border"
            style={{ borderColor: '#EBEBEB' }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>
                {b.tour?.name}
              </div>
              <div className="text-xs truncate" style={{ color: '#717171' }}>
                {b.bookingCode} · {b.tourist?.user?.name || 'Cliente'} ·{' '}
                {new Date(b.tourDate).toLocaleDateString('es-CO')}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold text-sm" style={{ color: '#222' }}>
                ${Number(b.totalAmount).toLocaleString()}
              </div>
              <StatusBadge status={b.status} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
