import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Clock, CheckCircle, XCircle, Search, Check, X, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import { useToastContext } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';

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
            <EntityCardShell key={registration.id}>
              <EntityCardHeader
                left={
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-6 w-6 shrink-0 text-[var(--theme-primary)]" />
                    {getStatusBadge(registration.status)}
                  </div>
                }
                right={
                  registration.status === 'pending' ? (
                    <>
                      <Tooltip content="Approve and set up facility" position="top">
                        <CardIconButton
                          variant="primary"
                          icon={Check}
                          aria-label="Approve and set up"
                          onClick={() =>
                            navigate(`/super-admin/facility-registrations/${registration.id}/approve`)
                          }
                        />
                      </Tooltip>
                      <Tooltip content="Reject registration" position="top">
                        <CardIconButton
                          variant="delete"
                          icon={X}
                          aria-label="Reject"
                          onClick={() => setRejectConfirmId(registration.id)}
                        />
                      </Tooltip>
                    </>
                  ) : null
                }
              />

              <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                {registration.facility_name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Requested on {new Date(registration.created_at).toLocaleDateString()}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <DataPill icon={Mail}>
                  <span className="truncate font-normal text-slate-600">{registration.email}</span>
                </DataPill>
                {registration.phone && (
                  <DataPill icon={Phone}>
                    <span className="font-normal text-slate-600">{registration.phone}</span>
                  </DataPill>
                )}
                <DataPill icon={MapPin} className="md:col-span-2">
                  <span className="font-normal text-slate-600">
                    {registration.address || 'No address provided'}
                  </span>
                </DataPill>
                {registration.requested_subdomain && (
                  <DataPill className="md:col-span-2">
                    <span className="font-mono text-sm text-[var(--theme-primary)]">
                      {registration.requested_subdomain}
                    </span>
                  </DataPill>
                )}
              </div>

              <DataPillSection label="Contact">
                <p className="text-sm font-medium text-slate-800">{registration.contact_name}</p>
              </DataPillSection>
            </EntityCardShell>
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

