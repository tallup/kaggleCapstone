import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function NotificationSettings() {
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
    queryKey: ['facility-settings', facilityId, 'notification'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/notification`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      enable_email_notifications: !!settings?.enable_email_notifications?.value,
      enable_in_app_notifications: !!settings?.enable_in_app_notifications?.value,
      notify_on_incident: !!settings?.notify_on_incident?.value,
      notify_on_check_in_out: !!settings?.notify_on_check_in_out?.value,
      notify_on_resident_sign_out: !!settings?.notify_on_resident_sign_out?.value,
      daily_summary_time: settings?.daily_summary_time?.value || '07:00',
    }),
    [settings]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          enable_email_notifications: { value: values.enable_email_notifications, type: 'boolean' },
          enable_in_app_notifications: {
            value: values.enable_in_app_notifications,
            type: 'boolean',
          },
          notify_on_incident: { value: values.notify_on_incident, type: 'boolean' },
          notify_on_check_in_out: { value: values.notify_on_check_in_out, type: 'boolean' },
          notify_on_resident_sign_out: {
            value: values.notify_on_resident_sign_out,
            type: 'boolean',
          },
          daily_summary_time: { value: values.daily_summary_time, type: 'string' },
        },
      };

      const response = await api.put(
        `/facilities/${facilityId}/settings/notification`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Notification settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'notification']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update notification settings',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      enable_email_notifications: !!formData.get('enable_email_notifications'),
      enable_in_app_notifications: !!formData.get('enable_in_app_notifications'),
      notify_on_incident: !!formData.get('notify_on_incident'),
      notify_on_check_in_out: !!formData.get('notify_on_check_in_out'),
      notify_on_resident_sign_out: !!formData.get('notify_on_resident_sign_out'),
      daily_summary_time: formData.get('daily_summary_time') || '',
    };
    saveMutation.mutate(values);
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          Notification settings are available once a facility is associated with your account.
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
          <Bell className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notification Settings</h1>
          <p className="text-sm text-gray-500">
            Control which events send notifications and through which channels.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="enable_email_notifications"
                defaultChecked={defaultValues.enable_email_notifications}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Email notifications</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="enable_in_app_notifications"
                defaultChecked={defaultValues.enable_in_app_notifications}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>In-app notifications</span>
            </label>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Events</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="notify_on_incident"
                defaultChecked={defaultValues.notify_on_incident}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Resident incidents</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="notify_on_check_in_out"
                defaultChecked={defaultValues.notify_on_check_in_out}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Staff and visitor check-in/out</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="notify_on_resident_sign_out"
                defaultChecked={defaultValues.notify_on_resident_sign_out}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Resident sign-outs and returns</span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Summary Time
            </label>
            <input
              type="time"
              name="daily_summary_time"
              defaultValue={defaultValues.daily_summary_time}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
            <p className="mt-1 text-xs text-gray-400">
              Time of day to send daily summary notifications (if enabled).
            </p>
          </div>

          <div className="flex justify-end items-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


