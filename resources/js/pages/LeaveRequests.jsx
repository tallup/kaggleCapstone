import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';

export default function LeaveRequests() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/user');
        setCurrentUser(response.data);
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    };
    fetchUser();
  }, []);

  // Check if user is a caregiver
  const isCaregiver = React.useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase().trim() || '';
    const roleNormalized = role.replace(/[\s_]/g, '');
    return roleNormalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
  }, [currentUser]);

  const { data: users } = useQuery({
    queryKey: ['users-options'],
    queryFn: async () => (await api.get('/residents', { params: { per_page: 1 } })).data && (await api.get('/roles')) && (await api.get('/v1/user')) && [] ,
    enabled: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: async () => {
      const params = { per_page: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      return (await api.get('/leave-requests', { params })).data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/leave-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['leave-requests']),
  });

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Leave Requests Management</h2>
            <p className="text-gray-600">View and manage staff leave requests.</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base">
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${statusFilter === s ? 'bg-[#2D5016] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div><p className="mt-4 text-gray-600">Loading leave requests...</p></div>
      ) : (
        <div className="space-y-4">
          {data?.data?.length ? (
            data.data.map((lr) => (
              <div key={lr.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{lr.staff?.name || 'Staff'}</h3>
                        <p className="text-sm text-gray-500">{new Date(lr.start_date).toLocaleDateString()} - {new Date(lr.end_date).toLocaleDateString()}</p>
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium mt-2 ${lr.status === 'approved' ? 'bg-green-50 text-[#2D5016]' : lr.status === 'pending' ? 'bg-amber-50 text-[#8B4513]' : 'bg-red-100 text-red-800'}`}>{lr.status}</span>
                      </div>
                    </div>
                    {lr.reason && <p className="text-sm text-gray-700 mt-3"><span className="font-medium">Reason:</span> {lr.reason}</p>}
                  </div>
                  <div className="flex space-x-2">
                    {/* Caregivers can only edit/delete their own requests */}
                    {(!isCaregiver || lr.staff_id === currentUser?.id) && (
                      <>
                        <button onClick={() => { setEditing(lr); setShowForm(true); }} className="p-2 text-[#2D5016] hover:bg-green-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => window.confirm('Delete leave request?') && deleteMutation.mutate(lr.id)} className="p-2 text-[#8B4513] hover:bg-amber-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No leave requests found</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <LeaveForm
          record={editing}
          currentUser={currentUser}
          isCaregiver={isCaregiver}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries(['leave-requests']); }}
        />
      )}
    </div>
  );
}

function LeaveForm({ record, currentUser, isCaregiver, onClose, onSuccess }) {
  // Format date helper function
  const formatDateForInput = (dateString) => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    // If it's already in YYYY-MM-DD format, return it
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    // Otherwise parse and format it
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    staff_id: record?.staff_id || currentUser?.id || '',
    start_date: formatDateForInput(record?.start_date),
    end_date: formatDateForInput(record?.end_date),
    reason: record?.reason || '',
    status: record?.status || 'pending',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (record) {
        await api.put(`/leave-requests/${record.id}`, form);
      } else {
        await api.post('/leave-requests', form);
      }
      onSuccess();
    } catch (e) {
      setErrors(e.response?.data?.errors || { general: e.response?.data?.message || 'Failed to save request' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center justify-center z-50 p-4 text-sm md:text-base">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{record ? 'Edit Leave Request' : 'New Leave Request'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          {errors.general && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800">{errors.general}</p></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" placeholder="Please provide a reason for your leave request..." />
            </div>
            {/* Only admins can approve/reject leave requests */}
            {!isCaregiver && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            )}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] disabled:opacity-50">{submitting ? 'Saving...' : (record ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

