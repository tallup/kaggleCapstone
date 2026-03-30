import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Clock, CheckCircle, XCircle, Search, Eye, Check, X, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import { useToastContext } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function FacilityRegistrations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectConfirmId, setRejectConfirmId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['facility-registrations', statusFilter, search],
    queryFn: async () => {
      const params = { status: statusFilter };
      if (search) params.search = search;
      const res = await api.get('/facility-registrations', { params });
      return res.data;
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/facility-registrations/${id}`, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility-registrations']);
      queryClient.invalidateQueries(['super-admin-stats']);
      showToast('Registration rejected', 'success');
    },
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'Pending' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={rejectConfirmId != null}
        onClose={() => !rejectMutation.isPending && setRejectConfirmId(null)}
        onConfirm={() => {
          if (rejectConfirmId == null) return;
          rejectMutation.mutate(rejectConfirmId, { onSuccess: () => setRejectConfirmId(null) });
        }}
        title="Reject this registration?"
        description="The applicant will be notified that their request was rejected."
        confirmLabel="Reject"
        cancelLabel="Cancel"
        variant="danger"
        isPending={rejectMutation.isPending}
      />
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Facility Registrations</h2>
            <p className="text-gray-600">Review and approve facility registration requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility name, contact, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {data?.data?.length ? (
        <div className="grid grid-cols-1 gap-6">
          {data.data.map((registration) => (
            <div key={registration.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-6 h-6 text-[var(--theme-primary)]" />
                        <h3 className="text-xl font-bold text-gray-900">{registration.facility_name}</h3>
                        {getStatusBadge(registration.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Requested on {new Date(registration.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{registration.email}</span>
                    </div>
                    {registration.phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{registration.phone}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-gray-700 md:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">{registration.address || 'No address provided'}</span>
                    </div>
                    {registration.requested_subdomain && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-sm font-medium">Subdomain:</span>
                        <span className="text-sm text-[var(--theme-primary)] font-mono">{registration.requested_subdomain}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Contact:</span>
                    <span className="font-medium">{registration.contact_name}</span>
                  </div>
                </div>

                {registration.status === 'pending' && (
                  <div className="flex gap-2 lg:flex-col">
                    <button
                      onClick={() => navigate(`/super-admin/facility-registrations/${registration.id}/approve`)}
                      className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <Check className="w-4 h-4" />
                      Approve & Setup
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectConfirmId(registration.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">No {statusFilter} registrations found</p>
        </div>
      )}

    </div>
  );
}

