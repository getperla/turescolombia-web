import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

type Role = 'tourist' | 'jalador' | 'operator';

const roles: { id: Role; title: string; desc: string; icon: string; gradient: string }[] = [
  { id: 'tourist', title: 'Turista', desc: 'Quiero explorar y reservar tours', icon: '🏖️', gradient: 'linear-gradient(135deg, #0D5C8A, #00B4CC)' },
  { id: 'jalador', title: 'Jalador', desc: 'Quiero vender tours y ganar comisiones', icon: '💰', gradient: 'linear-gradient(135deg, #F5882A, #FF5F5F)' },
  { id: 'operator', title: 'Operador', desc: 'Tengo tours y quiero publicarlos', icon: '🏢', gradient: 'linear-gradient(135deg, #2D6A4F, #00B4CC)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [role, setRole] = useState<Role>('tourist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [zone, setZone] = useState('');
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rntNumber, setRntNumber] = useState('');

  useEffect(() => {
    const qRole = router.query.role as string;
    if (qRole === 'jalador' || qRole === 'operator' || qRole === 'tourist') {
      setRole(qRole);
      setStep('form');
    }
  }, [router.query.role]);

  const currentRole = roles.find(r => r.id === role)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres'); return; }

    setLoading(true);
    try {
      const endpoint = role === 'tourist' ? '/auth/register' : role === 'jalador' ? '/auth/register/jalador' : '/auth/register/operator';
      const body: any = { name, email, phone, password, role };
      if (role === 'jalador') { body.zone = zone; body.bio = bio; }
      if (role === 'operator') { body.companyName = companyName; body.rntNumber = rntNumber || undefined; }
      await api.post(endpoint, body);
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-card shadow-card p-8">
            <div className="text-center mb-8">
              <h1 className="font-display font-bold text-2xl" style={{ color: '#0A1628' }}>Crear cuenta gratis</h1>
              <p className="font-sans text-sm mt-1" style={{ color: '#C9A05C' }}>Toma menos de 1 minuto</p>
            </div>

            {step === 'role' ? (
              <div className="space-y-3">
                <p className="text-sm font-sans text-center mb-4" style={{ color: '#6B5329' }}>Que quieres hacer?</p>
                {roles.map((r) => (
                  <button key={r.id} onClick={() => { setRole(r.id); setStep('form'); }}
                    className="w-full text-left p-5 rounded-card text-white transition-all hover:-translate-y-1 group"
                    style={{ background: r.gradient, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{r.icon}</span>
                      <div>
                        <div className="font-display font-bold text-lg">{r.title}</div>
                        <div className="text-white/70 font-sans text-sm">{r.desc}</div>
                      </div>
                      <svg className="w-5 h-5 ml-auto text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <button onClick={() => setStep('role')}
                  className="flex items-center gap-2 text-sm font-sans font-medium mb-6 transition-colors hover:-translate-x-0.5"
                  style={{ color: '#0D5C8A' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Cambiar perfil
                </button>

                {/* Badge del rol seleccionado */}
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-6" style={{ background: currentRole.gradient }}>
                  <span className="text-2xl">{currentRole.icon}</span>
                  <div>
                    <div className="font-display font-bold text-white">{currentRole.title}</div>
                    <div className="text-white/70 font-sans text-xs">{currentRole.desc}</div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Nombre completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Correo</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="tu@correo.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>WhatsApp</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="300 000 0000" />
                  </div>

                  {role === 'jalador' && (
                    <>
                      <div>
                        <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Donde trabajas?</label>
                        <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="input" placeholder="ej: Rodadero, Taganga, Centro" />
                      </div>
                      <div>
                        <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Cuéntanos de ti</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input" rows={2} placeholder="Que experiencia tienes vendiendo tours?" />
                      </div>
                    </>
                  )}

                  {role === 'operator' && (
                    <>
                      <div>
                        <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Nombre de tu empresa</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="input" placeholder="Tu empresa de turismo" />
                      </div>
                      <div>
                        <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>RNT (si lo tienes)</label>
                        <input type="text" value={rntNumber} onChange={(e) => setRntNumber(e.target.value)} className="input" placeholder="Numero RNT" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Contraseña</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" placeholder="Minimo 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Repetir contraseña</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input" placeholder="Confirma tu contraseña" />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>
                  )}

                  <button type="submit" disabled={loading} className="w-full btn-primary text-base disabled:opacity-50">
                    {loading ? 'Creando cuenta...' : `Crear cuenta`}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center text-sm font-sans" style={{ color: '#C9A05C' }}>
              Ya tienes cuenta?{' '}
              <Link href="/login" className="font-bold hover:underline" style={{ color: '#0D5C8A' }}>Entrar</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
