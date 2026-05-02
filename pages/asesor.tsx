import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ItineraryDay = {
  day: number;
  tourId: number;
  tourName: string;
  tourSlug: string;
  pricePerPerson: number;
};

type Itinerary = {
  totalDays: number;
  totalCostPerPerson: number;
  groupSize: number;
  totalCostGroup: number;
  days: ItineraryDay[];
};

const INITIAL_GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Hola, soy tu asesor de La Perla. Cuentame: cuantos dias tienes en Santa Marta, que presupuesto manejas y cuantas personas viajan?',
};

const COP = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function AsesorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/asesor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m !== INITIAL_GREETING || next.indexOf(m) > 0) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setMessages((m) => [...m, { role: 'assistant', content: data.message || '...' }]);
      if (data.itinerary) setItinerary(data.itinerary);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : 'Error desconocido';
      setError(detail);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Tuve un problema para responderte. Intenta de nuevo en un momento.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <Layout>
      <Head>
        <title>Asesor inteligente · La Perla</title>
        <meta
          name="description"
          content="Cuentanos cuantos dias tienes y tu presupuesto. Te armamos el itinerario con tours verificados de Santa Marta."
        />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-bold text-2xl mb-1" style={{ color: '#222' }}>
            Tu asesor de viaje
          </h1>
          <p className="text-sm" style={{ color: '#717171' }}>
            Dinos cuantos dias, presupuesto y personas. Te armamos el plan con tours reales del catalogo.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="bg-white rounded-2xl border p-4 mb-3 overflow-y-auto"
          style={{ borderColor: '#EBEBEB', height: '60vh', minHeight: 360 }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap max-w-[85%]"
                style={
                  m.role === 'user'
                    ? { background: '#222', color: '#fff' }
                    : { background: '#F7F7F7', color: '#222' }
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="mb-3 flex justify-start">
              <div
                className="rounded-2xl px-4 py-2 text-sm"
                style={{ background: '#F7F7F7', color: '#717171' }}
              >
                Pensando…
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            className="px-4 py-2 rounded-xl text-sm mb-3"
            style={{ background: '#FFF0F0', color: '#CC3333' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tengo 4 dias y 3 millones para 2 personas…"
            className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: '#EBEBEB' }}
            disabled={loading}
            inputMode="text"
            aria-label="Escribe tu mensaje"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#F5882A' }}
          >
            Enviar
          </button>
        </form>

        {itinerary && (
          <div
            className="bg-white rounded-2xl border p-5 mb-6"
            style={{ borderColor: '#EBEBEB' }}
          >
            <h2 className="font-bold text-lg mb-3" style={{ color: '#222' }}>
              Itinerario propuesto · {itinerary.totalDays} {itinerary.totalDays === 1 ? 'dia' : 'dias'}
            </h2>
            <ul className="space-y-2 mb-4">
              {itinerary.days.map((d) => (
                <li key={d.day} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#717171' }}>
                      Dia {d.day}
                    </div>
                    <Link
                      href={`/tour/${d.tourSlug}`}
                      className="text-sm font-semibold underline"
                      style={{ color: '#222' }}
                    >
                      {d.tourName}
                    </Link>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#222' }}>
                    ${COP(d.pricePerPerson)} COP
                  </div>
                </li>
              ))}
            </ul>
            <div
              className="flex items-center justify-between pt-3 border-t"
              style={{ borderColor: '#EBEBEB' }}
            >
              <div>
                <div className="text-xs" style={{ color: '#717171' }}>
                  {itinerary.groupSize} {itinerary.groupSize === 1 ? 'persona' : 'personas'}
                </div>
                <div className="text-xs" style={{ color: '#717171' }}>
                  ${COP(itinerary.totalCostPerPerson)} COP por persona
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: '#717171' }}>
                  Total grupo
                </div>
                <div className="font-bold text-xl" style={{ color: '#F5882A' }}>
                  ${COP(itinerary.totalCostGroup)} COP
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
