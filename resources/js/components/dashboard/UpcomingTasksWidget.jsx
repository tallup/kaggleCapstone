import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarWidget } from './DashboardSidebar';
import { Clock, Calendar, Flame, Pill, ClipboardList, ArrowRight } from 'lucide-react';
import logger from '../../utils/logger';

/**
 * UpcomingTasksWidget - Shows today's and tomorrow's tasks
 */
export default function UpcomingTasksWidget({ tasks = [] }) {
    const navigate = useNavigate();

    if (!tasks || tasks.length === 0) {
        return (
            <SidebarWidget
                title="Upcoming Tasks"
                icon={Clock}
                defaultOpen={true}
            >
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No upcoming tasks</p>
                </div>
            </SidebarWidget>
        );
    }

    const getTaskIcon = (type) => {
        const icons = {
            appointment: Calendar,
            fire_drill: Flame,
            medication: Pill,
            assessment: ClipboardList,
        };
        return icons[type] || Clock;
    };

    const formatTime = (dateTime) => {
        if (!dateTime) return '';
        try {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
                return '';
            }
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } catch (error) {
            logger.error('Error formatting time:', error, dateTime);
            return '';
        }
    };

    return (
        <SidebarWidget
            title="Upcoming Tasks"
            icon={Clock}
            defaultOpen={true}
        >
            <div className="space-y-2">
                {tasks.slice(0, 5).map((task, index) => {
                    const Icon = getTaskIcon(task.type);
                    return (
                        <div
                            key={task.id || index}
                            onClick={() => task.link && navigate(task.link)}
                            className={`p-3 rounded-lg border border-gray-200 hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg-light)] transition-colors ${
                                task.link ? 'cursor-pointer' : ''
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {task.title}
                                    </p>
                                    {task.time && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {formatTime(task.time)}
                                        </p>
                                    )}
                                </div>
                                {task.link && (
                                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SidebarWidget>
    );
}

