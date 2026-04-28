import React from 'react';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    DollarSign,
    UserCheck,
    Files,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview',       label: 'Overview',       icon: LayoutDashboard, path: '/management', exact: true },
    { id: 'documents',      label: 'Documents',      icon: Files,            path: '/document-library' },
    // path prefix is for active-tab matching; linkTo is a real route (no /pharmacy or /billing index exists).
    { id: 'pharmacy',       label: 'Pharmacy',       icon: Building2,       path: '/pharmacy',       linkTo: '/pharmacy/dashboard' },
    { id: 'billing',        label: 'Billing',        icon: DollarSign,      path: '/billing',        linkTo: '/billing/expense-categories' },
    {
        id: 'staff-site',
        label: 'Staff & site',
        icon: UserCheck,
        path: '/check-in-dashboard',
        extraPaths: ['/staff', '/visitors', '/residents/sign-out'],
    },
];

export default function ManagementSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/management';

    return (
        <SectionLayout title="Management" tabs={TABS} showTabBar={showTabBar} />
    );
}
