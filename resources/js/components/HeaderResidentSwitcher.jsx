import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import api from '../services/api';
import ResidentAvatarInline from './ui/ResidentAvatarInline';
import Tooltip from './ui/Tooltip';
import {
    shouldShowHeaderResidentSwitcher,
    isResidentsHubPathForSwitcher,
    isClinicalSectionForSwitcher,
    parseResidentContextId,
    buildSwitchHref,
    buildResidentsSectionResidentNavigateTo,
    clearResidentFromSearch,
} from '../utils/headerResidentSwitcher';

function residentFullName(r) {
    return [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' ') || 'Resident';
}

function getSwitcherLinkTo(pathname, search, id) {
    if (isResidentsHubPathForSwitcher(pathname) || isClinicalSectionForSwitcher(pathname)) {
        return buildResidentsSectionResidentNavigateTo(pathname, search, id);
    }
    return buildSwitchHref(pathname, search, id);
}

/**
 * Synkwise-style horizontal resident strip in the app header (Residents + Clinical hubs).
 * In the Residents hub, selection sets `residentId` and stays on the current tab/module.
 */
export default function HeaderResidentSwitcher({ currentUser, userLoading }) {
    const location = useLocation();
    const { pathname, search } = location;

    const visible = shouldShowHeaderResidentSwitcher(pathname);
    const activeId = parseResidentContextId(search, pathname);

    const { data, isLoading } = useQuery({
        queryKey: ['my-residents', '', currentUser?.assigned_branch_id],
        queryFn: async () => {
            const params = {
                per_page: 50,
                show_all: true,
            };
            if (currentUser?.assigned_branch_id) {
                params.branch_id = currentUser.assigned_branch_id;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
        enabled: visible && !userLoading && !!currentUser,
        staleTime: 60 * 1000,
    });

    const residents = React.useMemo(() => data?.data ?? [], [data?.data]);

    if (!visible || userLoading || !currentUser) {
        return null;
    }

    if (isLoading || residents.length === 0) {
        return null;
    }

    const allResidentsTo = isResidentsHubPathForSwitcher(pathname)
        ? { pathname: '/my-residents', search: clearResidentFromSearch(search) }
        : '/my-residents';

    return (
        <div
            className="flex min-w-0 max-w-[min(100%,28rem)] flex-1 items-center justify-center"
            aria-label="Switch resident"
        >
            <div
                className="flex max-w-full items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
            >
                {residents.map((resident) => {
                    const id = String(resident.id);
                    const isActive = activeId === id;
                    const to = getSwitcherLinkTo(pathname, search, id);
                    const name = residentFullName(resident);
                    return (
                        <Tooltip key={id} content={name} position="bottom">
                            <Link
                                role="listitem"
                                to={to}
                                aria-label={`Show ${name} in this view`}
                                aria-current={isActive ? 'page' : undefined}
                                className={`shrink-0 inline-flex rounded-full motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 ${
                                    isActive
                                        ? 'border-2 border-[var(--theme-primary)] shadow-sm'
                                        : 'border-2 border-transparent opacity-90 hover:border-gray-200 hover:opacity-100'
                                }`}
                            >
                                <ResidentAvatarInline resident={resident} className="h-7 w-7 text-[10px]" />
                            </Link>
                        </Tooltip>
                    );
                })}
                <Tooltip content="All residents" position="bottom">
                    <Link
                        to={allResidentsTo}
                        aria-label="Clear resident filter; view all residents"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-500 motion-safe:transition-colors hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg)] hover:text-[var(--theme-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-1"
                    >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                </Tooltip>
            </div>
        </div>
    );
}
