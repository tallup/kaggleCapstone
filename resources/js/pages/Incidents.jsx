import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import api from '../services/api';
import { 
    AlertTriangle, Plus, Edit, Trash2, Eye, X, 
    CheckCircle, Lock, Clock, User, MapPin, Calendar,
    FileText, Image as ImageIcon
} from 'lucide-react';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import { toast } from 'sonner';

const SEVERITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
};

const PRIORITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
};

const STATUS_COLORS = {
    open: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    in_progress: 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
    resolved: 'bg-green-100 text-green-800 border-green-300',
    closed: 'bg-gray-100 text-gray-800 border-gray-300',
    on_hold: 'bg-red-100 text-red-800 border-red-300',
};

const INCIDENT_TYPES = [
    'Fall',
    'Medication Error',
    'Behavioral Incident',
    'Medical Emergency',
    'Equipment Malfunction',
    'Security Breach',
    'Fire/Safety',
    'Food Safety',
    'Infection Control',
    'Transportation',
    'Communication Error',
    'Environmental Hazard',
    'Staff Injury',
    'Resident Injury',
    'Property Damage',
];

export default function Incidents() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [showForm, setShowForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'all',
        priority: searchParams.get('priority') || 'all',
        severity: searchParams.get('severity') || 'all',
        incident_type: searchParams.get('incident_type') || 'all',
        resident_id: searchParams.get('resident_id') || '',
        branch_id: searchParams.get('branch_id') || '',
        assigned_to: searchParams.get('assigned_to') || 'all',
        search: searchParams.get('search') || '',
        date_from: searchParams.get('date_from') || '',
        date_to: searchParams.get('date_to') || '',
    });
    const [attachments, setAttachments] = useState([]);
    
    // Initialize react-hook-form
    const methods = useForm({
        defaultValues: {
            resident_id: '',
            branch_id: '',
            incident_type: '',
            description: '',
            incident_date: new Date().toISOString().slice(0, 16),
            location: '',
            severity: 'low',
            priority: 'medium',
            status: 'open',
            action_taken: '',
            witnesses: '',
            follow_up: '',
            assigned_to: '',
        },
    });

    // Fetch incidents
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['incidents', filters],
        queryFn: async () => {
            const params = { per_page: 50 };
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== 'all') {
                    params[key] = filters[key];
                }
            });
            const response = await api.get('/incidents', { params });
            return response.data;
        },
        retry: 1,
    });

    // Watch branch_id from form to fetch residents and reset resident when branch changes
    const branchId = methods.watch('branch_id');
    
    useEffect(() => {
        if (branchId) {
            methods.setValue('resident_id', '');
        }
    }, [branchId, methods]);
    
    // Fetch residents
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', branchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchId) params.branch_id = branchId;
            return (await api.get('/residents', { params })).data;
        },
        enabled: !!branchId, // Only fetch when branch is selected
    });

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return {
                ...response.data,
                data: branches.filter(b => b.is_active !== false)
            };
        },
    });

    // Fetch users for assignment
    const { data: usersData } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            return (await api.get('/users', { params: { per_page: 100 } })).data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (formDataToSend) => {
            return await api.post('/incidents', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            handleCloseForm();
            toast.success('Incident created successfully');
        },
        onError: (error) => {
            console.error('Error creating incident:', error);
            toast.error(error.response?.data?.message || 'Failed to create incident');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return await api.put(`/incidents/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            handleCloseForm();
            toast.success('Incident updated successfully');
        },
        onError: (error) => {
            console.error('Error updating incident:', error);
            toast.error(error.response?.data?.message || 'Failed to update incident');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await api.delete(`/incidents/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            toast.success('Incident deleted successfully');
        },
        onError: (error) => {
            console.error('Error deleting incident:', error);
            toast.error(error.response?.data?.message || 'Failed to delete incident');
        },
    });

    const markResolvedMutation = useMutation({
        mutationFn: async ({ id, notes }) => {
            return await api.post(`/incidents/${id}/mark-resolved`, { notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            toast.success('Incident marked as resolved');
        },
    });

    const markClosedMutation = useMutation({
        mutationFn: async ({ id, notes }) => {
            return await api.post(`/incidents/${id}/mark-closed`, { notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            toast.success('Incident marked as closed');
        },
    });

    const handleOpenForm = (incident = null) => {
        if (incident) {
            setSelectedIncident(incident);
            methods.reset({
                resident_id: incident.resident_id || '',
                branch_id: incident.branch_id || '',
                incident_type: incident.incident_type || '',
                description: incident.description || '',
                incident_date: incident.incident_date ? new Date(incident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                location: incident.location || '',
                severity: incident.severity || 'low',
                priority: incident.priority || 'medium',
                status: incident.status || 'open',
                action_taken: incident.action_taken || '',
                witnesses: incident.witnesses || '',
                follow_up: incident.follow_up || '',
                assigned_to: incident.assigned_to || '',
            });
        } else {
            setSelectedIncident(null);
            methods.reset({
                resident_id: '',
                branch_id: '',
                incident_type: '',
                description: '',
                incident_date: new Date().toISOString().slice(0, 16),
                location: '',
                severity: 'low',
                priority: 'medium',
                status: 'open',
                action_taken: '',
                witnesses: '',
                follow_up: '',
                assigned_to: '',
            });
        }
        setAttachments([]);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedIncident(null);
        methods.reset();
        setAttachments([]);
    };

    const handleSubmit = (data) => {
        if (selectedIncident) {
            updateMutation.mutate({ id: selectedIncident.id, data });
        } else {
            // For create, we need to handle file uploads
            const formDataToSend = new FormData();
            
            Object.keys(data).forEach(key => {
                if (data[key] && key !== 'attachments') {
                    formDataToSend.append(key, data[key]);
                }
            });

            // Add attachments
            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    formDataToSend.append(`attachments[${index}][file]`, file);
                    formDataToSend.append(`attachments[${index}][file_type]`, file.type.startsWith('image/') ? 'photo' : 'document');
                }
            });

            createMutation.mutate(formDataToSend);
        }
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        
        // Update URL params
        const newParams = new URLSearchParams();
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] && newFilters[k] !== 'all') {
                newParams.set(k, newFilters[k]);
            }
        });
        setSearchParams(newParams);
    };

    const incidents = data?.data || [];
    const residents = residentsData?.data || [];
    const branches = branchesData?.data || [];
    const users = usersData?.data || [];

    // If view modal is open, show view as full page
    if (showViewModal && selectedIncident) {
        return (
            <ViewIncident
                incident={selectedIncident}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedIncident(null);
                }}
                onEdit={() => {
                    setShowViewModal(false);
                    handleOpenForm(selectedIncident);
                }}
            />
        );
    }

    // If form is open, show form as full page (like Expenses form)
    if (showForm) {
        return (
            <IncidentForm
                record={selectedIncident}
                branches={branches}
                residents={residents}
                users={users}
                attachments={attachments}
                setAttachments={setAttachments}
                onClose={handleCloseForm}
                onSuccess={() => {
                    handleCloseForm();
                    queryClient.invalidateQueries(['incidents']);
                }}
                createMutation={createMutation}
                updateMutation={updateMutation}
                methods={methods}
                branchId={branchId}
            />
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <SectionCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                            Incidents
                        </h1>
                        <p className="text-gray-600 mt-1">Manage and track facility incidents</p>
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition"
                    >
                        <Plus className="w-5 h-5" />
                        New Incident
                    </button>
                </div>
            </SectionCard>


            {/* Incidents List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading incidents...</p>
                </div>
            ) : error ? (
                <Card>
                    <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">Failed to load incidents</p>
                        <button
                            onClick={() => refetch()}
                            className="mt-4 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)]"
                        >
                            Retry
                        </button>
                    </div>
                </Card>
            ) : incidents.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No incidents found</p>
                        <button
                            onClick={() => handleOpenForm()}
                            className="mt-4 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)]"
                        >
                            Create First Incident
                        </button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {incidents.map((incident) => (
                        <Card key={incident.id} className="hover:shadow-lg transition">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm font-semibold text-[var(--theme-primary)]">
                                            {incident.incident_number}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.low}`}>
                                            {incident.severity?.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.medium}`}>
                                            {incident.priority?.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[incident.status] || STATUS_COLORS.open}`}>
                                            {incident.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {incident.incident_type}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span>
                                                {incident.resident?.first_name} {incident.resident?.last_name}
                                            </span>
                                        </div>
                                        {incident.location && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4" />
                                                <span>{incident.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {new Date(incident.incident_date).toLocaleString()}
                                            </span>
                                        </div>
                                        {incident.assigned_to && incident.assigned_to_user && (
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                <span>Assigned to: {incident.assigned_to_user.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                                        {incident.description}
                                    </p>

                                    {incident.attachments && incident.attachments.length > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                            <FileText className="w-4 h-4" />
                                            <span>{incident.attachments.length} attachment(s)</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => {
                                            setSelectedIncident(incident);
                                            setShowViewModal(true);
                                        }}
                                        className="p-2.5 border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-all shadow-sm"
                                        title="View"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleOpenForm(incident)}
                                        className="p-2.5 border-2 border-[var(--theme-primary)] bg-white text-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg)] hover:border-[var(--theme-primary-dark)] rounded-lg transition-all shadow-sm"
                                        title="Edit"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    {incident.status !== 'resolved' && incident.status !== 'closed' && (
                                        <button
                                            onClick={() => {
                                                if (incident.status === 'resolved') {
                                                    markClosedMutation.mutate({ id: incident.id, notes: '' });
                                                } else {
                                                    markResolvedMutation.mutate({ id: incident.id, notes: '' });
                                                }
                                            }}
                                            className="p-2.5 border-2 border-green-400 bg-white text-green-700 hover:bg-green-50 hover:border-green-500 rounded-lg transition-all shadow-sm"
                                            title={incident.status === 'resolved' ? 'Mark Closed' : 'Mark Resolved'}
                                        >
                                            {incident.status === 'resolved' ? (
                                                <Lock className="w-5 h-5" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this incident?')) {
                                                deleteMutation.mutate(incident.id);
                                            }
                                        }}
                                        className="p-2.5 border-2 border-red-400 bg-white text-red-700 hover:bg-red-50 hover:border-red-500 rounded-lg transition-all shadow-sm"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

        </div>
    );
}

// Incident Form Component (Full Page Form like Expenses)
function IncidentForm({ record, branches, residents, users, attachments, setAttachments, onClose, onSuccess, createMutation, updateMutation, methods, branchId }) {
    const handleSubmit = (data) => {
        if (record) {
            updateMutation.mutate({ id: record.id, data });
        } else {
            // For create, we need to handle file uploads
            const formDataToSend = new FormData();
            
            Object.keys(data).forEach(key => {
                if (data[key] && key !== 'attachments') {
                    formDataToSend.append(key, data[key]);
                }
            });

            // Add attachments
            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    formDataToSend.append(`attachments[${index}][file]`, file);
                    formDataToSend.append(`attachments[${index}][file_type]`, file.type.startsWith('image/') ? 'photo' : 'document');
                }
            });

            createMutation.mutate(formDataToSend);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Incident' : 'Add Incident'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect
                                    name="branch_id"
                                    label="Branch"
                                    required
                                    placeholder="Select Branch"
                                    options={branches.map(branch => ({ value: branch.id, label: branch.name }))}
                                />

                                <FormSelect
                                    name="resident_id"
                                    label="Resident"
                                    required
                                    placeholder="Select Resident"
                                    options={residents
                                        .filter(r => !branchId || r.branch_id == branchId)
                                        .map(resident => ({ 
                                            value: resident.id, 
                                            label: `${resident.first_name} ${resident.last_name}` 
                                        }))}
                                    disabled={!branchId}
                                />

                                <FormSelect
                                    name="incident_type"
                                    label="Incident Type"
                                    required
                                    placeholder="Select Type"
                                    options={INCIDENT_TYPES.map(type => ({ value: type, label: type }))}
                                />

                                <FormInput
                                    name="incident_date"
                                    label="Incident Date & Time"
                                    type="datetime-local"
                                    required
                                />

                                <FormInput
                                    name="location"
                                    label="Location"
                                    placeholder="e.g., Room 101, Main Hallway"
                                />

                                <FormSelect
                                    name="severity"
                                    label="Severity"
                                    required
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' },
                                    ]}
                                />

                                <FormSelect
                                    name="priority"
                                    label="Priority"
                                    required
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' },
                                    ]}
                                />

                                <FormSelect
                                    name="status"
                                    label="Status"
                                    required
                                    options={[
                                        { value: 'open', label: 'Open' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'resolved', label: 'Resolved' },
                                        { value: 'closed', label: 'Closed' },
                                        { value: 'on_hold', label: 'On Hold' },
                                    ]}
                                />

                                <FormSelect
                                    name="assigned_to"
                                    label="Assigned To"
                                    placeholder="Unassigned"
                                    options={[
                                        { value: '', label: 'Unassigned' },
                                        ...users
                                            .filter(u => u.is_active !== false)
                                            .map(user => ({ value: user.id, label: user.name }))
                                    ]}
                                />
                            </div>

                    <FormTextarea
                        name="description"
                        label="Description"
                        required
                        rows={4}
                        placeholder="Provide a detailed description of the incident..."
                    />

                    <FormTextarea
                        name="action_taken"
                        label="Action Taken"
                        rows={3}
                        placeholder="Describe the immediate actions taken..."
                    />

                    <FormTextarea
                        name="witnesses"
                        label="Witnesses"
                        rows={2}
                        placeholder="List any witnesses (names and roles)..."
                    />

                    <FormTextarea
                        name="follow_up"
                        label="Follow-up Actions"
                        rows={3}
                        placeholder="Describe planned or completed follow-up actions..."
                    />

                    {!record && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Attachments
                            </label>
                            <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => setAttachments(Array.from(e.target.files))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {attachments.map((file, index) => (
                                        <span key={index} className="px-2 py-1 bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] rounded text-sm">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : record
                                ? 'Update Incident'
                                : 'Create Incident'}
                        </button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}

// View Incident Component (Full Page View)
function ViewIncident({ incident, onClose, onEdit }) {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-hover)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <AlertTriangle className="w-8 h-8" />
                                    Incident Details
                                </h1>
                                <p className="text-white/90 mt-1">Comprehensive incident information and documentation</p>
                            </div>
                        </div>
                        <button
                            onClick={onEdit}
                            className="px-6 py-2 bg-white text-[var(--theme-primary)] rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Incident
                        </button>
                    </div>
                </div>

                {/* Quick Info Cards */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${STATUS_COLORS[incident.status] || STATUS_COLORS.open}`}>
                                {incident.status?.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-blue-900 font-medium">Current Status</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Severity</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.low}`}>
                                {incident.severity?.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-red-900 font-medium">Severity Level</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Priority</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.medium}`}>
                                {incident.priority?.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-orange-900 font-medium">Priority Level</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">ID</span>
                            <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-900 font-mono font-semibold">{incident.incident_number}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Incident Information */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[var(--theme-primary)]">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-[var(--theme-primary)]" />
                                Incident Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        <FileText className="w-4 h-4" />
                                        Incident Type
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{incident.incident_type}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        <Calendar className="w-4 h-4" />
                                        Date & Time
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{new Date(incident.incident_date).toLocaleString()}</p>
                                </div>
                                {incident.location && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <MapPin className="w-4 h-4" />
                                            Location
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">{incident.location}</p>
                                    </div>
                                )}
                                {incident.resident && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <User className="w-4 h-4" />
                                            Resident
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {incident.resident.first_name} {incident.resident.last_name}
                                        </p>
                                    </div>
                                )}
                                {incident.assigned_to_user && (
                                    <div className="space-y-1 md:col-span-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <User className="w-4 h-4" />
                                            Assigned To
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">{incident.assigned_to_user.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-blue-500">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" />
                                Description
                            </h2>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Taken */}
                    {incident.action_taken && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-green-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                    Action Taken
                                </h2>
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.action_taken}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Follow-up Actions */}
                    {incident.follow_up && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-purple-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-purple-500" />
                                    Follow-up Actions
                                </h2>
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.follow_up}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {incident.attachments && incident.attachments.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-indigo-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-6 h-6 text-indigo-500" />
                                    Attachments ({incident.attachments.length})
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {incident.attachments.map((attachment, index) => (
                                        <div key={index} className="group relative border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[var(--theme-primary)] transition-all hover:shadow-lg">
                                            {attachment.file_type === 'photo' ? (
                                                <div className="relative">
                                                    <img 
                                                        src={attachment.file_url} 
                                                        alt={`Attachment ${index + 1}`}
                                                        className="w-full h-40 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                                                    <FileText className="w-12 h-12 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="p-3 bg-white">
                                                <p className="text-xs font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Sidebar Info */}
                <div className="space-y-6">
                    {/* Witnesses */}
                    {incident.witnesses && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-yellow-500">
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-yellow-500" />
                                    Witnesses
                                </h2>
                                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{incident.witnesses}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={onEdit}
                                    className="w-full px-4 py-3 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Incident
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Back to List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

