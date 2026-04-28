import React from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    DollarSign,
    UserCheck,
    Clock,
    ArrowRight,
    Files,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ScrollReveal from '../../components/ui/ScrollReveal';
import { currentUserQueryOptions } from '../../queries/currentUser';
import { isCaregiverRole } from '../../utils/userRoles';

// Tiles that require admin-level access (administrator or admin).
// Caregivers do NOT see these — they manage care tasks, not facility operations.
const ADMIN_ONLY_IDS = new Set(['pharmacy', 'billing']);

const TILES = [
    {
        id: 'pharmacy',
        title: 'Pharmacy',
        description: 'Inventory, suppliers, orders, and pharmacy dashboard.',
        icon: Building2,
        path: '/pharmacy/dashboard',
        accent: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        id: 'billing',
        title: 'Billing',
        description: 'Expense categories, expenses, invoices, and billing reports.',
        icon: DollarSign,
        path: '/billing/expense-categories',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'documents',
        title: 'Documents',
        description: 'Facility files (admins) and resident files (care staff) in nested folders.',
        icon: Files,
        path: '/document-library',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        id: 'check-in',
        title: 'Check-in / out',
        description: 'Staff clock, visitors, resident sign-outs, and check-in dashboard.',
        icon: UserCheck,
        path: '/check-in-dashboard',
        accent: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        id: 'staff',
        title: 'Staff scheduling',
        description: 'Schedules, availability, and attendance.',
        icon: Clock,
        path: '/staff/schedule',
        accent: 'text-rose-600',
        bg: 'bg-rose-50',
    },
];

export default function ManagementHubPage() {
    const { data: currentUser } = useQuery(currentUserQueryOptions);
    const isCaregiver = isCaregiverRole(currentUser?.role);

    // Caregivers skip the admin-only tiles; they only see check-in and scheduling
    const visibleTiles = isCaregiver
        ? TILES.filter(t => !ADMIN_ONLY_IDS.has(t.id))
        : TILES;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTiles.map((tile, i) => {
                const Icon = tile.icon;
                return (
                    <ScrollReveal key={tile.id} animationType="fade" delay={i * 80}>
                        <Link
                            to={tile.path}
                            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-200 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tile.bg}`}>
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
                                <p className="mt-1 text-sm text-gray-500 leading-snug">
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
