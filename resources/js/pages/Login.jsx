import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ClipboardList } from 'lucide-react';
import api from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already logged in
    React.useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', {
                email,
                password,
            });

            if (response.data.token) {
                // Store token and user info
                localStorage.setItem('auth_token', response.data.token);
                if (response.data.user) {
                    localStorage.setItem('user_name', response.data.user.name || response.data.user.email);
                    localStorage.setItem('user_role', response.data.user.role || '');
                }
                
                // Redirect all users to React dashboard
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[var(--theme-bg-light,#F9FAFB)]">
            {/* Brand / Welcome Panel */}
            <div className="md:w-1/2 relative overflow-hidden flex items-center justify-center text-white p-8 md:p-12" style={{ background: `linear-gradient(135deg, var(--theme-primary-dark, #152D4A), var(--theme-primary, #1E3A5F), var(--theme-primary-light, #2E5A8F))` }}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_rgba(255,255,255,0))]"></div>
                <div className="absolute inset-0 opacity-10 mix-blend-soft-light bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.45)_0%,_rgba(255,255,255,0)_65%)]"></div>
                <div className="relative z-10 max-w-xl space-y-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-4 items-center space-y-4 md:space-y-0">
                        <div className="h-20 w-20 rounded-full shadow-xl ring-2 ring-white/50 overflow-hidden">
                            <img
                                src="/images/logonew.png"
                                alt="HomeLogic360"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                        <div>
                            <p className="uppercase tracking-[0.35em] text-xs font-semibold text-white/70">
                                HomeLogic360
                            </p>
                            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                                AFH Management System
                            </h1>
                        </div>
                    </div>
                    <p className="text-white/85 text-base md:text-lg leading-relaxed">
                        Streamline resident care, staff communication, and critical operations in one secure platform designed for assisted living excellence.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/70">
                        <div className="flex items-start space-x-3">
                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="font-semibold text-white">Enterprise Security</p>
                                <p className="text-white/55 text-xs leading-relaxed">HIPAA-ready architecture protects every log in and data touchpoint.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                                <ClipboardList className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="font-semibold text-white">Centralized Operations</p>
                                <p className="text-white/55 text-xs leading-relaxed">Manage residents, medications, and schedules from a single, intuitive hub.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Authentication Panel */}
            <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="space-y-2 text-center md:text-left">
                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--theme-primary)] font-semibold">Welcome back</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[var(--theme-primary-dark)]">Sign in to HomeLogic360</h2>
                        <p className="text-sm text-[#627567] leading-relaxed">
                            Enter your credentials to access the HomeLogic360 AFH Management System.
                        </p>
                    </div>

                    <div className="bg-white border border-[#E3E8E3] rounded-xl shadow-[0_18px_48px_-25px_rgba(27,64,45,0.35)] p-6 space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-[#39463F] mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="block w-full pl-11 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] outline-none transition-all placeholder:text-gray-400"
                                        placeholder="your-email@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[#39463F] mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="block w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--theme-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="text-xs text-[#6F8276] leading-relaxed">
                            <p>
                                Trouble signing in?{' '}
                                <a href="mailto:support@homelogic360.com" className="text-[var(--theme-primary)] font-semibold hover:text-[var(--theme-primary-hover)] hover:underline transition-colors">
                                    Contact support
                                </a>{' '}
                                or access the Filament admin console directly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
