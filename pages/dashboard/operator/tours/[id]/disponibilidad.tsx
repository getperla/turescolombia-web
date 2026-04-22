import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../components/Layout';
import { useRequireAuth } from '../../../../../lib/auth';
import api, { createAvailability, createAvailabilityBulk } from '../../../../../lib/api';

type Slot = {
  id: number;
  date: string;
  totalSpots: number;
  bookedSpots: number;
  status: string;
  priceOverride?: number;
};

export default function Disponibilidad() {
  const { authorized } = useRequireAuth(['operator']);
  const router = useRouter();
  const tourId = Number(router.query.id);
  const [tourName, setTourName] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Single date form
  const [date, setDate] = useState('');
  const [spots, setSpots] = useState('20');
  const [priceOverride, setPriceOverride] = useState('');

  // Bulk form
  const [bulkMode, setBulkMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bulkSpots, setBulkSpots] = useState('20');

  const loadData = useCallback(async () => {
    try {
      const [tourRes, availRes] = await Promise.all([
        api.get(`/tours/${tourId}`),
        api.get(`/tours/${tourId}/availability`),
      ]);
      setTourName(tourRes.data.name);
      setSlots(availRes.data || []);
    } catch (e) { console.error('Failed to load tour availability:', e); }
    setLoading(false);
  }, [tourId]);

  useEffect(() => {
    if (!authorized || !tourId) return;
    loadData();
  }, [authorized, tourId, loadData]);

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await createAvailability(tourId, {
        date,
        totalSpots: Number(spots),
        priceOverride: priceOverride ? Number(priceOverride) : undefined,
      });
      setMsg('Disponibilidad creada');
      setDate('');
      loadData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Error al crear disponibilidad');
    }
  };

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await createAvailabilityBulk(tourId, {
        startDate,
        endDate,
        totalSpots: Number(bulkSpots),
      });
      setMsg('Disponibilidad masiva creada');
      setStartDate('');
      setEndDate('');
      loadData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Error al crear disponibilidad');
    }
  };

  if (!authorized) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/operator/tours" className="text-sm text-brand-500 hover:underline mb-2 inline-block">
          &larr; Volver a mis tours
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Disponibilidad</h1>
        <p className="text-gray-500 mb-6">{tourName}</p>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {msg}
          </div>
        )}

        {/* Toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setBulkMode(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!bulkMode ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Fecha individual
          </button>
          <button onClick={() => setBulkMode(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bulkMode ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Rango de fechas
          </button>
        </div>

        {/* Form */}
        {!bulkMode ? (
          <form onSubmit={handleSingle} className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cupos</label>
                <input type="number" value={spots} onChange={(e) => setSpots(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio especial (COP)</label>
                <input type="number" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} className="input" placeholder="Opcional" />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-4">Agregar fecha</button>
          </form>
        ) : (
          <form onSubmit={handleBulk} className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cupos por dia</label>
                <input type="number" value={bulkSpots} onChange={(e) => setBulkSpots(e.target.value)} required className="input" />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-4">Crear rango</button>
          </form>
        )}

        {/* Existing slots */}
        <h2 className="font-semibold text-gray-900 mb-3">Fechas programadas ({slots.length})</h2>
        {loading ? (
          <p className="text-gray-400">Cargando...</p>
        ) : slots.length === 0 ? (
          <p className="text-gray-400 py-4">No hay fechas programadas</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cupos</th>
                  <th className="px-4 py-3">Reservados</th>
                  <th className="px-4 py-3">Disponibles</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm">{new Date(slot.date).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3 text-sm">{slot.totalSpots}</td>
                    <td className="px-4 py-3 text-sm">{slot.bookedSpots}</td>
                    <td className="px-4 py-3 text-sm font-medium">{slot.totalSpots - slot.bookedSpots}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${slot.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {slot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
