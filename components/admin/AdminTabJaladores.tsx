import { Btn, Skeleton, StatusBadge, exportCSV } from './shared';

type Props = {
  list: any[];
  loading: boolean;
  onEdit: (j: any) => void;
  onAction: (action: string, id: number) => void;
};

export default function AdminTabJaladores({ list, loading, onEdit, onAction }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm" style={{ color: '#717171' }}>
          {list.length} jaladores
        </span>
        <button
          onClick={() =>
            exportCSV(
              list.map((j) => ({
                nombre: j.user?.name,
                email: j.user?.email,
                zona: j.zone,
                ventas: j.totalSales,
                score: j.score,
                estado: j.status,
                codigo: j.refCode,
              })),
              'jaladores',
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
        list.map((j: any) => (
          <div
            key={j.id}
            className="flex items-center gap-3 p-3 mb-2 rounded-xl border"
            style={{ borderColor: '#EBEBEB' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: '#F5882A' }}
            >
              {j.user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>
                {j.user?.name}{' '}
                <span className="font-mono text-xs" style={{ color: '#717171' }}>
                  {j.refCode}
                </span>
              </div>
              <div className="text-xs truncate" style={{ color: '#717171' }}>
                {j.user?.email} · {j.zone || '-'} · {j.totalSales} ventas · Score {j.score}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={j.status} />
              <Btn label="Editar" bg="#F7F7F7" c="#222" onClick={() => onEdit(j)} />
              {j.status === 'pending' && (
                <Btn label="Aprobar" bg="#2D6A4F" onClick={() => onAction('approve-jalador', j.id)} />
              )}
              {j.status === 'active' && (
                <Btn
                  label="Suspender"
                  bg="#FFF0F0"
                  c="#CC3333"
                  onClick={() => onAction('suspend', j.user?.id)}
                />
              )}
              {j.status === 'suspended' && (
                <Btn
                  label="Reactivar"
                  bg="#E8F5EF"
                  c="#2D6A4F"
                  onClick={() => onAction('reactivate', j.user?.id)}
                />
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
