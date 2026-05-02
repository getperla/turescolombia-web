import { EditField } from './shared';

type Props = {
  editType: 'jalador' | 'operator';
  form: Record<string, string>;
  saving: boolean;
  onChange: (form: Record<string, string>) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function AdminEditModal({
  editType,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: Props) {
  const set = (key: string) => (v: string) => onChange({ ...form, [key]: v });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#EBEBEB' }}>
          <h2 className="font-bold text-lg" style={{ color: '#222' }}>
            Editar {editType === 'jalador' ? 'Jalador' : 'Operador'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar dialogo"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            style={{ color: '#717171' }}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#717171' }}>
            Datos personales
          </div>
          <EditField label="Nombre" value={form.name} onChange={set('name')} />
          <EditField label="Email" value={form.email} onChange={set('email')} type="email" />
          <EditField
            label="Telefono"
            value={form.phone}
            onChange={set('phone')}
            type="tel"
            placeholder="+57 300 000 0000"
          />

          {editType === 'jalador' && (
            <>
              <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>
                Perfil de Jalador
              </div>
              <EditField label="Bio" value={form.bio} onChange={set('bio')} textarea />
              <EditField
                label="Zona de trabajo"
                value={form.zone}
                onChange={set('zone')}
                placeholder="Centro Historico, Taganga..."
              />
              <EditField
                label="Idiomas (separados por coma)"
                value={form.languages}
                onChange={set('languages')}
                placeholder="Espanol, Ingles"
              />

              <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>
                Datos de pago
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#222' }}>
                  Metodo de pago
                </label>
                <select
                  value={form.payoutMethod}
                  onChange={(e) => set('payoutMethod')(e.target.value)}
                  className="input"
                >
                  <option value="">Seleccionar</option>
                  <option value="bank_transfer">Transferencia bancaria</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditField label="Banco" value={form.bankName} onChange={set('bankName')} />
                <EditField label="Numero de cuenta" value={form.bankAccount} onChange={set('bankAccount')} />
              </div>
              <EditField
                label="Nequi (telefono)"
                value={form.nequiPhone}
                onChange={set('nequiPhone')}
                type="tel"
              />
            </>
          )}

          {editType === 'operator' && (
            <>
              <div className="text-xs font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: '#717171' }}>
                Datos de empresa
              </div>
              <EditField
                label="Nombre de empresa"
                value={form.companyName}
                onChange={set('companyName')}
              />
              <EditField
                label="Numero RNT"
                value={form.rntNumber}
                onChange={set('rntNumber')}
                placeholder="RNT-XXXXX"
              />
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t" style={{ borderColor: '#EBEBEB' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-sm font-semibold"
            style={{ background: '#F7F7F7', color: '#222' }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#222' }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
