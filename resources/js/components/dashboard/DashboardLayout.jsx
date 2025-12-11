import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * DashboardLayout - Responsive multi-column layout with sidebar
 * Desktop: Main content (2/3) + Sidebar (1/3, 300px fixed)
 * Mobile: Single column with collapsible sidebar
 */
export default function DashboardLayout({ 
    children, 
    sidebar, 
    className = '' 
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className={`min-h-screen bg-gray-50 ${className}`}>
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden fixed top-4 right-4 z-50">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                    aria-label="Toggle sidebar"
                >
                    {sidebarOpen ? (
                        <X className="w-5 h-5 text-gray-700" />
                    ) : (
                        <Menu className="w-5 h-5 text-gray-700" />
                    )}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {children}
                    </div>

                    {/* Sidebar */}
                    <div
                        className={`lg:col-span-1 ${
                            sidebarOpen
                                ? 'fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 overflow-y-auto lg:relative lg:inset-0 lg:w-auto lg:shadow-none lg:z-auto'
                                : 'hidden lg:block'
                        }`}
                    >
                        <div className="sticky top-6 space-y-6">
                            {sidebar}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

