import { useState } from 'react';
import QRCode from 'qrcode';
import type { MockTour } from '../../lib/agente/mock';

type Props = {
  tours: MockTour[];
  people: number;
  refCode?: string;
  onClose: () => void;
};

type LinkResultado = {
  reference: string;
  paymentUrl: string;
  totalCop: number;
  commissionCop: number;
  mock: boolean;
};

const COP = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function ReservaModal({ tours, people, refCode, onClose }: Props) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<LinkResultado | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  const totalEstimado = tours.reduce((acc, t) => acc + t.price_adult * people, 0);
  const comisionEstimada = Math.round(totalEstimado * 0.2);

  const generarLink = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      setError('Nombre y telefono son requeridos.');
      return;
    }
    setGenerando(true);
    setError('');
    try {
      const res = await fetch('/api/agente/crear-reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourIds: tours.map((t) => t.id),
          people,
          clientName: nombre.trim(),
          clientPhone: telefono.trim(),
          clientEmail: email.trim() || undefined,
          refCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResultado(data);
      const qr = await QRCode.toDataURL(data.paymentUrl, { width: 240, margin: 1 });
      setQrDataUrl(qr);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : 'Error desconocido';
      setError(detail);
    } finally {
      setGenerando(false);
    }
  };

  const copiarLink = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.paymentUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // navigator.clipboard puede fallar en contextos no-seguros; ignorar.
    }
  };

  const whatsappUrl = resultado
    ? `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hola ${nombre}, tu reserva con La Perla esta lista. Paga seguro con Wompi aqui: ${resultado.paymentUrl}`,
      )}`
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reserva-titulo"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #EBEBEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 id="reserva-titulo" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#222', letterSpacing: '-0.01em' }}>
            {resultado ? 'Link de pago listo' : 'Confirmar reserva'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#717171',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {!resultado && (
            <>
              <div
                style={{
                  background: '#F7F7F7',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#222',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.005em' }}>
                  Itinerario · {people} {people === 1 ? 'persona' : 'personas'}
                </div>
                {tours.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                    }}
                  >
                    <span>{t.name}</span>
                    <span style={{ fontWeight: 600 }}>${COP(t.price_adult * people)}</span>
                  </div>
                ))}
                <div
                  style={{
                    borderTop: '1px solid #EBEBEB',
                    marginTop: '8px',
                    paddingTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    color: '#0A1628',
                    fontSize: '15px',
                  }}
                >
                  <span>Total</span>
                  <span style={{ fontFeatureSettings: '"tnum"' }}>${COP(totalEstimado)} COP</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#2D6A4F',
                    marginTop: '4px',
                  }}
                >
                  <span>Tu comision (20%)</span>
                  <span>${COP(comisionEstimada)} COP</span>
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#222' }}>
                  Nombre del cliente *
                </div>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Carlos Pereira"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #DDD',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#222' }}>
                  Telefono (WhatsApp) *
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #DDD',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#222' }}>
                  Email (opcional)
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #DDD',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </label>

              {error && (
                <div
                  style={{
                    background: '#FFF0F0',
                    color: '#CC3333',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={generarLink}
                disabled={generando}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: generando ? '#DDD' : '#F5882A',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: generando ? 'not-allowed' : 'pointer',
                }}
              >
                {generando ? 'Generando link…' : 'Generar link de pago'}
              </button>
            </>
          )}

          {resultado && (
            <>
              {resultado.mock && (
                <div
                  style={{
                    background: '#FFF8E5',
                    border: '1px solid #F5E0A8',
                    color: '#7A5C00',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '12px',
                    fontWeight: 600,
                  }}
                >
                  ⚙️ Modo demo · Wompi sandbox sin transaccion real
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR del link de pago"
                    width={240}
                    height={240}
                    style={{ display: 'inline-block', borderRadius: '12px' }}
                  />
                )}
                <div style={{ fontSize: '12px', color: '#717171', marginTop: '4px' }}>
                  Ref: {resultado.reference}
                </div>
              </div>

              <div
                style={{
                  background: '#F7F7F7',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  marginBottom: '12px',
                  color: '#222',
                }}
              >
                {resultado.paymentUrl}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={copiarLink}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: copiado ? '#2D6A4F' : '#0A1628',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {copiado ? '✓ Copiado' : '📋 Copiar link'}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#25D366',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  💬 WhatsApp
                </a>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#717171',
                  textAlign: 'center',
                  marginTop: '12px',
                }}
              >
                Total: <strong>${COP(resultado.totalCop)} COP</strong> · Tu comision:{' '}
                <strong style={{ color: '#2D6A4F' }}>${COP(resultado.commissionCop)} COP</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
