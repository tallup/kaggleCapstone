import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Calendar,
    Users,
    ClipboardList,
    Heart,
    Pill,
    AlertCircle,
    Moon,
    FileText,
} from 'lucide-react';
import api from '../../services/api';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import ResidentDocuments from '../../components/ResidentDocuments';

const tabs = [
    { id: 'profile', label: 'Profile Overview', icon: Users },
    { id: 'care', label: 'Care Plan', icon: ClipboardList },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'sleep', label: 'Sleep', icon: Moon },
];

function formatDate(value, options = { dateStyle: 'medium' }) {
    if (!value) {
        return 'N/A';
    }

    try {
        const dateOptions = typeof options === 'string' ? { dateStyle: options } : options;
        return new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(value));
    } catch (error) {
        console.warn('Failed to format date', value, error);
        return value;
    }
}

function calculateAge(date) {
    if (!date) return 'N/A';
    try {
        const birth = new Date(date);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            age -= 1;
        }
        return `${age} yrs`;
    } catch (error) {
        return 'N/A';
    }
}

function computeLengthOfStay(admissionDate) {
    if (!admissionDate) return 'N/A';
    const start = new Date(admissionDate);
    const now = new Date();
    const diff = Math.max(0, now - start);
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days < 30) {
        return `${days} day${days === 1 ? '' : 's'}`;
    }
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (months < 12) {
        return `${months} mo${months === 1 ? '' : 's'}${remainingDays ? ` ${remainingDays}d` : ''}`;
    }
    const years = Math.floor(months / 12);
    const leftoverMonths = months % 12;
    return `${years} yr${years === 1 ? '' : 's'}${leftoverMonths ? ` ${leftoverMonths}mo` : ''}`;
}

function formatPhone(value) {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }

    const cleaned = String(value).replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value;
}

function DefinitionItem({ label, children }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">{children || 'N/A'}</dd>
        </div>
    );
}

function EmptyState({ icon: Icon = AlertCircle, title, description }) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-sm text-gray-500">
            <Icon className="mx-auto h-10 w-10 text-emerald-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-800">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
    );
}

export default function ResidentDetailPage() {
    const navigate = useNavigate();
    const { residentId } = useParams();
    const [activeTab, setActiveTab] = React.useState('profile');

    const { data, isLoading, error } = useQuery({
        queryKey: ['resident-detail', residentId],
        enabled: Boolean(residentId),
        queryFn: async () => {
            const response = await api.get(`/residents/${residentId}`);
            // The API wraps the response in { data: {...} }
            return response.data?.data || response.data;
        },
    });

    const resident = data ?? null;
    const fullName = React.useMemo(() => {
        if (!resident) return '';
        return [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
    }, [resident]);

    const statusBadge = React.useMemo(() => {
        const isActive = resident?.is_active === true || resident?.is_active === 1 || resident?.is_active === '1';
        return {
            label: isActive ? 'Active' : 'Inactive',
            className: isActive
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                : 'bg-amber-50 text-amber-600 ring-amber-200',
        };
    }, [resident?.is_active]);

    const medications = React.useMemo(() => {
        if (!resident?.medications) return [];
        if (Array.isArray(resident.medications)) return resident.medications;
        return [resident.medications].filter(Boolean);
    }, [resident?.medications]);

    const allergies = React.useMemo(() => {
        if (!resident?.allergies) return [];
        if (Array.isArray(resident.allergies)) return resident.allergies;
        return [resident.allergies].filter(Boolean);
    }, [resident?.allergies]);

    const appointments = resident?.appointments ?? [];
    const vitalSigns = React.useMemo(() => {
        return resident?.vital_signs ?? resident?.vitalSigns ?? [];
    }, [resident]);

    const vitalMetrics = React.useCallback((vital) => {
        if (!vital) return [];
        const metrics = [];

        const hasBloodPressure = vital.systolic !== null && vital.systolic !== undefined && vital.diastolic !== null && vital.diastolic !== undefined;
        if (hasBloodPressure) {
            metrics.push({
                label: 'Blood Pressure',
                value: `${vital.systolic}/${vital.diastolic} mmHg`,
            });
        } else if (vital.systolic || vital.diastolic) {
            metrics.push({
                label: 'Blood Pressure',
                value: `${vital.systolic ?? '-'} / ${vital.diastolic ?? '-'} mmHg`,
            });
        }

        if (vital.temperature !== null && vital.temperature !== undefined) {
            metrics.push({
                label: 'Temperature',
                value: `${parseFloat(vital.temperature).toFixed(1)} °F`,
            });
        }

        if (vital.pulse !== null && vital.pulse !== undefined) {
            metrics.push({
                label: 'Pulse',
                value: `${vital.pulse} bpm`,
            });
        }

        if (vital.oxygen_saturation !== null && vital.oxygen_saturation !== undefined) {
            metrics.push({
                label: 'Oxygen Saturation',
                value: `${vital.oxygen_saturation}%`,
            });
        }

        if (vital.pain_level !== null && vital.pain_level !== undefined) {
            metrics.push({
                label: 'Pain Level',
                value: vital.pain_level,
            });
        }

        return metrics;
    }, []);

    if (isLoading) {
        return (
            <div>
                <Breadcrumbs items={[
                    { label: 'My Residents', path: '/my-residents' },
                    { label: 'Loading...', path: '' }
                ]} />
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                        Loading resident details...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        const message = error.response?.data?.message || error.message;
        return (
            <EmptyState
                icon={AlertCircle}
                title="Unable to load resident"
                description={message || 'Please try again later.'}
            />
        );
    }

    if (!resident) {
        return (
            <div>
                <Breadcrumbs items={[
                    { label: 'My Residents', path: '/my-residents' },
                    { label: 'Not Found', path: '' }
                ]} />
                <EmptyState
                    icon={AlertCircle}
                    title="Resident not found"
                    description="We could not find the resident you were looking for."
                />
            </div>
        );
    }

    return (
        <div>
            <Breadcrumbs items={[
                { label: 'My Residents', path: '/my-residents' },
                { label: resident.first_name && resident.last_name ? `${resident.first_name} ${resident.last_name}` : 'Resident Details', path: '' }
            ]} />
            <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to residents
                </button>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to={`/view-vitals?resident=${resident.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    >
                        <Heart className="h-4 w-4" />
                        View Vitals
                    </Link>
                    <Link
                        to={`/appointments?resident=${resident.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                        <Calendar className="h-4 w-4" />
                        Schedule Appointment
                    </Link>
                </div>
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-emerald-100 bg-emerald-600 text-white">
                            {resident.profile_image_url || resident.profile_image ? (
                                <img
                                    src={resident.profile_image_url || `/storage/${resident.profile_image}`}
                                    alt={fullName}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                        if (event.currentTarget.nextElementSibling) {
                                            event.currentTarget.nextElementSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div
                                className={`flex h-full w-full items-center justify-center text-2xl font-semibold uppercase ${(resident.profile_image_url || resident.profile_image) ? 'hidden' : ''}`}
                            >
                                {fullName ? fullName[0] : <Users className="h-8 w-8" />}
                            </div>
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-semibold text-gray-900">{fullName || 'Resident Profile'}</h1>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusBadge.className}`}>
                                    {statusBadge.label}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                Branch: <span className="font-medium text-gray-900">{resident?.branch?.name || 'Unassigned'}</span>
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                                    Admitted {formatDate(resident.admission_date)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                                    Age {calculateAge(resident.date_of_birth)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid w-full gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-2 lg:w-auto">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Length of stay</p>
                            <p className="text-lg font-semibold text-gray-900">{computeLengthOfStay(resident.admission_date)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Room</p>
                            <p className="text-lg font-semibold text-gray-900">{resident.room_number || resident.room || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DefinitionItem label="Date of Birth">{formatDate(resident.date_of_birth)}</DefinitionItem>
                    <DefinitionItem label="Primary Phone">{formatPhone(resident.phone)}</DefinitionItem>
                    <DefinitionItem label="Emergency Contact">{resident.emergency_contact_name || 'Not provided'}</DefinitionItem>
                    <DefinitionItem label="Emergency Phone">{formatPhone(resident.emergency_contact_phone)}</DefinitionItem>
                </div>
            </section>

            <nav className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
                {tabs.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    );
                })}
            </nav>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
                            <p className="text-sm text-gray-500">
                                Core information about the resident and their support contacts.
                            </p>
                        </div>
                        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DefinitionItem label="Preferred Name">{resident.name || fullName}</DefinitionItem>
                            <DefinitionItem label="Gender">{resident.gender || 'N/A'}</DefinitionItem>
                            <DefinitionItem label="Status">{resident.status || statusBadge.label}</DefinitionItem>
                            <DefinitionItem label="Physician">{resident.physician_name || 'Not documented'}</DefinitionItem>
                            <DefinitionItem label="Primary Diagnosis">{resident.diagnosis || 'Not documented'}</DefinitionItem>
                            <DefinitionItem label="Allergies">
                                {allergies.length ? allergies.join(', ') : 'No allergies recorded'}
                            </DefinitionItem>
                        </dl>
                    </div>
                )}

                {activeTab === 'care' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Care Plan & Notes</h2>
                        <div className="space-y-4 text-sm text-gray-600">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                                <h3 className="text-sm font-semibold text-emerald-900">Care Plan</h3>
                                <p className="mt-2 whitespace-pre-wrap">
                                    {resident.care_plan || 'No care plan has been documented for this resident yet.'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                <h3 className="text-sm font-semibold text-gray-900">Special Instructions</h3>
                                <p className="mt-2 whitespace-pre-wrap">
                                    {resident.special_instructions || 'No special instructions recorded.'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-inner">
                                <h3 className="text-sm font-semibold text-gray-900">Additional Notes</h3>
                                <p className="mt-2 whitespace-pre-wrap">
                                    {resident.notes || 'There are no additional notes for this resident.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'medications' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Medication Profile</h2>
                                <p className="text-sm text-gray-500">
                                    Quick reference of prescribed or regularly administered medications.
                                </p>
                            </div>
                            <Link
                                to={`/medications?resident=${resident.id}`}
                                className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                                Manage Medications
                            </Link>
                        </div>
                        {medications.length === 0 ? (
                            <EmptyState
                                icon={Pill}
                                title="No medications on file"
                                description="Medication orders assigned to this resident will appear here."
                            />
                        ) : (
                            <ul className="space-y-3 text-sm text-gray-700">
                                {medications.map((item, index) => (
                                    <li key={`${item}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                        {typeof item === 'string' ? item : JSON.stringify(item)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {activeTab === 'vitals' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Recent Vitals</h2>
                                <p className="text-sm text-gray-500">Most recent recordings across all vital categories.</p>
                            </div>
                            <Link
                                to={`/vitals?resident=${resident.id}`}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                Log Vitals
                            </Link>
                        </div>
                        {vitalSigns.length === 0 ? (
                            <EmptyState
                                icon={Heart}
                                title="No vital signs recorded"
                                description="When vitals are captured they will be summarized here."
                            />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {vitalSigns.slice(0, 6).map((vital) => (
                                    <div
                                        key={vital.id}
                                        className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900 space-y-2"
                                    >
                                        <p className="text-xs uppercase tracking-wide text-emerald-600">
                                            {vital.type || vital.measurement_type || 'Vital Reading'}
                                        </p>
                                        <div className="space-y-1">
                                            {(() => {
                                                const metrics = vitalMetrics(vital);
                                                if (metrics.length === 0) {
                                                    return (
                                                        <p className="text-lg font-semibold">
                                                            N/A
                                                        </p>
                                                    );
                                                }
                                                return metrics.map((metric, index) => (
                                                    <div key={`${metric.label}-${index}`} className="flex justify-between gap-4 text-sm">
                                                        <span className="font-medium text-emerald-800">{metric.label}</span>
                                                        <span className="text-emerald-900">{metric.value}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        <p className="mt-1 text-xs text-emerald-700">
                                            Recorded on {formatDate(vital.measurement_date || vital.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                        {vital.status && (
                                            <p className="text-xs text-emerald-600">
                                                Status: <span className="font-medium">{vital.status.replace('_', ' ')}</span>
                                            </p>
                                        )}
                                        {vital.notes && (
                                            <p className="text-xs text-emerald-700">
                                                Notes: {vital.notes}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Appointments</h2>
                                <p className="text-sm text-gray-500">
                                    Upcoming and recent appointments for this resident.
                                </p>
                            </div>
                            <Link
                                to={`/appointments?resident=${resident.id}`}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                Manage Appointments
                            </Link>
                        </div>
                        {appointments.length === 0 ? (
                            <EmptyState
                                icon={Calendar}
                                title="No appointments scheduled"
                                description="Scheduled appointments will appear here for quick review."
                            />
                        ) : (
                            <ul className="space-y-3">
                                {appointments.slice(0, 6).map((appointment) => (
                                    <li
                                        key={appointment.id}
                                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm text-gray-700"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {appointment.appointment_type || appointment.reason || 'Care Appointment'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    With {appointment.healthcare_provider?.name || 'assigned care provider'}
                                                </p>
                                            </div>
                                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                                                {formatDate(appointment.appointment_date, { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        {appointment.notes ? (
                                            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                                {appointment.notes}
                                            </p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <ResidentDocuments residentId={resident?.id || residentId} />
                    </div>
                )}

                {activeTab === 'sleep' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Sleep Overview</h2>
                                <p className="text-sm text-gray-500">
                                    Recent sleep records and patterns for this resident.
                                </p>
                            </div>
                            <Link
                                to={`/sleep?resident=${resident.id}`}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                View Sleep Workspace
                            </Link>
                        </div>
                        {resident.sleep_records?.length || resident.sleepPatterns?.length ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {(resident.sleep_records || [])
                                    .slice(0, 4)
                                    .map((record) => (
                                        <div
                                            key={`sleep-record-${record.id}`}
                                            className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900"
                                        >
                                            <p className="text-xs uppercase tracking-wide text-emerald-600">
                                                Sleep Record
                                            </p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {formatDate(record.sleep_date)}
                                            </p>
                                            <p className="mt-1 text-xs text-emerald-700">
                                                Duration: {record.hours_slept ?? 'N/A'} hours
                                            </p>
                                            {record.notes ? (
                                                <p className="mt-2 text-xs text-emerald-700 line-clamp-2">
                                                    {record.notes}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                {(resident.sleepPatterns || [])
                                    .slice(0, 4)
                                    .map((pattern) => (
                                        <div
                                            key={`sleep-pattern-${pattern.id}`}
                                            className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900"
                                        >
                                            <p className="text-xs uppercase tracking-wide text-emerald-600">
                                                Sleep Pattern
                                            </p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {pattern.pattern_name || 'Pattern'}
                                            </p>
                                            <p className="mt-1 text-xs text-emerald-700">
                                                Updated {formatDate(pattern.updated_at)}
                                            </p>
                                            {pattern.notes ? (
                                                <p className="mt-2 text-xs text-emerald-700 line-clamp-2">
                                                    {pattern.notes}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Moon}
                                title="No sleep data recorded"
                                description="Sleep records and patterns will appear here once logged."
                            />
                        )}
                    </div>
                )}
            </section>
        </div>
        </div>
    );
}


