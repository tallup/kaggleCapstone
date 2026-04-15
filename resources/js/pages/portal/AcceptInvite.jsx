import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { storeAuthToken } from '../../services/api';
import { clearCachedCurrentUser } from '../../queries/currentUser';
import { toast } from 'sonner';

export default function AcceptInvite() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link. No token provided.');
      setLoading(false);
      return;
    }
    api.get(`/family/invite/${token}`)
      .then((res) => {
        setInvite(res.data);
        setForm((f) => ({
          ...f,
          name: res.data.contact_name || f.name,
          email: res.data.contact_email || f.email,
        }));
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Invalid or expired invite link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    setSubmitting(true);
    api.post('/family/invite/accept', {
      invite_token: token,
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
      .then((res) => {
        const t = res.data?.token;
        if (t) {
          storeAuthToken(t);
          clearCachedCurrentUser(queryClient);
          if (res.data.user) {
            localStorage.setItem('user_name', res.data.user.name || res.data.user.email);
            localStorage.setItem('user_role', res.data.user.role || '');
          }
          toast.success('Account created. Welcome to the Family Portal.');
          navigate('/portal', { replace: true });
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.response?.data?.errors?.invite_token?.[0] || 'Something went wrong.';
        setError(msg);
      })
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid invite</h1>
          <p className="text-gray-600 mb-4">{error || 'This invite link is invalid or has expired.'}</p>
          <a href="/login" className="text-[var(--theme-primary)] hover:underline">Go to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Join the Family Portal</h1>
        {invite?.resident_name && (
          <p className="text-gray-600 mb-6">You’re being invited to view care updates for <strong>{invite.resident_name}</strong>.</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={form.password_confirmation}
              onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account & open portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
