import React from 'react';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Send,
    Inbox,
    PenLine,
    Users,
    Hash,
    Settings,
} from 'lucide-react';
import SectionLayout from '../../components/SectionLayout';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/fax', exact: true },
    { id: 'sent',     label: 'Sent',     icon: Send,            path: '/fax/sent' },
    { id: 'inbox',    label: 'Inbox',    icon: Inbox,           path: '/fax/inbox' },
    { id: 'compose',  label: 'Compose',  icon: PenLine,         path: '/fax/compose' },
    { id: 'contacts', label: 'Contacts', icon: Users,           path: '/fax/contacts' },
    { id: 'numbers',  label: 'Numbers',  icon: Hash,            path: '/fax/numbers' },
    { id: 'settings', label: 'Settings', icon: Settings,        path: '/fax/settings' },
];

export default function FaxSectionLayout() {
    const { pathname } = useLocation();
    const showTabBar = pathname !== '/fax';

    return <SectionLayout title="Fax" tabs={TABS} showTabBar={showTabBar} />;
}
