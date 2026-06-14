import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Pill, MessageSquare, Activity, ArrowRight } from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

const TILES = [
    {
        id: 'residents',
        title: 'Residents',
        description: 'Manage facility residents, admissions, and personal details.',
        icon: Users,
        path: '/organization/residents',
        accent: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        id: 'branches',
        title: 'Branches',
        description: 'Configure facility branches, buildings, and rooms.',
        icon: Building2,
        path: '/organization/branches',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'drugs',
        title: 'Drugs',
        description: 'Manage the master list of medications and drug information.',
        icon: Pill,
        path: '/organization/drugs',
        accent: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        id: 'resident-contacts',
        title: 'Resident Contacts',
        description: 'Manage emergency contacts and legal representatives.',
        icon: MessageSquare,
        path: '/organization/resident-contacts',
        accent: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        id: 'vital-ranges',
        title: 'Vital Ranges',
        description: 'Configure normal ranges and alerts for clinical vitals.',
        icon: Activity,
        path: '/organization/vital-ranges',
        accent: 'text-red-600',
        bg: 'bg-red-50',
    },
];

export default function OrganizationHubPage() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {TILES.map((tile, i) => {
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
