import React from 'react';
import {
    Calendar, Clock, CheckCircle, AlertCircle,
    ChevronRight, Activity, Pill, User,
    MapPin, Phone, FileText, Sparkles, Heart, ClipboardList,
    AlertTriangle, Flame, ShoppingCart, ArrowRight,
    Cake, ChevronDown, BellRing, CheckCircle2, Users,
    Stethoscope, TrendingUp,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SectionCard from '../SectionCard';
import { slideInUpNoFade, shouldAnimate } from '../../utils/animationPresets';
import api from '../../services/api';
import { getPacificNow, formatPacificTime, formatPacificDate } from '../../utils/pacificTime';

const ACTIONABLE_ICONS = {
    assessment: ClipboardList,
    appointment: Calendar,
    medication: Pill,
    fire_drill: Flame,
    inventory: ShoppingCart,
    leave_request: User,
};

const PRIORITY_STYLES = {
    urgent: {
        bar: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border border-red-200',
        icon: 'text-red-500',
        label: 'Urgent',
    },
    soon: {
        bar: 'bg-amber-400',
        badge: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: 'text-amber-500',
        label: 'Soon',
    },
    info: {
        bar: 'bg-blue-400',
        badge: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: 'text-blue-500',
        label: 'Info',
    },
};

function useLiveClock() {
    const [time, setTime] = React.useState(() => getPacificNow());
    React.useEffect(() => {
        const id = setInterval(() => setTime(getPacificNow()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

function getUpcomingBirthdays(residents, windowDays = 30) {
    if (!Array.isArray(residents)) return [];
    const today = getPacificNow();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return residents
        .filter(r => r.date_of_birth)
        .map(r => {
            const dob = new Date(r.date_of_birth);
            if (isNaN(dob.getTime())) return null;
            const birthMonth = dob.getMonth();
            const birthDay = dob.getDate();

            // Birthday this year
            const thisYear = today.getFullYear();
            let nextBirthday = new Date(thisYear, birthMonth, birthDay);
            // If birthday already passed this year, use next year
            if (nextBirthday < today && !(nextBirthday.getMonth() === todayMonth && nextBirthday.getDate() === todayDay)) {
                nextBirthday = new Date(thisYear + 1, birthMonth, birthDay);
            }
            const diffMs = nextBirthday - today;
            const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const turningAge = nextBirthday.getFullYear() - dob.getFullYear();
            return { ...r, daysUntil, nextBirthday, turningAge };
        })
        .filter(r => r && r.daysUntil >= 0 && r.daysUntil <= windowDays)
        .sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Derive a first name from user object regardless of which field is populated */
function deriveFirstName(user) {
    if (user?.first_name) return user.first_name;
    if (user?.name) return user.name.split(' ')[0];
    return 'Caregiver';
}

export default function CaregiverDashboard({
    user,
    stats,
    todaysSchedule = [],
    upcomingEvents = [],
    actionableItems = [],
}) {
    const navigate = useNavigate();
    const now = useLiveClock();
    const currentHour = now.getUTCHours();
    const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
    const firstName = deriveFirstName(user);

    // ── Fetch active residents (shared for birthday widget + quick-access strip) ─
    const { data: residentsData } = useQuery({
        queryKey: ['caregiver-dashboard-residents-birthdays'],
        queryFn: async () => {
            const res = await api.get('/residents', { params: { is_active: 1, per_page: 200 } });
            return res.data;
        },
        staleTime: 15 * 60 * 1000,
    });

    const residentList = React.useMemo(
        () => residentsData?.data ?? (Array.isArray(residentsData) ? residentsData : []),
        [residentsData],
    );

    const upcomingBirthdays = React.useMemo(
        () => getUpcomingBirthdays(residentList, 30),
        [residentList],
    );

    // Build a set of resident IDs that have pending medication reminders
    const medReminderResidentIds = React.useMemo(() => {
        const reminders = stats?.medication_reminders;
        if (!Array.isArray(reminders)) return new Set();
        return new Set(reminders.map(m => String(m.resident_id)).filter(Boolean));
    }, [stats?.medication_reminders]);

    // ── Fetch PRN follow-ups due today ─────────────────────────────────────────
    const { data: prnFollowupsData } = useQuery({
        queryKey: ['dashboard-prn-followups'],
        queryFn: async () => {
            const res = await api.get('/reminders', { params: { type: 'prn_followup', status: 'pending', per_page: 20 } });
            return res.data;
        },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const prnFollowups = React.useMemo(() => {
        const raw = prnFollowupsData?.data ?? (Array.isArray(prnFollowupsData) ? prnFollowupsData : []);
        return raw;
    }, [prnFollowupsData]);

    // Group schedule by time status
    const getScheduleStatus = (timeStr, isCompleted = false) => {
        if (isCompleted) return 'past';
        if (!timeStr) return 'upcoming';
        const nowLocal = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduleTime = new Date();
        scheduleTime.setHours(hours, minutes, 0);

        const diff = (scheduleTime - nowLocal) / (1000 * 60);

        if (diff < -60) return 'overdue';
        if (diff < -30) return 'past';
        if (diff >= -30 && diff <= 30) return 'current';
        return 'upcoming';
    };

    return (
        <div className="space-y-6">
            {/* ── Greeting Header ── */}
            <div
                className="bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-2xl shadow-sm p-6 text-white"
                role="banner"
                aria-label="Dashboard greeting"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">
                            {greeting}, {firstName} 👋
                        </h1>
                        <p className="text-white/75 text-sm">
                            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            {user?.branch?.name ? ` · ${user.branch.name}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Live clock */}
                        <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 border border-white/20">
                            <Clock className="w-4 h-4 text-white/70" aria-hidden="true" />
                            <span className="text-sm font-mono font-semibold tabular-nums" aria-label={`Current time Pacific: ${formatPacificTime(now)}`}>
                                {formatPacificTime(now)}
                            </span>
                            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">PT</span>
                        </div>
                        {/* On shift indicator */}
                        <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
                            <span className="text-sm font-medium">On Shift</span>
                        </div>
                        <button
                            onClick={() => navigate('/appointments')}
                            className="bg-white text-[var(--theme-primary)] px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-white/90 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-primary)]"
                        >
                            View Calendar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="My Residents"
                    value={stats?.assigned_residents || 0}
                    icon={Users}
                    onClick={() => navigate('/my-residents')}
                />
                <StatCard
                    title="Appointments"
                    value={stats?.todays_appointments || 0}
                    icon={Calendar}
                    onClick={() => navigate('/appointments')}
                />
                <StatCard
                    title="Medications Due"
                    value={stats?.medication_reminders?.length || 0}
                    icon={Pill}
                    urgent={(stats?.medication_reminders?.length || 0) > 0}
                    onClick={() => navigate('/medications/residents')}
                />
                <StatCard
                    title="Pending Tasks"
                    value={stats?.pending_assessments || 0}
                    icon={ClipboardList}
                    urgent={(stats?.pending_assessments || 0) > 0}
                    onClick={() => navigate('/assessments')}
                />
            </div>

            {/* ── Resident Quick-Access Strip ── */}
            {residentList.length > 0 && (
                <ResidentStrip
                    residents={residentList}
                    medReminderIds={medReminderResidentIds}
                    navigate={navigate}
                />
            )}

            {/* ── Tabbed Alerts Widget ── */}
            {actionableItems.length > 0 && (
                <AlertsWidget items={actionableItems} navigate={navigate} />
            )}

            {/* ── PRN Follow-ups Banner ── */}
            {prnFollowups.length > 0 && (
                <PrnFollowupsPanel followups={prnFollowups} navigate={navigate} />
            )}

            {/* ── Main 2-col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Today's Schedule */}
                <div className="lg:col-span-2" role="region" aria-label="Today's schedule">
                    <SectionCard
                        title="Today's Schedule"
                        headerRight={
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </span>
                        }
                    >
                        {todaysSchedule.length > 0 ? (
                            <div className="space-y-0">
                                {todaysSchedule.map((item, index) => {
                                    const status = getScheduleStatus(item.time_24h, item.is_completed);
                                    const isLast = index === todaysSchedule.length - 1;

                                    return (
                                        <div key={item.id} className="relative pl-8 pb-6 group">
                                            {!isLast && (
                                                <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200 group-hover:bg-gray-300 transition-colors" aria-hidden="true" />
                                            )}
                                            <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white
                                                ${status === 'overdue' ? 'border-red-400 bg-red-50' :
                                                  status === 'current' ? 'border-[var(--theme-primary)] shadow-[0_0_0_4px_rgba(var(--theme-primary-rgb),0.2)]' :
                                                    status === 'past' ? 'border-gray-300 bg-gray-50' : 'border-[var(--theme-primary)]'}`}
                                                aria-hidden="true"
                                            >
                                                {status === 'past' ? (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                                ) : status === 'overdue' ? (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${status === 'current' ? 'bg-[var(--theme-primary)] animate-pulse' : 'bg-[var(--theme-primary)]'}`} />
                                                )}
                                            </div>

                                            <div
                                                className={`relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer
                                                    ${status === 'overdue' ? 'bg-red-50 border-red-200' :
                                                      status === 'current' ? 'bg-[var(--theme-primary-bg-light)] border-[var(--theme-primary)]/20' :
                                                    status === 'past' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-[var(--theme-primary)]/30'}`}
                                                onClick={() => item.link && navigate(item.link)}
                                                role="button"
                                                tabIndex={item.link ? 0 : -1}
                                                onKeyDown={e => e.key === 'Enter' && item.link && navigate(item.link)}
                                                aria-label={`${item.title} for ${item.resident_name} at ${item.time}${status === 'overdue' ? ', overdue' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`text-sm font-semibold ${status === 'overdue' ? 'text-red-600' : status === 'current' ? 'text-[var(--theme-primary)]' : 'text-gray-900'}`}>
                                                                {item.time}
                                                            </span>
                                                            {status === 'overdue' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-red-700">
                                                                    Overdue
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider
                                                                ${item.type === 'medication' ? 'bg-green-100 text-green-700' :
                                                                    item.type === 'appointment' ? 'bg-blue-100 text-blue-700' :
                                                                        item.type === 'vitals' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
                                                            >
                                                                {item.category || item.type}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                                                        <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5" aria-hidden="true" />
                                                            {item.resident_name}
                                                        </p>
                                                        {item.location && (
                                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                                                {item.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {item.link && (
                                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--theme-primary)] transition-colors flex-shrink-0" aria-hidden="true" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
                                <p className="text-sm max-w-xs mx-auto mt-1 text-gray-500">No scheduled tasks or appointments remaining for today.</p>
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Upcoming Birthdays */}
                    {upcomingBirthdays.length > 0 && (
                        <BirthdaysWidget birthdays={upcomingBirthdays} navigate={navigate} />
                    )}

                    {/* Upcoming Events */}
                    <SectionCard
                        title="Upcoming Events"
                        actionLabel="View All"
                        onAction={() => navigate('/events')}
                    >
                        {upcomingEvents.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {upcomingEvents.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="p-3 hover:bg-gray-50 transition-colors rounded-xl cursor-pointer"
                                        onClick={() => event.link && navigate(event.link)}
                                        role="button"
                                        tabIndex={event.link ? 0 : -1}
                                        onKeyDown={e => e.key === 'Enter' && event.link && navigate(event.link)}
                                        aria-label={event.title}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs
                                                ${event.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                                    event.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}
                                                aria-hidden="true"
                                            >
                                                <span className="text-[10px] font-bold uppercase">{new Date(event.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                                <span className="text-base font-bold leading-none">{new Date(event.date).getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {event.time && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                                            {event.time}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400">{event.branch}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                                    <Calendar className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900">Nothing coming up</p>
                                <p className="text-xs text-gray-400 mt-1">Enjoy the quiet — no events ahead.</p>
                            </div>
                        )}
                    </SectionCard>

                    {/* Quick Actions */}
                    <SectionCard title="Quick Actions">
                        <div className="grid grid-cols-2 gap-3">
                            <QuickAction label="Record Vitals" icon={Heart} onClick={() => navigate('/vitals')} />
                            <QuickAction label="New Incident" icon={AlertCircle} onClick={() => navigate('/incidents')} />
                            <QuickAction label="Administer Meds" icon={Pill} onClick={() => navigate('/medications/residents')} />
                            <QuickAction label="T-Logs" icon={FileText} onClick={() => navigate('/t-logs')} />
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}

// ── Resident Quick-Access Strip ───────────────────────────────────────────────

function ResidentStrip({ residents, medReminderIds, navigate }) {
    return (
        <section
            aria-label="My residents quick access"
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-gray-900">My Residents</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        {residents.length} active
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/my-residents')}
                    className="text-xs font-semibold text-slate-800 underline-offset-2 hover:underline hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                >
                    View All →
                </button>
            </div>

            {/* Horizontal scroll */}
            <div
                className="flex gap-3 overflow-x-auto px-4 py-3 scroll-smooth"
                style={{ scrollbarWidth: 'thin' }}
                role="list"
            >
                {residents.map(resident => {
                    const initials = [resident.first_name?.[0], resident.last_name?.[0]].filter(Boolean).join('').toUpperCase();
                    const room = resident.room_number || resident.room;
                    const hasMedPending = medReminderIds.has(String(resident.id));
                    const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ');

                    return (
                        <button
                            key={resident.id}
                            type="button"
                            role="listitem"
                            onClick={() => navigate(`/residents/${resident.id}`)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] p-2 rounded-xl hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 group"
                            aria-label={`${fullName}${room ? `, room ${room}` : ''}${hasMedPending ? ', has pending medications' : ''}`}
                        >
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center text-sm font-bold border border-slate-300 shadow-sm group-hover:border-slate-400 group-hover:bg-white transition-colors [&_svg]:text-slate-700">
                                    {initials || <User className="w-5 h-5" aria-hidden="true" />}
                                </div>
                                {/* Medication pending dot */}
                                {hasMedPending && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white"
                                        aria-hidden="true"
                                        title="Medication pending"
                                    />
                                )}
                            </div>

                            {/* Name — use high-contrast grays; avoid theme primary for small text (light brand colors) */}
                            <span className="text-[10px] font-bold text-slate-950 text-center leading-tight w-full truncate group-hover:text-slate-900 transition-colors">
                                {resident.first_name || fullName}
                            </span>

                            {/* Room badge */}
                            {room ? (
                                <span className="text-[9px] text-slate-600 font-semibold">Rm {room}</span>
                            ) : (
                                <span className="text-[9px] text-slate-400">—</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            {medReminderIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 border-t border-gray-50 bg-gray-50/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
                    <span className="text-[10px] text-gray-500">Amber dot = pending medication reminder</span>
                </div>
            )}
        </section>
    );
}

// ── Tabbed Alerts Widget ───────────────────────────────────────────────────────

function AlertsWidget({ items, navigate }) {
    const [activeTab, setActiveTab] = React.useState('all');
    const widgetRef = React.useRef(null);

    React.useEffect(() => {
        if (widgetRef.current && shouldAnimate()) {
            slideInUpNoFade(widgetRef.current, { duration: 320, delay: 80 });
        }
    }, []);

    const medItems = React.useMemo(() => items.filter(i => i.type === 'medication'), [items]);
    const taskItems = React.useMemo(() => items.filter(i => i.type === 'assessment'), [items]);
    const otherItems = React.useMemo(() => items.filter(i => i.type !== 'medication' && i.type !== 'assessment'), [items]);

    const tabs = [
        { key: 'all', label: 'All', count: items.length, dotColor: 'bg-amber-400' },
        { key: 'medications', label: 'Medications', count: medItems.length, dotColor: 'bg-green-500' },
        { key: 'tasks', label: 'Tasks', count: taskItems.length, dotColor: 'bg-blue-500' },
        ...(otherItems.length > 0 ? [{ key: 'other', label: 'Other', count: otherItems.length, dotColor: 'bg-gray-400' }] : []),
    ];

    const currentItems =
        activeTab === 'medications' ? medItems :
        activeTab === 'tasks' ? taskItems :
        activeTab === 'other' ? otherItems :
        items;

    return (
        <section
            ref={widgetRef}
            aria-label="Alerts needing attention"
            className="rounded-xl border border-amber-100 bg-white shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-amber-50/40">
                <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-gray-900">Needs Attention</h2>
                </div>
                <span className="text-xs text-gray-400" aria-live="polite">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 border-b border-gray-100 bg-gray-50/40" role="tablist" aria-label="Alert categories">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]
                                ${isActive ? 'bg-white text-gray-900 border-t border-x border-gray-200 -mb-px z-10' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white ${isActive ? tab.dotColor : 'bg-gray-300'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Items */}
            {currentItems.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-600 bg-emerald-50/30">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>All clear in this category.</span>
                </div>
            ) : (
                <ul className="divide-y divide-gray-50" role="list">
                    {currentItems.map((item) => {
                        const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.info;
                        const Icon = ACTIONABLE_ICONS[item.type] || AlertCircle;
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => item.link && navigate(item.link)}
                                    className="relative w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)] transition-colors group"
                                    aria-label={`${item.title}${item.description ? ` — ${item.description}` : ''}, priority: ${style.label}`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} aria-hidden="true" />
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${style.badge}`} aria-hidden="true">
                                        <Icon className={`w-4 h-4 ${style.icon}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                                        {item.description && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                        )}
                                    </div>
                                    <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`} aria-hidden="true">
                                        {style.label}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] group-focus-visible:text-[var(--theme-primary)] transition-colors flex-shrink-0" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ── PRN Follow-ups Panel ──────────────────────────────────────────────────────

function PrnFollowupsPanel({ followups, navigate }) {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <section
            aria-label="PRN follow-ups due"
            className="rounded-xl border border-purple-100 bg-purple-50/30 overflow-hidden shadow-sm"
        >
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                aria-expanded={!collapsed}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-purple-900 hover:bg-purple-50/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400"
            >
                <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-purple-500" aria-hidden="true" />
                    PRN Follow-ups Due Today
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white bg-purple-500">
                        {followups.length}
                    </span>
                </div>
                {collapsed
                    ? <ChevronRight className="w-4 h-4 text-purple-400" aria-hidden="true" />
                    : <ChevronDown className="w-4 h-4 text-purple-400" aria-hidden="true" />
                }
            </button>

            {!collapsed && (
                <ul className="divide-y divide-purple-100/60 px-2 pb-2" role="list">
                    {followups.slice(0, 5).map((f, idx) => (
                        <li key={f.id ?? idx}>
                            <button
                                type="button"
                                onClick={() => f.resident_id && navigate(`/residents/${f.resident_id}/medications`)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 group"
                                aria-label={`PRN follow-up for ${f.resident?.name ?? f.resident_name ?? 'resident'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                    <Pill className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {f.resident?.name ?? f.resident_name ?? 'Resident'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {f.notes ?? f.description ?? 'PRN follow-up required'}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                    {followups.length > 5 && (
                        <li className="px-3 py-2 text-xs text-purple-600 font-medium text-center">
                            +{followups.length - 5} more follow-ups
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

// ── Upcoming Birthdays Widget ─────────────────────────────────────────────────

function BirthdaysWidget({ birthdays, navigate }) {
    const widgetRef = React.useRef(null);

    React.useEffect(() => {
        if (widgetRef.current && shouldAnimate()) {
            slideInUpNoFade(widgetRef.current, { duration: 300, delay: 100 });
        }
    }, []);

    return (
        <section
            ref={widgetRef}
            aria-label="Upcoming resident birthdays"
            className="rounded-xl border border-pink-100 bg-white shadow-sm overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100/60 bg-pink-50/30">
                <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-gray-900">Upcoming Birthdays</h2>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-pink-400">next 30 days</span>
            </div>

            <ul className="divide-y divide-gray-50" role="list">
                {birthdays.slice(0, 5).map((resident) => {
                    const initials = [resident.first_name?.[0], resident.last_name?.[0]].filter(Boolean).join('');
                    const isToday = resident.daysUntil === 0;
                    const isTomorrow = resident.daysUntil === 1;
                    const label = isToday ? '🎂 Today!' : isTomorrow ? 'Tomorrow' : `In ${resident.daysUntil}d`;
                    const labelColor = isToday
                        ? 'bg-pink-100 text-pink-700'
                        : isTomorrow
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-gray-50 text-gray-500';

                    return (
                        <li key={resident.id}>
                            <button
                                type="button"
                                onClick={() => navigate(`/residents/${resident.id}`)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50/30 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-400 group"
                                aria-label={`${resident.first_name} ${resident.last_name} turns ${resident.turningAge} ${label}`}
                            >
                                {/* Avatar */}
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                        ${isToday ? 'bg-pink-500 text-white ring-2 ring-pink-300' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}
                                    aria-hidden="true"
                                >
                                    {initials || <User className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {resident.first_name} {resident.last_name}
                                    </p>
                                    <p className="text-xs text-gray-400">Turning {resident.turningAge}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${labelColor}`}>
                                    {label}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, onClick, urgent }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative w-full text-left bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all duration-200 group overflow-hidden
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2
                ${urgent ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-[var(--theme-primary)]/30'}`}
            aria-label={`${title}: ${value}`}
        >
            {urgent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" aria-hidden="true" />}
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg group-hover:scale-110 transition-transform duration-200
                    ${urgent ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-800 border border-slate-200/80'}`}
                    aria-hidden="true"
                >
                    <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className={`w-4 h-4 transition-colors ${urgent ? 'text-red-300 group-hover:text-red-500' : 'text-gray-300 group-hover:text-slate-600'}`} aria-hidden="true" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className={`text-2xl font-bold mt-1 ${urgent && value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            </div>
            <p className="text-xs text-slate-600 font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity mt-1.5" aria-hidden="true">
                View details →
            </p>
        </button>
    );
}

function QuickAction({ label, icon: Icon, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-text-on-primary)] p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:shadow-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-primary)] active:scale-95"
        >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-semibold">{label}</span>
        </button>
    );
}
