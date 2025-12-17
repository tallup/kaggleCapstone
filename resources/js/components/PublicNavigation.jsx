import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Home, Sparkles, Info, Mail, Shield, DollarSign, FileText, UserPlus } from 'lucide-react';

export default function PublicNavigation() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/about', label: 'About', icon: Info },
        { path: '/features', label: 'Features', icon: Sparkles },
        { path: '/pricing', label: 'Pricing', icon: DollarSign },
        { path: '/register-facility', label: 'Register Facility', icon: UserPlus },
        { path: '/contact', label: 'Contact', icon: Mail },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                    >
                        <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                            <img
                                src="/images/logonew.png"
                                alt="HomeLogic360"
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center hidden">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="text-xl font-bold text-gray-900">HomeLogic360</span>
                    </button>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                        active
                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md font-semibold'
                                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Button & Sign In */}
                    <div className="flex items-center space-x-4">
                        {/* Mobile menu - show simplified nav */}
                        <div className="md:hidden flex items-center space-x-2">
                            <button
                                onClick={() => navigate('/features')}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                            >
                                Features
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg text-sm md:text-base"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}


