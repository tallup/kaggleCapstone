import React from 'react';
import { SidebarWidget } from './DashboardSidebar';
import MiniCalendar from '../ui/MiniCalendar';
import { Calendar } from 'lucide-react';

/**
 * MiniCalendarWidget - Compact calendar with activity indicators
 */
export default function MiniCalendarWidget({ 
    calendarData = [], 
    onDateSelect 
}) {
    return (
        <SidebarWidget
            title="Calendar"
            icon={Calendar}
            defaultOpen={true}
        >
            <MiniCalendar
                data={calendarData}
                onDateSelect={onDateSelect}
            />
        </SidebarWidget>
    );
}

