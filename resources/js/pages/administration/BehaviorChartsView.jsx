import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ResidentChartModal from '../../components/residents/ResidentChartModal';
import {
    ClipboardList,
    Filter,
    Eye,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    FileText,
    Download,
    RefreshCw,
    X,
    AlertCircle,
    Edit,
    CheckCircle,
    MoreVertical
} from 'lucide-react';
import { formatPacificDate } from '../../utils/pacificTime';
import logger from '../../utils/logger';
import Tooltip from '../../components/ui/Tooltip';
import Modal from '../../components/ui/Modal';

export default function BehaviorChartsView() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [branchId, setBranchId] = useState(null);
    const [residentId, setResidentId] = useState(null);
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return String(now.getMonth() + 1).padStart(2, '0');
    });
    const [year, setYear] = useState(() => {
        return new Date().getFullYear().toString();
    });
    const [branches, setBranches] = useState([]);
    const [residents, setResidents] = useState([]);
    const [selectedChart, setSelectedChart] = useState(null);
    const [reviewChart, setReviewChart] = useState(null);
    const [editingChart, setEditingChart] = useState(null);
    const [reviewStatus, setReviewStatus] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRefs = React.useRef({});

    // Fetch branches and residents
    React.useEffect(() => {
        api.get('/branches', { params: { per_page: 100 } })
            .then(res => setBranches(res.data?.data || []))
            .catch(() => { });
    }, []);

    React.useEffect(() => {
        if (branchId) {
            api.get('/residents', { params: { per_page: 100, branch_id: branchId, is_active: 1 } })
                .then(res => setResidents(res.data?.data || []))
                .catch(() => { });
        } else {
            setResidents([]);
            setResidentId(null);
        }
    }, [branchId]);

    // Fetch behavior charts
    const { data: chartsData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['behavior-charts', branchId, residentId, month, year],
        queryFn: async () => {
            const params = {
                per_page: 50,
                month: month,
                year: year,
            };
            if (branchId) params.branch_id = branchId;
            if (residentId) params.resident_id = residentId;
            const response = await api.get('/resident-charts', { params });
            return response.data;
        },
        enabled: !!(branchId && residentId), // Only fetch when both filters are selected
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnMount: true, // Refetch when component mounts
        staleTime: 0, // Always consider data stale
        cacheTime: 0, // Don't cache
    });

    // Refetch when returning to the page
    React.useEffect(() => {
        const handleFocus = () => {
            if (branchId && residentId) {
                refetch();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [branchId, residentId, refetch]);

    const charts = chartsData?.data || [];

    const handleViewChart = async (chart) => {
        // Always fetch full chart details to ensure we have all items and logs
        try {
            const response = await api.get(`/resident-charts/by-id/${chart.id}`);
            const fullChart = response.data;
            setSelectedChart(fullChart);
        } catch (error) {
            logger.error('Error fetching chart details:', error);
            setSelectedChart(chart);
        }
    };

    const handleCloseModal = () => {
        setSelectedChart(null);
    };

    const handleEditChart = (chart) => {
        setOpenMenuId(null);
        setEditingChart(chart);
    };

    const handleReviewChart = async (chart) => {
        setOpenMenuId(null);
        // Fetch full chart details
        try {
            const response = await api.get(`/resident-charts/by-id/${chart.id}`);
            const fullChart = response.data;
            setReviewChart(fullChart);
            setReviewStatus(fullChart.status || 'pending');
        } catch (error) {
            logger.error('Error fetching chart details:', error);
            setReviewChart(chart);
            setReviewStatus(chart.status || 'pending');
        }
    };

    const handleCloseReviewModal = () => {
        setReviewChart(null);
        setReviewStatus('');
    };

    const handleSubmitReview = async () => {
        if (!reviewChart || !reviewStatus) return;

        setIsSubmittingReview(true);
        try {
            await api.put(`/resident-charts/${reviewChart.id}/status`, {
                status: reviewStatus,
            });

            // Invalidate and refetch charts
            queryClient.invalidateQueries(['behavior-charts']);
            await refetch();

            handleCloseReviewModal();
        } catch (error) {
            logger.error('Error updating chart status:', error);
            alert('Failed to update chart status. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);

    const handleExport = () => {
        if (!charts.length) return;

        let csv = 'Date,Resident,Chart Status,Submitted At,Caregiver,Items Count,Logs Count\n';
        charts.forEach(chart => {
            csv += `${chart.chart_date},`;
            csv += `${chart.resident?.first_name || ''} ${chart.resident?.last_name || ''},`;
            csv += `${chart.status},`;
            csv += `${chart.submitted_at || 'N/A'},`;
            csv += `${chart.caregiver?.name || 'N/A'},`;
            csv += `${chart.items?.length || 0},`;
            csv += `${chart.logs?.length || 0}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `behavior-charts-${year}-${month}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status) => {
        if (status === 'submitted') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 !text-green-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Submitted
                </span>
            );
        }
        if (status === 'approved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 !text-blue-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Approved
                </span>
            );
        }
        if (status === 'declined') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 !text-red-800">
                    <X className="w-3 h-3" />
                    Declined
                </span>
            );
        }
        if (status === 'pending') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 !text-amber-800">
                    <Clock className="w-3 h-3" />
                    Pending
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 !text-amber-800">
                <Clock className="w-3 h-3" />
                Draft
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-8 h-8 text-[var(--theme-primary)]" />
                            Behavior Charts
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            View and manage caregiver-submitted behavior charts
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {charts.length > 0 && (
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                try {
                                    // Invalidate and refetch
                                    queryClient.invalidateQueries(['behavior-charts']);
                                    await refetch();
                                } catch (error) {
                                    logger.error('Error refreshing charts:', error);
                                }
                            }}
                            disabled={isRefetching || !branchId || !residentId}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg text-sm font-medium hover:bg-[var(--theme-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                            {isRefetching ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Select Branch
                        </label>
                        <select
                            value={branchId || ''}
                            onChange={(e) => {
                                setBranchId(e.target.value || null);
                                setResidentId(null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Select Resident
                        </label>
                        <select
                            value={residentId || ''}
                            onChange={(e) => setResidentId(e.target.value || null)}
                            disabled={!branchId}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Select Resident</option>
                            {residents.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.first_name} {r.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Month
                        </label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Year
                        </label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            min="2020"
                            max="2099"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            {!branchId || !residentId ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Please select a branch and resident to view behavior charts</p>
                </div>
            ) : isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading charts...</p>
                </div>
            ) : charts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No behavior charts found for the selected filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">Date</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">Resident</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">Chart Status</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">Reason Filled Late</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">View</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 divide-y divide-gray-100">
                                {charts.map((chart) => (
                                    <tr key={chart.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatPacificDate(chart.chart_date)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {chart.resident?.first_name && chart.resident?.last_name
                                                    ? `${chart.resident.first_name} ${chart.resident.last_name}`
                                                    : 'Missing'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {chart.status ? (
                                                getStatusBadge(chart.status)
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {chart.reason_filled_late || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {['submitted', 'approved', 'declined', 'pending'].includes(chart.status) ? (
                                                <button
                                                    onClick={() => handleViewChart(chart)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors text-sm font-medium"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                            ) : (
                                                <span className="text-sm text-gray-500">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {['submitted', 'approved', 'declined', 'pending'].includes(chart.status) ? (
                                                <div className="relative flex items-center justify-center" ref={(el) => (menuRefs.current[chart.id] = el)}>
                                                    <Tooltip content="More options" position="left">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(openMenuId === chart.id ? null : chart.id);
                                                            }}
                                                            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors bg-white"
                                                            style={{ color: '#374151' }}
                                                            aria-label="More options"
                                                        >
                                                            <MoreVertical className="w-5 h-5" style={{ color: '#374151' }} strokeWidth={2.25} />
                                                        </button>
                                                    </Tooltip>
                                                    {openMenuId === chart.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditChart(chart);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit Chart
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReviewChart(chart);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                Review Chart
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        // Navigate to chart page with date parameter to create a new chart for that date
                                                        const chartDate = chart.chart_date || new Date().toISOString().split('T')[0];
                                                        navigate(`/charts/resident/${chart.resident_id}?date=${chartDate}&new=true`);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors text-sm font-medium"
                                                >
                                                    Chart
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={selectedChart != null}
                onClose={handleCloseModal}
                title={
                    selectedChart
                        ? `Behavior chart — ${[selectedChart.resident?.first_name, selectedChart.resident?.last_name].filter(Boolean).join(' ')}`
                        : 'Behavior chart'
                }
                size="full"
            >
                {selectedChart ? (
                    <>
                    <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                        {formatPacificDate(selectedChart.chart_date)}
                    </p>
                <div className="space-y-6">
                            {/* Chart Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold !text-black mb-2">Status</label>
                                        <div>{getStatusBadge(selectedChart.status)}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold !text-black mb-2">Submitted By</label>
                                        <p className="text-sm font-medium !text-gray-900">
                                            {selectedChart.caregiver?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold !text-black mb-2">Submitted On</label>
                                        <p className="text-sm font-medium !text-gray-900">
                                            {selectedChart.submitted_at
                                                ? new Date(selectedChart.submitted_at).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold !text-black mb-2">Total Items</label>
                                        <p className="text-sm font-medium !text-gray-900">
                                            {selectedChart.items?.length || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Behavior Items */}
                            <div>
                                <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Behavior Checklist
                                </h3>
                                <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Category</th>
                                                <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Behavior</th>
                                                <th className="px-4 py-3 font-bold border-b border-gray-200 !text-black">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-700">
                                            {selectedChart.items && selectedChart.items.length > 0 ? (
                                                (() => {
                                                    // Group items by category
                                                    const grouped = {};
                                                    selectedChart.items.forEach(item => {
                                                        // Try multiple possible paths for category name
                                                        const categoryName = item.definition?.category?.name ||
                                                            item.definition?.behavior_category?.name ||
                                                            item.category_name ||
                                                            'Other';
                                                        if (!grouped[categoryName]) {
                                                            grouped[categoryName] = [];
                                                        }
                                                        grouped[categoryName].push(item);
                                                    });

                                                    return Object.entries(grouped).map(([catName, items]) =>
                                                        items.map((item, idx) => (
                                                            <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                                {idx === 0 && (
                                                                    <td
                                                                        className="px-4 py-3 border-r border-gray-200 align-middle font-bold !text-black bg-gray-50/30 whitespace-nowrap"
                                                                        rowSpan={items.length}
                                                                    >
                                                                        {catName}
                                                                    </td>
                                                                )}
                                                                <td className="px-4 py-3 border-r border-gray-200 font-medium !text-black">
                                                                    {item.definition?.name || item.name || 'Unknown'}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.value
                                                                        ? 'bg-green-100 !text-green-800'
                                                                        : 'bg-red-100 !text-red-800'
                                                                        }`}>
                                                                        {item.value ? 'Yes' : 'No'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    );
                                                })()
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="px-4 py-12 text-center text-gray-400 italic">
                                                        No behavior items recorded
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Detailed Logs */}
                            {selectedChart.logs && selectedChart.logs.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        Detailed Incident Logs
                                    </h3>
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        <table className="w-full text-left border-collapse min-w-[1000px]">
                                            <thead className="bg-gray-50 text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Time Occurred</th>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Behavior Description</th>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Triggers</th>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Intervention</th>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200 !text-black">Reported to Provider</th>
                                                    <th className="px-4 py-3 font-bold border-b border-gray-200 !text-black">Outcome</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-700">
                                                {selectedChart.logs.map((log, index) => (
                                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                        <td className="p-3 border-r border-gray-200">
                                                            {new Date(log.occurred_at).toLocaleString()}
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200">
                                                            <p className="text-sm whitespace-pre-wrap">{log.behavior_description || '-'}</p>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200">
                                                            <p className="text-sm whitespace-pre-wrap">{log.triggers || '-'}</p>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200">
                                                            <p className="text-sm whitespace-pre-wrap">{log.caregiver_intervention || '-'}</p>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.reported_to_provider
                                                                ? 'bg-green-100 !text-green-800'
                                                                : 'bg-gray-100 !text-gray-800'
                                                                }`}>
                                                                {log.reported_to_provider ? 'Yes' : 'No'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <p className="text-sm whitespace-pre-wrap">{log.outcome || '-'}</p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                <div className="border-t border-gray-200 pt-4 mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-6 py-2.5 bg-[var(--theme-primary)] text-white rounded-lg font-semibold hover:bg-[var(--theme-primary-hover)] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </>
                ) : null}
            </Modal>
            {/* Edit Chart Modal */}
            {editingChart && (
                <ResidentChartModal
                    isOpen={!!editingChart}
                    onClose={() => {
                        setEditingChart(null);
                        refetch();
                    }}
                    resident={editingChart.resident}
                    initialChart={editingChart}
                />
            )}

            <Modal
                isOpen={reviewChart != null}
                onClose={() => !isSubmittingReview && handleCloseReviewModal()}
                title="Review chart"
                size="md"
            >
                <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                    Update review status for this chart.
                </p>
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold !text-black mb-1">Resident</label>
                            <p className="text-sm font-medium !text-gray-900">
                                {reviewChart?.resident?.first_name} {reviewChart?.resident?.last_name}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold !text-black mb-1">Caregiver</label>
                            <p className="text-sm font-medium !text-gray-900">
                                {reviewChart?.caregiver?.name || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold !text-black mb-1">Branch</label>
                            <p className="text-sm font-medium !text-gray-900">
                                {reviewChart?.resident?.branch?.name || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold !text-black mb-1">Status</label>
                            <div>{reviewChart ? getStatusBadge(reviewChart.status) : null}</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold !text-black mb-2">Select Status:</label>
                        <select
                            value={reviewStatus}
                            onChange={(e) => setReviewStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent !text-black bg-white"
                        >
                            <option value="" className="!text-black bg-white">Select</option>
                            <option value="approved" className="!text-black bg-white">Approved</option>
                            <option value="declined" className="!text-black bg-white">Declined</option>
                            <option value="pending" className="!text-black bg-white">Pending</option>
                        </select>
                    </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCloseReviewModal}
                        disabled={isSubmittingReview}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={!reviewStatus || isSubmittingReview}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg font-semibold hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmittingReview ? 'Saving...' : 'Save Status'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}

