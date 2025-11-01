import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import api from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    React.useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            const role = localStorage.getItem('user_role') || '';
            if (role === 'administrator' || role === 'admin') {
                window.location.href = '/admin';
            } else {
                navigate('/dashboard', { replace: true });
            }
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
                
                // Redirect based on user role
                const role = response.data.user?.role || '';
                if (role === 'administrator' || role === 'admin') {
                    // Redirect to admin panel for administrators
                    window.location.href = '/admin';
                } else if (role === 'caregiver' || role === 'care_giver') {
                    // Redirect to React app for caregivers
                    navigate('/dashboard');
                } else {
                    // Default: redirect to React dashboard
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo and Branding */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-16 h-16 bg-[#2D5016] rounded-full flex items-center justify-center shadow-lg">
                            <img 
                                src="/images/logo.jpeg" 
                                alt="Evergreen Oasis Care Home"
                                className="w-14 h-14 rounded-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="w-14 h-14 bg-[#2D5016] rounded-full flex items-center justify-center hidden">
                                <span className="text-white font-bold text-2xl">E</span>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Evergreen Oasis Care Home</h1>
                    <p className="text-gray-600">Healthcare Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Sign In</h2>
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="staff@serenityafh.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2D5016] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1a3009] focus:outline-none focus:ring-2 focus:ring-[#2D5016] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Need help?{' '}
                            <a href="/admin/login" className="text-[#2D5016] hover:text-[#1a3009] font-medium">
                                Contact Support
                            </a>
                        </p>
                    </div>
                </div>

                {/* Alternative Login Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Or use{' '}
                        <a href="/admin/login" className="text-[#2D5016] hover:text-[#1a3009] font-medium">
                            Admin Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
