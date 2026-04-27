import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Building2,
    Pill,
    History,
    ShieldCheck,
    Key,
    Activity,
    UserMinus,
    MessageSquare,
    Contact,
    ClipboardCheck,
    Clock,
    ArrowRight,
    CreditCard,
} from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';
import { currentUserQueryOptions } from '../../queries/currentUser';

const TILES_BASE = [
    {
        id: 'residents',
        title: 'Residents',
        description: 'Manage facility residents, admissions, and personal details.',
        icon: Users,
        path: '/administration/residents',
        accent: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        id: 'branches',
        title: 'Branches',
        description: 'Configure facility branches, buildings, and rooms.',
        icon: Building2,
        path: '/administration/branches',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'drugs',
        title: 'Drugs',
        description: 'Manage the master list of medications and drug information.',
        icon: Pill,
        path: '/administration/drugs',
        accent: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        id: 'activity-logs',
        title: 'Audit Log',
        description: 'Track all system activities, changes, and user actions.',
        icon: History,
        path: '/administration/activity-logs',
        accent: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        id: 'users',
        title: 'Users',
        description: 'Manage staff accounts, profiles, and assignments.',
        icon: Contact,
        path: '/administration/users',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        id: 'roles',
        title: 'Roles',
        description: 'Configure user roles and system-wide access levels.',
        icon: ShieldCheck,
        path: '/administration/roles',
        accent: 'text-purple-600',
        bg: 'bg-purple-50',
    },
    {
        id: 'permissions',
        title: 'Permissions',
        description: 'Granular control over feature access for each facility.',
        icon: Key,
        path: '/administration/facility-permissions',
        accent: 'text-rose-600',
        bg: 'bg-rose-50',
    },
    {
        id: 'vital-ranges',
        title: 'Vital Ranges',
        description: 'Configure normal ranges and alerts for clinical vitals.',
        icon: Activity,
        path: '/administration/vital-ranges',
        accent: 'text-red-600',
        bg: 'bg-red-50',
    },
    {
        id: 'behavior-charts',
        title: 'Behavior Config',
        description: 'Set up behavior monitoring categories and chart types.',
        icon: ClipboardCheck,
        path: '/administration/behavior-charts',
        accent: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        id: 'leave-requests',
        title: 'Leave Requests',
        description: 'Review and approve staff time-off and leave applications.',
        icon: Clock,
        path: '/administration/leave-requests',
        accent: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        id: 'resident-contacts',
        title: 'Resident Contacts',
        description: 'Manage emergency contacts and legal representatives.',
        icon: MessageSquare,
        path: '/administration/resident-contacts',
        accent: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        id: 'deactivated',
        title: 'Archive',
        description: 'View and restore deactivated records and residents.',
        icon: UserMinus,
        path: '/administration/deactivated',
        accent: 'text-gray-600',
        bg: 'bg-gray-100',
    },
    {
        id: 'subscription-billing',
        title: 'Subscription & billing',
        description: 'Payment methods, invoices, and plan status (Stripe).',
        icon: CreditCard,
        path: '/administration/billing',
        accent: 'text-violet-600',
        bg: 'bg-violet-50',
        requireSaasBilling: true,
    },
];

export default function AdministrationHubPage() {
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
                                <p className="mt-1 text-xs text-gray-500 leading-snug">
                                    {tile.description}
                                </p>
                            </div>
                        </Link>
                    </ScrollReveal>
                );
            })}
        </div>
    );
}
