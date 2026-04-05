import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

type Role = 'tourist' | 'jalador' | 'operator';

const roleInfo: Record<Role, { title: string; desc: string }> = {
  tourist: { title: 'Turista', desc: 'Quiero buscar y reservar tours' },
  jalador: { title: 'Jalador', desc: 'Quiero vender tours y ganar comisiones' },
  operator: { title: 'Operador', desc: 'Tengo una empresa de turismo' },
};

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener minimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const endpoint = role === 'tourist' ? '/auth/register'
        : role === 'jalador' ? '/auth/register/jalador'
        : '/auth/register/operator';

      const body: any = { name, email, phone, password, role };
      if (role === 'jalador') {
        body.zone = zone;
        body.bio = bio;
      }
      if (role === 'operator') {
        body.companyName = companyName;
        body.rntNumber = rntNumber || undefined;
      }

      await api.post(endpoint, body);
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
              <p className="text-gray-500 mt-1">Es gratis y toma menos de 1 minuto</p>
            </div>

            {step === 'role' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">Que quieres hacer?</p>
                {(Object.keys(roleInfo) as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setStep('form'); }}
                    className="w-full text-left p-5 rounded-xl border-2 transition-colors hover:border-primary-500 hover:bg-primary-50 border-gray-200"
                  >
                    <div className="font-bold text-gray-900 text-lg">{roleInfo[r].title}</div>
                    <div className="text-gray-500">{roleInfo[r].desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setStep('role')}
                  className="text-sm text-primary-500 hover:underline mb-4 inline-block font-medium"
                >
                  ← Cambiar ({roleInfo[role].title})
                </button>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input text-lg" placeholder="Tu nombre" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input text-lg" placeholder="tu@correo.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input text-lg" placeholder="300 000 0000" />
                  </div>

                  {role === 'jalador' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Donde trabajas?</label>
                        <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="input text-lg" placeholder="ej: Rodadero, Taganga, Centro" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cuentanos de ti</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input text-lg" rows={2} placeholder="Que experiencia tienes?" />
                      </div>
                    </>
                  )}

                  {role === 'operator' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de tu empresa</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="input text-lg" placeholder="Tu empresa de turismo" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RNT (si lo tienes)</label>
                        <input type="text" value={rntNumber} onChange={(e) => setRntNumber(e.target.value)} className="input text-lg" placeholder="Numero RNT" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input text-lg" placeholder="Minimo 6 caracteres" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input text-lg" placeholder="Escribe otra vez tu contraseña" />
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                  )}

                  <button type="submit" disabled={loading} className="w-full btn-primary text-lg py-4 disabled:opacity-50">
                    {loading ? 'Creando cuenta...' : `Crear cuenta como ${roleInfo[role].title}`}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary-500 font-bold hover:underline">Entrar</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
