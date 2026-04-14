import React from 'react';
import { Link } from 'react-router-dom';
import {
    ClipboardList,
    Heart,
    Moon,
    ArrowRight,
    LayoutDashboard,
    Pill,
    Truck,
    FileText,
} from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

/** All destinations here are reached from Clinical hub / tab bar only — not duplicated in the main sidebar. */
const TILES = [
    {
        id: 'medications-dashboard',
        title: 'Medication dashboard',
        description: 'Overview of medication tasks, schedules, and facility-wide medication activity.',
        icon: LayoutDashboard,
        path: '/medications/dashboard',
        accent: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        id: 'medications-mar',
        title: 'Medications (MAR)',
        description: 'Manage active medication orders, administration, and resident medication profiles.',
        icon: Pill,
        path: '/medications',
        accent: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        id: 'medication-deliveries',
        title: 'Medication deliveries',
        description: 'Track pharmacy deliveries, receipts, and supply status for the facility.',
        icon: Truck,
        path: '/medication-deliveries',
        accent: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        id: 'medication-report',
        title: 'Medication report',
        description: 'Run medication-related reports for audits and compliance.',
        icon: FileText,
        path: '/medications/report',
        accent: 'text-slate-600',
        bg: 'bg-slate-50',
    },
    {
        id: 'medication-history',
        title: 'Medication history',
        description: 'Review past medication administrations and reconciliation records for all residents.',
        icon: ClipboardList,
        path: '/medication-history',
        accent: 'text-violet-600',
        bg: 'bg-violet-50',
    },
    {
        id: 'vitals',
        title: 'Vital signs',
        description: 'Log and track resident blood pressure, heart rate, temperature, oxygen saturation and weight.',
        icon: Heart,
        path: '/vitals',
        accent: 'text-rose-500',
        bg: 'bg-rose-50',
    },
    {
        id: 'sleep',
        title: 'Sleep tracking',
        description: 'Record nightly sleep quality and duration patterns to support resident wellbeing plans.',
        icon: Moon,
        path: '/sleep',
        accent: 'text-indigo-500',
        bg: 'bg-indigo-50',
    },
];

export default function ClinicalHubPage() {
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
