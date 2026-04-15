import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildPathWithPreservedResident } from '../../utils/headerResidentSwitcher';
import {
    Users,
    ClipboardList,
    Calendar,
    BarChart3,
    FileText,
    ArrowRight,
} from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

const TILES = [
    {
        id: 'my-residents',
        title: 'My residents',
        description: 'View and manage assigned residents, profiles, and care hubs.',
        icon: Users,
        path: '/my-residents',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'assessments',
        title: 'Assessments',
        description: 'Review and complete resident assessments and follow-ups.',
        icon: ClipboardList,
        path: '/assessments',
        accent: 'text-violet-600',
        bg: 'bg-violet-50',
    },
    {
        id: 'appointments',
        title: 'Appointments',
        description: 'Schedule and track appointments and provider visits.',
        icon: Calendar,
        path: '/appointments/dashboard',
        accent: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        id: 'charts',
        title: 'Behavior charts',
        description: 'Record and review behavior and charting data for residents.',
        icon: BarChart3,
        path: '/charts',
        accent: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        id: 't-logs',
        title: 'Progress notes',
        description: 'Document daily care notes and communication for compliance.',
        icon: FileText,
        path: '/t-logs',
        accent: 'text-slate-600',
        bg: 'bg-slate-50',
    },
];

export default function ResidentsHubPage() {
    const { search } = useLocation();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TILES.map((tile, i) => {
                const Icon = tile.icon;
                return (
                    <ScrollReveal key={tile.id} animationType="fade" delay={i * 80}>
                        <Link
                            to={buildPathWithPreservedResident(tile.path, search)}
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
