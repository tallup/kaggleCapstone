import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [redirectSeconds, setRedirectSeconds] = useState(null);

    const isLinkValid = useMemo(() => token.trim() !== '' && email.trim() !== '', [token, email]);

    useEffect(() => {
        if (redirectSeconds === null) return;

        if (redirectSeconds <= 0) {
            navigate('/login');
            return;
        }

        const interval = window.setInterval(() => {
            setRedirectSeconds((prev) => (prev === null ? null : prev - 1));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [redirectSeconds, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/reset-password', {
                token,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            setMessage(response?.data?.message || 'Password reset successful.');
            setRedirectSeconds(5);
        } catch (err) {
            const responseMessage = err?.response?.data?.message;
            const passwordError = err?.response?.data?.errors?.password?.[0];
            setError(passwordError || responseMessage || 'Unable to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
                <p className="mt-1 text-sm text-gray-600">Set your new password for {email || 'your account'}.</p>

                {!isLinkValid ? (
                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        Invalid or incomplete reset link. Please request a new reset email.
                    </div>
                ) : message ? (
                    <div className="mt-6 rounded-xl overflow-hidden border border-emerald-200 shadow-sm">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                <p className="font-semibold">Password reset successful</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                            <p>{message}</p>
                            <p className="mt-2 font-medium">
                                Redirecting to login in{' '}
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-bold text-white">
                                    {redirectSeconds ?? 0}
                                </span>{' '}
                                second{(redirectSeconds ?? 0) === 1 ? '' : 's'}...
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                New password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            />
                        </div>
                        <div>
                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm password
                            </label>
                            <input
                                id="password_confirmation"
                                type="password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            />
                        </div>

                        {message && (
                            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="mt-4 text-sm text-center">
                    <Link to="/login" className="text-[var(--theme-primary)] hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}

