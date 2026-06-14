import React from 'react';
import { NavLink, Outlet, useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard,
    Pill,
    ClipboardCheck,
    ClipboardList,
    Stethoscope,
    Building2,
    Truck,
    FileText,
    User,
    ArrowLeft,
    UserCircle,
} from 'lucide-react';
import api from '../../../services/api';
import {
    formatPacificCalendarMedium,
    calculateAgeFromPacificBirthDate,
} from '../../../utils/pacificTime';

const TAB_BASE = [
    { id: 'overview', path: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'list', path: 'list', label: 'Medications', icon: Pill },
    { id: 'mar', path: 'mar', label: 'Med pass', icon: ClipboardCheck },
    { id: 'log', path: 'log', label: 'Med log', icon: ClipboardList },
    { id: 'prn', path: 'prn', label: 'PRN', icon: Stethoscope },
    { id: 'pharmacy', path: 'pharmacy', label: 'Pharmacy', icon: Building2 },
    { id: 'deliveries', path: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'orders', path: 'orders', label: 'Orders', icon: FileText },
    { id: 'context', path: 'context', label: 'Profile', icon: User },
];

export default function ResidentMedicationHubLayout() {
    const { residentId } = useParams();
    const navigate = useNavigate();

    const { data: resident, isLoading } = useQuery({
        queryKey: ['med-hub-layout-resident', residentId],
        queryFn: async () => {
            const res = await api.get(`/residents/${residentId}`);
            return res.data?.data ?? res.data;
        },
        enabled: !!residentId,
    });

    const tabs = TAB_BASE;

    const fullName = resident
        ? [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ')
        : '';
    const initials = resident
        ? [resident.first_name?.[0], resident.last_name?.[0]].filter(Boolean).join('').toUpperCase()
        : '';
    const age = resident?.date_of_birth ? calculateAgeFromPacificBirthDate(resident.date_of_birth) : null;
    const room = resident?.room_number || resident?.room;
    const base = `/my-residents/${residentId}/medications`;

    return (
        <div className="space-y-0 -mt-1">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mb-4">
                <div className="h-1 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)]" aria-hidden="true" />

                <div className="px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => navigate(`/my-residents/${residentId}`)}
                            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                            aria-label="Back to resident record"
                        >
                            <ArrowLeft className="w-4 h-4 text-gray-500" strokeWidth={2.25} />
                        </button>

                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--theme-primary)]/20 bg-[var(--theme-primary)]/10 shrink-0">
                            {resident?.profile_image_url || resident?.profile_image ? (
                                <img
                                    src={resident.profile_image_url || `/storage/${resident.profile_image}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[var(--theme-primary)] text-lg font-bold">
                                    {initials || <UserCircle className="w-7 h-7" />}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-primary)]">Medication hub</p>
                            {isLoading ? (
                                <div className="h-7 w-48 bg-gray-100 rounded animate-pulse mt-1" />
                            ) : (
                                <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">
                                    {fullName || 'Resident'}
                                </h1>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                                {resident?.date_of_birth ? (
                                    <span>
                                        DOB {formatPacificCalendarMedium(resident.date_of_birth)}
                                        {age !== null ? ` · ${age} y.o.` : ''}
                                    </span>
                                ) : null}
                                {room ? <span>Rm {room}</span> : null}
                                {resident?.branch?.name ? <span>{resident.branch.name}</span> : null}
                            </div>
                            <Link
                                to={`/my-residents/${residentId}`}
                                className="inline-block mt-2 text-xs font-bold text-[var(--theme-primary)] hover:underline"
                            >
                                Open full resident record →
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="border-t-2 border-gray-100 bg-white">
                    <div
                        className="flex overflow-x-auto scroll-smooth"
                        style={{ scrollbarWidth: 'none' }}
                        role="tablist"
                        aria-label="Medication hub sections"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <NavLink
                                    key={tab.id}
                                    to={`${base}/${tab.path}`}
                                    role="tab"
                                    className={({ isActive }) =>
                                        `relative flex flex-col items-center gap-0.5 px-3 py-2 min-w-[68px] whitespace-nowrap motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)] ${
                                            isActive
                                                ? 'text-[var(--theme-primary)]'
                                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon
                                                className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}`}
                                                aria-hidden="true"
                                            />
                                            <span
                                                className={`text-[10px] font-bold tracking-wide text-center leading-tight max-w-[72px] ${
                                                    isActive ? 'text-[var(--theme-primary)]' : 'text-gray-500'
                                                }`}
                                            >
                                                {tab.label}
                                            </span>
                                            {isActive ? (
                                                <span
                                                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--theme-primary)]"
                                                    aria-hidden="true"
                                                />
                                            ) : null}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-1 pb-8">
                <Outlet />
            </div>
        </div>
    );
}
