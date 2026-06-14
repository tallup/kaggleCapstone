import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Sparkles, ShoppingCart, Flame, AlertTriangle, CalendarClock } from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview',       label: 'Overview',       icon: LayoutDashboard, path: '/operations'    },
    { id: 'housekeeping',   label: 'Housekeeping',   icon: Sparkles,        path: '/housekeeping'  },
    { id: 'grocery',        label: 'Grocery',        icon: ShoppingCart,    path: '/grocery-status'},
    { id: 'fire-drills',    label: 'Fire Drills',    icon: Flame,           path: '/fire-drills'   },
    { id: 'incidents',      label: 'Incidents',      icon: AlertTriangle,   path: '/incidents'     },
    { id: 'leave',          label: 'Leave Requests', icon: CalendarClock,   path: '/leave-requests'},
];

export default function OperationsSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/operations';

    return (
        <SectionLayout title="Operations" tabs={TABS} showTabBar={showTabBar} />
    );
}
