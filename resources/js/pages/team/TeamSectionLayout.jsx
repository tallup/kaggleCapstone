import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard,
    Contact,
    History,
    ShieldCheck,
    Clock,
    CreditCard,
    UserMinus,
    FileStack,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';
import { currentUserQueryOptions } from '../../queries/currentUser';

const BASE_TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/team', exact: true },
    { id: 'users', label: 'Staff', icon: Contact, path: '/team/users' },
    { id: 'audit', label: 'Audit Log', icon: History, path: '/team/activity-logs' },
    { id: 'roles', label: 'Roles & Perms', icon: ShieldCheck, path: '/team/roles', extraPaths: ['/team/facility-permissions'] },
    { id: 'leave', label: 'Leave Requests', icon: Clock, path: '/team/leave-requests' },
    { id: 'employee-docs', label: 'Employee Documents', icon: FileStack, path: '/team/employee-documents' },
    { id: 'archive', label: 'Archive', icon: UserMinus, path: '/team/deactivated' },
];

const BILLING_TAB = { id: 'billing', label: 'Billing', icon: CreditCard, path: '/team/billing' };

function canAccessSaasBilling(user) {
    if (!user) {
        return false;
    }
    const r = String(user.role || '').toLowerCase();
    return r === 'administrator' || r === 'super_admin';
}

export default function TeamSectionLayout() {
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

    const showTabBar = pathname !== '/team';

    return <SectionLayout title="Team & compliance" tabs={tabs} showTabBar={showTabBar} />;
}
