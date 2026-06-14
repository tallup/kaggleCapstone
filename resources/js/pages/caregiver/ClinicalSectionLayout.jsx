import React from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, Heart, Moon, LayoutDashboard, Pill, Truck, Calendar, BarChart3, ClipboardCheck } from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview',           label: 'Overview',           icon: LayoutDashboard,  path: '/clinical' },
    { id: 'vitals',             label: 'Vitals',             icon: Heart,            path: '/vitals',              extraPaths: ['/view-vitals'] },
    { id: 'sleep',              label: 'Sleep',              icon: Moon,             path: '/sleep',               extraPaths: ['/sleep-patterns'] },
    { id: 'medications',        label: 'Medications',        icon: Pill,             path: '/medications',         extraPaths: ['/medications/residents', '/medications/dashboard', '/medications/report'] },
    { id: 'medication-history', label: 'Medication history', icon: ClipboardList,    path: '/medication-history' },
    { id: 'deliveries',         label: 'Deliveries',         icon: Truck,            path: '/medication-deliveries' },
    {
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        path: '/appointments',
        extraPaths: ['/appointments/dashboard', '/appointments/create'],
    },
    { id: 'assessments',        label: 'Assessments',        icon: ClipboardCheck,   path: '/assessments' },
    {
        id: 'charts',
        label: 'Charts',
        icon: BarChart3,
        path: '/charts',
        extraPaths: ['/charts/resident'],
    },
];

export default function ClinicalSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/clinical';

    return (
        <SectionLayout title="Clinical" tabs={TABS} showTabBar={showTabBar} />
    );
}
