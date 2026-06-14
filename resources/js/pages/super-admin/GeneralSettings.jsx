import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function GeneralSettings() {
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
    queryKey: ['facility-settings', facilityId, 'general'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/general`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      display_name: settings?.display_name?.value || currentUser?.facility?.name || '',
      timezone: settings?.timezone?.value || '',
      locale: settings?.locale?.value || 'en',
      date_format: settings?.date_format?.value || 'MM/dd/yyyy',
      time_format: settings?.time_format?.value || 'hh:mm a',
    }),
    [settings, currentUser]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          display_name: { value: values.display_name, type: 'string' },
          timezone: { value: values.timezone, type: 'string' },
          locale: { value: values.locale, type: 'string' },
          date_format: { value: values.date_format, type: 'string' },
          time_format: { value: values.time_format, type: 'string' },
        },
      };

      const response = await api.put(`/facilities/${facilityId}/settings/general`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('General settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'general']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update general settings',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    saveMutation.mutate(values);
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          General settings are available once a facility is associated with your account.
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
          <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">General Settings</h1>
          <p className="text-sm text-gray-500">
            Configure facility display details, timezone, and formatting options.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Display Name
            </label>
            <input
              name="display_name"
              defaultValue={defaultValues.display_name}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="Facility name shown in the app"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
            <input
              name="locale"
              defaultValue={defaultValues.locale}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="en"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <input
              name="timezone"
              defaultValue={defaultValues.timezone}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="America/Los_Angeles"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <input
              name="date_format"
              defaultValue={defaultValues.date_format}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="MM/dd/yyyy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <input
              name="time_format"
              defaultValue={defaultValues.time_format}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="hh:mm a"
            />
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


