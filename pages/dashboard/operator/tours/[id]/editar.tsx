import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../components/Layout';
import { useRequireAuth } from '../../../../../lib/auth';
import { getTour, updateTour, getCategories, Category, Tour } from '../../../../../lib/api';

export default function EditarTour() {
  const { authorized } = useRequireAuth(['operator']);
  const router = useRouter();
  const tourId = Number(router.query.id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    categoryId: '',
    priceAdult: '',
    priceChild: '',
    maxPeople: '',
    departureTime: '',
    returnTime: '',
    duration: '',
    departurePoint: '',
    location: '',
    includes: '',
    excludes: '',
    restrictions: '',
    observations: '',
  });

  useEffect(() => {
    if (!authorized || !tourId) return;
    Promise.all([
      getTour(tourId),
      getCategories(),
    ]).then(([tour, cats]) => {
      setCategories(cats);
      setForm({
        name: tour.name,
        description: tour.description,
        shortDescription: tour.shortDescription || '',
        categoryId: tour.category?.id ? String(tour.category.id) : '',
        priceAdult: String(tour.priceAdult),
        priceChild: tour.priceChild ? String(tour.priceChild) : '',
        maxPeople: String(tour.maxPeople),
        departureTime: tour.departureTime,
        returnTime: tour.returnTime,
        duration: tour.duration,
        departurePoint: tour.departurePoint,
        location: tour.location,
        includes: tour.includes.join('\n'),
        excludes: tour.excludes.join('\n'),
        restrictions: tour.restrictions.join('\n'),
        observations: tour.observations || '',
      });
      setPageLoading(false);
    }).catch(() => setPageLoading(false));
  }, [authorized, tourId]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateTour(tourId, {
        name: form.name,
        description: form.description,
        shortDescription: form.shortDescription || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        priceAdult: Number(form.priceAdult),
        priceChild: form.priceChild ? Number(form.priceChild) : undefined,
        maxPeople: Number(form.maxPeople),
        departureTime: form.departureTime,
        returnTime: form.returnTime,
        duration: form.duration,
        departurePoint: form.departurePoint,
        location: form.location,
        includes: form.includes.split('\n').map(s => s.trim()).filter(Boolean),
        excludes: form.excludes.split('\n').map(s => s.trim()).filter(Boolean),
        restrictions: form.restrictions.split('\n').map(s => s.trim()).filter(Boolean),
        observations: form.observations || undefined,
      });
      setSuccess('Tour actualizado correctamente');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar');
    }
    setLoading(false);
  };

  if (!authorized) return null;
  if (pageLoading) return <Layout><div className="max-w-3xl mx-auto py-12 px-4 text-gray-400">Cargando tour...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/operator/tours" className="text-sm text-brand-500 hover:underline mb-4 inline-block">
          &larr; Volver a mis tours
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar tour</h1>

        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Informacion basica</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={set('name')} required className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion *</label>
              <textarea value={form.description} onChange={set('description')} required className="input" rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion corta</label>
              <input type="text" value={form.shortDescription} onChange={set('shortDescription')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={set('categoryId')} className="input">
                <option value="">Sin categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Precios y capacidad</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio adulto (COP) *</label>
                <input type="number" value={form.priceAdult} onChange={set('priceAdult')} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio nino (COP)</label>
                <input type="number" value={form.priceChild} onChange={set('priceChild')} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad maxima *</label>
                <input type="number" value={form.maxPeople} onChange={set('maxPeople')} required className="input" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Horario y ubicacion</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora salida *</label>
                <input type="time" value={form.departureTime} onChange={set('departureTime')} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora retorno *</label>
                <input type="time" value={form.returnTime} onChange={set('returnTime')} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duracion *</label>
                <input type="text" value={form.duration} onChange={set('duration')} required className="input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punto de salida *</label>
                <input type="text" value={form.departurePoint} onChange={set('departurePoint')} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input type="text" value={form.location} onChange={set('location')} className="input" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Detalles</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incluye (una por linea)</label>
              <textarea value={form.includes} onChange={set('includes')} className="input" rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No incluye (una por linea)</label>
              <textarea value={form.excludes} onChange={set('excludes')} className="input" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restricciones (una por linea)</label>
              <textarea value={form.restrictions} onChange={set('restrictions')} className="input" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea value={form.observations} onChange={set('observations')} className="input" rows={2} />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/dashboard/operator/tours" className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
