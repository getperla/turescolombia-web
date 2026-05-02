import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import type { AdminTab } from '../../components/admin/shared';

const REFRESH_INTERVAL_MS = 60_000;

/**
 * State + handlers del panel admin. Aislado del componente de pagina
 * para que admin.tsx sea solo orquestador. Auto-refresh del dashboard
 * cada 60s mientras el panel este montado y autorizado.
 */
export function useAdminPanel(authorized: boolean) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [listError, setListError] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<'jalador' | 'operator' | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const refresh = useCallback(() => {
    api.get('/dashboard/admin').then((r) => setData(r.data)).catch(() => setData(null));
    api
      .get('/notifications')
      .then((r) => {
        const ns = r.data || [];
        setNotifications(ns);
        setUnread(ns.filter((n: any) => !n.isRead).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authorized) return;
    refresh();
    const iv = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [authorized, refresh]);

  const loadList = useCallback(async (type: AdminTab) => {
    setLoading(true);
    setList([]);
    setListError('');
    try {
      const endpoints: Partial<Record<AdminTab, string>> = {
        jaladores: '/users/jaladores',
        operators: '/users/operators',
        tours: '/tours',
        bookings: '/bookings/operator',
      };
      const path = endpoints[type];
      if (!path) return;
      const params = type === 'tours' ? { limit: '100' } : undefined;
      const result = (await api.get(path, params ? { params } : undefined)).data;
      setList(Array.isArray(result) ? result : result?.data || []);
    } catch {
      setListError('No se pudo conectar al servidor. Verifica que el backend este corriendo.');
    }
    setLoading(false);
  }, []);

  const openTab = useCallback(
    (t: AdminTab) => {
      setTab(t);
      setActionMsg('');
      setListError('');
      if (!['dashboard', 'reports', 'notifications'].includes(t)) loadList(t);
    },
    [loadList],
  );

  const doAction = useCallback(
    async (action: string, id: number) => {
      setActionMsg('');
      try {
        const map: Record<string, string> = {
          'approve-jalador': `/admin/jaladores/${id}/approve`,
          'approve-operator': `/admin/operators/${id}/approve`,
          suspend: `/admin/users/${id}/suspend`,
          reactivate: `/admin/users/${id}/reactivate`,
          'approve-tour': `/admin/tours/${id}/approve`,
          'reject-tour': `/admin/tours/${id}/reject`,
        };
        if (!map[action]) return;
        await api.post(map[action]);
        setActionMsg('Hecho');
        loadList(tab);
        refresh();
      } catch (e: any) {
        setActionMsg(e.response?.data?.message || 'Error');
      }
    },
    [tab, loadList, refresh],
  );

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all');
    refresh();
  }, [refresh]);

  const openEditJalador = useCallback((j: any) => {
    setEditType('jalador');
    setEditItem(j);
    setEditForm({
      name: j.user?.name || '',
      email: j.user?.email || '',
      phone: j.user?.phone || '',
      bio: j.bio || '',
      zone: j.zone || '',
      languages: (j.languages || []).join(', '),
      bankName: j.bankName || '',
      bankAccount: j.bankAccount || '',
      nequiPhone: j.nequiPhone || '',
      payoutMethod: j.payoutMethod || '',
    });
  }, []);

  const openEditOperator = useCallback((op: any) => {
    setEditType('operator');
    setEditItem(op);
    setEditForm({
      name: op.user?.name || '',
      email: op.user?.email || '',
      phone: op.user?.phone || '',
      companyName: op.companyName || '',
      rntNumber: op.rntNumber || '',
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditItem(null);
    setEditType(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editItem || !editType) return;
    setEditSaving(true);
    try {
      const payload =
        editType === 'jalador'
          ? {
              name: editForm.name,
              email: editForm.email,
              phone: editForm.phone || undefined,
              bio: editForm.bio,
              zone: editForm.zone,
              languages: editForm.languages.split(',').map((l) => l.trim()).filter(Boolean),
              bankName: editForm.bankName || undefined,
              bankAccount: editForm.bankAccount || undefined,
              nequiPhone: editForm.nequiPhone || undefined,
              payoutMethod: editForm.payoutMethod || undefined,
            }
          : {
              name: editForm.name,
              email: editForm.email,
              phone: editForm.phone || undefined,
              companyName: editForm.companyName,
              rntNumber: editForm.rntNumber || undefined,
            };
      const url =
        editType === 'jalador'
          ? `/admin/jaladores/${editItem.id}`
          : `/admin/operators/${editItem.id}`;
      await api.put(url, payload);
      setActionMsg('Actualizado');
      closeEdit();
      loadList(tab);
    } catch (e: any) {
      setActionMsg(e.response?.data?.message || 'Error al guardar');
    }
    setEditSaving(false);
  }, [editItem, editType, editForm, tab, loadList, closeEdit]);

  const chartData = useMemo<{ name: string; count: number }[]>(
    () => data?.bookingsByStatus?.map((s: any) => ({ name: s.status, count: s.count })) || [],
    [data?.bookingsByStatus],
  );

  return {
    data,
    tab,
    list,
    loading,
    actionMsg,
    listError,
    notifications,
    unread,
    editItem,
    editType,
    editForm,
    editSaving,
    chartData,
    openTab,
    doAction,
    markAllRead,
    openEditJalador,
    openEditOperator,
    closeEdit,
    saveEdit,
    setEditForm,
    loadList,
  };
}
