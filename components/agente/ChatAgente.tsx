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

  const sugerencias = [
    '4 días, presupuesto 800.000 pesos',
    '2 días, 400.000 pesos, familia con niños',
    '1 día, 200.000 pesos, aventura',
    '3 días, 1.500.000 pesos, pareja',
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
          padding: '16px',
          borderBottom: '1px solid #EBEBEB',
          background: 'linear-gradient(135deg, #0A1628, #0D5C8A)',
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
          <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
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
                  lineHeight: '1.5',
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
          style={{
            padding: '0 16px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {sugerencias.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #EBEBEB',
                background: 'white',
                color: '#0D5C8A',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {s}
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
