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
  const [whatsappPhone, setWhatsappPhone] = useState('');
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
      setWhatsappPhone(data.whatsappPhone || data.phone || '');
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
      await updateProfile({ name, phone: phone || undefined, whatsappPhone: whatsappPhone || undefined });
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
        <h1 className="font-bold text-xl mb-6" style={{ color: '#222' }}>Mi Perfil</h1>

        {msg && <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>{msg}</div>}
        {error && <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>}

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

          {/* WhatsApp section — para que clientes lo contacten directo */}
          <div className="rounded-2xl p-6 space-y-4 shadow-sm border" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', borderColor: '#25D366' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </div>
              <div>
                <h2 className="font-bold" style={{ color: '#222' }}>Mi WhatsApp</h2>
                <p className="text-xs" style={{ color: '#717171' }}>Para que tus clientes te escriban directo</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numero de WhatsApp</label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="input"
                placeholder="+57 300 000 0000"
              />
              <p className="text-xs mt-1.5" style={{ color: '#717171' }}>Incluye el código de país (ej: +57 para Colombia)</p>
            </div>
            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola! Vi tu link en La Perla y quiero reservar un tour 🏖')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#25D366' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Probar mi WhatsApp
              </a>
            )}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nequi (teléfono)</label>
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
