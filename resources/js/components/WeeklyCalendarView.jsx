import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Tooltip from './ui/Tooltip';

/**
 * Weekly Calendar View Component
 * Displays a week view (Monday-Sunday) with status indicators
 * 
 * @param {Object} props
 * @param {string} props.selectedDate - Currently selected date (YYYY-MM-DD)
 * @param {Function} props.onDateSelect - Callback when date is selected
 * @param {Array} props.weekData - Array of day objects with metadata
 * @param {Function} props.onWeekChange - Callback when week changes (receives new Monday date)
 * @param {string} props.className - Additional CSS classes
 */
export default function WeeklyCalendarView({
    selectedDate,
    onDateSelect,
    weekData = [],
    onWeekChange,
    className = '',
}) {
    const [currentWeek, setCurrentWeek] = React.useState(() => {
        if (selectedDate) {
            const date = new Date(selectedDate);
            return getMonday(date);
        }
        return getMonday(new Date());
    });

    // Get Monday of a given date
    function getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    // Get all days of the current week (Monday to Sunday)
    const weekDays = React.useMemo(() => {
        const days = [];
        const monday = new Date(currentWeek);
        monday.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayData = weekData.find(d => d.date === dateStr) || {};
            
            days.push({
                date: dateStr,
                day: date.getDate(),
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isToday: dateStr === new Date().toISOString().split('T')[0],
                isSelected: selectedDate === dateStr,
                ...dayData,
            });
        }
        return days;
    }, [currentWeek, weekData, selectedDate]);

    const handlePrevWeek = () => {
        const newWeek = new Date(currentWeek);
        newWeek.setDate(newWeek.getDate() - 7);
        setCurrentWeek(newWeek);
        if (onWeekChange) {
            onWeekChange(newWeek.toISOString().split('T')[0]);
        }
    };

    const handleNextWeek = () => {
        const newWeek = new Date(currentWeek);
        newWeek.setDate(newWeek.getDate() + 7);
        setCurrentWeek(newWeek);
        if (onWeekChange) {
            onWeekChange(newWeek.toISOString().split('T')[0]);
        }
    };

    const handleToday = () => {
        const today = getMonday(new Date());
        setCurrentWeek(today);
        if (onWeekChange) {
            onWeekChange(today.toISOString().split('T')[0]);
        }
        if (onDateSelect) {
            onDateSelect(new Date().toISOString().split('T')[0]);
        }
    };

    const handleDateClick = (dateStr) => {
        if (onDateSelect) {
            onDateSelect(dateStr);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-gray-200 border-gray-300',
            in_progress: 'bg-yellow-200 border-yellow-400',
            completed: 'bg-green-200 border-green-400',
            needs_attention: 'bg-red-200 border-red-400',
        };
        return colors[status] || 'bg-gray-200 border-gray-300';
    };

    const formatWeekRange = () => {
        const monday = new Date(currentWeek);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
                <Tooltip content="Previous week" position="bottom">
                    <button
                        type="button"
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Previous week"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" strokeWidth={2.25} />
                    </button>
                </Tooltip>
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {formatWeekRange()}
                    </h3>
                    <button
                        onClick={handleToday}
                        className="px-3 py-1 text-sm bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors"
                    >
                        Today
                    </button>
                </div>
                <Tooltip content="Next week" position="bottom">
                    <button
                        type="button"
                        onClick={handleNextWeek}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Next week"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" strokeWidth={2.25} />
                    </button>
                </Tooltip>
            </div>

            {/* Week Days Grid */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                    <button
                        key={day.date}
                        onClick={() => handleDateClick(day.date)}
                        className={`
                            p-3 rounded-lg border-2 transition-all
                            ${day.isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' : 'border-gray-200 hover:border-gray-300'}
                            ${day.isToday ? 'ring-2 ring-blue-400' : ''}
                            ${day.status ? getStatusColor(day.status) : 'bg-white'}
                            flex flex-col items-center gap-2 min-h-[100px]
                        `}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                                {day.dayName}
                            </span>
                            <span className={`text-lg font-semibold ${day.isSelected ? 'text-[var(--theme-primary)]' : day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                                {day.day}
                            </span>
                        </div>
                        {day.status && (
                            <div className="flex flex-col items-center gap-1 w-full">
                                <span className="text-xs font-medium capitalize px-2 py-1 rounded bg-white/70">
                                    {day.status.replace('_', ' ')}
                                </span>
                                {day.count && day.count > 1 && (
                                    <span className="text-xs text-gray-600">
                                        {day.count} updates
                                    </span>
                                )}
                            </div>
                        )}
                        {day.items_needed && (
                            <div className="text-xs text-gray-600 text-center line-clamp-2 w-full">
                                {day.items_needed.substring(0, 30)}...
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

