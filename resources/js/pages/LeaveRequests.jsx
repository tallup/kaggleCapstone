import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { Calendar, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function LeaveRequests() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [approveConfirmId, setApproveConfirmId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch current user
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/user');
        setCurrentUser(response.data);
      } catch (err) {
        logger.error('Failed to fetch current user:', err);
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

  // Check if user is an admin (can approve/reject)
  const isAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase().trim() || '';
    return role === 'administrator' || role === 'admin' || role === 'super_admin' || 
           currentUser.isFacilityAdministrator?.() || currentUser.isBranchAdmin?.();
  }, [currentUser]);

  const { data: users } = useQuery({
    queryKey: ['users-options'],
    queryFn: async () => (await api.get('/residents', { params: { per_page: 1 } })).data && (await api.get('/roles')) && (await api.get('/v1/user')) && [],
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
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      return api.put(`/leave-requests/${id}`, {
        status: 'approved',
        approved_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, declineReason }) => {
      return api.put(`/leave-requests/${id}`, {
        status: 'declined',
        decline_reason: declineReason || 'Request declined by administrator',
        approved_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });

  const handleReject = (id) => {
    const declineReason = window.prompt('Please provide a reason for declining this request (optional):');
    if (declineReason !== null) { // User didn't cancel
      rejectMutation.mutate({ id, declineReason });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={approveConfirmId != null}
        onClose={() => !approveMutation.isPending && setApproveConfirmId(null)}
        onConfirm={() => {
          if (approveConfirmId == null) return;
          approveMutation.mutate(approveConfirmId, { onSuccess: () => setApproveConfirmId(null) });
        }}
        title="Approve this leave request?"
        description="The request will be marked as approved."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        variant="primary"
        isPending={approveMutation.isPending}
      />
      <ConfirmDialog
        isOpen={deleteConfirmId != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId == null) return;
          deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
        }}
        title="Delete this leave request?"
        description="This request will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
      {showForm ? (
      <div>
        <LeaveForm
          record={editing}
          currentUser={currentUser}
          isCaregiver={isCaregiver}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries(['leave-requests']);
          }}
        />
      </div>
      ) : (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Leave Requests Management</h2>
            <p className="text-gray-600">View and manage staff leave requests.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { 
                setEditing(null); 
                setShowForm(true); 
              }} 
              className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>New Request</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((s) => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${statusFilter === s ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div><p className="mt-4 text-gray-600">Loading leave requests...</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.data?.length ? (
            data.data.map((lr) => (
              <div key={lr.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{lr.staff?.name || 'Staff'}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 text-[var(--theme-primary)]" />
                        <span>{new Date(lr.start_date).toLocaleDateString()} - {new Date(lr.end_date).toLocaleDateString()}</span>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${lr.status === 'approved' ? 'bg-green-100 text-green-800' : lr.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex space-x-2">
                      {/* Approve/Reject buttons for admins on pending requests */}
                      {isAdmin && lr.status === 'pending' && (
                        <>
                          <button 
                            type="button"
                            onClick={() => setApproveConfirmId(lr.id)} 
                            disabled={approveMutation.isLoading}
                            className="p-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(lr.id)} 
                            disabled={rejectMutation.isLoading}
                            className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Edit/Delete buttons */}
                      {(!isCaregiver || lr.staff_id === currentUser?.id) && (
                        <>
                          <button 
                            onClick={() => { setEditing(lr); setShowForm(true); }} 
                            className="p-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] rounded-lg transition-colors shadow-md hover:shadow-lg" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(lr.id)} 
                            className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-md hover:shadow-lg" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  {lr.reason && (
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Reason</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{lr.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No leave requests found</p>
            </div>
          )}
        </div>
      )}
    </div>
      )}
    </>
  );
}

function LeaveForm({ record, currentUser, isCaregiver, onClose, onSuccess }) {
  // Format date helper function
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString !== 'string') return '';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
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

    // Client-side validation
    if (!form.start_date || !form.end_date) {
      setErrors({ general: 'Please select both start and end dates.' });
      setSubmitting(false);
      return;
    }

    if (!form.reason || form.reason.trim().length < 10) {
      setErrors({ general: 'Reason must be at least 10 characters long.' });
      setSubmitting(false);
      return;
    }

    try {
      let response;
      if (record) {
        response = await api.put(`/leave-requests/${record.id}`, form);
      } else {
        response = await api.post('/leave-requests', form);
      }
      onSuccess();
    } catch (e) {
      logger.error('Leave request error:', e);
      const errorData = e.response?.data;

      // Handle validation errors
      if (errorData?.errors) {
        const validationErrors = {};
        Object.keys(errorData.errors).forEach(key => {
          validationErrors[key] = Array.isArray(errorData.errors[key])
            ? errorData.errors[key][0]
            : errorData.errors[key];
        });
        setErrors(validationErrors);

        // Also show the general message if provided
        if (errorData?.message) {
          setErrors(prev => ({ ...prev, general: errorData.message }));
        }
      } else {
        // Handle general errors
        const errorMessage = errorData?.message || e.message || 'Failed to save request. Please try again.';
        setErrors({ general: errorMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SectionCard>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {record ? 'Edit Leave Request' : 'New Leave Request'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{errors.general}</p>
            </div>
          )}
          {Object.keys(errors).filter(key => key !== 'general').length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {Object.entries(errors).filter(([key]) => key !== 'general').map(([key, value]) => (
                  <li key={key}>{Array.isArray(value) ? value[0] : value}</li>
                ))}
              </ul>
            </div>
          )}
          <form id="leave-request-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input 
                  type="date" 
                  value={form.start_date} 
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input 
                  type="date" 
                  value={form.end_date} 
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <textarea 
                value={form.reason} 
                onChange={(e) => setForm({ ...form, reason: e.target.value })} 
                rows={3} 
                required 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                placeholder="Please provide a reason for your leave request..."
              />
            </div>
            {/* Only admins can approve/reject leave requests */}
            {!isCaregiver && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            )}
          </form>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="leave-request-form"
            disabled={submitting}
            className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

