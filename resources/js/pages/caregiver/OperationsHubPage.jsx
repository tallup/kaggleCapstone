import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShoppingCart, Flame, AlertTriangle, CalendarClock, ArrowRight } from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

const TILES = [
    {
        id: 'housekeeping',
        title: 'Housekeeping',
        description: 'Manage cleaning schedules, assign tasks, and track room completion across the facility.',
        icon: Sparkles,
        path: '/housekeeping',
        accent: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        id: 'grocery',
        title: 'Grocery Status',
        description: 'Track weekly grocery orders, completion rates and supply levels for each branch.',
        icon: ShoppingCart,
        path: '/grocery-status',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'fire-drills',
        title: 'Fire Drills',
        description: 'Schedule and log mandatory fire and emergency evacuation drills for compliance.',
        icon: Flame,
        path: '/fire-drills',
        accent: 'text-orange-500',
        bg: 'bg-orange-50',
    },
    {
        id: 'incidents',
        title: 'Incident Reports',
        description: 'Document, review and track resident or staff incidents for regulatory reporting.',
        icon: AlertTriangle,
        path: '/incidents',
        accent: 'text-red-500',
        bg: 'bg-red-50',
    },
    {
        id: 'leave',
        title: 'Leave Requests',
        description: 'Submit and manage staff leave requests, approvals and scheduling coverage.',
        icon: CalendarClock,
        path: '/leave-requests',
        accent: 'text-violet-600',
        bg: 'bg-violet-50',
    },
];

export default function OperationsHubPage() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TILES.map((tile, i) => {
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
                                className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] group-hover:translate-x-0.5 transition-all mt-1"
                                aria-hidden="true"
                            />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors leading-tight">
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
