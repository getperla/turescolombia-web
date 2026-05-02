import dynamic from 'next/dynamic';
import type { AdminTab } from './shared';

const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false },
);

type Card = {
  key: AdminTab;
  label: string;
  value: number | string;
  icon: string;
  color: string;
};

type Props = {
  data: any;
  chartData: { name: string; count: number }[];
  cards: Card[];
  onTabChange: (tab: AdminTab) => void;
};

export default function AdminMetricCards({ data, chartData, cards, onTabChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onTabChange(c.key)}
            className="text-left p-4 rounded-xl border hover:shadow-md active:scale-95 transition-all"
            style={{ borderColor: '#EBEBEB' }}
          >
            <div className="text-xl mb-1">{c.icon}</div>
            <div className="text-2xl font-bold" style={{ color: c.color }}>
              {c.value}
            </div>
            <div className="text-xs" style={{ color: '#717171' }}>
              {c.label}
            </div>
          </button>
        ))}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
              <div className="text-xs" style={{ color: '#717171' }}>
                GTV Total
              </div>
              <div className="text-xl font-bold" style={{ color: '#222' }}>
                ${Number(data.gmv || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
              <div className="text-xs" style={{ color: '#717171' }}>
                Revenue (20%)
              </div>
              <div className="text-xl font-bold" style={{ color: '#F5882A' }}>
                ${Number(data.platformRevenue || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#F7F7F7' }}>
              <div className="text-xs" style={{ color: '#717171' }}>
                Comisiones Jaladores
              </div>
              <div className="text-xl font-bold" style={{ color: '#2D6A4F' }}>
                ${Number(data.jaladorCommissions || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="p-4 rounded-xl mb-6" style={{ background: '#F7F7F7' }}>
              <div className="text-xs mb-3" style={{ color: '#717171' }}>
                Reservas por estado
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F5882A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
