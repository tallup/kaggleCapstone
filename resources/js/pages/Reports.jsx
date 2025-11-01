import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { FileText, Calendar, Download, TrendingUp } from 'lucide-react';

export default function Reports() {
    const [reportType, setReportType] = useState('overview');
    const [dateRange, setDateRange] = useState('week');

    // Fetch different data based on report type
    const { data: appointments } = useQuery({
        queryKey: ['appointments-report', dateRange],
        queryFn: async () => {
            const response = await api.get('/appointments', {
                params: { per_page: 100, date_filter: dateRange === 'week' ? 'upcoming' : 'all' },
            });
            return response.data;
        },
        enabled: reportType === 'appointments' || reportType === 'overview',
    });

    const { data: vitals } = useQuery({
        queryKey: ['vitals-report', dateRange],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (dateRange === 'week') {
                params.date_from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            }
            const response = await api.get('/vitals', { params });
            return response.data;
        },
        enabled: reportType === 'vitals' || reportType === 'overview',
    });

    const { data: residents } = useQuery({
        queryKey: ['residents-report'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 100 } });
            return response.data;
        },
        enabled: reportType === 'residents' || reportType === 'overview',
    });

    const stats = {
        totalAppointments: appointments?.data?.length || 0,
        totalVitals: vitals?.data?.length || 0,
        totalResidents: residents?.data?.length || 0,
        completedAppointments: appointments?.data?.filter(a => a.status === 'completed')?.length || 0,
        scheduledAppointments: appointments?.data?.filter(a => a.status === 'scheduled')?.length || 0,
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Reports</h1>
            
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Management</h2>
                <p className="text-gray-600 mb-6">Generate and view various reports.</p>
                
                <div className="flex flex-wrap gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type:</label>
                        <div className="flex space-x-2">
                            {['overview', 'appointments', 'vitals', 'residents'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setReportType(type)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        reportType === type
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
                        <div className="flex space-x-2">
                            {['week', 'month', 'all'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        dateRange === range
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Report */}
            {reportType === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Residents</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalResidents}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <FileText className="w-6 h-6 text-[#2D5016]" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Appointments</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAppointments}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Scheduled</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.scheduledAppointments}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Vital Signs</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVitals}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Completed Appointments</span>
                                <span className="font-semibold text-gray-900">{stats.completedAppointments}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Completion Rate</span>
                                <span className="font-semibold text-gray-900">
                                    {stats.totalAppointments > 0
                                        ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                                        : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Reports */}
            {reportType !== 'overview' && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                        {reportType} Report - {dateRange}
                    </h3>
                    <p className="text-gray-600">
                        Detailed {reportType} report for the selected period.
                    </p>
                    <button className="mt-4 px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            )}
        </div>
    );
}
