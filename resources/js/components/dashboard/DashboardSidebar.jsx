import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * DashboardSidebar - Container for sidebar widgets with collapsible sections
 */
export default function DashboardSidebar({ children, className = '' }) {
    return (
        <aside className={`space-y-6 ${className}`}>
            {children}
        </aside>
    );
}

/**
 * SidebarWidget - Collapsible widget container
 */
export function SidebarWidget({ 
    title, 
    icon: Icon, 
    defaultOpen = true, 
    children,
    className = '' 
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 text-gray-600" />}
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    );
}

