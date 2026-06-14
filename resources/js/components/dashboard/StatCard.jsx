import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp, AlertCircle } from 'lucide-react';
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
    onClick,
    dense = false,
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
        const s = dense ? 'w-3.5 h-3.5' : 'w-4 h-4';
        if (trend === 'positive' || trend === 'up') {
            return <ArrowUp className={`${s} text-green-600`} />;
        }
        if (trend === 'negative' || trend === 'down') {
            return <ArrowDown className={`${s} text-red-600`} />;
        }
        if (trend === 'warning') {
            return <AlertCircle className={`${s} text-amber-500`} />;
        }
        if (trend === 'neutral') {
            return <TrendingUp className={`${s} text-gray-400`} />;
        }
        return null;
    };

    const showTrendDecoration =
        !!trend &&
        (trendValue != null ||
            trend === 'warning' ||
            trend === 'negative' ||
            trend === 'down' ||
            trend === 'neutral');

    return (
        <div
            onClick={handleClick}
            className={`group relative bg-white ${dense ? 'rounded-lg' : 'rounded-xl'} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 active:scale-[0.98] ${className}`}
        >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r ${gradient}`}></div>
            
            {/* Content */}
            <div className={dense ? 'p-3 sm:p-3.5' : 'p-6'}>
                <div className={`flex items-start justify-between ${dense ? 'mb-1.5' : 'mb-4'}`}>
                    <div className="flex-1 min-w-0">
                        <p className={`${dense ? 'text-[11px] leading-tight' : 'text-sm'} font-medium text-gray-600 mb-0.5`}>{title}</p>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <p className={`${dense ? 'text-xl sm:text-2xl' : 'text-3xl'} font-bold text-gray-900 tabular-nums`}>{displayValue}</p>
                            {showTrendDecoration && getTrendIcon()}
                            {trendValue && (
                                <span className={`${dense ? 'text-[10px]' : 'text-xs'} font-medium ${
                                    trend === 'positive' || trend === 'up' ? 'text-green-600' :
                                    trend === 'negative' || trend === 'down' ? 'text-red-600' :
                                    'text-gray-500'
                                }`}>
                                    {trendValue}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className={`text-gray-500 ${dense ? 'text-[10px] mt-0.5 leading-snug' : 'text-xs mt-2'}`}>{description}</p>
                        )}
                    </div>
                    {Icon && (
                        <div className={`${iconBg} ${iconColor} ${dense ? 'p-1.5 rounded-md' : 'p-3 rounded-lg'} flex-shrink-0`}>
                            <Icon className={dense ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-6 h-6'} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

