import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarWidget } from './DashboardSidebar';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

/**
 * AlertsWidget - Shows important alerts and notifications
 */
export default function AlertsWidget({ alerts = [], onDismiss }) {
    const navigate = useNavigate();

    if (!alerts || alerts.length === 0) {
        return (
            <SidebarWidget
                title="Alerts"
                icon={AlertCircle}
                defaultOpen={true}
            >
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No alerts</p>
                </div>
            </SidebarWidget>
        );
    }

    const getAlertIcon = (severity) => {
        const icons = {
            critical: AlertTriangle,
            warning: AlertCircle,
            info: Info,
        };
        return icons[severity] || AlertCircle;
    };

    const getAlertColor = (severity) => {
        const colors = {
            critical: 'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
        };
        return colors[severity] || colors.info;
    };

    return (
        <SidebarWidget
            title="Alerts"
            icon={AlertCircle}
            defaultOpen={true}
        >
            <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, index) => {
                    const Icon = getAlertIcon(alert.severity || 'info');
                    return (
                        <div
                            key={alert.id || index}
                            className={`p-3 rounded-lg border ${getAlertColor(alert.severity || 'info')}`}
                        >
                            <div className="flex items-start gap-2">
                                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {alert.title}
                                    </p>
                                    {alert.message && (
                                        <p className="text-xs mt-1 line-clamp-2">
                                            {alert.message}
                                        </p>
                                    )}
                                    {alert.link && (
                                        <button
                                            onClick={() => navigate(alert.link)}
                                            className="text-xs font-medium mt-2 underline hover:no-underline"
                                        >
                                            View details
                                        </button>
                                    )}
                                </div>
                                {onDismiss && (
                                    <button
                                        onClick={() => onDismiss(alert.id)}
                                        className="flex-shrink-0 p-1 hover:bg-black/10 rounded"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SidebarWidget>
    );
}

