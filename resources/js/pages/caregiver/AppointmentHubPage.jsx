import React from 'react';
import { 
    Calendar, 
    Bell, 
    Clock, 
    Users,
    Activity,
    PlusCircle
} from 'lucide-react';
import SectionHub from '../../components/SectionHub';

const FEATURES = [
    {
        id: 'todays-appointments',
        title: "Today's Appointments",
        description: 'View and manage all medical and family appointments scheduled for today.',
        icon: Clock,
        accent: 'bg-amber-50 text-amber-600 border-amber-100',
        iconBg: 'bg-amber-100',
        path: '/appointments',
    },
    {
        id: 'appointment-scheduler',
        title: 'Appointment Scheduler',
        description: 'Schedule new appointments for residents with external providers.',
        icon: PlusCircle,
        accent: 'bg-blue-50 text-blue-600 border-blue-100',
        iconBg: 'bg-blue-100',
        path: '/appointments/dashboard',
        subLinks: [
            { label: 'Add New', path: '/appointments' },
            { label: 'Calendar View', path: '/appointments/dashboard' },
        ],
    },
    {
        id: 'system-reminders',
        title: 'Reminders & Follow-ups',
        description: 'Track follow-up tasks and system-generated care reminders.',
        icon: Bell,
        accent: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        iconBg: 'bg-indigo-100',
        path: '/reminders',
    },
    {
        id: 'resident-outings',
        title: 'Resident Sign-Outs',
        description: 'Manage resident departures and returns for external visits.',
        icon: Users,
        accent: 'bg-purple-50 text-purple-600 border-purple-100',
        iconBg: 'bg-purple-100',
        path: '/residents/sign-out',
    },
];

export default function AppointmentHubPage() {
    return (
        <SectionHub
            title="Appointment Hub"
            subtitle="Coordinating resident schedules, visits, and reminders"
            features={FEATURES}
        />
    );
}
