import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Edit,
    Save,
    X,
    Languages,
    Building2,
    ShieldCheck,
    Clock,
    ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import ResidentDocuments from '../../components/ResidentDocuments';
import ResidentSafetyStrip from '../../components/residents/ResidentSafetyStrip';
import ResidentStatusBadges from '../../components/residents/ResidentStatusBadges';
import logger from '../../utils/logger';
import { canEditResidentCarePlan } from '../../utils/userRoles';
import { formatPacificCalendarMedium, calculateAgeFromPacificBirthDate } from '../../utils/pacificTime';
import { getResidentStatusSummary } from '../../utils/residentStatus';

const tabs = [
    { id: 'profile', label: 'Profile Overview', icon: Users },
    { id: 'care', label: 'Care Plan', icon: ClipboardList },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'notes', label: 'T-Logs', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'sleep', label: 'Sleep', icon: Moon },
];

const PACIFIC_TZ = 'America/Los_Angeles';

/** True when the API value is a calendar date (not a real instant with time-of-day). */
function isCalendarOnlyDateString(value) {
    if (typeof value !== 'string') return false;
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true;
    // Laravel date columns often serialize as midnight UTC
    return /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)$/.test(s);
}

function formatDate(value, options = { dateStyle: 'medium' }) {
    if (!value) {
        return 'N/A';
    }

    try {
        const dateOptions = typeof options === 'string' ? { dateStyle: options } : options;
        const hasTime = typeof dateOptions === 'object' && dateOptions && 'timeStyle' in dateOptions;
        // Calendar-only API dates: never shift the day via local timezone
        if (!hasTime && isCalendarOnlyDateString(value)) {
            return formatPacificCalendarMedium(value);
        }
        return new Intl.DateTimeFormat('en-US', { ...dateOptions, timeZone: PACIFIC_TZ }).format(new Date(value));
    } catch (error) {
        logger.warn('Failed to format date', value, error);
        return value;
    }
}

function calculateAge(date) {
    const age = calculateAgeFromPacificBirthDate(date);
    return age !== null ? `${age} yrs` : 'N/A';
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
            <Icon className="mx-auto h-10 w-10 text-[var(--theme-primary)] opacity-60" />
            <h3 className="mt-3 text-base font-semibold text-gray-800">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
    );
}

export default function ResidentDetailPage() {
    const navigate = useNavigate();
    const { residentId } = useParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = React.useState('profile');
    const [editingCarePlan, setEditingCarePlan] = React.useState(false);
    const [carePlanData, setCarePlanData] = React.useState({
        care_plan: '',
        special_instructions: '',
        notes: '',
    });

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
    });

    const canEditResident = canEditResidentCarePlan(currentUser);

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

    // Initialize care plan data when resident loads
    React.useEffect(() => {
        if (resident) {
            setCarePlanData({
                care_plan: resident.care_plan || '',
                special_instructions: resident.special_instructions || '',
                notes: resident.notes || '',
            });
        }
    }, [resident]);

    // Update care plan mutation
    const updateCarePlanMutation = useMutation({
        mutationFn: async (data) => {
            try {
                const response = await api.put(`/residents/${residentId}`, data);
                return response.data?.data || response.data;
            } catch (error) {
                logger.error('API Error:', error.response?.data || error.message);
                throw error;
            }
        },
        onSuccess: (updatedResident) => {
            queryClient.setQueryData(['resident-detail', residentId], { data: updatedResident });
            queryClient.invalidateQueries(['resident-detail', residentId]);
            queryClient.invalidateQueries(['my-residents']);
            setEditingCarePlan(false);
        },
        onError: (error) => {
            logger.error('Failed to update care plan:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update care plan. Please try again.';
            alert(errorMessage);
        },
    });

    const handleSaveCarePlan = () => {
        updateCarePlanMutation.mutate(carePlanData);
    };

    const handleCancelEdit = () => {
        if (resident) {
            setCarePlanData({
                care_plan: resident.care_plan || '',
                special_instructions: resident.special_instructions || '',
                notes: resident.notes || '',
            });
        }
        setEditingCarePlan(false);
    };

    const statusSummary = React.useMemo(() => getResidentStatusSummary(resident), [resident]);

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
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-white px-4 py-2 text-sm font-semibold text-[var(--theme-primary)] shadow-sm transition hover:bg-[var(--theme-primary)]/10"
                    >
                        <Heart className="h-4 w-4" />
                        View Vitals
                    </Link>
                    <Link
                        to={`/appointments?resident=${resident.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-sm transition hover:bg-[var(--theme-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-primary)]"
                    >
                        <Calendar className="h-4 w-4" />
                        Schedule Appointment
                    </Link>
                </div>
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-[var(--theme-primary)]/20 bg-[var(--theme-primary)] text-white">
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
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                    ID: {resident?.id ?? 'N/A'}
                                </span>
                                <ResidentStatusBadges resident={resident} size="md" showCensus />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                Branch: <span className="font-medium text-gray-900">{resident?.branch?.name || 'Unassigned'}</span>
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                                    <Calendar className="h-3.5 w-3.5 text-[var(--theme-primary)]" />
                                    Admitted {formatDate(resident.admission_date)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                                    <Users className="h-3.5 w-3.5 text-[var(--theme-primary)]" />
                                    Age {calculateAge(resident.date_of_birth)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid w-full gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-2 lg:w-auto">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Lifecycle</p>
                            <p className="text-lg font-semibold text-gray-900">{statusSummary.lifecycleMeta.label}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Temporary</p>
                            <p className="text-lg font-semibold text-gray-900">{statusSummary.temporaryMeta?.label || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Length of Stay</p>
                            <p className="text-lg font-semibold text-gray-900">{computeLengthOfStay(resident.admission_date)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Room</p>
                            <p className="text-lg font-semibold text-gray-900">{resident.room_number || resident.room || 'N/A'}</p>
                        </div>
                        {resident.code_status && (
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Code Status</p>
                                <p className="text-base font-semibold text-blue-700">{resident.code_status}</p>
                            </div>
                        )}
                        {(resident.primary_language || resident.language) && (
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Language</p>
                                <p className="text-base font-semibold text-gray-900">{resident.primary_language || resident.language}</p>
                            </div>
                        )}
                        {(resident.pharmacy?.name || resident.pharmacy_name) && (
                            <div className="sm:col-span-2">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Pharmacy</p>
                                <p className="text-base font-semibold text-gray-900">{resident.pharmacy?.name || resident.pharmacy_name}</p>
                            </div>
                        )}
                        {resident.updated_at && (
                            <div className="sm:col-span-2 border-t border-gray-200 pt-2 mt-1">
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    Last updated {formatDate(resident.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DefinitionItem label="Date of Birth">{formatDate(resident.date_of_birth)}</DefinitionItem>
                    <DefinitionItem label="Primary Phone">{formatPhone(resident.phone)}</DefinitionItem>
                    <DefinitionItem label="Emergency Contact">{resident.emergency_contact_name || 'Not provided'}</DefinitionItem>
                    <DefinitionItem label="Emergency Phone">{formatPhone(resident.emergency_contact_phone)}</DefinitionItem>
                </div>
            </section>

            <ResidentSafetyStrip resident={resident} isLoading={isLoading} />

            <nav
                className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100"
                aria-label="Resident record sections"
            >
                {tabs.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            aria-current={isActive ? 'true' : undefined}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                                isActive
                                    ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
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
                            <DefinitionItem label="Lifecycle Status">{statusSummary.lifecycleMeta.label}</DefinitionItem>
                            <DefinitionItem label="Temporary Status">{statusSummary.temporaryMeta?.label || 'None'}</DefinitionItem>
                            <DefinitionItem label="Census">{statusSummary.isInCensus ? 'In census' : 'Out of census'}</DefinitionItem>
                            {resident.temporary_status_started_at && (
                                <DefinitionItem label="Temporary Status Started">
                                    {formatDate(resident.temporary_status_started_at, { dateStyle: 'medium', timeStyle: 'short' })}
                                </DefinitionItem>
                            )}
                            {resident.temporary_status_note && (
                                <DefinitionItem label="Temporary Status Note">{resident.temporary_status_note}</DefinitionItem>
                            )}
                            {resident.discharge_date && (
                                <DefinitionItem label="Discharge Date">{formatDate(resident.discharge_date)}</DefinitionItem>
                            )}
                            {resident.discharge_reason && (
                                <DefinitionItem label="Discharge Reason">{resident.discharge_reason}</DefinitionItem>
                            )}
                            {resident.discharge_destination && (
                                <DefinitionItem label="Discharge Destination">{resident.discharge_destination}</DefinitionItem>
                            )}
                            <DefinitionItem label="Physician">
                                {resident.primary_care_doctor || resident.physician_name || 'Not documented'}
                            </DefinitionItem>
                            <DefinitionItem label="Primary Diagnosis">{resident.diagnosis || 'Not documented'}</DefinitionItem>
                            <DefinitionItem label="Allergies">
                                {allergies.length ? allergies.join(', ') : 'No allergies recorded'}
                            </DefinitionItem>
                        </dl>
                    </div>
                )}

                {activeTab === 'care' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Care Plan & Notes</h2>
                            {canEditResident && !editingCarePlan && (
                                <button
                                    type="button"
                                    onClick={() => setEditingCarePlan(true)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </button>
                            )}
                        </div>
                        <div className="space-y-4 text-sm text-gray-600">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-emerald-900">Care Plan</h3>
                                </div>
                                {editingCarePlan ? (
                                    <textarea
                                        value={carePlanData.care_plan}
                                        onChange={(e) => setCarePlanData({ ...carePlanData, care_plan: e.target.value })}
                                        rows={6}
                                        placeholder="Enter care plan details..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                    />
                                ) : (
                                    <p className="mt-2 whitespace-pre-wrap">
                                        {resident.care_plan || 'No care plan has been documented for this resident yet.'}
                                    </p>
                                )}
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900">Special Instructions</h3>
                                </div>
                                {editingCarePlan ? (
                                    <textarea
                                        value={carePlanData.special_instructions}
                                        onChange={(e) => setCarePlanData({ ...carePlanData, special_instructions: e.target.value })}
                                        rows={4}
                                        placeholder="Enter special instructions..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                    />
                                ) : (
                                    <p className="mt-2 whitespace-pre-wrap">
                                        {resident.special_instructions || 'No special instructions recorded.'}
                                    </p>
                                )}
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-inner">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900">Additional Notes</h3>
                                </div>
                                {editingCarePlan ? (
                                    <textarea
                                        value={carePlanData.notes}
                                        onChange={(e) => setCarePlanData({ ...carePlanData, notes: e.target.value })}
                                        rows={4}
                                        placeholder="Enter additional notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                    />
                                ) : (
                                    <p className="mt-2 whitespace-pre-wrap">
                                        {resident.notes || 'There are no additional notes for this resident.'}
                                    </p>
                                )}
                            </div>
                            {editingCarePlan && (
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCarePlan}
                                        disabled={updateCarePlanMutation.isPending}
                                        className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {updateCarePlanMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
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
                                to={`/my-residents/${resident.id}/medications/list`}
                                className="rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
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
                                {medications.map((medication) => (
                                    <li key={medication.id || `med-${medication.name}`} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {medication.name || medication.drug?.name || 'Unnamed Medication'}
                                                    </h3>
                                                    {medication.is_active && (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                {medication.instructions && (
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        {medication.instructions}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                                                    {medication.quantity && (
                                                        <span>Quantity: {medication.quantity}</span>
                                                    )}
                                                    {medication.start_date && (
                                                        <span>Start: {formatDate(medication.start_date)}</span>
                                                    )}
                                                    {medication.end_date && (
                                                        <span>End: {formatDate(medication.end_date)}</span>
                                                    )}
                                                    {[medication.time_1, medication.time_2, medication.time_3, medication.time_4]
                                                        .filter(Boolean)
                                                        .length > 0 && (
                                                        <span>
                                                            Times: {[medication.time_1, medication.time_2, medication.time_3, medication.time_4]
                                                                .filter(Boolean)
                                                                .sort((a, b) => {
                                                                    const toMin = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0); };
                                                                    return toMin(a) - toMin(b);
                                                                })
                                                                .join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                {medication.notes && (
                                                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                                        {medication.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
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
                                className="rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
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
                                className="rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
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

                {activeTab === 'notes' && (
                    <ResidentProgressNotes residentId={residentId} />
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
                                className="rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
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
                                                Duration: {record.total_sleep_hours ? Number(record.total_sleep_hours).toFixed(2) : 'N/A'} hours
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

// ─── Progress Notes panel (used in the Notes tab) ──────────────────────────

const NOTE_TYPE_COLORS = {
    urgent: 'bg-red-50 text-red-700 ring-red-200',
    high: 'bg-orange-50 text-orange-700 ring-orange-200',
    health: 'bg-blue-50 text-blue-700 ring-blue-200',
    behavior: 'bg-purple-50 text-purple-700 ring-purple-200',
    'follow-up': 'bg-violet-50 text-violet-700 ring-violet-200',
    contacts: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    general: 'bg-green-50 text-green-700 ring-green-200',
    notes: 'bg-gray-100 text-gray-700 ring-gray-200',
};

function ResidentProgressNotes({ residentId }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['resident-t-logs', residentId],
        queryFn: async () => {
            const response = await api.get('/t-logs', {
                params: { resident_id: residentId, per_page: 10 },
            });
            return response.data;
        },
        enabled: Boolean(residentId),
        staleTime: 2 * 60 * 1000,
    });

    const notes = React.useMemo(() => {
        const rows = data?.data ?? data ?? [];
        return Array.isArray(rows) ? rows : [];
    }, [data]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">T-Logs</h2>
                    <p className="text-sm text-gray-500">Recent caregiver observations and follow-ups.</p>
                </div>
                <Link
                    to={`/t-logs?resident_id=${residentId}`}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View All T-Logs
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState
                    icon={AlertCircle}
                    title="Could not load notes"
                    description="Please try refreshing the page."
                />
            ) : notes.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No T-Logs yet"
                    description="Caregiver observations and notes logged for this resident will appear here."
                />
            ) : (
                <ul className="space-y-3" role="list">
                    {notes.map(note => {
                        const typeKey = (note.type || 'general').toLowerCase();
                        const levelKey = (note.notification_level || '').toLowerCase();
                        const badgeColor = NOTE_TYPE_COLORS[levelKey] || NOTE_TYPE_COLORS[typeKey] || NOTE_TYPE_COLORS.general;
                        return (
                            <li
                                key={note.id}
                                className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm text-gray-700"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(note.type || note.notification_level) && (
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}>
                                                {note.type || note.notification_level}
                                            </span>
                                        )}
                                        {note.subject && (
                                            <span className="font-semibold text-gray-900 text-sm">{note.subject}</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {formatDate(note.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                {note.description && (
                                    <p className="mt-2 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                                        {note.description}
                                    </p>
                                )}
                                {note.caregiver_name || note.user?.name ? (
                                    <p className="mt-2 text-xs text-gray-400">
                                        By {note.caregiver_name || note.user?.name}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
