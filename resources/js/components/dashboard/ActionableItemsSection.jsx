import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ClipboardList, Calendar, Pill, Flame, AlertTriangle, 
    Clock, ArrowRight, CheckCircle, XCircle 
} from 'lucide-react';

/**
 * ActionableItemsSection - Main section displaying items requiring action
 */
export default function ActionableItemsSection({ items = [], onItemClick }) {
    const navigate = useNavigate();

    if (!items || items.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">All caught up!</p>
                    <p className="text-sm text-gray-500 mt-1">No items requiring immediate attention.</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Action Required</h2>
                <p className="text-sm text-gray-500 mt-1">Items that need your attention</p>
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
                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getItemColor(item.priority || 'info')}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`p-2 rounded-lg ${
                                        item.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                        item.priority === 'soon' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {item.title}
                                            </p>
                                            {getPriorityBadge(item.priority || 'info')}
                                        </div>
                                        {item.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2">
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
                                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
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

