import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import logger from '../utils/logger';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { 'en-US': enUS },
});

export default function CalendarView({ events, onSelectEvent, onSelectSlot, defaultDate, views = ['month', 'week', 'day'], height = '600px', ...props }) {
    // Format events for react-big-calendar
    const formattedEvents = React.useMemo(() => {
        if (!events || !Array.isArray(events)) return [];
        
        return events.map(event => {
            try {
                const start = event.start ? new Date(event.start) : new Date();
                const end = event.end ? new Date(event.end) : new Date(start.getTime() + 3600000);
                
                return {
                    ...event,
                    start,
                    end,
                };
            } catch (err) {
                logger.error('Error formatting event:', err, event);
                return null;
            }
        }).filter(Boolean);
    }, [events]);

    return (
        <div style={{ height, width: '100%' }} className="bg-white rounded-lg shadow-sm p-4 w-full">
            <style>{`
                .rbc-calendar {
                    font-size: 11px;
                }
                .rbc-date-cell {
                    padding: 4px 8px !important;
                    font-weight: 700 !important;
                    color: #111827 !important;
                    text-align: right !important;
                    font-size: 12px !important;
                    display: block !important;
                }
                .rbc-date-cell button, .rbc-date-cell a {
                    color: #111827 !important;
                    text-decoration: none !important;
                    font-weight: 700 !important;
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .rbc-off-range-label {
                    color: #9ca3af !important;
                    opacity: 0.5;
                }
                .rbc-header {
                    padding: 8px 3px !important;
                    font-weight: 700 !important;
                    color: #374151 !important;
                    background-color: #f9fafb !important;
                    border-bottom: 1px solid #e5e7eb !important;
                }
                /* Higher contrast for toolbar buttons */
                .rbc-toolbar button {
                    color: #374151 !important;
                    border: 1px solid #d1d5db !important;
                    background-color: #ffffff !important;
                    background-image: none !important;
                    font-weight: 600 !important;
                    padding: 6px 16px !important;
                    cursor: pointer !important;
                    border-radius: 6px !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .rbc-toolbar button:hover {
                    background-color: #f3f4f6 !important;
                    color: #111827 !important;
                }
                .rbc-toolbar button.rbc-active {
                    background-color: var(--theme-primary, #1e3a5f) !important;
                    color: var(--theme-text-on-primary, #ffffff) !important;
                    border-color: var(--theme-primary, #1e3a5f) !important;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1) !important;
                    font-weight: 700 !important;
                }
                .rbc-toolbar button:focus {
                    outline: 2px solid var(--theme-primary, #1e3a5f) !important;
                    outline-offset: 1px !important;
                }
                .rbc-toolbar-label {
                    font-weight: 700 !important;
                    color: #111827 !important;
                    font-size: 16px !important;
                    margin: 0 16px !important;
                }
                /* Fix month view row height and event visibility */
                .rbc-month-row {
                    min-height: 100px !important;
                }
                .rbc-event {
                    font-size: 10px !important;
                    font-weight: 500 !important;
                    line-height: 1.2;
                    padding: 1px 3px;
                }
                .rbc-event-label {
                    font-size: 9px;
                }
                .rbc-day-slot .rbc-event {
                    font-size: 10px;
                    padding: 1px 2px;
                }
                .rbc-month-view .rbc-event {
                    font-size: 9px;
                    padding: 1px 2px;
                    min-height: 16px;
                }
                .rbc-agenda-view .rbc-event {
                    font-size: 11px;
                }
            `}</style>
            <Calendar
                localizer={localizer}
                events={formattedEvents}
                startAccessor="start"
                endAccessor="end"
                defaultDate={defaultDate || new Date()}
                views={views}
                onSelectEvent={onSelectEvent}
                onSelectSlot={onSelectSlot}
                selectable
                style={{ height: '100%', width: '100%' }}
                eventPropGetter={(event) => {
                    const backgroundColor = event.color || 'var(--theme-primary)';
                    const borderColor = event.borderColor || backgroundColor;
                    return {
                        style: {
                            backgroundColor,
                            borderColor,
                            borderWidth: '1px',
                            borderRadius: '3px',
                            color: event.textColor || '#ffffff',
                            padding: '1px 3px',
                            fontSize: '9px',
                            lineHeight: '1.2',
                            minHeight: '16px',
                        },
                    };
                }}
                {...props}
            />
        </div>
    );
}

