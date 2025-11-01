import React from 'react';

/**
 * Modern, reusable card component with side border accents
 * 
 * @param {string} borderColor - Border color class (e.g., 'border-blue-500')
 * @param {string} title - Card title (displayed in uppercase, brown)
 * @param {ReactNode} children - Card content
 * @param {function} onClick - Click handler
 * @param {boolean} clickable - Whether card is clickable
 */
export default function Card({ 
    borderColor = 'border-gray-400',
    title, 
    children, 
    onClick,
    clickable = false 
}) {
    const cardClasses = clickable || onClick
        ? "group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-l-4"
        : "bg-white rounded-2xl shadow-md border-l-4 overflow-hidden";
    
    return (
        <div className={`${cardClasses} ${borderColor}`} onClick={onClick}>
            {/* Content */}
            <div className="p-6">
                {title && (
                    <div className="mb-4">
                        <p className="text-[#8B4513] text-sm font-semibold uppercase tracking-wide">
                            {title}
                        </p>
                    </div>
                )}
                
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
}

