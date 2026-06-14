import React from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    LayoutDashboard,
    Pill,
    FileText,
    ClipboardList,
    FolderOpen,
    Heart,
    Calendar,
    User,
    ArrowLeft,
    MapPin,
    ShieldAlert,
    AlertCircle,
    Clock,
    Utensils,
    Activity,
    Save,
    Edit,
    X,
    Moon,
    Stethoscope,
    Phone,
    Languages,
    Building2,
    CheckCircle,
    TrendingUp,
    BarChart3,
    BookOpen,
    Plus,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import Assessments from '../Assessments';
import TLogForm from '../TLogForm';
import CaregiverResidentChart from './CaregiverResidentChart';
import { hasModuleAccess } from '../../utils/moduleAccess';
import {
    calculateAgeFromPacificBirthDate,
    formatPacificCalendarMedium,
    getPacificNow,
} from '../../utils/pacificTime';
import ResidentDocuments from '../../components/ResidentDocuments';
import ResidentStatusBadges from '../../components/residents/ResidentStatusBadges';
import ResidentStatusModal from '../../components/residents/ResidentStatusModal';
import Modal from '../../components/ui/Modal';
import logger from '../../utils/logger';
import { canEditResidentCarePlan, isCaregiverRole } from '../../utils/userRoles';
import { getResidentStatusSummary } from '../../utils/residentStatus';

// ─── Tab definitions (overview + merged hub-style sections) ─────────────────────────────────
const RESIDENT_TAB_BASE = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, kind: 'tab' },
    { id: 'medications', label: 'Medications', icon: Pill, kind: 'link', getPath: (rid) => `/my-residents/${rid}/medications/list` },
    { id: 'vitals', label: 'Vitals', icon: Heart, kind: 'tab' },
    { id: 'assessments', label: 'Assessments', icon: ClipboardList, kind: 'tab', requiresAssessmentsModule: true },
    { id: 'appointments', label: 'Appointments', icon: Calendar, kind: 'tab' },
    { id: 'charts', label: 'Charts', icon: BarChart3, kind: 'tab' },
    { id: 'notes', label: 'T-Logs', icon: FileText, kind: 'tab' },
    { id: 'care', label: 'Care Plan', icon: BookOpen, kind: 'tab' },
    { id: 'documents', label: 'Documents', icon: FolderOpen, kind: 'tab' },
    { id: 'profile', label: 'Profile', icon: User, kind: 'tab' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCalDate(value) {
    if (!value) return 'N/A';
    try { return formatPacificCalendarMedium(value); } catch { return value; }
}

function formatPhone(value) {
    if (!value) return 'N/A';
    const cleaned = String(value).replace(/[^\d+]/g, '');
    if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return value;
}

function computeLengthOfStay(admissionDate) {
    if (!admissionDate) return null;
    const days = Math.round((new Date() - new Date(admissionDate)) / 86400000);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.floor(months / 12)}yr`;
}

const codeStatusColor = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('full')) return 'bg-red-500';
    if (s.includes('dnr')) return 'bg-amber-500';
    if (s.includes('comfort')) return 'bg-blue-500';
    return 'bg-gray-400';
};

// ─── Main hub page ────────────────────────────────────────────────────────────

export default function ResidentHubPage() {
    const { residentId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [statusResident, setStatusResident] = React.useState(null);
    const activeTab = searchParams.get('tab') || 'overview';

    const setTab = (id) => setSearchParams({ tab: id }, { replace: true });

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
    });

    const enabledModules = Array.isArray(currentUser?.enabled_modules) ? currentUser.enabled_modules : [];
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isAdministrator = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
    const isAdmin = isSuperAdmin || isAdministrator;
    const isCaregiver = isCaregiverRole(currentUser?.role);
    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const canUpdateStatus = isAdmin || isCaregiver || permissions.includes('edit_residents');
    const canUpdateLifecycleStatus = isAdmin;
    const showAssessmentsTab = isSuperAdmin || hasModuleAccess('/assessments', enabledModules, isSuperAdmin);

    const visibleTabs = React.useMemo(() => {
        return RESIDENT_TAB_BASE.filter((t) => {
            if (t.requiresAssessmentsModule && !showAssessmentsTab) return false;
            return true;
        });
    }, [showAssessmentsTab]);

    const visibleTabIds = React.useMemo(
        () => visibleTabs.filter((t) => t.kind === 'tab').map((t) => t.id),
        [visibleTabs],
    );

    React.useEffect(() => {
        if (activeTab === 'medications' && residentId) {
            navigate(`/my-residents/${residentId}/medications/list`, { replace: true });
            return;
        }
        if (!visibleTabIds.includes(activeTab)) {
            setSearchParams({ tab: 'overview' }, { replace: true });
        }
    }, [activeTab, visibleTabIds, residentId, navigate, setSearchParams]);

    const { data: resident, isLoading, error } = useQuery({
        queryKey: ['resident-hub', residentId],
        queryFn: async () => {
            const res = await api.get(`/residents/${residentId}`);
            return res.data?.data ?? res.data;
        },
        enabled: !!residentId,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, payload }) => api.post(`/residents/${id}/status`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resident-hub', residentId] });
            queryClient.invalidateQueries({ queryKey: ['residents'] });
        },
    });

    const fullName = resident
        ? [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ')
        : '';
    const initials = resident
        ? [resident.first_name?.[0], resident.last_name?.[0]].filter(Boolean).join('').toUpperCase()
        : '';
    const age = resident?.date_of_birth ? calculateAgeFromPacificBirthDate(resident.date_of_birth) : null;
    const room = resident?.room_number || resident?.room;

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-start">
                    <Link
                        to="/my-residents"
                        className="text-sm font-semibold text-[var(--theme-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] rounded"
                    >
                        Back to directory
                    </Link>
                </div>
                <div className="flex min-h-[50vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)]" />
                </div>
            </div>
        );
    }

    if (error || !resident) {
        return (
            <div>
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-bold text-gray-900">Resident not found</h3>
                    <p className="text-sm text-gray-500 mt-1">We couldn&apos;t load this resident&apos;s record.</p>
                    <button onClick={() => navigate('/my-residents')} className="mt-4 text-sm font-bold text-[var(--theme-primary)] hover:underline">
                        ← Back to My Residents
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <ResidentStatusModal
                resident={statusResident}
                isOpen={statusResident != null}
                isPending={updateStatusMutation.isPending}
                error={updateStatusMutation.error}
                allowLifecycle={canUpdateLifecycleStatus}
                onClose={() => {
                    if (updateStatusMutation.isPending) return;
                    updateStatusMutation.reset();
                    setStatusResident(null);
                }}
                onSubmit={(payload) => {
                    if (!statusResident) return;
                    updateStatusMutation.reset();
                    updateStatusMutation.mutate(
                        { id: statusResident.id, payload },
                        { onSuccess: () => setStatusResident(null) }
                    );
                }}
            />
            <div className="space-y-0 -mt-1">
            {/* ── Resident header card ─────────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mb-0">
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)]" aria-hidden="true" />

                <div className="px-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Back button */}
                    <button
                        type="button"
                        onClick={() => navigate('/my-residents')}
                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                        aria-label="Back to residents"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-400" strokeWidth={2.25} />
                    </button>

                    {/* Avatar */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--theme-primary)]/20 bg-[var(--theme-primary)]/10 shrink-0">
                        {resident.profile_image_url || resident.profile_image ? (
                            <img
                                src={resident.profile_image_url || `/storage/${resident.profile_image}`}
                                alt={fullName}
                                className="w-full h-full object-cover"
                                onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                            />
                        ) : null}
                        <div className={`absolute inset-0 ${resident.profile_image_url || resident.profile_image ? 'hidden' : 'flex'} items-center justify-center text-[var(--theme-primary)] text-xl font-bold`}>
                            {initials || <User className="w-7 h-7" />}
                        </div>
                    </div>

                    {/* Name + clinical pills */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{fullName.toUpperCase()}</h1>
                            <ResidentStatusBadges resident={resident} showCensus />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {resident.date_of_birth && (
                                <span className="text-xs text-gray-500">
                                    DOB: {formatCalDate(resident.date_of_birth)}{age !== null ? ` (${age} y.o.)` : ''}
                                </span>
                            )}
                            {resident.gender && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{resident.gender}</span>
                            )}
                            {room && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
                                    <MapPin className="w-3 h-3" aria-hidden="true" /> Rm {room}
                                </span>
                            )}
                            {resident.code_status && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                    <span className={`w-2 h-2 rounded-full ${codeStatusColor(resident.code_status)}`} aria-hidden="true" />
                                    {resident.code_status}
                                </span>
                            )}
                            {resident.allergies && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                                    {Array.isArray(resident.allergies) ? resident.allergies.join(', ') : resident.allergies}
                                </span>
                            )}
                            {computeLengthOfStay(resident.admission_date) && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    Stay: {computeLengthOfStay(resident.admission_date)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {canUpdateStatus && (
                            <button
                                type="button"
                                onClick={() => {
                                    updateStatusMutation.reset();
                                    setStatusResident(resident);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Update Status
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate(`/my-residents/${residentId}/medications/list`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-90 transition-opacity"
                        >
                            <Pill className="w-3.5 h-3.5" aria-hidden="true" />
                            Administer Meds
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/medication-history?resident=${residentId}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                            Med History
                        </button>
                    </div>
                </div>

                {/* ── Tab bar ── */}
                <div className="border-t-2 border-gray-100 bg-white">
                    <div
                        className="flex overflow-x-auto scroll-smooth"
                        style={{ scrollbarWidth: 'none' }}
                        role="tablist"
                        aria-label="Resident sections"
                    >
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon;
                            if (tab.kind === 'link') {
                                const linkTo = tab.getPath ? tab.getPath(residentId) : tab.href;
                                return (
                                    <Link
                                        key={tab.id}
                                        to={linkTo}
                                        role="tab"
                                        aria-selected={false}
                                        className="relative flex flex-col items-center gap-0.5 px-3 py-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)] min-w-[68px] text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                        <Icon className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
                                        <span className="text-[10px] font-bold tracking-wide text-gray-500">{tab.label}</span>
                                    </Link>
                                );
                            }
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setTab(tab.id)}
                                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)] min-w-[68px] ${
                                        isActive
                                            ? 'text-[var(--theme-primary)]'
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon
                                        className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}`}
                                        aria-hidden="true"
                                    />
                                    <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-500'}`}>
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <span
                                            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--theme-primary)]"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Tab content ──────────────────────────────────────────────── */}
            <div className="pt-4">
                {activeTab === 'overview'     && (
                    <OverviewTab
                        resident={resident}
                        residentId={residentId}
                        navigate={navigate}
                        setTab={setTab}
                        medicationHubListPath={`/my-residents/${residentId}/medications/list`}
                    />
                )}
                {activeTab === 'notes'        && <NotesTab residentId={residentId} canAddProgressNotes={!isCaregiver} />}
                {activeTab === 'care'         && <CarePlanTab resident={resident} residentId={residentId} currentUser={currentUser} />}
                {activeTab === 'documents'    && <ResidentDocuments residentId={residentId} />}
                {activeTab === 'vitals'       && <VitalsTab residentId={residentId} resident={resident} navigate={navigate} />}
                {activeTab === 'appointments' && <AppointmentsTab residentId={residentId} resident={resident} navigate={navigate} />}
                {activeTab === 'profile'      && <ProfileTab resident={resident} />}
                {activeTab === 'assessments' && showAssessmentsTab && (
                    <div className="resident-hub-embed max-w-[100vw] overflow-x-auto">
                        <Assessments embedded embeddedResidentId={residentId} />
                    </div>
                )}
                {activeTab === 'charts' && (
                    <div className="resident-hub-embed">
                        <CaregiverResidentChart residentId={residentId} embedded />
                    </div>
                )}
            </div>
            </div>
        </>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent, onClick }) {
    const base = 'rounded-xl border bg-white shadow-sm p-4 flex items-center gap-4';
    const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';
    return (
        <div className={`${base} ${interactive} ${accent ? 'border-l-4 ' + accent : 'border-gray-100'}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accent ? 'bg-opacity-10 bg-current' : 'bg-gray-50'}`}>
                <Icon className="w-5 h-5 text-[var(--theme-primary)]" aria-hidden="true" />
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function OverviewTab({ resident, residentId, navigate, setTab, medicationHubListPath }) {
    const { data: medsData } = useQuery({
        queryKey: ['overview-meds', residentId],
        queryFn: async () => {
            const res = await api.get('/medications', { params: { resident_id: residentId, active_only: 'true', per_page: 100 } });
            return res.data;
        },
        enabled: !!residentId,
    });

    const { data: notesData } = useQuery({
        queryKey: ['overview-notes', residentId],
        queryFn: async () => {
            const res = await api.get('/t-logs', { params: { resident_id: residentId, per_page: 3 } });
            return res.data;
        },
        enabled: !!residentId,
    });

    const { data: apptData } = useQuery({
        queryKey: ['overview-appts', residentId],
        queryFn: async () => {
            const res = await api.get('/appointments', { params: { resident_id: residentId, per_page: 5 } });
            return res.data;
        },
        enabled: !!residentId,
    });

    const medsCount   = (medsData?.data ?? medsData ?? []).length ?? 0;
    const recentNotes = notesData?.data ?? notesData ?? [];
    const upcomingAppts = (apptData?.data ?? apptData ?? []).filter(a => a.appointment_date && new Date(a.appointment_date) >= new Date());
    const vitalSigns = resident?.vital_signs ?? resident?.vitalSigns ?? [];
    const latestVital = Array.isArray(vitalSigns) ? vitalSigns[0] : null;
    const statusSummary = getResidentStatusSummary(resident);

    return (
        <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Pill}     label="Active Meds"      value={medsCount}               onClick={() => navigate(medicationHubListPath)} />
                <StatCard icon={Calendar} label="Upcoming Appts"   value={upcomingAppts.length}    onClick={() => setTab('appointments')} />
                <StatCard icon={FileText} label="Recent Notes"     value={Array.isArray(recentNotes) ? recentNotes.length : 0} onClick={() => setTab('notes')} />
                <StatCard icon={Heart}    label="Vitals on File"   value={Array.isArray(vitalSigns) ? vitalSigns.length : 0} onClick={() => setTab('vitals')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Latest vitals */}
                <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                            <h3 className="text-sm font-bold text-gray-900">Latest Vitals</h3>
                        </div>
                        <button onClick={() => setTab('vitals')} className="text-xs font-semibold text-[var(--theme-primary)] hover:underline">View All →</button>
                    </div>
                    {latestVital ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                            {[
                                { label: 'BP', value: latestVital.systolic ? `${latestVital.systolic}/${latestVital.diastolic}` : null },
                                { label: 'Pulse', value: latestVital.pulse ? `${latestVital.pulse} bpm` : null },
                                { label: 'Temp', value: latestVital.temperature ? `${parseFloat(latestVital.temperature).toFixed(1)} °F` : null },
                                { label: 'SpO₂', value: latestVital.oxygen_saturation ? `${latestVital.oxygen_saturation}%` : null },
                                { label: 'Pain', value: latestVital.pain_level !== null && latestVital.pain_level !== undefined ? `${latestVital.pain_level}/10` : null },
                                { label: 'Weight', value: latestVital.weight ? `${latestVital.weight} lbs` : null },
                            ].filter(v => v.value).map(({ label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                                    <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">No vitals recorded</div>
                    )}
                </section>

                {/* Recent notes */}
                <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                            <h3 className="text-sm font-bold text-gray-900">Recent Notes</h3>
                        </div>
                        <button onClick={() => setTab('notes')} className="text-xs font-semibold text-[var(--theme-primary)] hover:underline">View All →</button>
                    </div>
                    {Array.isArray(recentNotes) && recentNotes.length > 0 ? (
                        <ul className="divide-y divide-gray-50">
                            {recentNotes.slice(0, 3).map(note => (
                                <li key={note.id} className="px-4 py-3">
                                    <p className="text-sm text-gray-800 line-clamp-2">{note.notes || note.content || note.message || '—'}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) : ''}
                                        {note.user?.name ? ` · ${note.user.name}` : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">No notes recorded</div>
                    )}
                </section>
            </div>

            {/* Clinical snapshot */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-gray-900">Clinical Snapshot</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {[
                        { label: 'Lifecycle Status', value: statusSummary.lifecycleMeta.label },
                        { label: 'Temporary Status', value: statusSummary.temporaryMeta?.label },
                        { label: 'Census', value: statusSummary.isInCensus ? 'In census' : 'Out of census' },
                        { label: 'Code Status', value: resident.code_status },
                        { label: 'Primary Language', value: resident.primary_language || resident.language },
                        { label: 'Diet', value: resident.diet || resident.dietary_restrictions },
                        { label: 'Pharmacy', value: resident.pharmacy?.name || resident.pharmacy_name },
                        { label: 'Diagnosis', value: resident.diagnosis },
                        { label: 'General Medication Instructions', value: resident.general_medication_instructions },
                    ].map(({ label, value }) => (
                        <div key={label} className="px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                            <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">{value || <span className="text-gray-400 italic">Not recorded</span>}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ residentId, canAddProgressNotes = false }) {
    const [page, setPage] = React.useState(1);
    const [showAddNoteModal, setShowAddNoteModal] = React.useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['hub-notes', residentId, page],
        queryFn: async () => {
            const res = await api.get('/t-logs', { params: { resident_id: residentId, per_page: 10, page } });
            return res.data;
        },
        enabled: !!residentId,
        keepPreviousData: true,
    });

    const notes = data?.data ?? (Array.isArray(data) ? data : []);
    const totalPages = data?.last_page ?? 1;

    if (isLoading) return <TabSkeleton rows={5} />;

    return (
        <>
            <Modal
                isOpen={showAddNoteModal}
                onClose={() => setShowAddNoteModal(false)}
                title="New progress note"
                size="xl"
            >
                <TLogForm
                    key={showAddNoteModal ? `hub-note-${residentId}` : 'closed'}
                    tLog={null}
                    initialResidentId={residentId}
                    inModal
                    onClose={() => setShowAddNoteModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['hub-notes', residentId] });
                        queryClient.invalidateQueries({ queryKey: ['t-logs'] });
                        queryClient.invalidateQueries({ queryKey: ['resident-t-logs', residentId] });
                        setShowAddNoteModal(false);
                    }}
                />
            </Modal>
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-gray-900">T-Logs</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canAddProgressNotes && (
                            <button
                                type="button"
                                onClick={() => setShowAddNoteModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-on-primary)] shadow-sm hover:bg-[var(--theme-primary-hover)] transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                Add progress note
                            </button>
                        )}
                    <Link
                        to={`/t-logs?resident_id=${residentId}`}
                        className="text-xs font-semibold text-[var(--theme-primary)] hover:underline"
                    >
                        Open Full View →
                    </Link>
                    </div>
                </div>

                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FileText className="w-10 h-10 text-gray-200 mb-3" aria-hidden="true" />
                        <p className="text-sm font-semibold text-gray-900">No notes recorded</p>
                        <p className="text-xs text-gray-400 mt-1">T-Logs for this resident will appear here.</p>
                        {canAddProgressNotes && (
                            <button
                                type="button"
                                onClick={() => setShowAddNoteModal(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" aria-hidden="true" />
                                Add progress note
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {notes.map(note => (
                            <li key={note.id} className="px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 leading-relaxed">{note.notes || note.content || note.message || '—'}</p>
                                        {note.category && (
                                            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600">
                                                {note.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right text-[11px] text-gray-400 shrink-0">
                                        <p className="font-medium text-gray-600">{note.user?.name || note.caregiver_name || 'Staff'}</p>
                                        <p>{note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }) : ''}</p>
                                        <p>{note.created_at ? new Date(note.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }) : ''}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs font-bold text-gray-500 disabled:opacity-40 hover:text-gray-800 transition-colors">
                            ← Prev
                        </button>
                        <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs font-bold text-gray-500 disabled:opacity-40 hover:text-gray-800 transition-colors">
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

// ─── Care Plan Tab ────────────────────────────────────────────────────────────

function CarePlanTab({ resident, residentId, currentUser }) {
    const queryClient = useQueryClient();
    const canEdit = canEditResidentCarePlan(currentUser);
    const [editing, setEditing] = React.useState(false);
    const [form, setForm] = React.useState({
        care_plan: resident?.care_plan || '',
        special_instructions: resident?.special_instructions || '',
        notes: resident?.notes || '',
    });

    React.useEffect(() => {
        if (resident) {
            setForm({
                care_plan: resident.care_plan || '',
                special_instructions: resident.special_instructions || '',
                notes: resident.notes || '',
            });
        }
    }, [resident]);

    const mutation = useMutation({
        mutationFn: (data) => api.put(`/residents/${residentId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['resident-hub', residentId]);
            setEditing(false);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Failed to save care plan.');
        },
    });

    const fields = [
        { key: 'care_plan', label: 'Care Plan', rows: 6 },
        { key: 'special_instructions', label: 'Special Instructions', rows: 4 },
        { key: 'notes', label: 'Additional Notes', rows: 3 },
    ];

    const carePlanEmpty =
        !(resident?.care_plan || '').trim() &&
        !(resident?.special_instructions || '').trim() &&
        !(resident?.notes || '').trim();

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-gray-900">Care Plan</h3>
                </div>
                {canEdit && !editing && (
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-on-primary)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
                    >
                        <Edit className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {carePlanEmpty ? 'Add care plan' : 'Edit care plan'}
                    </button>
                )}
            </div>
            <div className="p-4 space-y-4">
                {fields.map(({ key, label, rows }) => (
                    <div key={key}>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
                        {editing ? (
                            <textarea
                                rows={rows}
                                value={form[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent resize-y"
                            />
                        ) : (
                            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap min-h-[60px]">
                                {form[key] || <span className="text-gray-400 italic">Not recorded</span>}
                            </div>
                        )}
                    </div>
                ))}
                {editing && (
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => mutation.mutate(form)}
                            disabled={mutation.isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-90 disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" /> {mutation.isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                            <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Vitals Tab ───────────────────────────────────────────────────────────────

function VitalsTab({ residentId, resident, navigate }) {
    const vitalSigns = resident?.vital_signs ?? resident?.vitalSigns ?? [];

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-gray-900">Vital Signs</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(`/vitals?resident=${residentId}`)}
                            className="text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            + Record Vitals
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/view-vitals?resident=${residentId}`)}
                            className="text-xs font-semibold text-[var(--theme-primary)] hover:underline"
                        >
                            Full History →
                        </button>
                    </div>
                </div>

                {Array.isArray(vitalSigns) && vitalSigns.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/80 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                <tr>
                                    {['Date', 'BP', 'Pulse', 'Temp', 'SpO₂', 'Weight', 'Pain'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vitalSigns.slice(0, 10).map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{v.recorded_at || v.created_at ? new Date(v.recorded_at || v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) : '—'}</td>
                                        <td className="px-4 py-2.5 font-medium">{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}</td>
                                        <td className="px-4 py-2.5">{v.pulse ?? '—'}</td>
                                        <td className="px-4 py-2.5">{v.temperature ? `${parseFloat(v.temperature).toFixed(1)}°` : '—'}</td>
                                        <td className="px-4 py-2.5">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</td>
                                        <td className="px-4 py-2.5">{v.weight ?? '—'}</td>
                                        <td className="px-4 py-2.5">{v.pain_level ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Heart className="w-10 h-10 text-gray-200 mb-3" aria-hidden="true" />
                        <p className="text-sm font-semibold text-gray-900">No vitals recorded</p>
                        <button onClick={() => navigate(`/vitals?resident=${residentId}`)} className="mt-3 text-xs font-bold text-[var(--theme-primary)] hover:underline">
                            Record first vital →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ residentId, resident, navigate }) {
    const { data, isLoading } = useQuery({
        queryKey: ['hub-appointments', residentId],
        queryFn: async () => (await api.get('/appointments', { params: { resident_id: residentId, per_page: 20 } })).data,
        enabled: !!residentId,
    });

    const appointments = data?.data ?? (Array.isArray(data) ? data : []);
    const now = new Date();
    const upcoming = appointments.filter(a => a.appointment_date && new Date(a.appointment_date) >= now);
    const past     = appointments.filter(a => a.appointment_date && new Date(a.appointment_date) < now);

    if (isLoading) return <TabSkeleton rows={4} />;

    const renderAppt = (appt) => (
        <li key={appt.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{appt.title || appt.appointment_type || 'Appointment'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) : '—'}
                    {appt.appointment_time ? ` · ${appt.appointment_time}` : ''}
                </p>
                {appt.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{appt.notes}</p>}
            </div>
            {appt.status && (
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                    appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                    appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                }`}>{appt.status}</span>
            )}
        </li>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-gray-900">Appointments</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(`/appointments/create/${residentId}`)}
                        className="text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        + Schedule
                    </button>
                </div>

                {upcoming.length > 0 && (
                    <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Upcoming</p>
                        <ul className="divide-y divide-gray-50">{upcoming.map(renderAppt)}</ul>
                    </div>
                )}
                {past.length > 0 && (
                    <div className="border-t border-gray-100">
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Past</p>
                        <ul className="divide-y divide-gray-50">{past.slice(0, 5).map(renderAppt)}</ul>
                    </div>
                )}
                {appointments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Calendar className="w-10 h-10 text-gray-200 mb-3" aria-hidden="true" />
                        <p className="text-sm font-semibold text-gray-900">No appointments</p>
                        <button onClick={() => navigate(`/appointments/create/${residentId}`)} className="mt-3 text-xs font-bold text-[var(--theme-primary)] hover:underline">
                            Schedule first appointment →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ resident }) {
    if (!resident) return null;

    const statusSummary = getResidentStatusSummary(resident);

    const sections = [
        {
            title: 'Resident Status',
            icon: Activity,
            fields: [
                { label: 'Lifecycle Status', value: statusSummary.lifecycleMeta.label },
                { label: 'Temporary Status', value: statusSummary.temporaryMeta?.label || 'None' },
                { label: 'Census', value: statusSummary.isInCensus ? 'In census' : 'Out of census' },
                { label: 'Temporary Started', value: resident.temporary_status_started_at ? formatCalDate(resident.temporary_status_started_at) : null },
                { label: 'Temporary Note', value: resident.temporary_status_note },
                { label: 'Discharge Date', value: resident.discharge_date ? formatCalDate(resident.discharge_date) : null },
                { label: 'Discharge Reason', value: resident.discharge_reason },
                { label: 'Discharge Destination', value: resident.discharge_destination },
            ],
        },
        {
            title: 'Personal Information',
            icon: User,
            fields: [
                { label: 'Full Name', value: [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ') },
                { label: 'Date of Birth', value: formatCalDate(resident.date_of_birth) + (calculateAgeFromPacificBirthDate(resident.date_of_birth) !== null ? ` (${calculateAgeFromPacificBirthDate(resident.date_of_birth)} y.o.)` : '') },
                { label: 'Gender', value: resident.gender },
                { label: 'Primary Language', value: resident.primary_language || resident.language },
                { label: 'Phone', value: formatPhone(resident.phone) },
                { label: 'Email', value: resident.email },
                { label: 'Social Security #', value: resident.social_security ? '###-##-####' : null },
            ],
        },
        {
            title: 'Residence',
            icon: Building2,
            fields: [
                { label: 'Room', value: resident.room_number || resident.room },
                { label: 'Admission Date', value: formatCalDate(resident.admission_date) },
                { label: 'Branch', value: resident.branch?.name },
                { label: 'Length of Stay', value: computeLengthOfStay(resident.admission_date) },
            ],
        },
        {
            title: 'Clinical',
            icon: Stethoscope,
            fields: [
                { label: 'Code Status', value: resident.code_status },
                { label: 'Allergies', value: Array.isArray(resident.allergies) ? resident.allergies.join(', ') : resident.allergies },
                { label: 'Diet', value: resident.diet || resident.dietary_restrictions },
                { label: 'Diagnosis', value: resident.diagnosis },
                { label: 'Pharmacy', value: resident.pharmacy?.name || resident.pharmacy_name },
                { label: 'General Medication Instructions', value: resident.general_medication_instructions },
            ],
        },
        {
            title: 'Emergency Contact',
            icon: Phone,
            fields: [
                { label: 'Contact Name', value: resident.emergency_contact_name },
                { label: 'Contact Phone', value: formatPhone(resident.emergency_contact_phone) },
                { label: 'Relationship', value: resident.emergency_contact_relationship },
            ],
        },
    ];

    return (
        <div className="space-y-4">
            {sections.map(({ title, icon: Icon, fields }) => {
                const filled = fields.filter(f => f.value);
                if (filled.length === 0) return null;
                return (
                    <section key={title} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                            <Icon className="w-4 h-4 text-[var(--theme-primary)]" aria-hidden="true" />
                            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                            {filled.map(({ label, value }) => (
                                <div key={label} className="bg-white px-4 py-3">
                                    <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                );
            })}
        </div>
    );
}

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function TabSkeleton({ rows = 4 }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" aria-busy="true" aria-label="Loading…">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-50 animate-pulse" />
            ))}
        </div>
    );
}
