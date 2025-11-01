import React from 'react';

/**
 * Modern, reusable section card component
 * Used for displaying lists and content sections with consistent styling
 * 
 * @param {string} title - Section title
 * @param {ReactNode} children - Section content
 * @param {string} actionLabel - Action button label
 * @param {function} onAction - Action button click handler
 * @param {ReactNode} headerRight - Additional header content (right side)
 */
export default function SectionCard({ 
    title, 
    children, 
    actionLabel,
    onAction,
    headerRight
}) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    {title && (
                        <h2 className="text-lg font-bold text-[#2D5016]">{title}</h2>
                    )}
                    <div className="flex items-center space-x-4">
                        {headerRight}
                        {actionLabel && onAction && (
                            <button
                                onClick={onAction}
                                className="text-sm text-[#2D5016] hover:text-[#1a3009] font-medium"
                            >
                                {actionLabel} →
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

