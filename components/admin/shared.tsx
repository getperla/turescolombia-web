/**
 * Helpers compartidos del panel admin: botones chicos, skeletons, badge
 * de estado, input de edicion y export CSV. Aislados aca para que cada
 * tab solo tenga su logica de dominio.
 */

export function Btn({
  label,
  bg,
  c,
  onClick,
}: {
  label: string;
  bg: string;
  c?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-lg font-semibold"
      style={{ background: bg, color: c || 'white' }}
    >
      {label}
    </button>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-14 rounded-xl animate-pulse"
          style={{ background: '#F0F0F0' }}
        />
      ))}
    </div>
  );
}

export function EditField({
  label,
  value,
  onChange,
  type,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { bg: string; c: string }> = {
    active: { bg: '#E8F5EF', c: '#2D6A4F' },
    pending: { bg: '#FEF3E8', c: '#F5882A' },
    confirmed: { bg: '#E8F4FA', c: '#0D5C8A' },
    completed: { bg: '#E8F5EF', c: '#2D6A4F' },
    cancelled: { bg: '#FFF0F0', c: '#CC3333' },
    in_progress: { bg: '#FEF3E8', c: '#E07020' },
  };
  const s = m[status] || m.pending;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-semibold"
      style={{ background: s.bg, color: s.c }}
    >
      {status}
    </span>
  );
}

export function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

export type AdminTab =
  | 'dashboard'
  | 'jaladores'
  | 'operators'
  | 'tours'
  | 'bookings'
  | 'reports'
  | 'notifications';
