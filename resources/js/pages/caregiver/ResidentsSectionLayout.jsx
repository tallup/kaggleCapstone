import React from 'react';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FileText,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview',     label: 'Overview',      icon: LayoutDashboard, path: '/residents' },
    { id: 'my-residents', label: 'Residents',     icon: Users,           path: '/my-residents' },
    { id: 'notes',        label: 'T-Logs', icon: FileText,       path: '/t-logs' },
];

export default function ResidentsSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/my-residents';

    return (
        <SectionLayout title="Residents" tabs={TABS} showTabBar={showTabBar} />
    );
}
