import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * StatCard - Modern, minimal stat card with improved visual hierarchy
 */
export default function StatCard({
    title,
    value,
    icon: Icon,
    gradient = 'from-blue-500 to-blue-600',
    iconBg = 'bg-blue-50',
    iconColor = 'text-blue-600',
    description,
    link,
    trend,
    trendValue,
    className = '',
    onClick
}) {
    const navigate = useNavigate();
    const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (link) {
            navigate(link);
        }
    };

    const getTrendIcon = () => {
        if (trend === 'positive' || trend === 'up') {
            return <ArrowUp className="w-4 h-4 text-green-600" />;
        } else if (trend === 'negative' || trend === 'down') {
            return <ArrowDown className="w-4 h-4 text-red-600" />;
        } else if (trend === 'neutral') {
            return <TrendingUp className="w-4 h-4 text-gray-400" />;
        }
        return null;
    };

    return (
        <div
            onClick={handleClick}
            className={`group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 active:scale-[0.98] ${className}`}
        >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>
            
            {/* Content */}
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-gray-900">{displayValue}</p>
                            {trend && getTrendIcon()}
                            {trendValue && (
                                <span className={`text-xs font-medium ${
                                    trend === 'positive' || trend === 'up' ? 'text-green-600' :
                                    trend === 'negative' || trend === 'down' ? 'text-red-600' :
                                    'text-gray-500'
                                }`}>
                                    {trendValue}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-gray-500 mt-2">{description}</p>
                        )}
                    </div>
                    {Icon && (
                        <div className={`${iconBg} ${iconColor} p-3 rounded-lg flex-shrink-0`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

