import React from 'react';
import { ClipboardList, Heart, Moon, LayoutDashboard, Pill, Truck } from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview',            label: 'Overview',            icon: LayoutDashboard, path: '/clinical' },
    { id: 'medication-history',  label: 'Medication history',  icon: ClipboardList,   path: '/medication-history' },
    { id: 'vitals',              label: 'Vitals',              icon: Heart,           path: '/vitals',             extraPaths: ['/view-vitals'] },
    { id: 'sleep',               label: 'Sleep',               icon: Moon,            path: '/sleep',              extraPaths: ['/sleep-patterns'] },
    { id: 'medications',         label: 'Medications',         icon: Pill,            path: '/medications' },
    { id: 'deliveries',          label: 'Deliveries',          icon: Truck,           path: '/medication-deliveries' },
];

export default function ClinicalSectionLayout() {
    return (
        <SectionLayout
            title="Clinical"
            subtitle="Health monitoring and clinical records"
            tabs={TABS}
        />
    );
}
