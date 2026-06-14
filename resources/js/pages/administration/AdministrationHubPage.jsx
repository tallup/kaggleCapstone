import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Database, Mail, ArrowRight } from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

const TILES = [
    {
        id: 'behavior-charts',
        title: 'Behavior Config',
        description: 'Set up behavior monitoring categories and chart types.',
        icon: ClipboardList,
        path: '/administration/behavior-charts',
        accent: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        id: 'chart-data',
        title: 'Chart Data',
        description: 'Manage reference data used by behavior and clinical charts.',
        icon: Database,
        path: '/administration/chart-data',
        accent: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        id: 'email-settings',
        title: 'Email settings',
        description: 'Configure outbound email and notification delivery.',
        icon: Mail,
        path: '/administration/email-settings',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
];

export default function AdministrationHubPage() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
