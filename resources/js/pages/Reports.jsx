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
    ArrowRight
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
                        per_page: 1000, // Get enough to count
                        date_filter: 'all', // Get all, then filter by date range
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
                
                // Get assessments for the month (need to filter manually as API may not support date filtering)
                const assessmentsRes = await api.get('/assessments', {
                    params: {
                        per_page: 1000,
                    }
                });
                const assessmentsCount = assessmentsRes.data?.data?.filter(assessment => {
                    const assessDate = new Date(assessment.created_at || assessment.assessment_date || assessment.date);
                    return assessDate >= startOfMonth && assessDate <= endOfMonth;
                }).length || 0;
                
                return {
                    appointments: appointmentsCount,
                    vitals: vitalsCount,
                    residents: residentsCount,
                    assessments: assessmentsCount,
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

    const chartPages = [
        {
            title: 'Chart Reports',
            description: 'This Month',
            icon: BarChart3,
            link: '/reports/charts',
            value: statsData?.residents || 0
        },
        {
            title: 'Resident Charts',
            description: 'This Month',
            icon: Users,
            link: '/reports/resident-charts',
            value: statsData?.residents || 0
        },
        {
            title: 'Vitals Charts',
            description: 'This Month',
            icon: Activity,
            link: '/reports/vitals-charts',
            value: statsData?.vitals || 0
        },
        {
            title: 'Vitals Reports',
            description: 'This Month',
            icon: History,
            link: '/reports/vitals-reports',
            value: statsData?.vitals || 0
        },
        {
            title: 'Assessment Charts',
            description: 'This Month',
            icon: Brain,
            link: '/reports/assessment-charts',
            value: statsData?.assessments || 0
        },
        {
            title: 'Appointments Charts',
            description: 'This Month',
            icon: Calendar,
            link: '/reports/appointments-charts',
            value: statsData?.appointments || 0
        },
        {
            title: 'Vitals History',
            description: 'This Month',
            icon: Clock,
            link: '/reports/vitals-history',
            value: statsData?.vitals || 0
        },
        {
            title: 'Sleep Charts',
            description: 'This Month',
            icon: Moon,
            link: '/reports/sleep-charts',
            value: 0
        },
        {
            title: 'Staff Charts',
            description: 'This Month',
            icon: UserCheck,
            link: '/reports/staff-charts',
            value: 0
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] to-[#E6E6D4]">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#2D5016] mb-2">Chart Reports</h1>
                    <p className="text-gray-600">Access and view detailed analytics across all report categories</p>
                </div>

                {/* Chart Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                            <p className="mt-4 text-gray-600">Loading statistics...</p>
                        </div>
                    ) : (
                        chartPages.map((page, index) => {
                            const Icon = page.icon;
                            return (
                                <div
                                    key={index}
                                    onClick={() => navigate(page.link)}
                                    className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100"
                                >
                                    {/* Gradient decoration */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2D5016] to-[#4a7a2a]"></div>
                                    
                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <p className="text-[#8B4513] text-sm font-semibold uppercase tracking-wide mb-1">
                                                    {page.title}
                                                </p>
                                                <div className="flex items-baseline space-x-2">
                                                    <p className="text-4xl font-bold text-[#2D5016]">
                                                        {page.value}
                                                    </p>
                                                </div>
                                                {page.description && (
                                                    <p className="text-gray-500 text-xs mt-2 flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {page.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                <Icon className="w-6 h-6 text-[#2D5016]" />
                                            </div>
                                        </div>
                                        
                                        {/* Hover effect */}
                                        <div className="flex items-center text-[#2D5016] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span>View details</span>
                                            <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
