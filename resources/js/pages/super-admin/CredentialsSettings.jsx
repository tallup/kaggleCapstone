import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function CredentialsSettings() {
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

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get('/user');
      return response.data;
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

  const credentialsMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        current_password: values.current_password,
      };

      if (values.email) payload.email = values.email;
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
      queryClient.invalidateQueries(['current-user']);
      queryClient.invalidateQueries(['me']);
    },
    onError: (error) => {
      toast.showToast(error.response?.data?.message || 'Failed to update credentials', 'error');
    },
  });

  const handleSubmit = (event) => {
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
          <KeyRound className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Credential Settings</h1>
          <p className="text-sm text-gray-500">
            Update your Super Admin login email and password.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
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
            {credentialsMutation.isPending ? 'Updating...' : 'Update Credentials'}
          </button>
        </div>
      </form>
    </div>
  );
}
