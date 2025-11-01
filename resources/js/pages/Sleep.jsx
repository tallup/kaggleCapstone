import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Moon, Plus, Search, Calendar, Clock, User, Edit, Trash2, Filter } from 'lucide-react';

export default function Sleep() {
    const queryClient = useQueryClient();
    const [dateFilter, setDateFilter] = useState('all');
    const [residentFilter, setResidentFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // Fetch residents for filter
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 100 } });
            return response.data;
        },
    });

    // Fetch sleep records
    const { data, isLoading } = useQuery({
        queryKey: ['sleep-records', dateFilter, residentFilter, search],
        queryFn: async () => {
            const params = { per_page: 20 };
            
            if (dateFilter === 'today') {
                params.today = 'true';
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                params.date_from = weekAgo.toISOString().split('T')[0];
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                params.date_from = monthAgo.toISOString().split('T')[0];
            }
            
            if (residentFilter) {
                params.resident_id = residentFilter;
            }

            if (search) {
                params.search = search;
            }

            const response = await api.get('/sleep-records', { params });
            return response.data;
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/sleep-records/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sleep-records']);
        },
    });

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        try {
            const time = new Date(`2000-01-01T${timeString}`);
            return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return timeString;
        }
    };

    const getQualityColor = (quality) => {
        if (!quality) return 'gray';
        if (quality >= 8) return 'green';
        if (quality >= 6) return 'yellow';
        return 'red';
    };

    const getDurationColor = (hours) => {
        if (!hours) return 'gray';
        if (hours >= 8) return 'green';
        if (hours >= 6) return 'yellow';
        return 'red';
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this sleep record?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Sleep Records</h1>
                <button
                    onClick={() => {
                        setEditingRecord(null);
                        setShowForm(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Sleep Record</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'today', 'week', 'month'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        dateFilter === filter
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Resident:</label>
                        <select
                            value={residentFilter}
                            onChange={(e) => setResidentFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        >
                            <option value="">All Residents</option>
                            {residentsData?.data?.map((resident) => (
                                <option key={resident.id} value={resident.id}>
                                    {resident.first_name} {resident.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search residents..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sleep Records List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading sleep records...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data?.data?.length > 0 ? (
                        data.data.map((record) => (
                            <div key={record.id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <Moon className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {record.resident?.first_name} {record.resident?.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {record.branch?.name} • {new Date(record.sleep_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Sleep Time</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatTime(record.sleep_time)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Wake Time</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatTime(record.wake_time)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Moon className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Duration</p>
                                                    <p className={`text-sm font-semibold ${
                                                        getDurationColor(record.total_sleep_hours) === 'green' ? 'text-green-600' :
                                                        getDurationColor(record.total_sleep_hours) === 'yellow' ? 'text-yellow-600' :
                                                        getDurationColor(record.total_sleep_hours) === 'red' ? 'text-red-600' :
                                                        'text-gray-600'
                                                    }`}>
                                                        {Number.isFinite(Number(record.total_sleep_hours)) ? Number(record.total_sleep_hours).toFixed(2) : 'N/A'} hrs
                                                    </p>
                                                </div>
                                            </div>

                                            {record.sleep_quality && (
                                                <div className="flex items-center space-x-2">
                                                    <Moon className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Quality</p>
                                                        <p className={`text-sm font-semibold ${
                                                            getQualityColor(record.sleep_quality) === 'green' ? 'text-green-600' :
                                                            getQualityColor(record.sleep_quality) === 'yellow' ? 'text-yellow-600' :
                                                            getQualityColor(record.sleep_quality) === 'red' ? 'text-red-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                            {record.sleep_quality}/10
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {record.restlessness_episodes !== null && (
                                                <div className="flex items-center space-x-2">
                                                    <Moon className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Restlessness</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {record.restlessness_episodes} episodes
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {record.notes && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">Notes: </span>
                                                    {record.notes}
                                                </p>
                                            </div>
                                        )}

                                        {record.created_by && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Recorded by: {record.created_by?.name || 'Unknown'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex space-x-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(record)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <Moon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No sleep records found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {dateFilter === 'today' 
                                    ? 'No sleep records recorded today.' 
                                    : 'Try adjusting your filters or add a new sleep record.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {showForm && (
                <SleepRecordForm
                    record={editingRecord}
                    residents={residentsData?.data || []}
                    onClose={() => {
                        setShowForm(false);
                        setEditingRecord(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingRecord(null);
                        queryClient.invalidateQueries(['sleep-records']);
                    }}
                />
            )}
        </div>
    );
}

// Sleep Record Form Component
function SleepRecordForm({ record, residents, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        resident_id: record?.resident_id || '',
        branch_id: record?.branch_id || '',
        sleep_date: record?.sleep_date || new Date().toISOString().split('T')[0],
        sleep_time: record?.sleep_time || '',
        wake_time: record?.wake_time || '',
        total_sleep_hours: record?.total_sleep_hours || '',
        sleep_quality: record?.sleep_quality || '',
        restlessness_episodes: record?.restlessness_episodes || 0,
        notes: record?.notes || '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get branches from residents
    const branches = React.useMemo(() => {
        const branchMap = new Map();
        residents.forEach(resident => {
            if (resident.branch && !branchMap.has(resident.branch.id)) {
                branchMap.set(resident.branch.id, resident.branch);
            }
        });
        return Array.from(branchMap.values());
    }, [residents]);

    // Filter residents by selected branch
    const filteredResidents = React.useMemo(() => {
        if (!formData.branch_id) return residents;
        return residents.filter(r => r.branch_id == formData.branch_id);
    }, [formData.branch_id, residents]);

    React.useEffect(() => {
        if (formData.sleep_time && formData.wake_time) {
            const sleepTime = new Date(`2000-01-01T${formData.sleep_time}`);
            const wakeTime = new Date(`2000-01-01T${formData.wake_time}`);
            
            let calculatedWakeTime = wakeTime;
            if (calculatedWakeTime < sleepTime) {
                calculatedWakeTime = new Date(calculatedWakeTime.getTime() + 24 * 60 * 60 * 1000);
            }
            
            const diffMs = calculatedWakeTime - sleepTime;
            const diffHours = diffMs / (1000 * 60 * 60);
            setFormData(prev => ({...prev, total_sleep_hours: diffHours.toFixed(2)}));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.sleep_time, formData.wake_time]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
            };

            if (record) {
                await api.put(`/sleep-records/${record.id}`, payload);
            } else {
                await api.post('/sleep-records', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save sleep record' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {record ? 'Edit Sleep Record' : 'Add Sleep Record'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    </div>

                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Branch *
                                </label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData({...formData, branch_id: e.target.value, resident_id: ''})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resident *
                                </label>
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => setFormData({...formData, resident_id: e.target.value})}
                                    required
                                    disabled={!formData.branch_id}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent disabled:bg-gray-100"
                                >
                                    <option value="">Select Resident</option>
                                    {filteredResidents.map(resident => (
                                        <option key={resident.id} value={resident.id}>
                                            {resident.first_name} {resident.last_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sleep Date *
                            </label>
                            <input
                                type="date"
                                value={formData.sleep_date}
                                onChange={(e) => setFormData({...formData, sleep_date: e.target.value})}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            />
                            {errors.sleep_date && <p className="text-xs text-red-600 mt-1">{errors.sleep_date[0]}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sleep Time *
                                </label>
                                <input
                                    type="time"
                                    value={formData.sleep_time}
                                    onChange={(e) => setFormData({...formData, sleep_time: e.target.value})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.sleep_time && <p className="text-xs text-red-600 mt-1">{errors.sleep_time[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Wake Time *
                                </label>
                                <input
                                    type="time"
                                    value={formData.wake_time}
                                    onChange={(e) => setFormData({...formData, wake_time: e.target.value})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.wake_time && <p className="text-xs text-red-600 mt-1">{errors.wake_time[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total Sleep Hours
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={formData.total_sleep_hours}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sleep Quality (1-10)
                                </label>
                                <select
                                    value={formData.sleep_quality}
                                    onChange={(e) => setFormData({...formData, sleep_quality: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                >
                                    <option value="">Select Quality</option>
                                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Restlessness Episodes
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.restlessness_episodes}
                                    onChange={(e) => setFormData({...formData, restlessness_episodes: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                            </div>
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
                                placeholder="Additional notes about the sleep session..."
                            />
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
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
