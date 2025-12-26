import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Activity, User, Heart, Plus, Thermometer, Droplet, Edit, Trash2, ChevronDown, X } from 'lucide-react';
import { getLocalDateString } from '../utils/pacificTime';
import { TableSkeleton, ListSkeleton } from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import { useToastContext } from '../contexts/ToastContext';
import BranchSelector from '../components/BranchSelector';

export default function Vitals() {
    const queryClient = useQueryClient();
    const toast = useToastContext();
    const [searchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');
    const [dateFilter, setDateFilter] = useState('all');
    const [residentFilter, setResidentFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    // Get current user to check permissions
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            try {
                const response = await api.get('/user');
                return response.data;
            } catch {
                return null;
            }
        },
    });

    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);
    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_vitals');
    const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_vitals');
    const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_vitals');

    // Reset resident filter and invalidate queries when branch changes
    React.useEffect(() => {
        setResidentFilter('');
        // Invalidate vitals query to ensure fresh data when branch changes
        queryClient.invalidateQueries(['vitals']);
    }, [selectedBranchId, queryClient]);

    const { data, isLoading } = useQuery({
        queryKey: ['vitals', dateFilter, residentFilter, selectedBranchId],
        queryFn: async () => {
            const params = { per_page: 20 };
            
            if (dateFilter === 'today') {
                params.today = 'true';
            } else if (dateFilter === 'week') {
                params.date_from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            }
            
            if (residentFilter) {
                params.resident_id = residentFilter;
            }

            if (selectedBranchId) {
                params.branch_id = selectedBranchId;
            }

            const response = await api.get('/vitals', { params });
            return response.data;
        },
        enabled: !!selectedBranchId, // Only fetch when branch is selected
    });

    // Fetch branches for administrators (always fetch for form)
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            return response.data;
        },
    });

    // Fetch residents for form - filtered by branch
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', selectedBranchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (selectedBranchId) {
                params.branch_id = selectedBranchId.toString();
            }
            return (await api.get('/residents', { params })).data;
        },
        enabled: !!selectedBranchId, // Only fetch when branch is selected
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/vitals/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['vitals']);
            toast.success('Success', 'Vital sign record deleted successfully');
        },
        onError: (error) => {
            toast.error('Error', error.response?.data?.message || 'Failed to delete vital sign record');
        },
    });

    if (showForm) {
        return (
            <div>
                <VitalSignForm
                    record={editing}
                    residents={residentsData?.data || []}
                    branches={branchesData?.data || []}
                    isFacilityAdmin={isFacilityAdmin}
                    isBranchAdmin={isBranchAdmin}
                    currentUser={currentUser}
                    selectedBranchId={selectedBranchId}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['vitals']);
                    }}
                />
            </div>
        );
    }

    // Show branch selector if no branch is selected
    if (!selectedBranchId) {
        return (
            <div className="space-y-6">
                <BranchSelector currentUser={currentUser} />
                <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm font-semibold text-gray-700">Please select a branch to continue</p>
                    <p className="mt-2 text-xs text-gray-500">Select a branch from the dropdown above to view and manage vital signs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <BranchSelector currentUser={currentUser} />
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vital Signs Management</h2>
                            <p className="text-gray-600">View and track resident vital signs.</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditing(null);
                                setShowForm(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Vitals</span>
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setDateFilter('today')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateFilter === 'today'
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setDateFilter('week')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateFilter === 'week'
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setDateFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateFilter === 'all'
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resident:</label>
                        <select
                            value={residentFilter}
                            onChange={(e) => setResidentFilter(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Residents</option>
                            {residentsData?.data?.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.first_name} {r.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : (
                <div>
                    {data?.data?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.data.map((vital) => (
                                <div key={vital.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {vital.resident?.first_name} {vital.resident?.last_name}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(vital.measurement_date).toLocaleDateString()} at{' '}
                                                    {vital.measurement_date && typeof vital.measurement_date === 'string' 
                                                        ? new Date(vital.measurement_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => {
                                                        setEditing(vital);
                                                        setShowForm(true);
                                                    }}
                                                    className="p-2 text-[var(--theme-primary)] hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this vital sign record?')) {
                                                            deleteMutation.mutate(vital.id);
                                                        }
                                                    }}
                                                    className="p-2 text-[var(--theme-secondary)] hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {vital.systolic && vital.diastolic && (
                                            <div className="flex items-center space-x-2 p-2 bg-amber-50 rounded-lg">
                                                <Heart className="w-5 h-5 text-red-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500">Blood Pressure</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {vital.systolic}/{vital.diastolic} mmHg
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {vital.pulse && (
                                            <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                                                <Activity className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500">Pulse</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {vital.pulse} bpm
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {vital.temperature && (
                                            <div className="flex items-center space-x-2 p-2 bg-amber-50 rounded-lg">
                                                <Thermometer className="w-5 h-5 text-red-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500">Temperature</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {vital.temperature}°F
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {vital.oxygen_saturation && (
                                            <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                                                <Droplet className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500">O2 Sat</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {vital.oxygen_saturation}%
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {vital.notes && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-700">
                                                <span className="font-medium">Notes: </span>
                                                {vital.notes}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {vital.taken_by && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Taken by: {vital.taken_by?.name || 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Activity}
                            title="No vital signs found"
                            description={
                                dateFilter === 'today' 
                                    ? 'No vital signs recorded today. Get started by recording vital signs for residents.'
                                    : 'Try adjusting your filters or check back later.'
                            }
                            action={canCreate ? (
                                <button
                                    onClick={() => {
                                        setEditing(null);
                                        setShowForm(true);
                                    }}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors"
                                >
                                    <Plus className="w-4 h-4 inline mr-2" />
                                    Add Vitals
                                </button>
                            ) : null}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function VitalSignForm({ record, residents, branches = [], isFacilityAdmin = false, isBranchAdmin = false, currentUser = null, selectedBranchId: propSelectedBranchId, onClose, onSuccess }) {
    const toast = useToastContext();
    // Always use branch from URL/props - no branch selection in form
    const selectedBranchId = propSelectedBranchId || '';
    const [formData, setFormData] = useState({
        resident_id: record?.resident_id || '',
        measurement_date: record?.measurement_date 
            ? (typeof record.measurement_date === 'string' 
                ? record.measurement_date.split('T')[0]
                : (() => {
                    const date = new Date(record.measurement_date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })())
            : getLocalDateString(),
        measurement_time: record?.measurement_date
            ? (typeof record.measurement_date === 'string'
                ? new Date(record.measurement_date).toTimeString().slice(0, 5)
                : new Date(record.measurement_date).toTimeString().slice(0, 5))
            : new Date().toTimeString().slice(0, 5),
        systolic: record?.systolic || '',
        diastolic: record?.diastolic || '',
        temperature: record?.temperature || '',
        pulse: record?.pulse || '',
        oxygen_saturation: record?.oxygen_saturation || '',
        pain_level: record?.pain_level || '',
        pain_description: record?.pain_description || '',
        notes: record?.notes || '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter residents by selected branch (from URL)
    const filteredResidents = React.useMemo(() => {
        if (!selectedBranchId) return residents;
        return residents.filter(r => r.branch_id == selectedBranchId);
    }, [residents, selectedBranchId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Combine date and time
            const measurementDateTime = `${formData.measurement_date}T${formData.measurement_time}:00`;
            
            const payload = {
                ...formData,
                measurement_date: measurementDateTime,
                resident_id: parseInt(formData.resident_id),
                systolic: formData.systolic ? parseInt(formData.systolic) : null,
                diastolic: formData.diastolic ? parseInt(formData.diastolic) : null,
                temperature: formData.temperature ? parseFloat(formData.temperature) : null,
                pulse: formData.pulse ? parseInt(formData.pulse) : null,
                oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : null,
                pain_level: formData.pain_level ? parseInt(formData.pain_level) : null,
            };

            if (record) {
                await api.put(`/vitals/${record.id}`, payload);
                toast.success('Success', 'Vital sign updated successfully', { isFormSubmission: true });
            } else {
                await api.post('/vitals', payload);
                toast.success('Success', 'Vital sign recorded successfully', { isFormSubmission: true });
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                const errorMessage = error.response?.data?.message || 'Failed to save vital sign';
                setErrors({ general: errorMessage });
                toast.error('Error', errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Vital Sign' : 'Add Vital Sign'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

                    {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 grid-cols-1">
                            {propSelectedBranchId && (
                                <input type="hidden" value={propSelectedBranchId} />
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resident *
                                </label>
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => setFormData({...formData, resident_id: e.target.value})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="">Select Resident</option>
                                    {filteredResidents.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.first_name} {r.last_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Measurement Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.measurement_date}
                                    onChange={(e) => setFormData({...formData, measurement_date: e.target.value})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.measurement_date && <p className="text-xs text-red-600 mt-1">{errors.measurement_date[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Measurement Time
                                </label>
                                <TimePicker
                                    value={formData.measurement_time}
                                    onChange={(value) => setFormData({...formData, measurement_time: value})}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Systolic (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.systolic}
                                        onChange={(e) => setFormData({...formData, systolic: e.target.value})}
                                        min="0"
                                        max="300"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Diastolic (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.diastolic}
                                        onChange={(e) => setFormData({...formData, diastolic: e.target.value})}
                                        min="0"
                                        max="200"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Temperature (°F)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.temperature}
                                        onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                                        min="90"
                                        max="110"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pulse (bpm)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.pulse}
                                        onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                                        min="0"
                                        max="200"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Oxygen Saturation (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.oxygen_saturation}
                                        onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pain Level (0-10)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.pain_level}
                                        onChange={(e) => setFormData({...formData, pain_level: e.target.value})}
                                        min="0"
                                        max="10"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pain Description
                            </label>
                            <input
                                type="text"
                                value={formData.pain_description}
                                onChange={(e) => setFormData({...formData, pain_description: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Describe pain location/type..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Additional notes..."
                            />
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
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
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
        </div>
    );
}

// TimePicker Component
function TimePicker({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            return parseInt(h) || 12;
        }
        return 12;
    });
    const [minutes, setMinutes] = useState(() => {
        if (value) {
            const [, m] = value.split(':');
            return parseInt(m) || 0;
        }
        return 0;
    });
    const [period, setPeriod] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            const hour = parseInt(h) || 0;
            return hour >= 12 ? 'PM' : 'AM';
        }
        return 'AM';
    });

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            const hour = parseInt(h) || 0;
            const min = parseInt(m) || 0;
            setHours(hour % 12 || 12);
            setMinutes(min);
            setPeriod(hour >= 12 ? 'PM' : 'AM');
        }
    }, [value]);

    const formatTime = (h, m, p) => {
        let hour24 = h;
        if (p === 'PM' && h !== 12) hour24 = h + 12;
        if (p === 'AM' && h === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleTimeChange = (newHours, newMinutes, newPeriod) => {
        const timeValue = formatTime(newHours, newMinutes, newPeriod);
        onChange(timeValue);
        setIsOpen(false);
    };

    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

    const displayValue = value 
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
        : '--:-- --';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent bg-white text-left flex items-center justify-between ${className}`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {displayValue}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-full">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {/* Hours */}
                            <select
                                value={hours}
                                onChange={(e) => {
                                    const newHours = parseInt(e.target.value);
                                    handleTimeChange(newHours, minutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {hourOptions.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            <span className="text-2xl font-bold text-gray-700">:</span>
                            
                            {/* Minutes */}
                            <select
                                value={minutes}
                                onChange={(e) => {
                                    const newMinutes = parseInt(e.target.value);
                                    handleTimeChange(hours, newMinutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {minuteOptions.map(m => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            {/* AM/PM */}
                            <select
                                value={period}
                                onChange={(e) => {
                                    const newPeriod = e.target.value;
                                    handleTimeChange(hours, minutes, newPeriod);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
