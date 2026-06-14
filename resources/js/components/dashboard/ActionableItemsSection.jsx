import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ClipboardList, Calendar, Pill, Flame, AlertTriangle, 
    Clock, ArrowRight, CheckCircle, XCircle 
} from 'lucide-react';

/**
 * ActionableItemsSection - Main section displaying items requiring action
 */
export default function ActionableItemsSection({ items = [], onItemClick, dense = false }) {
    const navigate = useNavigate();

    if (!items || items.length === 0) {
        return (
            <div className={`bg-white ${dense ? 'rounded-lg' : 'rounded-xl'} shadow-sm border border-gray-200 ${dense ? 'p-4' : 'p-6'}`}>
                <div className={`text-center ${dense ? 'py-5' : 'py-8'}`}>
                    <CheckCircle className={`${dense ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'} text-green-500 mx-auto`} />
                    <p className={`text-gray-600 font-medium ${dense ? 'text-sm' : ''}`}>All caught up!</p>
                    <p className={`text-gray-500 mt-1 ${dense ? 'text-xs' : 'text-sm'}`}>No items requiring immediate attention.</p>
                </div>
            </div>
        );
    }

    const getItemIcon = (type) => {
        const icons = {
            assessment: ClipboardList,
            appointment: Calendar,
            medication: Pill,
            fire_drill: Flame,
            incident: AlertTriangle,
            leave_request: Clock,
        };
        return icons[type] || ClipboardList;
    };

    const getItemColor = (priority) => {
        const colors = {
            urgent: 'border-red-500 bg-red-50',
            soon: 'border-yellow-500 bg-yellow-50',
            info: 'border-blue-500 bg-blue-50',
        };
        return colors[priority] || 'border-gray-300 bg-white';
    };

    const getPriorityBadge = (priority) => {
        const badges = {
            urgent: { label: 'Urgent', color: 'bg-red-500 text-white' },
            soon: { label: 'Soon', color: 'bg-yellow-500 text-white' },
            info: { label: 'Info', color: 'bg-blue-500 text-white' },
        };
        const badge = badges[priority] || badges.info;
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className={`bg-white ${dense ? 'rounded-lg' : 'rounded-xl'} shadow-sm border border-gray-200 overflow-hidden`}>
            <div className={`border-b border-gray-200 ${dense ? 'px-3 py-2.5' : 'px-6 py-4'}`}>
                <h2 className={`font-semibold text-gray-900 ${dense ? 'text-sm' : 'text-lg'}`}>Action Required</h2>
                <p className={`text-gray-500 ${dense ? 'text-[11px] mt-0.5' : 'text-sm mt-1'}`}>Items that need your attention</p>
            </div>
            <div className="divide-y divide-gray-200">
                {items.map((item, index) => {
                    const Icon = getItemIcon(item.type);
                    const handleClick = () => {
                        if (onItemClick) {
                            onItemClick(item);
                        } else if (item.link) {
                            navigate(item.link);
                        }
                    };

                    return (
                        <div
                            key={item.id || index}
                            onClick={handleClick}
                            className={`${dense ? 'p-2.5 sm:p-3' : 'p-4'} hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getItemColor(item.priority || 'info')}`}
                        >
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
                                <div className={`flex items-start ${dense ? 'gap-2' : 'gap-3'} flex-1 min-w-0`}>
                                    <div className={`${dense ? 'p-1.5' : 'p-2'} rounded-lg ${
                                        item.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                        item.priority === 'soon' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]'
                                    }`}>
                                        <Icon className={dense ? 'w-4 h-4' : 'w-5 h-5'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`flex items-center gap-2 ${dense ? 'mb-0.5' : 'mb-1'} flex-wrap`}>
                                            <p className={`${dense ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 truncate`}>
                                                {item.title}
                                            </p>
                                            {getPriorityBadge(item.priority || 'info')}
                                        </div>
                                        {item.description && (
                                            <p className={`text-gray-600 line-clamp-2 ${dense ? 'text-[11px] leading-snug' : 'text-xs'}`}>
                                                {item.description}
                                            </p>
                                        )}
                                        {item.metadata && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {item.metadata.date && (
                                                    <span className="text-xs text-gray-500">
                                                        {item.metadata.date}
                                                    </span>
                                                )}
                                                {item.metadata.location && (
                                                    <span className="text-xs text-gray-500">
                                                        {item.metadata.location}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400 flex-shrink-0`} />
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 5 && (
                <div className={`bg-gray-50 border-t border-gray-200 ${dense ? 'px-3 py-2' : 'px-6 py-3'}`}>
                    <button
                        onClick={() => navigate('/dashboard/actionable')}
                        className="text-sm font-medium text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] flex items-center gap-1"
                    >
                        View all items
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

