import React from 'react';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Building2,
    Pill,
    MessageSquare,
    Activity,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/organization', exact: true },
    { id: 'residents', label: 'Residents', icon: Users, path: '/organization/residents' },
    { id: 'branches', label: 'Branches', icon: Building2, path: '/organization/branches' },
    { id: 'drugs', label: 'Drugs', icon: Pill, path: '/organization/drugs' },
    { id: 'resident-contacts', label: 'Resident Contacts', icon: MessageSquare, path: '/organization/resident-contacts' },
    { id: 'vital-ranges', label: 'Vital Ranges', icon: Activity, path: '/organization/vital-ranges' },
];

export default function OrganizationSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/organization';

    return <SectionLayout title="Organization" tabs={TABS} showTabBar={showTabBar} />;
}
