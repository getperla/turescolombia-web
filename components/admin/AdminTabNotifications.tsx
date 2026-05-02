type Notification = {
  id: number;
  type?: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  notifications: Notification[];
  unread: number;
  onMarkAllRead: () => void;
};

const ICONS: Array<{ test: string; icon: string }> = [
  { test: 'booking', icon: '📋' },
  { test: 'sale', icon: '💰' },
  { test: 'review', icon: '⭐' },
  { test: 'commission', icon: '💵' },
];

function iconFor(type?: string): string {
  for (const { test, icon } of ICONS) {
    if (type?.includes(test)) return icon;
  }
  return '🔔';
}

export default function AdminTabNotifications({ notifications, unread, onMarkAllRead }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm" style={{ color: '#717171' }}>
          {notifications.length} notificaciones ({unread} sin leer)
        </span>
        <button
          onClick={onMarkAllRead}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: '#F7F7F7', color: '#222' }}
        >
          Marcar todas como leidas
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: '#717171' }}>
          Sin notificaciones
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="flex items-start gap-3 p-3 mb-2 rounded-xl border"
            style={{ borderColor: '#EBEBEB', background: n.isRead ? 'white' : '#FFFBF5' }}
          >
            <div className="text-lg shrink-0">{iconFor(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: '#222' }}>
                {n.title}
              </div>
              <div className="text-xs" style={{ color: '#717171' }}>
                {n.body}
              </div>
              <div className="text-xs mt-1" style={{ color: '#B0B0B0' }}>
                {new Date(n.createdAt).toLocaleString('es-CO')}
              </div>
            </div>
            {!n.isRead && (
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-2"
                style={{ background: '#FF5F5F' }}
              />
            )}
          </div>
        ))
      )}
    </>
  );
}
