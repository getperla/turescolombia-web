import { Btn, Skeleton, StatusBadge, exportCSV } from './shared';

type Props = {
  list: any[];
  loading: boolean;
  onEdit: (op: any) => void;
  onAction: (action: string, id: number) => void;
};

export default function AdminTabOperadores({ list, loading, onEdit, onAction }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm" style={{ color: '#717171' }}>
          {list.length} operadores
        </span>
        <button
          onClick={() =>
            exportCSV(
              list.map((o) => ({
                empresa: o.companyName,
                email: o.user?.email,
                rnt: o.rntNumber,
                tours: o.totalTours,
                score: o.score,
                aprobado: o.isApproved,
              })),
              'operadores',
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
        list.map((op: any) => (
          <div
            key={op.id}
            className="flex items-center gap-3 p-3 mb-2 rounded-xl border"
            style={{ borderColor: '#EBEBEB' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: '#2D6A4F' }}
            >
              {op.companyName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#222' }}>
                {op.companyName}
              </div>
              <div className="text-xs truncate" style={{ color: '#717171' }}>
                {op.user?.email} · RNT: {op.rntNumber || 'N/A'} · {op.totalTours} tours
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={op.isApproved ? 'active' : 'pending'} />
              <Btn label="Editar" bg="#F7F7F7" c="#222" onClick={() => onEdit(op)} />
              {!op.isApproved && (
                <Btn label="Aprobar" bg="#2D6A4F" onClick={() => onAction('approve-operator', op.id)} />
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
