import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard,
    Users,
    Building2,
    Pill,
    History,
    Contact,
    ShieldCheck,
    ClipboardList,
    CreditCard,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';
import { currentUserQueryOptions } from '../../queries/currentUser';

const BASE_TABS = [
    { id: 'overview',       label: 'Overview',       icon: LayoutDashboard, path: '/administration', exact: true },
    { id: 'residents',      label: 'Residents',      icon: Users,           path: '/administration/residents' },
    { id: 'branches',       label: 'Branches',       icon: Building2,        path: '/administration/branches' },
    { id: 'drugs',          label: 'Drugs',          icon: Pill,            path: '/administration/drugs' },
    { id: 'users',          label: 'Staff',          icon: Contact,         path: '/administration/users' },
    { id: 'audit',          label: 'Audit Log',      icon: History,         path: '/administration/activity-logs' },
    { id: 'charts',         label: 'Behavior Config', icon: ClipboardList,   path: '/administration/behavior-charts' },
    { id: 'roles',          label: 'Roles & Perms',  icon: ShieldCheck,     path: '/administration/roles', extraPaths: ['/administration/facility-permissions'] },
];

const BILLING_TAB = { id: 'billing', label: 'Billing', icon: CreditCard, path: '/administration/billing' };

function canAccessSaasBilling(user) {
    if (!user) {
        return false;
    }
    const r = String(user.role || '').toLowerCase();
    return r === 'administrator' || r === 'super_admin';
}

export default function AdministrationSectionLayout() {
    const { pathname } = useLocation();
    const { data: user } = useQuery(currentUserQueryOptions);

    const tabs = useMemo(() => {
        if (!canAccessSaasBilling(user)) {
            return BASE_TABS;
        }
        const next = [...BASE_TABS];
        next.splice(1, 0, BILLING_TAB);
        return next;
    }, [user]);

    // Hub index uses the card grid for navigation; hide the duplicate icon tab strip there only.
    const showTabBar = pathname !== '/administration';

    return (
        <SectionLayout title="Administration" tabs={tabs} showTabBar={showTabBar} />
    );
}
