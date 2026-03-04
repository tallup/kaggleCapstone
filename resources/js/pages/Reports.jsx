import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { 
    BarChart3, 
    Users, 
    Activity, 
    Calendar, 
    Brain,
    History,
    Moon,
    UserCheck,
    Clock,
    ArrowRight,
    TrendingUp,
    Pill,
    ClipboardList,
    Sparkles,
    ShoppingCart,
    Flame,
    AlertTriangle,
    Building2,
    DollarSign,
} from 'lucide-react';
import PrintableReportLayout, { ReportPrintButton } from '../components/reports/PrintableReportLayout';

export default function Reports() {
    const navigate = useNavigate();

    // Fetch monthly statistics
    const { data: statsData, isLoading } = useQuery({
        queryKey: ['reports-stats-monthly'],
        queryFn: async () => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const startDateStr = startOfMonth.toISOString().split('T')[0];
            const endDateStr = endOfMonth.toISOString().split('T')[0];
            
            try {
                // Get appointments for the month
                const appointmentsRes = await api.get('/appointments', {
                    params: {
                        per_page: 1000,
                        date_filter: 'all',
                    }
                });
                const appointmentsCount = appointmentsRes.data?.data?.filter(apt => {
                    const aptDate = new Date(apt.appointment_date);
                    return aptDate >= startOfMonth && aptDate <= endOfMonth;
                }).length || 0;
                
                // Get vitals for the month using date filtering
                const vitalsRes = await api.get('/vitals', {
                    params: {
                        per_page: 1000,
                        date_from: startDateStr,
                        date_to: endDateStr,
                    }
                });
                const vitalsCount = vitalsRes.data?.total || vitalsRes.data?.data?.length || 0;
                
                // Get residents (total count, not filtered by month)
                const residentsRes = await api.get('/residents', { params: { per_page: 1 } });
                const residentsCount = residentsRes.data?.total || 0;
                
                // Get assessments for the month
                const assessmentsRes = await api.get('/assessments', {
                    params: {
                        per_page: 1000,
                    }
                });
                const assessmentsCount = assessmentsRes.data?.data?.filter(assessment => {
                    const assessDate = new Date(assessment.created_at || assessment.assessment_date || assessment.date);
                    return assessDate >= startOfMonth && assessDate <= endOfMonth;
                }).length || 0;
                
                // Get sleep records for the month
                const sleepRes = await api.get('/sleep-records', {
                    params: {
                        per_page: 1000,
                        date_from: startDateStr,
                        date_to: endDateStr,
                    }
                });
                const sleepCount = sleepRes.data?.total || sleepRes.data?.data?.length || 0;
                
                // Get housekeeping tasks
                const housekeepingRes = await api.get('/cleaning/tasks', {
                    params: {
                        per_page: 1,
                    }
                });
                const housekeepingCount = housekeepingRes.data?.meta?.total || housekeepingRes.data?.total || housekeepingRes.data?.data?.length || 0;
                
                // Get grocery status updates
                const groceryRes = await api.get('/grocery-status-updates', {
                    params: {
                        per_page: 1,
                    }
                });
                const groceryCount = groceryRes.data?.meta?.total || groceryRes.data?.total || groceryRes.data?.data?.length || 0;
                
                // Get fire drills
                const fireDrillsRes = await api.get('/fire-drills', {
                    params: {
                        per_page: 1,
                    }
                });
                const fireDrillsCount = fireDrillsRes.data?.meta?.total || fireDrillsRes.data?.total || fireDrillsRes.data?.data?.length || 0;
                
                // Get incidents
                const incidentsRes = await api.get('/incidents', {
                    params: {
                        per_page: 1,
                    }
                });
                const incidentsCount = incidentsRes.data?.meta?.total || incidentsRes.data?.total || incidentsRes.data?.data?.length || 0;
                
                // Get staff stats
                const staffRes = await api.get('/charts/staff').catch(() => ({ data: { total_staff: 0 } }));
                const staffCount = staffRes.data?.total_staff || 0;
                
                // Get billing/expenses stats
                const billingRes = await api.get('/billing/expenses', {
                    params: {
                        per_page: 1,
                    }
                }).catch(() => ({ data: { meta: { total: 0 } } }));
                const billingCount = billingRes.data?.meta?.total || billingRes.data?.total || billingRes.data?.data?.length || 0;
                
                // Get pharmacy inventory stats
                const pharmacyRes = await api.get('/pharmacy-inventory', {
                    params: {
                        per_page: 1,
                    }
                }).catch(() => ({ data: { meta: { total: 0 } } }));
                const pharmacyCount = pharmacyRes.data?.meta?.total || pharmacyRes.data?.total || pharmacyRes.data?.data?.length || 0;
                
                return {
                    appointments: appointmentsCount,
                    vitals: vitalsCount,
                    residents: residentsCount,
                    assessments: assessmentsCount,
                    sleep: sleepCount,
                    housekeeping: housekeepingCount,
                    grocery: groceryCount,
                    fireDrills: fireDrillsCount,
                    incidents: incidentsCount,
                    staff: staffCount,
                    billing: billingCount,
                    pharmacy: pharmacyCount,
                };
            } catch (error) {
                logger.error('Error fetching monthly stats:', error);
                return {
                    appointments: 0,
                    vitals: 0,
                    residents: 0,
                    assessments: 0,
                    sleep: 0,
                    housekeeping: 0,
                    grocery: 0,
                    fireDrills: 0,
                    incidents: 0,
                    staff: 0,
                    billing: 0,
                    pharmacy: 0,
                };
            }
        },
    });

    const reportCategories = [
        {
            title: 'Analytics Dashboard',
            description: 'Unified view of all module metrics and trends',
            icon: TrendingUp,
            link: '/reports/analytics',
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            featured: true,
        },
        {
            title: 'Clinical Reports',
            description: 'Vitals, Medications, Appointments, Assessments, Sleep',
            reports: [
                {
                    title: 'Vitals Charts',
                    description: 'Vital signs analytics and trends',
                    icon: Activity,
                    link: '/reports/vitals-charts',
                    value: statsData?.vitals || 0,
                    gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-dark)]',
                    iconBg: 'bg-[var(--theme-secondary-bg-light)]',
                    iconColor: 'text-[var(--theme-secondary)]',
                },
                {
                    title: 'Vitals Reports',
                    description: 'Historical vital signs data',
                    icon: History,
                    link: '/reports/vitals-reports',
                    value: statsData?.vitals || 0,
                    gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-dark)]',
                    iconBg: 'bg-[var(--theme-secondary-bg-light)]',
                    iconColor: 'text-[var(--theme-secondary)]',
                },
                {
                    title: 'Vitals History',
                    description: 'Complete vital signs history',
                    icon: Clock,
                    link: '/reports/vitals-history',
                    value: statsData?.vitals || 0,
                    gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-dark)]',
                    iconBg: 'bg-[var(--theme-secondary-bg-light)]',
                    iconColor: 'text-[var(--theme-secondary)]',
                },
                {
                    title: 'Assessment Charts',
                    description: 'Assessment completion and trends',
                    icon: Brain,
                    link: '/reports/assessment-charts',
                    value: statsData?.assessments || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Appointments Charts',
                    description: 'Appointment scheduling analytics',
                    icon: Calendar,
                    link: '/reports/appointments-charts',
                    value: statsData?.appointments || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Sleep Charts',
                    description: 'Sleep patterns and quality analysis',
                    icon: Moon,
                    link: '/reports/sleep-charts',
                    value: statsData?.sleep || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
            ],
        },
        {
            title: 'Operations Reports',
            description: 'Housekeeping, Grocery Status, Fire Drills, Incidents',
            reports: [
                {
                    title: 'Housekeeping Reports',
                    description: 'Task completion and schedules',
                    icon: Sparkles,
                    link: '/housekeeping',
                    value: statsData?.housekeeping || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Grocery Status',
                    description: 'Grocery inventory and status updates',
                    icon: ShoppingCart,
                    link: '/grocery-status',
                    value: statsData?.grocery || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Fire Drills',
                    description: 'Fire drill schedules and completion',
                    icon: Flame,
                    link: '/fire-drills',
                    value: statsData?.fireDrills || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Incidents',
                    description: 'Incident reports and tracking',
                    icon: AlertTriangle,
                    link: '/incidents',
                    value: statsData?.incidents || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
            ],
        },
        {
            title: 'Administrative Reports',
            description: 'Pharmacy, Billing, Staff, Residents',
            reports: [
                {
                    title: 'Chart Reports',
                    description: 'Overview of all chart data',
                    icon: BarChart3,
                    link: '/reports/charts',
                    value: statsData?.residents || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Resident Charts',
                    description: 'Resident demographics and statistics',
                    icon: Users,
                    link: '/reports/resident-charts',
                    value: statsData?.residents || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Staff Charts',
                    description: 'Staff performance and statistics',
                    icon: UserCheck,
                    link: '/reports/staff-charts',
                    value: statsData?.staff || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Billing Reports',
                    description: 'Expenses and invoice analytics',
                    icon: DollarSign,
                    link: '/billing/reports',
                    value: statsData?.billing || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
                {
                    title: 'Pharmacy Reports',
                    description: 'Inventory and medication tracking',
                    icon: Building2,
                    link: '/pharmacy/inventory',
                    value: statsData?.pharmacy || 0,
                    gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
                    iconBg: 'bg-[var(--theme-primary-bg-light)]',
                    iconColor: 'text-[var(--theme-primary)]',
                },
            ],
        },
    ];

    return (
        <PrintableReportLayout title="Reports">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                    <div className="flex justify-end mb-4">
                        <ReportPrintButton />
                    </div>

                    {/* Featured Analytics Dashboard */}
                {reportCategories[0] && (
                    <div className="mb-6">
                        <div
                            onClick={() => navigate(reportCategories[0].link)}
                            className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${reportCategories[0].gradient}`}></div>
                            <div className="p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`${reportCategories[0].iconBg} p-3 rounded-lg flex-shrink-0`}>
                                            <TrendingUp className={`w-6 h-6 ${reportCategories[0].iconColor}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-lg font-bold text-gray-900">{reportCategories[0].title}</h2>
                                            <p className="text-sm text-gray-600 mt-0.5">{reportCategories[0].description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(reportCategories[0].link);
                                        }}
                                        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--theme-primary-hover)] transition-all shadow-sm hover:shadow-md"
                                    >
                                        <span>View Dashboard</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Categories */}
                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--theme-primary)] border-t-transparent"></div>
                        <p className="mt-6 text-gray-600 text-lg font-medium">Loading statistics...</p>
                    </div>
                ) : (
                    reportCategories.slice(1).map((category, categoryIndex) => (
                        <div key={categoryIndex} className="mb-8">
                            <div className="mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{category.title}</h2>
                                <p className="text-gray-600">{category.description}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {category.reports.map((report, index) => {
                                    const Icon = report.icon;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => navigate(report.link)}
                                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-transparent active:scale-[0.98]"
                                        >
                                            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${report.gradient}`}></div>
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 truncate">
                                                            {report.title}
                                                        </p>
                                                        <div className="flex items-baseline space-x-2 mb-3">
                                                            <p className="text-3xl md:text-4xl font-bold text-gray-900">
                                                                {report.value.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        {report.description && (
                                                            <p className="text-gray-500 text-sm flex items-center">
                                                                <Clock className="w-4 h-4 mr-1.5" />
                                                                {report.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`${report.iconBg} p-3 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0 ml-4`}>
                                                        <Icon className={`w-7 h-7 ${report.iconColor}`} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center text-[var(--theme-primary)] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 mt-4 pt-4 border-t border-gray-100">
                                                    <span>View details</span>
                                                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
        </PrintableReportLayout>
    );
}
