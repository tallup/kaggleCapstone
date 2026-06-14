import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Calendar, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Clock, User, Building2 } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import logger from '../../utils/logger';

const SHIFT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

export default function StaffSchedule() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [branchId, setBranchId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteShiftId, setDeleteShiftId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({
    branch_id: '',
    user_id: '',
    start_at: '',
    end_at: '',
    shift_type: 'regular',
    notes: '',
    is_published: true,
  });

  const weekStart = useMemo(() => subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  React.useEffect(() => {
    api.get('/user').then((r) => setCurrentUser(r.data)).catch((e) => logger.error('Failed to fetch user:', e));
  }, []);

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const response = await api.get('/branches', { params: { per_page: 500 } });
      return response.data?.data ?? response.data ?? [];
    },
  });
  const branches = Array.isArray(branchesData) ? branchesData : branchesData?.data ?? [];

  const { data: usersData } = useQuery({
    queryKey: ['users-list-staff'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { per_page: 500 } });
      return response.data?.data ?? response.data ?? [];
    },
  });
  const users = Array.isArray(usersData) ? usersData : usersData?.data ?? [];

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['shifts', dateFrom, dateTo, branchId],
    queryFn: async () => {
      const params = { date_from: dateFrom, date_to: dateTo + ' 23:59:59', per_page: 200 };
      if (branchId) params.branch_id = branchId;
      const response = await api.get('/shifts', { params });
      return response.data;
    },
  });
  const shifts = shiftsData?.data ?? [];
  const canManage = 
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'administrator' || 
    currentUser?.role === 'admin' || 
    currentUser?.is_any_admin || 
    currentUser?.permissions?.includes?.('manage_schedules');


  const createMutation = useMutation({
    mutationFn: (body) => api.post('/shifts', body),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      setShowModal(false);
      setForm({ branch_id: '', user_id: '', start_at: '', end_at: '', shift_type: 'regular', notes: '', is_published: true });
    },
    onError: (err) => {
      logger.error('Create shift failed', err);
      alert(err?.response?.data?.message || 'Failed to create shift');
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/shifts/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      setShowModal(false);
      setEditingShift(null);
      setForm({ branch_id: '', user_id: '', start_at: '', end_at: '', shift_type: 'regular', notes: '', is_published: true });
    },
    onError: (err) => {
      logger.error('Update shift failed', err);
      alert(err?.response?.data?.message || 'Failed to update shift');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      setEditingShift(null);
    },
    onError: (err) => {
      logger.error('Delete shift failed', err);
      alert(err?.response?.data?.message || 'Failed to delete shift');
    },
  });

  const openCreate = () => {
    setEditingShift(null);
    setForm({
      branch_id: branchId || '',
      user_id: '',
      start_at: `${dateFrom}T09:00:00`,
      end_at: `${dateFrom}T17:00:00`,
      shift_type: 'regular',
      notes: '',
      is_published: true,
    });
    setShowModal(true);
  };
  const openEdit = (shift) => {
    setEditingShift(shift);
    setForm({
      branch_id: String(shift.branch_id ?? ''),
      user_id: String(shift.user_id ?? ''),
      start_at: shift.start_at ? format(new Date(shift.start_at), "yyyy-MM-dd'T'HH:mm:ss") : '',
      end_at: shift.end_at ? format(new Date(shift.end_at), "yyyy-MM-dd'T'HH:mm:ss") : '',
      shift_type: shift.shift_type || 'regular',
      notes: shift.notes || '',
      is_published: shift.is_published !== false,
    });
    setShowModal(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      branch_id: Number(form.branch_id),
      user_id: Number(form.user_id),
      start_at: form.start_at,
      end_at: form.end_at,
      shift_type: form.shift_type,
      notes: form.notes || null,
      is_published: form.is_published,
    };
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  return (
    <>
      <ConfirmDialog
        isOpen={deleteShiftId != null}
        onClose={() => !deleteMutation.isPending && setDeleteShiftId(null)}
        onConfirm={() => {
          if (deleteShiftId == null) return;
          deleteMutation.mutate(deleteShiftId, { onSuccess: () => setDeleteShiftId(null) });
        }}
        title="Delete this shift?"
        description="This shift will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Schedule</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage shifts by week and branch</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add Shift
          </button>
        )}
      </div>

      <SectionCard>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading shifts...</div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No shifts"
            description="No shifts in this week. Add a shift to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Staff</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Start</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">End</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                  {canManage && <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{s.branch?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{s.user?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {s.start_at ? format(new Date(s.start_at), 'MMM d, HH:mm') : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {s.end_at ? format(new Date(s.end_at), 'MMM d, HH:mm') : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{SHIFT_TYPES.find((t) => t.value === s.shift_type)?.label ?? s.shift_type}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 max-w-[200px] truncate">{s.notes || '—'}</td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          aria-label="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteShiftId(s.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingShift(null); }}
        title={editingShift ? 'Edit shift' : 'Add shift'}
        size="md"
      >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    required
                    value={form.branch_id}
                    onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff</label>
                  <select
                    required
                    value={form.user_id}
                    onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select staff</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.start_at ? String(form.start_at).slice(0, 16) : ''}
                      onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value ? e.target.value + ':00' : '' }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.end_at ? String(form.end_at).slice(0, 16) : ''}
                      onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value ? e.target.value + ':00' : '' }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.shift_type}
                    onChange={(e) => setForm((f) => ({ ...f, shift_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {SHIFT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={form.is_published}
                    onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_published" className="text-sm text-gray-700">Published</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90"
                  >
                    {editingShift ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingShift(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
      </Modal>
    </div>
    </>
  );
}
