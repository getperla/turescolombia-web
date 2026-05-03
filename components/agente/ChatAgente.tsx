import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import type { MockTour } from '../../lib/agente/mock';
import ReservaModal from './ReservaModal';
import TourCard from './TourCard';

type Mensaje = {
  role: 'user' | 'assistant';
  content: string;
  picks?: MockTour[];
  people?: number;
};

type Props = {
  refCode?: string;
  onReservaLista?: (datos: { message: string; quiereReservar: boolean }) => void;
};

export default function ChatAgente({ refCode, onReservaLista }: Props) {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [esModoMock, setEsModoMock] = useState(false);
  const [reserva, setReserva] = useState<{ tours: MockTour[]; people: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    if (!iniciado) {
      setIniciado(true);
      setMensajes([
        {
          role: 'assistant',
          content:
            '¡Hola! 👋 Soy tu asistente de ventas de La Perla.\n\n¿Cuántos días tiene tu cliente en Santa Marta y cuál es su presupuesto aproximado? Con eso te armo el itinerario perfecto. 🏖️',
        },
      ]);
    }
  }, [iniciado]);

  const enviarMensaje = async () => {
    if (!input.trim() || cargando) return;

    const nuevoMensaje: Mensaje = { role: 'user', content: input.trim() };
    const historialActualizado = [...mensajes, nuevoMensaje];
    setMensajes(historialActualizado);
    setInput('');
    setCargando(true);

    try {
      const response = await fetch('/api/agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historialActualizado,
          refCode,
          context: { jaladorName: user?.name || 'Asesor' },
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);

      if (data.mock) setEsModoMock(true);

      const picks: MockTour[] | undefined =
        Array.isArray(data.picks) && data.picks.length > 0 ? data.picks : undefined;
      const people: number | undefined = typeof data.people === 'number' ? data.people : undefined;

      setMensajes((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, picks, people },
      ]);

      if (data.quiereReservar) {
        if (picks) {
          setReserva({ tours: picks, people: people || 1 });
        }
        onReservaLista?.(data);
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un problema. Intenta de nuevo en un momento.' },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const sugerencias: { emoji: string; label: string; prompt: string }[] = [
    { emoji: '🏖️', label: '4 días · 800k', prompt: '4 días, 800.000 pesos, 2 personas' },
    { emoji: '👨‍👩‍👧', label: 'Familia · 400k', prompt: '2 días, 400.000 pesos, familia con niños' },
    { emoji: '🥾', label: 'Aventura · 200k', prompt: '1 día, 200.000 pesos, aventura' },
    { emoji: '💑', label: 'Pareja · 1.5M', prompt: '3 días, 1.500.000 pesos, pareja' },
    { emoji: '🌅', label: 'Sunset · 150k', prompt: '1 día, 150.000 pesos, atardecer en la playa' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '500px',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #EBEBEB',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          // Frosted glass: gradiente translucido + blur de 24px
          background:
            'linear-gradient(135deg, rgba(10,22,40,0.82), rgba(13,92,138,0.82))',
          backdropFilter: 'saturate(180%) blur(24px)',
          WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#C9A05C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>
            Asistente La Perla
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            Te ayuda a vender más rápido
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#2D6A4F',
          }}
        />
      </div>

      {esModoMock && (
        <div
          style={{
            padding: '8px 16px',
            background: '#FFF8E5',
            borderBottom: '1px solid #F5E0A8',
            color: '#7A5C00',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span aria-hidden>⚙️</span>
          Modo demo · respuestas predefinidas, sin consumo de API
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {mensajes.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#F5882A' : '#F7F7F7',
                  color: msg.role === 'user' ? 'white' : '#222',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  animation: 'msgIn 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both',
                }}
              >
                {msg.content}
              </div>
            </div>

            {msg.role === 'assistant' && msg.picks && msg.picks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {msg.picks.map((tour, idx) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    people={msg.people || 1}
                    index={msg.picks!.length > 1 ? idx + 1 : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {cargando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: '#F7F7F7',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#C9A05C',
                    animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {mensajes.length <= 1 && (
        <div
          className="chat-suggestions-scroll"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '4px 16px 14px',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
        >
          {sugerencias.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s.prompt)}
              style={{
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minWidth: '88px',
                padding: '10px 14px',
                borderRadius: '14px',
                border: '1px solid #EBEBEB',
                background: 'white',
                color: '#222',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.12s',
                lineHeight: 1.2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(10,22,40,0.08)';
                e.currentTarget.style.borderColor = '#C9A05C';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#EBEBEB';
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }} aria-hidden>
                {s.emoji}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #EBEBEB',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviarMensaje();
            }
          }}
          placeholder="Escribe aquí — ejemplo: 4 días, 800.000 pesos..."
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #DDDDDD',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={enviarMensaje}
          disabled={!input.trim() || cargando}
          aria-label="Enviar mensaje"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: input.trim() && !cargando ? '#F5882A' : '#EBEBEB',
            border: 'none',
            cursor: input.trim() && !cargando ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            transition: 'background 0.2s',
            flexShrink: 0,
            color: 'white',
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-suggestions-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .chat-suggestions-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {reserva && (
        <ReservaModal
          tours={reserva.tours}
          people={reserva.people}
          refCode={refCode}
          onClose={() => setReserva(null)}
        />
      )}
    </div>
  );
}
