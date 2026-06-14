import React from 'react';
import { 
    ClipboardList, 
    FileCheck, 
    History, 
    BarChart2,
    Clock
} from 'lucide-react';
import SectionHub from '../../components/SectionHub';

const FEATURES = [
    {
        id: 'active-assessments',
        title: 'Active Assessments',
        description: 'Conduct and review pending resident assessments and evaluations.',
        icon: ClipboardList,
        accent: 'bg-teal-50 text-teal-600 border-teal-100',
        iconBg: 'bg-teal-100',
        path: '/assessments',
    },
    {
        id: 'assessment-reviews',
        title: 'Assessment Reviews',
        description: 'Review and sign off on completed resident assessments.',
        icon: FileCheck,
        accent: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        iconBg: 'bg-emerald-100',
        path: '/assessments', // Typically filtered or deep-linked
    },
    {
        id: 'assessment-history',
        title: 'Assessment History',
        description: 'Access archived assessments and long-term resident progress.',
        icon: History,
        accent: 'bg-blue-50 text-blue-600 border-blue-100',
        iconBg: 'bg-blue-100',
        path: '/assessments',
    },
    {
        id: 'assessment-analytics',
        title: 'Assessment Analytics',
        description: 'Visual reports and trends based on assessment data.',
        icon: BarChart2,
        accent: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        iconBg: 'bg-indigo-100',
        path: '/reports/assessment-charts',
    },
];

export default function AssessmentHubPage() {
    return (
        <SectionHub
            title="Assessment Hub"
            subtitle="Resident evaluations and clinical compliance management"
            features={FEATURES}
        />
    );
}
