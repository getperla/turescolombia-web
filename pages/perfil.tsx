import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useRequireAuth, useAuth } from '../lib/auth';
import { getProfile, updateProfile, updateJaladorProfile } from '../lib/api';

export default function PerfilPage() {
  const { authorized } = useRequireAuth();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [zone, setZone] = useState('');
  const [languages, setLanguages] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [nequiPhone, setNequiPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');

  useEffect(() => {
    if (!authorized) return;
    loadProfile();
  }, [authorized]);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      if (data.jalador) {
        setBio(data.jalador.bio || '');
        setZone(data.jalador.zone || '');
        setLanguages((data.jalador.languages || []).join(', '));
        setBankName(data.jalador.bankName || '');
        setBankAccount(data.jalador.bankAccount || '');
        setNequiPhone(data.jalador.nequiPhone || '');
        setPayoutMethod(data.jalador.payoutMethod || '');
      }
    } catch {
      setError('No se pudo cargar el perfil');
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);
    try {
      await updateProfile({ name, phone: phone || undefined });
      updateUser({ name });

      if (profile?.role === 'jalador') {
        await updateJaladorProfile({
          bio,
          zone,
          languages: languages.split(',').map(l => l.trim()).filter(Boolean),
          bankName: bankName || undefined,
          bankAccount: bankAccount || undefined,
          nequiPhone: nequiPhone || undefined,
          payoutMethod: payoutMethod || undefined,
        });
      }

      setMsg('Perfil actualizado correctamente');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar');
    }
    setSaving(false);
  };

  const roleEmoji: Record<string, string> = {
    tourist: '', jalador: '', operator: '', admin: '',
  };
  const roleLabel: Record<string, string> = {
    tourist: 'Turista', jalador: 'Jalador', operator: 'Operador', admin: 'Admin',
  };

  if (!authorized) return null;
  if (loading) return (
    <Layout>
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-secondary-700 mb-6">Mi Perfil</h1>

        {msg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 border border-green-100">✅ {msg}</div>}
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}

        {/* Account info card */}
        <div className="bg-white border border-primary-100 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {profile?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{profile?.name}</div>
              <div className="text-sm text-gray-400">{profile?.email}</div>
              <span className="badge bg-primary-100 text-primary-700 mt-1">
                {roleEmoji[profile?.role] || ''} {roleLabel[profile?.role] || profile?.role}
              </span>
            </div>
          </div>

          {/* Stats for jalador */}
          {profile?.jalador && (
            <div className="grid grid-cols-4 gap-3 bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-4 text-center text-sm border border-primary-100">
              <div>
                <div className="font-bold text-primary-600">{profile.jalador.score.toFixed(0)}</div>
                <div className="text-gray-400 text-xs">Score</div>
              </div>
              <div>
                <div className="font-bold text-primary-600">{profile.jalador.totalSales}</div>
                <div className="text-gray-400 text-xs">Ventas</div>
              </div>
              <div>
                <div className="font-bold text-primary-600">{profile.jalador.badge?.replace('_', ' ')}</div>
                <div className="text-gray-400 text-xs">Badge</div>
              </div>
              <div>
                <div className="font-bold text-primary-600 font-mono text-xs">{profile.jalador.refCode}</div>
                <div className="text-gray-400 text-xs">Ref Code</div>
              </div>
            </div>
          )}

          {profile?.operator && (
            <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-4 text-sm border border-primary-100">
              <div className="font-bold text-gray-900 mb-1">{profile.operator.companyName}</div>
              <div className="text-gray-500">
                RNT: {profile.operator.rntNumber || 'N/A'} &middot;
                Score: {profile.operator.score} &middot;
                {profile.operator.isApproved ? ' ✅ Aprobado' : ' ⏳ Pendiente aprobacion'}
              </div>
            </div>
          )}

          {profile?.tourist && (
            <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-primary-50 to-amber-50 rounded-xl p-4 text-center text-sm border border-primary-100">
              <div>
                <div className="font-bold text-primary-600">{profile.tourist.totalBookings}</div>
                <div className="text-gray-400 text-xs">Reservas</div>
              </div>
              <div>
                <div className="font-bold text-primary-600">${Number(profile.tourist.totalSpent).toLocaleString()}</div>
                <div className="text-gray-400 text-xs">Total gastado</div>
              </div>
            </div>
          )}
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-secondary-700">Datos personales</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+57 300 000 0000" />
            </div>
          </div>

          {profile?.role === 'jalador' && (
            <>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
                <h2 className="font-bold text-secondary-700">Perfil de Jalador</h2>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Zona de trabajo</label>
                  <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="input" placeholder="Centro Historico, Taganga..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Idiomas (separados por coma)</label>
                  <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" placeholder="Espanol, Ingles" />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
                <h2 className="font-bold text-secondary-700">Datos de pago</h2>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Metodo de pago preferido</label>
                  <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="input">
                    <option value="">Seleccionar</option>
                    <option value="bank_transfer">🏦 Transferencia bancaria</option>
                    <option value="nequi">📱 Nequi</option>
                    <option value="daviplata">📱 Daviplata</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Banco</label>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Numero de cuenta</label>
                    <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nequi (telefono)</label>
                  <input type="tel" value={nequiPhone} onChange={(e) => setNequiPhone(e.target.value)} className="input" />
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 w-full md:w-auto">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
