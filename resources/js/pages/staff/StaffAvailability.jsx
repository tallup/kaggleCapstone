import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { format } from 'date-fns';
import { Calendar, Plus, Edit, Trash2, Clock, User } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import logger from '../../utils/logger';

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function StaffAvailability() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteAvailId, setDeleteAvailId] = useState(null);
  const [recurringOnly, setRecurringOnly] = useState('');
  const [form, setForm] = useState({
    user_id: '',
    day_of_week: '',
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    type: 'available',
  });

  React.useEffect(() => {
    api.get('/user').then((r) => {
      setCurrentUser(r.data);
      if (!userId && r.data?.id) setUserId(String(r.data.id));
    }).catch((e) => logger.error('Failed to fetch user:', e));
  }, []);

  const { data: usersData } = useQuery({
    queryKey: ['users-list-avail'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { per_page: 500 } });
      return response.data?.data ?? response.data ?? [];
    },
    enabled: !!currentUser,
  });
  const users = Array.isArray(usersData) ? usersData : usersData?.data ?? [];
  const canManageOthers = currentUser?.role === 'super_admin' || currentUser?.isAnyAdmin || currentUser?.permissions?.includes?.('manage_schedules');
  const effectiveUserId = userId || currentUser?.id;

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ['staff-availability', effectiveUserId, recurringOnly],
    queryFn: async () => {
      const params = { per_page: 200 };
      if (effectiveUserId) params.user_id = effectiveUserId;
      if (recurringOnly === 'recurring') params.recurring = true;
      if (recurringOnly === 'oneoff') params.recurring = false;
      const response = await api.get('/staff-availability', { params });
      return response.data;
    },
    enabled: !!effectiveUserId,
  });
  const items = availabilityData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/staff-availability', body),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-availability']);
      setShowModal(false);
      resetForm();
    },
    onError: (err) => {
      logger.error('Create availability failed', err);
      alert(err?.response?.data?.message || 'Failed to create availability');
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/staff-availability/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-availability']);
      setShowModal(false);
      setEditing(null);
      resetForm();
    },
    onError: (err) => {
      logger.error('Update availability failed', err);
      alert(err?.response?.data?.message || 'Failed to update availability');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff-availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-availability']);
      setEditing(null);
    },
    onError: (err) => {
      logger.error('Delete availability failed', err);
      alert(err?.response?.data?.message || 'Failed to delete');
    },
  });

  function resetForm() {
    setForm({
      user_id: effectiveUserId ? String(effectiveUserId) : '',
      day_of_week: '',
      date: '',
      start_time: '09:00',
      end_time: '17:00',
      type: 'available',
    });
  }

  const openCreate = () => {
    setEditing(null);
    setForm({
      user_id: effectiveUserId ? String(effectiveUserId) : '',
      day_of_week: '',
      date: '',
      start_time: '09:00',
      end_time: '17:00',
      type: 'available',
    });
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      user_id: String(item.user_id ?? ''),
      day_of_week: item.day_of_week ? String(item.day_of_week) : '',
      date: item.date ? format(new Date(item.date), 'yyyy-MM-dd') : '',
      start_time: item.start_time ? String(item.start_time).slice(0, 5) : '09:00',
      end_time: item.end_time ? String(item.end_time).slice(0, 5) : '17:00',
      type: item.type || 'available',
    });
    setShowModal(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const uid = form.user_id || effectiveUserId;
    if (!uid) {
      alert('Please select staff.');
      return;
    }
    const payload = {
      user_id: Number(uid),
      start_time: form.start_time,
      end_time: form.end_time,
      type: form.type,
    };
    if (form.day_of_week) {
      payload.day_of_week = Number(form.day_of_week);
    } else if (form.date) {
      payload.date = form.date;
    } else {
      alert('Please set either a day of week (recurring) or a date (one-off).');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  return (
    <>
      <ConfirmDialog
        isOpen={deleteAvailId != null}
        onClose={() => !deleteMutation.isPending && setDeleteAvailId(null)}
        onConfirm={() => {
          if (deleteAvailId == null) return;
          deleteMutation.mutate(deleteAvailId, { onSuccess: () => setDeleteAvailId(null) });
        }}
        title="Remove this availability?"
        description="This availability rule will be deleted."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Availability</h1>
          <p className="text-sm text-gray-600 mt-1">Set recurring weekly availability and one-off overrides</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add availability
        </button>
      </div>

      <SectionCard>
        {canManageOthers && (
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-gray-500" />
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">My availability</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={recurringOnly}
            onChange={(e) => setRecurringOnly(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="recurring">Recurring (weekly)</option>
            <option value="oneoff">One-off</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No availability"
            description="Add recurring or one-off availability to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Staff</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">When</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.user?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.day_of_week
                        ? DAYS.find((d) => d.value === item.day_of_week)?.label ?? `Day ${item.day_of_week}`
                        : item.date
                          ? format(new Date(item.date), 'MMM d, yyyy')
                          : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {String(item.start_time).slice(0, 5)} – {String(item.end_time).slice(0, 5)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.type === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {item.type === 'available' ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button type="button" onClick={() => openEdit(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" aria-label="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteAvailId(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1" aria-label="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? 'Edit availability' : 'Add availability'}
        size="md"
      >
              <form onSubmit={handleSubmit} className="space-y-4">
                {canManageOthers && (
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
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recurring (day of week)</label>
                  <select
                    value={form.day_of_week}
                    onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value, date: '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">—</option>
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Or one-off date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, day_of_week: '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if using recurring day above.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                    <input
                      type="time"
                      required
                      value={form.start_time}
                      onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                    <input
                      type="time"
                      required
                      value={form.end_time}
                      onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90">
                    {editing ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditing(null); }}
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
