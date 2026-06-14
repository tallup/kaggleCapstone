import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarWidget } from './DashboardSidebar';
import { 
    Plus, UserPlus, Calendar as CalendarIcon, 
    ClipboardList, Pill, Flame, FileText 
} from 'lucide-react';

/**
 * QuickActionsWidget - Quick action buttons for common tasks
 */
export default function QuickActionsWidget({ isCaregiver = false }) {
    const navigate = useNavigate();

    const actions = isCaregiver ? [
        { label: 'Record Vitals', icon: ClipboardList, link: '/vitals', color: 'bg-blue-500 hover:bg-blue-600' },
        { label: 'Add Appointment', icon: CalendarIcon, link: '/appointments', color: 'bg-green-500 hover:bg-green-600' },
        { label: 'Medication Log', icon: Pill, link: '/medications', color: 'bg-purple-500 hover:bg-purple-600' },
    ] : [
        { label: 'Add Resident', icon: UserPlus, link: '/organization/residents', color: 'bg-blue-500 hover:bg-blue-600' },
        { label: 'Schedule Appointment', icon: CalendarIcon, link: '/appointments', color: 'bg-green-500 hover:bg-green-600' },
        { label: 'New Assessment', icon: ClipboardList, link: '/assessments', color: 'bg-purple-500 hover:bg-purple-600' },
        { label: 'Schedule Fire Drill', icon: Flame, link: '/fire-drills', color: 'bg-orange-500 hover:bg-orange-600' },
        { label: 'Add Medication', icon: Pill, link: '/medications', color: 'bg-indigo-500 hover:bg-indigo-600' },
        { label: 'Create Incident', icon: FileText, link: '/incidents', color: 'bg-red-500 hover:bg-red-600' },
    ];

    return (
        <SidebarWidget
            title="Quick Actions"
            icon={Plus}
            defaultOpen={true}
        >
            <div className="grid grid-cols-2 gap-2">
                {actions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={index}
                            onClick={() => navigate(action.link)}
                            className={`${action.color} text-white p-3 rounded-lg flex flex-col items-center gap-2 transition-colors shadow-sm hover:shadow-md`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium text-center leading-tight">
                                {action.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </SidebarWidget>
    );
}

