import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function ServerSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/me');
      return response.data?.data || response.data;
    },
  });

  const facilityId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('super_admin_selected_facility_id');
      if (stored) return stored;
    }
    return currentUser?.facility_id;
  }, [currentUser]);

  const { data: settings, isLoading } = useQuery({
    enabled: !!facilityId,
    queryKey: ['facility-settings', facilityId, 'server'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/server`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      maintenance_mode: !!settings?.maintenance_mode?.value,
      queue_concurrency: settings?.queue_concurrency?.value ?? 5,
      log_retention_days: settings?.log_retention_days?.value ?? 30,
    }),
    [settings]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          maintenance_mode: { value: values.maintenance_mode, type: 'boolean' },
          queue_concurrency: { value: values.queue_concurrency, type: 'integer' },
          log_retention_days: { value: values.log_retention_days, type: 'integer' },
        },
      };

      const response = await api.put(`/facilities/${facilityId}/settings/server`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Server settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'server']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update server settings',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      maintenance_mode: !!formData.get('maintenance_mode'),
      queue_concurrency: parseInt(formData.get('queue_concurrency') || '1', 10),
      log_retention_days: parseInt(formData.get('log_retention_days') || '1', 10),
    };
    saveMutation.mutate(values);
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          Server settings are available once a facility is associated with your account.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
          <Server className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Server Settings</h1>
          <p className="text-sm text-gray-500">
            Control maintenance mode, queues and log retention for this facility.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Maintenance</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="maintenance_mode"
                defaultChecked={defaultValues.maintenance_mode}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Put facility into maintenance mode (read-only access)</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Queue Concurrency
              </label>
              <input
                type="number"
                name="queue_concurrency"
                min={1}
                max={50}
                defaultValue={defaultValues.queue_concurrency}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <p className="mt-1 text-xs text-gray-400">
                Number of queue workers allocated to this facility&apos;s tasks.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Log Retention (days)
              </label>
              <input
                type="number"
                name="log_retention_days"
                min={1}
                max={365}
                defaultValue={defaultValues.log_retention_days}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <p className="mt-1 text-xs text-gray-400">
                How long logs should be retained before being cleaned up.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center justify-center px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}


