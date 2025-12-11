import React from 'react';
import { SidebarWidget } from './DashboardSidebar';
import { TrendingUp, Users, ClipboardCheck, Pill, Clock, UserCheck } from 'lucide-react';

/**
 * InsightsWidget - Displays key performance metrics
 */
export default function InsightsWidget({ metrics = {} }) {
    const insights = [
        {
            label: 'Occupancy Rate',
            value: metrics.occupancy_rate ?? 0,
            unit: '%',
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Compliance Score',
            value: metrics.compliance_score ?? 0,
            unit: '%',
            icon: ClipboardCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Medication Adherence',
            value: metrics.medication_adherence_rate ?? 0,
            unit: '%',
            icon: Pill,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Avg Response Time',
            value: metrics.average_incident_response_time ?? 0,
            unit: ' hrs',
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
        {
            label: 'Staff Count',
            value: metrics.staff_utilization ?? 0,
            unit: '',
            icon: UserCheck,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
        },
    ];

    return (
        <SidebarWidget
            title="Key Insights"
            icon={TrendingUp}
            defaultOpen={true}
        >
            <div className="space-y-3">
                {insights.map((insight, index) => {
                    const Icon = insight.icon;
                    return (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`${insight.bgColor} ${insight.color} p-2 rounded-lg`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">{insight.label}</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {typeof insight.value === 'number' 
                                            ? insight.value.toFixed(1) 
                                            : insight.value}
                                        {insight.unit}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SidebarWidget>
    );
}

