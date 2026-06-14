import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    History,
    ShieldCheck,
    Key,
    Contact,
    Clock,
    ArrowRight,
    CreditCard,
    UserMinus,
    FileStack,
} from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';
import { currentUserQueryOptions } from '../../queries/currentUser';

const TILES_BASE = [
    {
        id: 'activity-logs',
        title: 'Audit Log',
        description: 'Track all system activities, changes, and user actions.',
        icon: History,
        path: '/team/activity-logs',
        accent: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        id: 'users',
        title: 'Users',
        description: 'Manage staff accounts, profiles, and assignments.',
        icon: Contact,
        path: '/team/users',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        id: 'roles',
        title: 'Roles',
        description: 'Configure user roles and system-wide access levels.',
        icon: ShieldCheck,
        path: '/team/roles',
        accent: 'text-purple-600',
        bg: 'bg-purple-50',
    },
    {
        id: 'permissions',
        title: 'Permissions',
        description: 'Granular control over feature access for each facility.',
        icon: Key,
        path: '/team/facility-permissions',
        accent: 'text-rose-600',
        bg: 'bg-rose-50',
    },
    {
        id: 'leave-requests',
        title: 'Leave Requests',
        description: 'Review and approve staff time-off and leave applications.',
        icon: Clock,
        path: '/team/leave-requests',
        accent: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        id: 'employee-documents',
        title: 'Employee Documents',
        description: 'Staff documentation and compliance files.',
        icon: FileStack,
        path: '/team/employee-documents',
        accent: 'text-slate-600',
        bg: 'bg-slate-50',
    },
    {
        id: 'deactivated',
        title: 'Archive',
        description: 'View and restore deactivated records and residents.',
        icon: UserMinus,
        path: '/team/deactivated',
        accent: 'text-gray-600',
        bg: 'bg-gray-100',
    },
    {
        id: 'subscription-billing',
        title: 'Subscription & billing',
        description: 'Payment methods, invoices, and plan status (Stripe).',
        icon: CreditCard,
        path: '/team/billing',
        accent: 'text-violet-600',
        bg: 'bg-violet-50',
        requireSaasBilling: true,
    },
];

export default function TeamHubPage() {
    const { data: user } = useQuery(currentUserQueryOptions);

    const tiles = useMemo(() => {
        const r = String(user?.role || '').toLowerCase();
        const canSaas = r === 'administrator' || r === 'super_admin';
        return TILES_BASE.filter((tile) => !tile.requireSaasBilling || canSaas);
    }, [user]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tiles.map((tile, i) => {
                const Icon = tile.icon;
                return (
                    <ScrollReveal key={tile.id} animationType="fade" delay={i * 40}>
                        <Link
                            to={tile.path}
                            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col gap-3 hover:shadow-md hover:border-gray-200 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile.bg}`}>
                                    <Icon className={`w-5 h-5 ${tile.accent}`} aria-hidden="true" />
                                </div>
                                <ArrowRight
                                    className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] group-hover:translate-x-0.5 motion-safe:transition-all mt-1"
                                    aria-hidden="true"
                                />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 group-hover:text-[var(--theme-primary)] motion-safe:transition-colors leading-tight">
                                    {tile.title}
                                </h2>
                                <p className="mt-1 text-xs text-gray-500 leading-snug">{tile.description}</p>
                            </div>
                        </Link>
                    </ScrollReveal>
                );
            })}
        </div>
    );
}
