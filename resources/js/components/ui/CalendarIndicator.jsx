import React from 'react';

/**
 * Calendar Indicator Component - Reusable indicator dot/badge
 * 
 * @param {Object} props
 * @param {string} props.type - Type of indicator (e.g., 'vital', 'appointment')
 * @param {string} props.color - Color class (e.g., 'bg-green-500')
 * @param {number} props.count - Count to display
 * @param {string} props.size - Size variant ('sm', 'md', 'lg')
 */
export default function CalendarIndicator({
    type,
    color = 'bg-gray-400',
    count,
    size = 'md',
}) {
    const sizeClasses = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-3 h-3',
    };

    if (count !== undefined && count > 0) {
        return (
            <div
                className={`${sizeClasses[size]} ${color} rounded-full flex items-center justify-center text-white text-[8px] font-bold`}
                title={`${type}: ${count}`}
            >
                {count > 9 ? '9+' : count}
            </div>
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} ${color} rounded-full`}
            title={type}
        />
    );
}











