import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ClipboardList, Plus, Search, Filter, Edit, Trash2, Calendar, User, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';

export default function Assessments() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    // Fetch residents for form
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
    });

    // Fetch branches for form
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch assessments
    const { data, isLoading, error } = useQuery({
        queryKey: ['assessments', search, statusFilter, typeFilter, dateFilter],
        queryFn: async () => {
            const params = { per_page: 20 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.assessment_type = typeFilter;
            
            if (dateFilter === 'today') {
                params.today = 'true';
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                params.date_from = weekAgo.toISOString().split('T')[0];
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                params.date_from = monthAgo.toISOString().split('T')[0];
            }
            
            const response = await api.get('/assessments', { params });
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/assessments/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['assessments']),
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'reviewed':
                return 'bg-purple-100 text-purple-800';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'archived':
                return 'bg-gray-100 text-gray-600';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'completed':
            case 'reviewed':
                return <CheckCircle className="w-4 h-4 text-blue-600" />;
            default:
                return <Clock className="w-4 h-4 text-gray-600" />;
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center space-x-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Assessment</span>
                </button>
            </div>

            <SectionCard>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Management</h2>
                    <p className="text-gray-600">View and manage resident assessments.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assessments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <input
                            type="text"
                            placeholder="Assessment Type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        />
                    </div>

                    {/* Date Filter */}
                    <div>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                        </select>
                    </div>
                </div>
            </SectionCard>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">
                        Error loading assessments: {error.response?.data?.message || error.message}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading assessments...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data?.data?.length > 0 ? (
                        data.data.map((assessment) => (
                            <Card 
                                key={assessment.id} 
                                gradient="from-blue-500 to-blue-600"
                                iconBg="bg-blue-100"
                                iconColor="text-blue-600"
                                icon={<ClipboardList />}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {assessment.assessment_type || 'Assessment'}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-4">
                                            {assessment.resident?.first_name} {assessment.resident?.last_name}
                                            {assessment.branch && ` • ${assessment.branch.name}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(assessment.status)}
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                            {assessment.status?.replace('_', ' ')}
                                        </span>
                                        <div className="flex flex-col items-end space-y-1">
                                            <Link
                                                to={`/assessments/${assessment.id}`}
                                                className="px-3 py-1 text-sm text-white bg-[#2D5016] hover:bg-[#1a3009] rounded-lg transition-colors"
                                            >
                                                Start Assessment
                                            </Link>
                                            <Link
                                                to={`/assessments/${assessment.id}/review`}
                                                className="px-3 py-1 text-sm text-white bg-[#2D5016] hover:bg-[#1a3009] rounded-lg transition-colors"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Assessment Date</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {new Date(assessment.assessment_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {assessment.assessor && (
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Assessed By</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {assessment.assessor.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {assessment.completed_at && (
                                                <div className="flex items-center space-x-2">
                                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Completed</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(assessment.completed_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                </div>

                                {assessment.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">Notes: </span>
                                            {assessment.notes}
                                        </p>
                                    </div>
                                )}

                                {assessment.scores && Object.keys(assessment.scores).length > 0 && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Scores:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(assessment.scores).map(([key, value]) => (
                                                <span key={key} className="inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                                                    {key}: {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={() => {
                                            setEditing(assessment);
                                            setShowForm(true);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this assessment?')) {
                                                deleteMutation.mutate(assessment.id);
                                            }
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No assessments found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {search || statusFilter || typeFilter
                                    ? 'No assessments match your filters.'
                                    : 'No assessments found in the system.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {showForm && (
                <AssessmentForm
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
                        queryClient.invalidateQueries(['assessments']);
                    }}
                />
            )}
        </div>
    );
}

// Assessment Form Component
function AssessmentForm({ record, residents, branches, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        resident_id: record?.resident_id || '',
        branch_id: record?.branch_id || '',
        assessment_type: record?.assessment_type || '',
        assessment_date: record?.assessment_date || new Date().toISOString().split('T')[0],
        status: record?.status || 'draft',
        notes: record?.notes || '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter residents by selected branch
    const filteredResidents = React.useMemo(() => {
        if (!formData.branch_id) return residents;
        return residents.filter(r => r.branch_id == formData.branch_id);
    }, [formData.branch_id, residents]);

    // Auto-select branch when resident is selected
    React.useEffect(() => {
        if (formData.resident_id && !formData.branch_id) {
            const resident = residents.find(r => r.id == formData.resident_id);
            if (resident?.branch_id) {
                setFormData(prev => ({...prev, branch_id: resident.branch_id}));
            }
        }
    }, [formData.resident_id, residents, formData.branch_id]);

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
                await api.put(`/assessments/${record.id}`, payload);
            } else {
                await api.post('/assessments', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save assessment' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {record ? 'Edit Assessment' : 'Add Assessment'}
                        </h2>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assessment Type *
                                </label>
                                <input
                                    type="text"
                                    value={formData.assessment_type}
                                    onChange={(e) => setFormData({...formData, assessment_type: e.target.value})}
                                    required
                                    placeholder="e.g., Initial Assessment, Follow-up"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.assessment_type && <p className="text-xs text-red-600 mt-1">{errors.assessment_type[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assessment Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.assessment_date}
                                    onChange={(e) => setFormData({...formData, assessment_date: e.target.value})}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                                {errors.assessment_date && <p className="text-xs text-red-600 mt-1">{errors.assessment_date[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status *
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                            >
                                <option value="draft">Draft</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="approved">Approved</option>
                                <option value="archived">Archived</option>
                            </select>
                            {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                placeholder="Additional notes about the assessment..."
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
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
