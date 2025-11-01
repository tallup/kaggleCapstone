import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Pill, Clock, User, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Edit, Trash2, Download } from 'lucide-react';

export default function Medications() {
    const queryClient = useQueryClient();
    const [activeOnly, setActiveOnly] = useState(true);
    const [search, setSearch] = useState('');
    const [residentFilter, setResidentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [showHistory, setShowHistory] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['medications', activeOnly, search, residentFilter, branchFilter, currentPage],
        queryFn: async () => {
            const response = await api.get('/medications', {
                params: {
                    active_only: activeOnly ? 'true' : 'false',
                    search: search || undefined,
                    resident_id: residentFilter || undefined,
                    branch_id: branchFilter || undefined,
                    per_page: 20,
                    page: currentPage,
                },
            });
            return response.data;
        },
    });

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [activeOnly, search, residentFilter, branchFilter]);

    // Fetch administrations for selected medication
    const { data: administrationsData } = useQuery({
        queryKey: ['medication-administrations', selectedMedication],
        queryFn: async () => {
            if (!selectedMedication) return null;
            const response = await api.get('/medication-administrations', {
                params: {
                    medication_id: selectedMedication,
                    per_page: 50,
                },
            });
            return response.data;
        },
        enabled: !!selectedMedication,
    });

    // Filter options
    const { data: residentsData } = useQuery({
        queryKey: ['residents-options'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
    });
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/medications/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['medications']),
    });

    const formatTime = (timeValue) => {
        if (!timeValue) return null;
        try {
            // Handle different formats: datetime string, time string, or Date object
            let date;
            if (typeof timeValue === 'string') {
                // If it's a full datetime string (e.g., "2025-10-31 08:00:00" or ISO format)
                if (timeValue.includes('T') || timeValue.includes(' ')) {
                    date = new Date(timeValue);
                } else if (timeValue.match(/^\d{2}:\d{2}/)) {
                    // If it's just a time string (e.g., "08:00")
                    date = new Date(`2000-01-01T${timeValue}`);
                } else {
                    date = new Date(timeValue);
                }
            } else {
                date = new Date(timeValue);
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return null;
            }
            
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return null;
        }
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Medications</h1>
            
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Medication Management</h2>
                <p className="text-gray-600 mb-6">View and track resident medications.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
                        <input
                            type="text"
                            placeholder="Search by medication name, resident..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter:</label>
                        <button
                            onClick={() => setActiveOnly(!activeOnly)}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeOnly
                                    ? 'bg-[#2D5016] text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {activeOnly ? 'Active Only' : 'All Medications'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resident</label>
                        <select
                            value={residentFilter}
                            onChange={(e) => setResidentFilter(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        >
                            <option value="">All</option>
                            {residentsData?.data?.map(r => (
                                <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        >
                            <option value="">All</option>
                            {branchesData?.data?.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="mt-4">
                    <button
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Medication</span>
                        </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading medications...</p>
                </div>
            ) : (
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div />
                        <button
                            onClick={() => { setSearch(''); setResidentFilter(''); setBranchFilter(''); setActiveOnly(true); }}
                            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                        >
                            Reset Filters
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {data?.data?.length > 0 ? (
                            data.data.map((medication) => (
                            <div key={medication.id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="p-2 bg-green-50 rounded-lg">
                                                <Pill className="w-5 h-5 text-[#2D5016]" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {medication.name}
                                                </h3>
                                                <p className="text-base font-medium text-gray-700">
                                                    {medication.resident?.first_name} {medication.resident?.last_name}
                                                    {medication.branch && ` • ${medication.branch.name}`}
                                                </p>
                                            </div>
                                            {medication.is_active && (
                                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            {medication.instructions && (
                                                <div className="flex items-start space-x-2">
                                                    <Pill className="w-4 h-4 text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Instructions</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {medication.instructions}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {medication.quantity && (
                                                <div className="flex items-start space-x-2">
                                                    <Pill className="w-4 h-4 text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Quantity</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {medication.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {medication.start_date && (
                                                <div className="flex items-start space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Start Date</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(medication.start_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {medication.end_date && (
                                                <div className="flex items-start space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">End Date</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(medication.end_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Medication Times */}
                                        {(medication.time_1 || medication.time_2 || medication.time_3 || medication.time_4) && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                <div className="mb-2">
                                                    <p className="text-xs font-medium text-gray-700">Administration Times:</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {medication.time_1 && formatTime(medication.time_1) && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-[#2D5016] rounded text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {formatTime(medication.time_1)}
                                                        </span>
                                                    )}
                                                    {medication.time_2 && formatTime(medication.time_2) && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-[#2D5016] rounded text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {formatTime(medication.time_2)}
                                                        </span>
                                                    )}
                                                    {medication.time_3 && formatTime(medication.time_3) && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-[#2D5016] rounded text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {formatTime(medication.time_3)}
                                                        </span>
                                                    )}
                                                    {medication.time_4 && formatTime(medication.time_4) && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-[#2D5016] rounded text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {formatTime(medication.time_4)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quick Administer */}
                                                <QuickAdminister medication={medication} onSuccess={() => { queryClient.invalidateQueries(['medications']); queryClient.invalidateQueries(['medication-administrations']); }} />

                                                <button onClick={()=> setShowHistory(showHistory === medication.id ? null : medication.id)} className="mt-2 text-xs text-[#2D5016] hover:underline">
                                                    {showHistory === medication.id ? 'Hide History' : 'View History'}
                                                </button>

                                                {showHistory === medication.id && (
                                                    <MedicationAdministrationHistory medicationId={medication.id} />
                                                )}
                                            </div>
                                        )}

                                        {medication.diagnosis && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">Diagnosis: </span>
                                                    {medication.diagnosis}
                                                </p>
                                            </div>
                                        )}

                                        {medication.notes && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">Notes: </span>
                                                    {medication.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center col-span-full">
                                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-medium">No medications found</p>
                                <p className="text-gray-500 text-sm mt-2">
                                    {activeOnly 
                                        ? 'No active medications found.' 
                                        : 'Try adjusting your search or filters.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {data?.data?.length > 0 && data?.meta && (
                        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {data.meta.from || 0} to {data.meta.to || 0} of {data.meta.total || 0} medications
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || !data.meta.prev_page_url}
                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1 text-sm">
                                    Page {data.meta.current_page || 1} of {data.meta.last_page || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage >= (data.meta.last_page || 1) || !data.meta.next_page_url}
                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Per-Resident Report Button */}
                    <div className="mt-4 bg-white rounded-lg shadow p-4">
                        <button
                            onClick={() => {
                                const meds = data?.data || [];
                                const grouped = meds.reduce((acc, m) => {
                                    const rId = m.resident_id;
                                    if (!acc[rId]) acc[rId] = { resident: m.resident, medications: [] };
                                    acc[rId].medications.push(m);
                                    return acc;
                                }, {});
                                const report = Object.values(grouped).map(g => ({
                                    Resident: `${g.resident?.first_name || ''} ${g.resident?.last_name || ''}`,
                                    Branch: g.resident?.branch?.name || '',
                                    'Total Medications': g.medications.length,
                                    'Active Medications': g.medications.filter(m => m.is_active).length,
                                    'Medications': g.medications.map(m => m.name).join('; '),
                                }));
                                const header = ['Resident', 'Branch', 'Total Medications', 'Active Medications', 'Medications'];
                                const csv = [header.join(',')].concat(report.map(r => [
                                    r.Resident.replace(/,/g, ';'),
                                    r.Branch.replace(/,/g, ';'),
                                    r['Total Medications'],
                                    r['Active Medications'],
                                    r.Medications.replace(/,/g, ';'),
                                ].join(',')));
                                const blob = new Blob(["\uFEFF" + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'medications_by_resident_report.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Medications Report by Resident</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Administration Form Modal */}
            {showAdminForm && (
                <MedicationAdministrationForm
                    medication={data?.data?.find(m => m.id === selectedMedication)}
                    onClose={() => {
                        setShowAdminForm(false);
                        setSelectedMedication(null);
                    }}
                    onSuccess={() => {
                        setShowAdminForm(false);
                        setSelectedMedication(null);
                        queryClient.invalidateQueries(['medications']);
                        queryClient.invalidateQueries(['medication-administrations']);
                    }}
                />
            )}

            {/* Medication Create/Edit Modal */}
            {showForm && (
                <MedicationForm
                    record={editing}
                    residents={residentsData?.data || []}
                    branches={branchesData?.data || []}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['medications']);
                    }}
                />
            )}
        </div>
    );
}

// Medication Administration History Component
function MedicationAdministrationHistory({ medicationId }) {
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['medication-administrations', medicationId, statusFilter, dateFrom, dateTo],
        queryFn: async () => {
            const response = await api.get('/medication-administrations', {
                params: {
                    medication_id: medicationId,
                    status: statusFilter || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                    per_page: 100,
                },
            });
            return response.data;
        },
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'missed':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'refused':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            default:
                return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'missed':
                return 'bg-red-100 text-red-800';
            case 'refused':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const exportCsv = async () => {
        // Fetch a larger set for export
        const resp = await api.get('/medication-administrations', {
            params: {
                medication_id: medicationId,
                status: statusFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                per_page: 1000,
            },
        });
        const rows = resp.data?.data || [];
        const header = ['Date', 'Time', 'Status', 'Dosage', 'Administered By'];
        const csvLines = [header.join(',')].concat(
            rows.map(r => [
                new Date(r.administered_at).toLocaleDateString(),
                new Date(r.administered_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
                r.status,
                (r.dosage_given || '').toString().replace(/,/g, ';'),
                (r.administered_by?.name || '').replace(/,/g, ';'),
            ].join(','))
        );
        const blob = new Blob(["\uFEFF" + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'medication_administration_history.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-3">
            <div className="flex flex-wrap gap-3 items-end mb-3">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-2 py-1 text-xs border rounded"
                    >
                        <option value="">All</option>
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="refused">Refused</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="px-2 py-1 text-xs border rounded" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="px-2 py-1 text-xs border rounded" />
                </div>
                <button onClick={exportCsv} className="ml-auto px-3 py-1 bg-[#2D5016] text-white rounded text-xs hover:bg-[#1a3009]">Export CSV</button>
            </div>

            {isLoading ? (
                <div className="mt-3 text-xs text-gray-500">Loading history...</div>
            ) : !data?.data?.length ? (
                <div className="mt-3 text-xs text-gray-500">No administration history found.</div>
            ) : (
                <div className="mt-3 border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
                    {data.data.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(admin.status)}
                                <span>
                                    {new Date(admin.administered_at).toLocaleDateString()} {new Date(admin.administered_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(admin.status)}`}>
                                    {admin.status}
                                </span>
                            </div>
                            {admin.administered_by?.name && (
                                <span className="text-gray-500">by {admin.administered_by.name}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Medication Administration Form Component
function MedicationAdministrationForm({ medication, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        medication_id: medication?.id || '',
        resident_id: medication?.resident_id || '',
        branch_id: medication?.branch_id || '',
        administered_at: new Date().toISOString().slice(0, 16),
        status: 'completed',
        dosage_given: '',
        notes: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                medication_id: parseInt(formData.medication_id),
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
            };

            await api.post('/medication-administrations', payload);
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to record administration' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Record Medication Administration</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Medication
                            </label>
                            <input
                                type="text"
                                value={medication?.name || ''}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Resident
                            </label>
                            <input
                                type="text"
                                value={medication?.resident ? `${medication.resident.first_name} ${medication.resident.last_name}` : ''}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Administered At *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.administered_at}
                                onChange={(e) => setFormData({...formData, administered_at: e.target.value})}
                                required
                                max={new Date().toISOString().slice(0, 16)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            />
                            {errors.administered_at && <p className="text-xs text-red-600 mt-1">{errors.administered_at[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status *
                            </label>
                            <div className="flex gap-2 mb-2">
                                {['completed','missed','refused'].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: s })}
                                        className={`px-3 py-1 rounded-lg text-xs border ${formData.status===s ? 'bg-[#2D5016] text-white border-[#2D5016]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {s.charAt(0).toUpperCase()+s.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            >
                                <option value="completed">Completed</option>
                                <option value="missed">Missed</option>
                                <option value="refused">Refused</option>
                            </select>
                            {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dosage Given
                            </label>
                            <input
                                type="text"
                                value={formData.dosage_given}
                                onChange={(e) => setFormData({...formData, dosage_given: e.target.value})}
                                placeholder="e.g., 1 tablet, 5ml"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            />
                            {errors.dosage_given && <p className="text-xs text-red-600 mt-1">{errors.dosage_given[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                placeholder="Additional notes about the administration..."
                            />
                            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes[0]}</p>}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Recording...' : 'Record Administration'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Medication Create/Edit Form Component
function MedicationForm({ record, residents, branches, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        resident_id: record?.resident_id || '',
        branch_id: record?.branch_id || '',
        drug_id: record?.drug_id || '',
        name: record?.name || '',
        instructions: record?.instructions || '',
        quantity: record?.quantity || '',
        diagnosis: record?.diagnosis || '',
        prescription_date: record?.prescription_date || '',
        start_date: record?.start_date || new Date().toISOString().split('T')[0],
        end_date: record?.end_date || '',
        notes: record?.notes || '',
        is_active: record?.is_active ?? true,
        time_1: record?.time_1 || '',
        time_2: record?.time_2 || '',
        time_3: record?.time_3 || '',
        time_4: record?.time_4 || '',
    });

    // Determine how many time fields to display based on instruction
    const getTimesNeeded = (instruction) => {
        switch (instruction) {
            case 'q.i.d':
                return 4; // four times daily
            case 't.i.d':
                return 3; // thrice daily
            case 'b.i.d':
                return 2; // twice daily
            case 'h.s':
            case 'a.m':
            case 'p.m':
                return 1; // once
            case 'PRN':
            default:
                return 0; // as needed or unspecified: no scheduled times
        }
    };

    // Clear unused time fields when instruction changes
    React.useEffect(() => {
        const needed = getTimesNeeded(formData.instructions);
        setFormData((prev) => ({
            ...prev,
            time_1: needed >= 1 ? prev.time_1 : '',
            time_2: needed >= 2 ? prev.time_2 : '',
            time_3: needed >= 3 ? prev.time_3 : '',
            time_4: needed >= 4 ? prev.time_4 : '',
        }));
    }, [formData.instructions]);

    // Fetch drugs
    const { data: drugsData } = useQuery({
        queryKey: ['drugs-options'],
        queryFn: async () => (await api.get('/drugs', { params: { active_only: 'true', per_page: 1000 } })).data,
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
                drug_id: formData.drug_id ? parseInt(formData.drug_id) : null,
                is_active: Boolean(formData.is_active),
            };

            if (record) {
                await api.put(`/medications/${record.id}`, payload);
            } else {
                await api.post('/medications', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save medication' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">{record ? 'Edit Medication' : 'Add Medication'}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                    </div>

                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => {
                                        // Clear resident when branch changes
                                        setFormData({ 
                                            ...formData, 
                                            branch_id: e.target.value,
                                            resident_id: '' // Clear resident selection when branch changes
                                        });
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Resident *</label>
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
                                    required
                                    disabled={!formData.branch_id}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {formData.branch_id ? 'Select Resident' : 'Select Branch First'}
                                    </option>
                                    {residents
                                        .filter(r => !formData.branch_id || r.branch_id == formData.branch_id)
                                        .map(r => (
                                            <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                        ))}
                                </select>
                                {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Drug *</label>
                                <select
                                    value={formData.drug_id}
                                    onChange={(e) => {
                                        const selectedDrug = drugsData?.data?.find(d => d.id == e.target.value);
                                        setFormData({ 
                                            ...formData, 
                                            drug_id: e.target.value,
                                            name: selectedDrug ? selectedDrug.name : formData.name
                                        });
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                >
                                    <option value="">Select Drug</option>
                                    {drugsData?.data?.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}{d.generic_name ? ` (${d.generic_name})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.drug_id && <p className="text-xs text-red-600 mt-1">{errors.drug_id[0]}</p>}
                            </div>
                            {formData.drug_id && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name (Optional - auto-filled from drug)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        placeholder="Will use drug name if not provided"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="text"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    placeholder="e.g., 30 tablets"
                                />
                                {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Instructions *</label>
                                <select
                                    value={formData.instructions}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                >
                                    <option value="">Choose dosage instructions</option>
                                    <option value="t.i.d">t.i.d — Thrice daily</option>
                                    <option value="q.i.d">q.i.d — Four times daily</option>
                                    <option value="b.i.d">b.i.d — Twice daily</option>
                                    <option value="PRN">PRN — As needed</option>
                                    <option value="h.s">h.s — Hour of sleep</option>
                                    <option value="a.m">a.m — Morning</option>
                                    <option value="p.m">p.m — Evening</option>
                                </select>
                                {errors.instructions && <p className="text-xs text-red-600 mt-1">{errors.instructions[0]}</p>}
                            </div>

                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-1">
                                    {(() => {
                                        const needed = getTimesNeeded(formData.instructions);
                                        if (needed === 0) return 'No scheduled times required for PRN/unspecified.';
                                        if (needed === 1) return 'Select one time for administration.';
                                        return `Select ${needed} times spread across the day.`;
                                    })()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    min={formData.start_date || ''}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date[0]}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                                <input
                                    type="text"
                                    value={formData.diagnosis}
                                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    placeholder="Enter diagnosis or condition for this medication"
                                />
                                {errors.diagnosis && <p className="text-xs text-red-600 mt-1">{errors.diagnosis[0]}</p>}
                            </div>

                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Administration Times</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[1,2,3,4].slice(0, getTimesNeeded(formData.instructions)).map((idx) => (
                                    <div key={idx}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Time {idx}</label>
                                        <input
                                            type="time"
                                            value={formData[`time_${idx}`] || ''}
                                            onChange={(e) => setFormData({ ...formData, [`time_${idx}`]: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={!!formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <span>Active</span>
                            </label>

                            <div className="space-x-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : (record ? 'Update Medication' : 'Create Medication')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Quick Administer Component
function QuickAdminister({ medication, onSuccess }) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState('completed');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleRecord = async () => {
        try {
            setSubmitting(true);
            setError('');
            await api.post('/medication-administrations', {
                medication_id: medication.id,
                resident_id: medication.resident_id,
                branch_id: medication.branch_id,
                administered_at: new Date().toISOString().slice(0,16),
                status,
            });
            queryClient.invalidateQueries(['medication-administrations']);
            onSuccess?.();
        } catch (e) {
            const msg = e?.response?.data?.message || 'Unable to record administration.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-3">
            <div className="flex items-center gap-2">
                <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-2 py-1 text-xs border rounded">
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="refused">Refused</option>
                </select>
                <button onClick={handleRecord} disabled={submitting} className="px-2 py-1 bg-[#2D5016] text-white rounded text-xs hover:bg-[#1a3009] disabled:opacity-50">
                    {submitting ? 'Recording...' : 'Record Now'}
                </button>
            </div>
            {error && (
                <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
