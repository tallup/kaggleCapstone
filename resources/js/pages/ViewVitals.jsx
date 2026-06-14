import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltipPlugin,
    Legend,
    Filler
} from 'chart.js';
import { Download, Plus, MoreVertical, Calendar, User, Building2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import logger from '../utils/logger';
import { useToastContext } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Tooltip from '../components/ui/Tooltip';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../utils/headerResidentSwitcher';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltipPlugin,
    Legend,
    Filler
);

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function ViewVitals() {
    const toast = useToastContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [branchId, setBranchId] = useState('');
    const [residentId, setResidentId] = useState('');
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [approveConfirmId, setApproveConfirmId] = useState(null);
    const menuRefs = useRef({});

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            if (response?.data && typeof response.data === 'object') {
                if (response.data.user) {
                    return response.data.user;
                }
                if (response.data.data) {
                    return response.data.data;
                }
                return response.data;
            }
            return null;
        },
        staleTime: 5 * 60 * 1000,
    });

    const isCaregiver = React.useMemo(() => {
        if (!currentUser) {
            return false;
        }

        const truthyValues = [
            currentUser.is_caregiver,
            currentUser.isCaregiver,
            currentUser.caregiver,
            currentUser.is_care_giver,
        ];

        const normalizeToBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value === 1;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                return ['1', 'true', 'yes', 'y', 'caregiver', 'care_giver'].includes(normalized);
            }
            return false;
        };

        if (truthyValues.some(normalizeToBoolean)) {
            return true;
        }

        const candidateValues = [];
        const collectCandidate = (value) => {
            if (value !== null && value !== undefined && value !== '') {
                candidateValues.push(String(value));
            }
        };

        collectCandidate(currentUser.role);
        collectCandidate(currentUser.position);
        collectCandidate(currentUser.primary_role);
        collectCandidate(currentUser.job_title);
        collectCandidate(currentUser.primaryRole);
        collectCandidate(currentUser.title);

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                    if (roleItem?.pivot?.role_name) {
                        collectCandidate(roleItem.pivot.role_name);
                    }
                }
            });
        } else if (roles?.data && Array.isArray(roles.data)) {
            roles.data.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                    if (roleItem?.pivot?.role_name) {
                        collectCandidate(roleItem.pivot.role_name);
                    }
                }
            });
        }

        return candidateValues.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) {
                return false;
            }
            const normalized = lower.replace(/[\s_-]/g, '');
            if (normalized === 'caregiver') {
                return true;
            }
            return lower.includes('care') && lower.includes('giver');
        });
    }, [currentUser]);

    const caregiverBranchId = React.useMemo(() => {
        if (!isCaregiver) {
            return '';
        }

        const assignedId = currentUser?.assigned_branch_id;
        return assignedId ? String(assignedId) : '';
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    useEffect(() => {
        if (!isCaregiver) {
            return;
        }

        if (caregiverBranchId && branchId !== caregiverBranchId) {
            setBranchId(caregiverBranchId);
            setResidentId('');
            setCurrentPage(1);
        }

        if (!caregiverBranchId && branchId !== '') {
            setBranchId('');
            setResidentId('');
            setCurrentPage(1);
        }
    }, [isCaregiver, caregiverBranchId, branchId]);

    useEffect(() => {
        const b = searchParams.get('branch') || '';
        const rid =
            searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || searchParams.get('resident_id') || '';
        if (b) setBranchId(b);
        if (rid) setResidentId(rid);
    }, [searchParams]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return branches.filter(b => b.is_active !== false);
        },
    });

    const branchOptions = React.useMemo(() => {
        if (!branchesData) {
            return [];
        }
        if (Array.isArray(branchesData)) {
            return branchesData;
        }
        if (Array.isArray(branchesData?.data)) {
            return branchesData.data;
        }
        return [];
    }, [branchesData]);

    const filteredBranchOptions = React.useMemo(() => {
        if (!isCaregiver) {
            return branchOptions;
        }

        if (caregiverBranchId) {
            return branchOptions.filter((branch) => String(branch.id) === String(caregiverBranchId));
        }

        return branchOptions;
    }, [branchOptions, isCaregiver, caregiverBranchId]);

    const caregiverBranchName = React.useMemo(() => {
        if (!isCaregiver || !caregiverBranchId) {
            return '';
        }

        const matchingBranch = branchOptions.find(
            (branch) => String(branch.id) === String(caregiverBranchId)
        );

        if (matchingBranch) {
            return matchingBranch.name;
        }

        if (currentUser?.assigned_branch?.name) {
            return currentUser.assigned_branch.name;
        }

        if (currentUser?.assigned_branch_name) {
            return currentUser.assigned_branch_name;
        }

        return '';
    }, [isCaregiver, caregiverBranchId, branchOptions, currentUser]);

    // Fetch residents filtered by branch
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', branchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchId) {
                params.branch_id = branchId;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
    });

    // Calculate date range for selected month/year
    const startDate = useMemo(() => {
        const date = new Date(year, month - 1, 1);
        return date.toISOString().split('T')[0];
    }, [year, month]);
    
    const endDate = useMemo(() => {
        const date = new Date(year, month, 0); // Last day of selected month
        return date.toISOString().split('T')[0];
    }, [year, month]);

    // Mutation to update vital status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const response = await api.put(`/vitals/${id}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['vitals-view']);
            setOpenMenuId(null);
        },
        onError: (error) => {
            logger.error('Failed to update vital status:', error);
            toast.error('Error', 'Failed to update vital status. Please try again.');
        },
    });

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openMenuId && menuRefs.current[openMenuId]) {
                const menuElement = menuRefs.current[openMenuId];
                if (menuElement && !menuElement.contains(event.target)) {
                    setOpenMenuId(null);
                }
            }
        };
        
        if (openMenuId) {
            // Use a small delay to avoid closing immediately when opening
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('touchstart', handleClickOutside);
            }, 10);
            
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }
    }, [openMenuId]);

    const handleApproveConfirm = () => {
        if (approveConfirmId == null) return;
        const id = approveConfirmId;
        updateStatusMutation.mutate(
            { id, status: 'approved' },
            { onSuccess: () => setApproveConfirmId(null) }
        );
    };

    // Fetch vitals data
    const { data: vitalsData, isLoading, error, refetch } = useQuery({
        queryKey: ['vitals-view', branchId, residentId, startDate, endDate, currentPage, perPage],
        queryFn: async () => {
            const params = {
                per_page: perPage,
                page: currentPage,
                date_from: startDate,
                date_to: endDate,
            };
            
            if (residentId) {
                params.resident_id = residentId;
            }
            // Note: branch_id is not a valid API parameter - branch filtering is done server-side based on user's facility/branch

            try {
                const response = await api.get('/vitals', { params });
                return response.data;
            } catch (err) {
                logger.error('Error fetching vitals:', err);
                logger.error('Error response:', err.response?.data);
                throw err;
            }
        },
        enabled: true,
        retry: false,
    });

    // Prepare chart data
    const chartData = React.useMemo(() => {
        if (!vitalsData?.data || vitalsData.data.length === 0) {
            return null;
        }

        // Sort by date for chart
        const sortedVitals = [...vitalsData.data].sort((a, b) => {
            return new Date(a.measurement_date) - new Date(b.measurement_date);
        });

        const labels = sortedVitals.map(v => {
            const date = new Date(v.measurement_date);
            return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Systolic',
                    data: sortedVitals.map(v => v.systolic),
                    borderColor: 'rgb(139, 92, 246)', // Purple/violet instead of blue-based purple
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Diastolic',
                    data: sortedVitals.map(v => v.diastolic),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Temperature',
                    data: sortedVitals.map(v => v.temperature),
                    borderColor: 'rgb(249, 115, 22)',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Pulse',
                    data: sortedVitals.map(v => v.pulse),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Oxygen Saturation',
                    data: sortedVitals.map(v => v.oxygen_saturation),
                    borderColor: 'rgb(16, 185, 129)', // Emerald green instead of blue/teal
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
            ],
        };
    }, [vitalsData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        backgroundColor: 'transparent', // Ensure no background color
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                    },
                    color: '#000000', // Black text for legend
                    boxWidth: 12,
                    boxHeight: 12,
                },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#000000',
                bodyColor: '#000000',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    labelColor: function(context) {
                        return {
                            borderColor: context.dataset.borderColor,
                            backgroundColor: context.dataset.borderColor,
                        };
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                min: 20,
                max: 200,
                ticks: {
                    stepSize: 30,
                    color: '#6b7280', // Gray ticks
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                backgroundColor: 'transparent',
            },
            x: {
                ticks: {
                    color: '#6b7280', // Gray ticks
                },
                grid: {
                    display: false,
                },
                backgroundColor: 'transparent',
            },
        },
        elements: {
            point: {
                backgroundColor: function(context) {
                    return context.dataset.borderColor;
                },
                borderColor: function(context) {
                    return context.dataset.borderColor;
                },
            },
        },
    };

    // Handle download vitals
    const handleDownload = () => {
        if (!vitalsData?.data || vitalsData.data.length === 0) {
            toast.warning('No data', 'No vitals data available to download');
            return;
        }

        const selectedResident = residentsData?.data?.find((r) => r.id == residentId);
        const residentDisplayName = selectedResident
            ? `${selectedResident.first_name || ''} ${selectedResident.last_name || ''}`.trim() || 'Unknown'
            : residentId
                ? `Resident #${residentId}`
                : 'All Residents';

        const residentFileName = residentDisplayName.replace(/\s+/g, '_');
        const branchDisplayName =
            selectedResident?.branch?.name ||
            filteredBranchOptions.find((b) => String(b.id) === String(branchId))?.name ||
            caregiverBranchName ||
            (branchId ? `Branch #${branchId}` : 'All Branches');

        let dateOfBirth = 'N/A';
        if (selectedResident?.date_of_birth) {
            const dobDate = new Date(selectedResident.date_of_birth);
            if (!isNaN(dobDate.getTime())) {
                dateOfBirth = dobDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                });
            }
        }

        const fileName = `vitals_${residentFileName}_${months[month - 1]}_${year}.csv`;
        const generatedAt = new Date().toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });

        const headers = [
            'Date',
            'Blood Pressure',
            'Temperature',
            'Pulse',
            'Oxygen Saturation',
            'Pain',
            'Vital Status',
            'Notes',
        ];
        const rows = vitalsData.data.map(v => {
            const date = new Date(v.measurement_date);
            return [
                date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
                v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '-',
                v.temperature ? `${v.temperature}°F` : '-',
                v.pulse || '-',
                v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-',
                v.pain_level || '-',
                v.status || 'approved',
                v.notes || '-',
            ];
        });

        // Create CSV content
        const patientDetails = [
            ['Resident Name', residentDisplayName],
            ['Date of Birth', dateOfBirth],
            ['Gender', selectedResident?.gender || 'N/A'],
            ['Branch', branchDisplayName || 'N/A'],
            ['Report Month', `${months[month - 1]} ${year}`],
            ['Generated On', generatedAt],
        ];

        let csvContent = '';
        patientDetails.forEach((row) => {
            csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
        });
        csvContent += '\n';
        csvContent += headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle new vitals
    const handleNewVitals = () => {
        navigate('/vitals');
    };

    const totalPages = vitalsData?.last_page || 1;

    return (
        <>
            <ConfirmDialog
                isOpen={approveConfirmId != null}
                onClose={() => !updateStatusMutation.isPending && setApproveConfirmId(null)}
                onConfirm={handleApproveConfirm}
                title="Approve this vital sign?"
                description="This will mark the reading as approved."
                confirmLabel="Approve"
                cancelLabel="Cancel"
                variant="primary"
                isPending={updateStatusMutation.isPending}
            />
        <div className="min-h-screen bg-gray-50">
            <div className="p-6">
                {/* Filters Section */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <div className="relative">
                                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                {isCaregiver ? (
                                    <div className="w-full pl-9 pr-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 min-h-[40px] flex items-center">
                                        <span>
                                            {caregiverBranchName || 'No branch assigned'}
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        value={branchId}
                                        onChange={(e) => {
                                            setBranchId(e.target.value);
                                            setResidentId(''); // Reset resident when branch changes
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none"
                                    >
                                        <option value="">All Branches</option>
                                        {filteredBranchOptions.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={residentId}
                                    onChange={(e) => {
                                        setResidentId(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none"
                                >
                                    <option value="">Select a Resident</option>
                                    {residentsData?.data?.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.first_name} {r.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <button 
                                onClick={() => {
                                                    refetch();
                                }}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors mt-6"
                            >
                                Apply Filters
                            </button>
                        </div>

                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={month}
                                    onChange={(e) => {
                                        setMonth(parseInt(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none"
                                >
                                    {months.map((m, idx) => (
                                        <option key={idx + 1} value={idx + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={year}
                                    onChange={(e) => {
                                        setYear(parseInt(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6" style={{ backgroundColor: '#ffffff' }}>
                    <div className="h-96" style={{ backgroundColor: '#ffffff' }}>
                {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-600 text-sm text-center px-4">
                                {error.message || 'Unable to load vitals data.'}
                            </div>
                        ) : chartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No vitals data available for the selected period
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 mb-6">
                    <button
                        onClick={handleDownload}
                        disabled={!vitalsData?.data || vitalsData.data.length === 0}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Download Vitals
                    </button>
                    <button
                        onClick={handleNewVitals}
                        className="px-6 py-2 bg-white text-[var(--theme-primary)] border-2 border-[var(--theme-primary)] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Vitals
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="overflow-x-auto" style={{ position: 'relative' }}>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Blood Pressure</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Temperature</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Pulse</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Oxygen Saturation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Pain</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Vital Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-primary)] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                                            </div>
                                        </td>
                                    </tr>
                                        ) : error ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center text-red-600 text-sm">
                                                    {error.message || 'Unable to load vitals data.'}
                                                </td>
                                            </tr>
                                        ) : vitalsData?.data && vitalsData.data.length > 0 ? (
                                            vitalsData.data.map((vital) => {
                                                const date = new Date(vital.measurement_date);
                                                return (
                                                    <tr key={vital.id} className="hover:bg-gray-50" style={{ position: 'relative', zIndex: openMenuId === vital.id ? 10 : 1 }}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {vital.systolic && vital.diastolic ? `${vital.systolic}/${vital.diastolic}` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {vital.temperature ? `${vital.temperature}°F` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {vital.pulse || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {vital.pain_level || '-'}
                                                        </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        vital.status === 'approved' ? 'bg-green-900 text-green-300' :
                                                        vital.status === 'critical' ? 'bg-red-900 text-red-300' :
                                                        vital.status === 'pending_review' ? 'bg-yellow-900 text-yellow-300' :
                                                        'bg-gray-700 text-gray-300'
                                                    }`}>
                                                        {vital.status || 'approved'}
                                                    </span>
                                                </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            <div className="relative" ref={(el) => (menuRefs.current[vital.id] = el)}>
                                                                <Tooltip content="Actions" position="left">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setOpenMenuId(openMenuId === vital.id ? null : vital.id);
                                                                        }}
                                                                        className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                                                                        aria-label="Row actions"
                                                                    >
                                                                        <MoreVertical className="w-5 h-5" strokeWidth={2.25} />
                                                                    </button>
                                                                </Tooltip>
                                                                {openMenuId === vital.id && (
                                                                    <>
                                                                        {/* Backdrop to close menu when clicking outside */}
                                                                        <div
                                                                            className="fixed inset-0 z-[190]"
                                                                            onClick={() => setOpenMenuId(null)}
                                                                            aria-hidden
                                                                        />
                                                                        <div className="absolute right-0 z-[191] mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-xl">
                                                                            <div className="py-1">
                                                                                {vital.status === 'pending_review' && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            setApproveConfirmId(vital.id);
                                                                                            setOpenMenuId(null);
                                                                                        }}
                                                                                        disabled={updateStatusMutation.isPending}
                                                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                                                        Approve
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                                    No vitals data found for the selected period
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {vitalsData && totalPages > 1 && !error && (
                                <div className="bg-gray-50 px-6 py-4 flex items-center justify-center gap-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="text-gray-700">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                </div>
            </div>
        </div>
        </>
    );
}

