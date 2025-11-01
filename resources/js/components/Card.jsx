import React from 'react';

/**
 * Modern, reusable card component with gradient accents
 * 
 * @param {string} gradient - Tailwind gradient classes (e.g., 'from-blue-500 to-blue-600')
 * @param {string} iconBg - Icon background color classes
 * @param {string} iconColor - Icon color classes
 * @param {ReactNode} icon - Icon component
 * @param {string} title - Card title (displayed in uppercase, brown)
 * @param {ReactNode} children - Card content
 * @param {function} onClick - Click handler
 * @param {boolean} clickable - Whether card is clickable
 */
export default function Card({ 
    gradient = 'from-gray-400 to-gray-600', 
    iconBg = 'bg-gray-100',
    iconColor = 'text-gray-600',
    icon, 
    title, 
    children, 
    onClick,
    clickable = false 
}) {
    const cardClasses = clickable || onClick
        ? "group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100"
        : "bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden";
    
    return (
        <div className={cardClasses} onClick={onClick}>
            {/* Gradient decoration */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>
            
            {/* Content */}
            <div className="p-6">
                {(title || icon) && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                            {title && (
                                <p className="text-[#8B4513] text-sm font-semibold uppercase tracking-wide mb-2">
                                    {title}
                                </p>
                            )}
                        </div>
                        {icon && (
                            <div className={`${iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                {React.cloneElement(icon, { className: `w-6 h-6 ${iconColor}` })}
                            </div>
                        )}
                    </div>
                )}
                
                <div className={title || icon ? '' : ''}>
                    {children}
                </div>
            </div>
        </div>
    );
}

