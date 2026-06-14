import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Home, Sparkles, Info, Mail, Shield, FileText, UserPlus, Menu, X, BookOpen } from 'lucide-react';

export default function PublicNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/about', label: 'About', icon: Info },
        { path: '/features', label: 'Features', icon: Sparkles },
        { path: '/blog', label: 'Blog', icon: BookOpen },
        { path: '/register-facility', label: 'Register Facility', icon: UserPlus },
        { path: '/contact', label: 'Contact', icon: Mail },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleNavClick = (path) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    return (
        <>
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
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center hidden">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="text-xl font-bold text-gray-900">HomeLogic360</span>
                    </button>

                        {/* Navigation Links - Desktop */}
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
                                            ? 'bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white shadow-md font-semibold'
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
                            {/* Hamburger Menu Button - Mobile */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                            
                            {/* Sign In Button */}
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg text-sm md:text-base"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <>
                    {/* Mobile Menu */}
                    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden">
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <span className="text-lg font-bold text-gray-900">Menu</span>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Navigation Items */}
                            <nav className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.path);
                                        return (
                                            <button
                                                key={item.path}
                                                onClick={() => handleNavClick(item.path)}
                                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                                    active
                                                        ? 'bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white shadow-md'
                                                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </nav>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}


