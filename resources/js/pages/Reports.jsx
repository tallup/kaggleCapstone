import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
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
                
                return {
                    appointments: appointmentsCount,
                    vitals: vitalsCount,
                    residents: residentsCount,
                    assessments: assessmentsCount,
                    sleep: sleepCount,
                };
            } catch (error) {
                console.error('Error fetching monthly stats:', error);
                return {
                    appointments: 0,
                    vitals: 0,
                    residents: 0,
                    assessments: 0,
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
                    gradient: 'from-red-500 to-red-600',
                    iconBg: 'bg-red-50',
                    iconColor: 'text-red-600',
                },
                {
                    title: 'Vitals Reports',
                    description: 'Historical vital signs data',
                    icon: History,
                    link: '/reports/vitals-reports',
                    value: statsData?.vitals || 0,
                    gradient: 'from-orange-500 to-orange-600',
                    iconBg: 'bg-orange-50',
                    iconColor: 'text-orange-600',
                },
                {
                    title: 'Vitals History',
                    description: 'Complete vital signs history',
                    icon: Clock,
                    link: '/reports/vitals-history',
                    value: statsData?.vitals || 0,
                    gradient: 'from-teal-500 to-teal-600',
                    iconBg: 'bg-teal-50',
                    iconColor: 'text-teal-600',
                },
                {
                    title: 'Assessment Charts',
                    description: 'Assessment completion and trends',
                    icon: Brain,
                    link: '/reports/assessment-charts',
                    value: statsData?.assessments || 0,
                    gradient: 'from-indigo-500 to-indigo-600',
                    iconBg: 'bg-indigo-50',
                    iconColor: 'text-indigo-600',
                },
                {
                    title: 'Appointments Charts',
                    description: 'Appointment scheduling analytics',
                    icon: Calendar,
                    link: '/reports/appointments-charts',
                    value: statsData?.appointments || 0,
                    gradient: 'from-green-500 to-green-600',
                    iconBg: 'bg-green-50',
                    iconColor: 'text-green-600',
                },
                {
                    title: 'Sleep Charts',
                    description: 'Sleep patterns and quality analysis',
                    icon: Moon,
                    link: '/reports/sleep-charts',
                    value: statsData?.sleep || 0,
                    gradient: 'from-slate-500 to-slate-600',
                    iconBg: 'bg-slate-50',
                    iconColor: 'text-slate-600',
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
                    value: 0,
                    gradient: 'from-purple-500 to-purple-600',
                    iconBg: 'bg-purple-50',
                    iconColor: 'text-purple-600',
                },
                {
                    title: 'Grocery Status',
                    description: 'Grocery inventory and status updates',
                    icon: ShoppingCart,
                    link: '/grocery-status',
                    value: 0,
                    gradient: 'from-teal-500 to-teal-600',
                    iconBg: 'bg-teal-50',
                    iconColor: 'text-teal-600',
                },
                {
                    title: 'Fire Drills',
                    description: 'Fire drill schedules and completion',
                    icon: Flame,
                    link: '/fire-drills',
                    value: 0,
                    gradient: 'from-orange-500 to-orange-600',
                    iconBg: 'bg-orange-50',
                    iconColor: 'text-orange-600',
                },
                {
                    title: 'Incidents',
                    description: 'Incident reports and tracking',
                    icon: AlertTriangle,
                    link: '/incidents',
                    value: 0,
                    gradient: 'from-rose-500 to-rose-600',
                    iconBg: 'bg-rose-50',
                    iconColor: 'text-rose-600',
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
                    gradient: 'from-blue-500 to-blue-600',
                    iconBg: 'bg-blue-50',
                    iconColor: 'text-blue-600',
                },
                {
                    title: 'Resident Charts',
                    description: 'Resident demographics and statistics',
                    icon: Users,
                    link: '/reports/resident-charts',
                    value: statsData?.residents || 0,
                    gradient: 'from-purple-500 to-purple-600',
                    iconBg: 'bg-purple-50',
                    iconColor: 'text-purple-600',
                },
                {
                    title: 'Staff Charts',
                    description: 'Staff performance and statistics',
                    icon: UserCheck,
                    link: '/reports/staff-charts',
                    value: 0,
                    gradient: 'from-pink-500 to-pink-600',
                    iconBg: 'bg-pink-50',
                    iconColor: 'text-pink-600',
                },
                {
                    title: 'Billing Reports',
                    description: 'Expenses and invoice analytics',
                    icon: DollarSign,
                    link: '/billing/reports',
                    value: 0,
                    gradient: 'from-emerald-500 to-emerald-600',
                    iconBg: 'bg-emerald-50',
                    iconColor: 'text-emerald-600',
                },
                {
                    title: 'Pharmacy Reports',
                    description: 'Inventory and medication tracking',
                    icon: Building2,
                    link: '/pharmacy/inventory',
                    value: 0,
                    gradient: 'from-cyan-500 to-cyan-600',
                    iconBg: 'bg-cyan-50',
                    iconColor: 'text-cyan-600',
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">

                {/* Featured Analytics Dashboard */}
                {reportCategories[0] && (
                    <div className="mb-8">
                        <div
                            onClick={() => navigate(reportCategories[0].link)}
                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border-2 border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${reportCategories[0].gradient}`}></div>
                            <div className="p-8">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`${reportCategories[0].iconBg} p-4 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                                <TrendingUp className={`w-8 h-8 ${reportCategories[0].iconColor}`} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{reportCategories[0].title}</h2>
                                                <p className="text-gray-600 mt-1">{reportCategories[0].description}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-4">
                                            Get a unified view of all your facility metrics, trends, and analytics in one comprehensive dashboard.
                                        </p>
                                    </div>
                                    <div className="flex items-center text-[var(--theme-primary)] text-lg font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 ml-6">
                                        <span>View Dashboard</span>
                                        <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
                                    </div>
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
    );
}
