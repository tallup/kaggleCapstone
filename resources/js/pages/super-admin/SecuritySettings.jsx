import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function SecuritySettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();
  const [credentialForm, setCredentialForm] = useState({
    email: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/me');
      return response.data?.data || response.data;
    },
  });

  useEffect(() => {
    if (currentUser?.email) {
      setCredentialForm((prev) => ({
        ...prev,
        email: currentUser.email,
      }));
    }
  }, [currentUser?.email]);

  const facilityId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('super_admin_selected_facility_id');
      if (stored) return stored;
    }
    return currentUser?.facility_id;
  }, [currentUser]);

  const { data: settings, isLoading } = useQuery({
    enabled: !!facilityId,
    queryKey: ['facility-settings', facilityId, 'security'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/security`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      password_min_length: settings?.password_min_length?.value ?? 8,
      password_require_uppercase: !!settings?.password_require_uppercase?.value,
      password_require_number: !!settings?.password_require_number?.value,
      password_require_symbol: !!settings?.password_require_symbol?.value,
      session_timeout_minutes: settings?.session_timeout_minutes?.value ?? 30,
      max_login_attempts: settings?.max_login_attempts?.value ?? 5,
      enable_two_factor: !!settings?.enable_two_factor?.value,
    }),
    [settings]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          password_min_length: { value: values.password_min_length, type: 'integer' },
          password_require_uppercase: { value: values.password_require_uppercase, type: 'boolean' },
          password_require_number: { value: values.password_require_number, type: 'boolean' },
          password_require_symbol: { value: values.password_require_symbol, type: 'boolean' },
          session_timeout_minutes: { value: values.session_timeout_minutes, type: 'integer' },
          max_login_attempts: { value: values.max_login_attempts, type: 'integer' },
          enable_two_factor: { value: values.enable_two_factor, type: 'boolean' },
        },
      };

      const response = await api.put(`/facilities/${facilityId}/settings/security`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Security settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'security']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update security settings',
        'error'
      );
    },
  });

  const credentialsMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        current_password: values.current_password,
      };

      if (values.email) {
        payload.email = values.email;
      }

      if (values.password) {
        payload.password = values.password;
        payload.password_confirmation = values.password_confirmation;
      }

      const response = await api.put('/user/credentials', payload);
      return response.data;
    },
    onSuccess: (data) => {
      const updatedEmail = data?.user?.email || credentialForm.email;
      setCredentialForm({
        email: updatedEmail,
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      toast.showToast('Super admin credentials updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['me']);
      queryClient.invalidateQueries(['current-user']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update credentials',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    values.password_min_length = parseInt(values.password_min_length, 10);
    values.session_timeout_minutes = parseInt(values.session_timeout_minutes, 10);
    values.max_login_attempts = parseInt(values.max_login_attempts, 10);
    values.password_require_uppercase = !!formData.get('password_require_uppercase');
    values.password_require_number = !!formData.get('password_require_number');
    values.password_require_symbol = !!formData.get('password_require_symbol');
    values.enable_two_factor = !!formData.get('enable_two_factor');

    saveMutation.mutate(values);
  };

  const handleCredentialSubmit = (event) => {
    event.preventDefault();

    const currentEmail = (currentUser?.email || '').trim().toLowerCase();
    const nextEmail = credentialForm.email.trim().toLowerCase();
    const wantsEmailChange = nextEmail !== '' && nextEmail !== currentEmail;
    const wantsPasswordChange = credentialForm.password.trim() !== '';

    if (!credentialForm.current_password.trim()) {
      toast.showToast('Current password is required to update credentials.', 'error');
      return;
    }

    if (!wantsEmailChange && !wantsPasswordChange) {
      toast.showToast('No credential changes detected.', 'error');
      return;
    }

    if (wantsPasswordChange && credentialForm.password !== credentialForm.password_confirmation) {
      toast.showToast('New password and confirmation do not match.', 'error');
      return;
    }

    credentialsMutation.mutate({
      email: wantsEmailChange ? nextEmail : undefined,
      current_password: credentialForm.current_password,
      password: wantsPasswordChange ? credentialForm.password : undefined,
      password_confirmation: wantsPasswordChange ? credentialForm.password_confirmation : undefined,
    });
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          Security settings are available once a facility is associated with your account.
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
          <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Security Settings</h1>
          <p className="text-sm text-gray-500">
            Define password policies, session timeouts and login safeguards for this facility.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Password Length
            </label>
            <input
              name="password_min_length"
              type="number"
              defaultValue={defaultValues.password_min_length}
              min={6}
              max={128}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              name="session_timeout_minutes"
              type="number"
              defaultValue={defaultValues.session_timeout_minutes}
              min={5}
              max={1440}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Login Attempts
            </label>
            <input
              name="max_login_attempts"
              type="number"
              defaultValue={defaultValues.max_login_attempts}
              min={3}
              max={20}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Password Complexity</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="password_require_uppercase"
                defaultChecked={defaultValues.password_require_uppercase}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Require at least one uppercase letter</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="password_require_number"
                defaultChecked={defaultValues.password_require_number}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Require at least one number</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="password_require_symbol"
                defaultChecked={defaultValues.password_require_symbol}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Require at least one symbol</span>
            </label>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Additional Controls</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="enable_two_factor"
                defaultChecked={defaultValues.enable_two_factor}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Enable two-factor authentication for staff logins</span>
            </label>
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

      <form onSubmit={handleCredentialSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Super Admin Credentials</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your Super Admin sign-in email and password directly from this portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Email
            </label>
            <input
              name="email"
              type="email"
              value={credentialForm.email}
              onChange={(e) => setCredentialForm((prev) => ({ ...prev, email: e.target.value }))}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                name="current_password"
                type={showPasswords.current ? 'text' : 'password'}
                value={credentialForm.current_password}
                onChange={(e) => setCredentialForm((prev) => ({ ...prev, current_password: e.target.value }))}
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password (optional)
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPasswords.next ? 'text' : 'password'}
                value={credentialForm.password}
                onChange={(e) => setCredentialForm((prev) => ({ ...prev, password: e.target.value }))}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.next ? 'Hide new password' : 'Show new password'}
              >
                {showPasswords.next ? <EyeOff className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                name="password_confirmation"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={credentialForm.password_confirmation}
                onChange={(e) => setCredentialForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.confirm ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={credentialsMutation.isPending}
            className="inline-flex items-center justify-center px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4 mr-2" strokeWidth={2.5} />
            {credentialsMutation.isPending ? 'Updating...' : 'Update Credentials'}
          </button>
        </div>
      </form>
    </div>
  );
}


