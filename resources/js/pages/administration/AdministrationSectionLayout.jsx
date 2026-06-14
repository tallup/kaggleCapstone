import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Database, Mail } from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/administration', exact: true },
    { id: 'charts', label: 'Behavior Config', icon: ClipboardList, path: '/administration/behavior-charts' },
    { id: 'chart-data', label: 'Chart Data', icon: Database, path: '/administration/chart-data' },
    { id: 'email', label: 'Email', icon: Mail, path: '/administration/email-settings' },
];

export default function AdministrationSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/administration';

    return <SectionLayout title="System" tabs={TABS} showTabBar={showTabBar} />;
}
