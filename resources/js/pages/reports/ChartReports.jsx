import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { TrendingUp, Users, Activity, Calendar } from 'lucide-react';

export default function ChartReports() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['chart-overview'],
        queryFn: async () => {
            const [residents, vitals, appointments, sleep] = await Promise.all([
                api.get('/charts/residents').then(r => r.data),
                api.get('/charts/vitals').then(r => r.data),
                api.get('/charts/appointments').then(r => r.data),
                api.get('/charts/sleep').then(r => r.data),
            ]);
            return { residents, vitals, appointments, sleep };
        },
    });

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                <p className="mt-4 text-gray-600">Loading chart reports...</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Chart Reports</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Residents</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.residents?.total_residents || 0}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <Users className="w-6 h-6 text-[#2D5016]" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Vitals Records</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.vitals?.total_vitals || 0}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <Activity className="w-6 h-6 text-[#2D5016]" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Appointments</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.appointments?.total_appointments || 0}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <Calendar className="w-6 h-6 text-[#2D5016]" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Avg Sleep Hours</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {stats?.sleep?.avg_sleep_hours ? parseFloat(stats.sleep.avg_sleep_hours).toFixed(1) : '0.0'}h
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-[#8B4513]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats?.residents?.by_branch && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Residents by Branch</h2>
                        <div className="h-64">
                            <Bar
                                data={{
                                    labels: stats.residents.by_branch.map(b => b.branch_name),
                                    datasets: [{
                                        label: 'Residents',
                                        data: stats.residents.by_branch.map(b => b.count),
                                        backgroundColor: colors.primary,
                                    }],
                                }}
                                options={defaultOptions}
                            />
                        </div>
                    </div>
                )}

                {stats?.vitals?.trends && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Vitals Trends (Last 7 Days)</h2>
                        <div className="h-64">
                            <Line
                                data={{
                                    labels: stats.vitals.trends.map(t => t.date),
                                    datasets: [{
                                        label: 'Vitals Count',
                                        data: stats.vitals.trends.map(t => t.count),
                                        borderColor: colors.info,
                                        backgroundColor: colors.info + '20',
                                        fill: true,
                                    }],
                                }}
                                options={defaultOptions}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
