import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Search, Users, Plus, Edit, XCircle, CheckCircle, Filter } from 'lucide-react';

export default function Residents() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    
    const { data, isLoading, error } = useQuery({
        queryKey: ['residents', search, branchFilter, statusFilter],
        queryFn: async () => {
            try {
                const params = { per_page: 50, show_all: true }; // Show all by default
                if (search) params.search = search;
                if (branchFilter) params.branch_id = branchFilter;
                if (statusFilter) params.status = statusFilter;
                
                const response = await api.get('/residents', { params });
                console.log('Residents API Response:', response.data); // Debug log
                return response.data;
            } catch (err) {
                console.error('Error fetching residents:', err);
                throw err;
            }
        },
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            return await api.put(`/residents/${id}`, { is_active: !isActive });
        },
        onSuccess: () => queryClient.invalidateQueries(['residents']),
    });

    return (
        <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">All Residents</h2>
                        <p className="text-gray-600">Search and view details for all residents in the facility.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Resident</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or room number..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        />
                    </div>

                    {/* Branch Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Branches</option>
                            {branchesData?.data?.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">
                        Error loading residents: {error.response?.data?.message || error.message}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading residents...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.data?.length > 0 ? (
                        data.data
                            .filter(resident => {
                                if (statusFilter === 'active') return resident.is_active !== false;
                                if (statusFilter === 'inactive') return resident.is_active === false;
                                return true;
                            })
                            .map((resident) => (
                        <div key={resident.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3 flex-1">
                                    {resident.profile_image ? (
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                            <img 
                                                src={`/storage/${resident.profile_image}`} 
                                                alt={`${resident.first_name} ${resident.last_name}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(resident.first_name + ' ' + resident.last_name)}&background=2D5016&color=fff&size=128`;
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-[#2D5016] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                            {resident.first_name?.[0]?.toUpperCase() || ''}{resident.last_name?.[0]?.toUpperCase() || ''}
                                        </div>
                                    )}
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {resident.first_name} {resident.middle_names ? resident.middle_names + ' ' : ''}{resident.last_name}
                                </h3>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditing(resident);
                                            setShowForm(true);
                                        }}
                                        className="p-2 text-[#2D5016] hover:bg-green-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const action = resident.is_active ? 'deactivate' : 'activate';
                                            if (window.confirm(`Are you sure you want to ${action} this resident?`)) {
                                                toggleActiveMutation.mutate({ id: resident.id, isActive: resident.is_active });
                                            }
                                        }}
                                        className={`p-2 rounded-lg transition-colors ${
                                            resident.is_active 
                                                ? 'text-[#8B4513] hover:bg-amber-50' 
                                                : 'text-green-600 hover:bg-green-50'
                                        }`}
                                        title={resident.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {resident.is_active ? (
                                            <XCircle className="w-4 h-4" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                {resident.branch && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Branch:</span>
                                        <span className="font-medium text-gray-900">{resident.branch.name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room:</span>
                                    <span className="font-medium text-gray-900">{resident.room_number || resident.room || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">DOB:</span>
                                    <span className="font-medium text-gray-900">
                                        {resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Admission:</span>
                                    <span className="font-medium text-gray-900">
                                        {resident.admission_date ? new Date(resident.admission_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                                {resident.allergies && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Allergies:</span>
                                        <span className="font-medium text-gray-900">{Array.isArray(resident.allergies) ? resident.allergies.join(', ') : resident.allergies}</span>
                                    </div>
                                )}
                                {resident.diagnosis && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Diagnosis:</span>
                                        <span className="font-medium text-gray-900">{resident.diagnosis}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No residents found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {search 
                                    ? 'No residents match your search.' 
                                    : 'No residents found in the system.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {showForm && (
                <ResidentForm
                    record={editing}
                    branches={branchesData?.data || []}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['residents']);
                    }}
                />
            )}
        </div>
    );
}

// Resident Form Component
function ResidentForm({ record, branches, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        first_name: record?.first_name || '',
        middle_names: record?.middle_names || '',
        last_name: record?.last_name || '',
        date_of_birth: record?.date_of_birth || '',
        gender: record?.gender || '',
        phone: record?.phone || '',
        room: record?.room || '',
        room_number: record?.room_number || '',
        branch_id: record?.branch_id || '',
        admission_date: record?.admission_date || new Date().toISOString().split('T')[0],
        emergency_contact_name: record?.emergency_contact_name || '',
        emergency_contact_phone: record?.emergency_contact_phone || '',
        diagnosis: record?.diagnosis || '',
        allergies: record?.allergies || '',
        medical_conditions: record?.medical_conditions || '',
        physician_name: record?.physician_name || '',
        is_active: record?.is_active ?? true,
    });

    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(
        record?.profile_image ? `/storage/${record.profile_image}` : null
    );

    // Helper function to format date for input field (YYYY-MM-DD)
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        // If it's already in YYYY-MM-DD format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        // If it's a Date object, convert to YYYY-MM-DD
        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
        }
        // If it's a string date, try to parse it
        try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            // If parsing fails, return empty string
        }
        return '';
    };

    // Update formData when record changes
    React.useEffect(() => {
        if (record) {
            // Handle allergies and medical_conditions - convert arrays to strings for form
            const allergiesValue = Array.isArray(record.allergies) 
                ? record.allergies.join(', ') 
                : (record.allergies || '');
            
            const medicalConditionsValue = Array.isArray(record.medical_conditions) 
                ? record.medical_conditions.join(', ') 
                : (record.medical_conditions || '');

            setFormData({
                first_name: record.first_name || '',
                middle_names: record.middle_names || '',
                last_name: record.last_name || '',
                date_of_birth: formatDateForInput(record.date_of_birth),
                gender: record.gender || '',
                phone: record.phone || '',
                room: record.room || '',
                room_number: record.room_number || '',
                branch_id: record.branch_id || '',
                admission_date: formatDateForInput(record.admission_date) || new Date().toISOString().split('T')[0],
                emergency_contact_name: record.emergency_contact_name || '',
                emergency_contact_phone: record.emergency_contact_phone || '',
                diagnosis: record.diagnosis || '',
                allergies: allergiesValue,
                medical_conditions: medicalConditionsValue,
                physician_name: record.physician_name || '',
                is_active: record.is_active ?? true,
            });
        } else {
            // Reset to defaults when no record (creating new)
            setFormData({
                first_name: '',
                middle_names: '',
                last_name: '',
                date_of_birth: '',
                gender: '',
                phone: '',
                room: '',
                room_number: '',
                branch_id: '',
                admission_date: new Date().toISOString().split('T')[0],
                emergency_contact_name: '',
                emergency_contact_phone: '',
                diagnosis: '',
                allergies: '',
                medical_conditions: '',
                physician_name: '',
                is_active: true,
            });
        }

        // Reset profile image preview
        if (record?.profile_image) {
            setProfileImagePreview(`/storage/${record.profile_image}`);
        } else {
            setProfileImagePreview(null);
        }
        setProfileImage(null);
    }, [record]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('=== FORM SUBMIT HANDLER CALLED ===');
        setErrors({});
        setSuccessMessage('');
        
        // Basic frontend validation
        console.log('Checking validation...', { 
            first_name: formData.first_name, 
            last_name: formData.last_name, 
            date_of_birth: formData.date_of_birth,
            branch_id: formData.branch_id,
            admission_date: formData.admission_date
        });
        
        const validationErrors = {};
        if (!formData.first_name || formData.first_name.trim() === '') {
            validationErrors.first_name = ['First name is required'];
        }
        if (!formData.last_name || formData.last_name.trim() === '') {
            validationErrors.last_name = ['Last name is required'];
        }
        if (!formData.date_of_birth) {
            validationErrors.date_of_birth = ['Date of birth is required'];
        }
        if (!formData.branch_id) {
            validationErrors.branch_id = ['Branch is required'];
        }
        if (!formData.admission_date) {
            validationErrors.admission_date = ['Admission date is required'];
        }
        
        if (Object.keys(validationErrors).length > 0) {
            console.log('Validation failed:', validationErrors);
            setErrors(validationErrors);
            return;
        }
        
        console.log('Validation passed, proceeding with submission...');
        setIsSubmitting(true);

        // Helper to normalize date format (YYYY-MM-DD)
        const normalizeDate = (dateValue) => {
            if (!dateValue) return '';
            // If it's already in YYYY-MM-DD format, return as-is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                return dateValue;
            }
            // If it's in MM/DD/YYYY format, convert it
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
                const [month, day, year] = dateValue.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            // Try to parse as date
            try {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            } catch (e) {
                console.warn('Could not parse date:', dateValue);
            }
            return dateValue;
        };

        console.log('Form submission started', { formData, profileImage: !!profileImage, record: !!record });
        console.log('Auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');

        try {
            // Normalize dates before sending
            const normalizedDateOfBirth = normalizeDate(formData.date_of_birth);
            const normalizedAdmissionDate = normalizeDate(formData.admission_date);
            
            console.log('Date normalization:', {
                original_dob: formData.date_of_birth,
                normalized_dob: normalizedDateOfBirth,
                original_admission: formData.admission_date,
                normalized_admission: normalizedAdmissionDate
            });

            // Use FormData if there's an image, otherwise use JSON
            let response;
            if (profileImage) {
                const formDataToSend = new FormData();
                
                // Always include required fields
                formDataToSend.append('first_name', formData.first_name || '');
                formDataToSend.append('last_name', formData.last_name || '');
                formDataToSend.append('date_of_birth', normalizedDateOfBirth);
                formDataToSend.append('branch_id', parseInt(formData.branch_id) || '');
                formDataToSend.append('admission_date', normalizedAdmissionDate);
                
                // Include optional fields (convert empty strings to null for nullable fields)
                const optionalFields = [
                    'middle_names', 'gender', 'phone', 'room', 'room_number',
                    'emergency_contact_name', 'emergency_contact_phone',
                    'diagnosis', 'allergies', 'medical_conditions', 'physician_name', 'status'
                ];
                
                optionalFields.forEach(key => {
                    const value = formData[key];
                    if (value !== null && value !== undefined && value !== '') {
                        formDataToSend.append(key, value);
                    }
                });
                
                // Handle boolean field
                if (formData.is_active !== null && formData.is_active !== undefined) {
                    formDataToSend.append('is_active', formData.is_active ? '1' : '0');
                }
                
                formDataToSend.append('profile_image', profileImage);

                // Don't set Content-Type - let browser set it automatically for FormData
                const config = {};

            if (record) {
                    // For file uploads with PUT, use post with _method override
                    formDataToSend.append('_method', 'PUT');
                    response = await api.post(`/residents/${record.id}`, formDataToSend, config);
                } else {
                    response = await api.post('/residents', formDataToSend, config);
                }
                console.log('Resident saved successfully (with image):', response.data);
            } else {
                // Clean up empty strings - convert to null for optional fields
                const payload = {};
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (value === '' || value === null || value === undefined) {
                        // Keep required fields as-is, set optional ones to null
                        if (['first_name', 'last_name', 'date_of_birth', 'branch_id', 'admission_date'].includes(key)) {
                            payload[key] = value;
                        } else {
                            payload[key] = null;
                        }
                    } else {
                        payload[key] = value;
                    }
                });
                
                // Normalize dates in JSON payload
                payload.date_of_birth = normalizedDateOfBirth;
                payload.admission_date = normalizedAdmissionDate;
                payload.branch_id = parseInt(formData.branch_id);

                if (record) {
                    response = await api.put(`/residents/${record.id}`, payload);
                } else {
                    response = await api.post('/residents', payload);
                }
                console.log('Resident saved successfully:', response.data);
            }
            
            console.log('Form submission successful');
            // Show success message
            setSuccessMessage(record ? 'Resident updated successfully!' : 'Resident created successfully!');
            
            // Wait a moment so user can see the success message, then close
            setTimeout(() => {
            onSuccess();
            }, 1500);
        } catch (error) {
            console.error('Error saving resident:', error);
            console.error('Error response:', error.response);
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
            setIsSubmitting(false);
            
            // Handle different error types
            if (error.response) {
                // Server responded with error status
                if (error.response.status === 401 || error.response.status === 403) {
                    setErrors({ general: 'Authentication failed. Please log in again.' });
                    setTimeout(() => {
                        window.location.href = '/app/login';
                    }, 2000);
                } else if (error.response.status === 422) {
                    // Validation errors - show detailed field errors
                    console.log('422 Validation errors:', error.response.data);
                    if (error.response.data?.errors) {
                        // Laravel validation errors format
                        const validationErrors = error.response.data.errors;
                        console.log('Field validation errors:', validationErrors);
                        setErrors(validationErrors);
                        // Also show a general message
                        const errorMessages = Object.values(validationErrors).flat();
                        if (errorMessages.length > 0) {
                            setErrors({ 
                                ...validationErrors,
                                general: `Validation failed: ${errorMessages.join(', ')}` 
                            });
                        }
                    } else if (error.response.data?.message) {
                        setErrors({ general: error.response.data.message });
                    } else {
                        setErrors({ general: 'Validation failed. Please check all required fields are filled correctly.' });
                    }
                } else if (error.response.status === 500) {
                    // Server error - show more details if available
                    console.error('500 Server Error:', error.response.data);
                    const errorMessage = error.response.data?.message || 
                                       error.response.data?.error || 
                                       'A server error occurred. Please check the server logs or try again later.';
                    setErrors({ 
                        general: `Server Error: ${errorMessage}. Please check your input and try again. If the problem persists, contact support.` 
                    });
                } else if (error.response.data?.errors) {
                setErrors(error.response.data.errors);
                } else {
                    setErrors({ general: error.response.data?.message || `Failed to save resident (Error ${error.response.status}). Please try again.` });
                }
            } else if (error.request) {
                // Request was made but no response received
                setErrors({ general: 'No response from server. Please check your internet connection and try again.' });
            } else {
                // Something else happened
                setErrors({ general: error.message || 'An unexpected error occurred. Please try again.' });
            }
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {record ? 'Edit Resident' : 'Add Resident'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-green-800">{successMessage}</p>
                            </div>
                        </div>
                    )}
                    {errors.general && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-red-800">{errors.general}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                            
                            {/* Profile Picture */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Profile Picture
                                </label>
                                <div className="flex items-center space-x-4">
                                    {profileImagePreview && (
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
                                            <img 
                                                src={profileImagePreview} 
                                                alt="Profile preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="block text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-lg file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-[#2D5016] file:text-white
                                                hover:file:bg-[#1a3009]
                                                file:cursor-pointer"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            JPG, PNG or GIF. Max size: 2MB
                                        </p>
                                    </div>
                                </div>
                                {errors.profile_image && <p className="text-xs text-red-600 mt-1">{errors.profile_image[0]}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                    {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Middle Names
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.middle_names}
                                        onChange={(e) => setFormData({...formData, middle_names: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                    {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date of Birth *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                        required
                                        max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                    {errors.date_of_birth && <p className="text-xs text-red-600 mt-1">{errors.date_of_birth[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender
                                    </label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Branch *
                                    </label>
                                    <select
                                        value={formData.branch_id}
                                        onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
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
                                        Room Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.room_number}
                                        onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Admission Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.admission_date}
                                        onChange={(e) => setFormData({...formData, admission_date: e.target.value})}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                    {errors.admission_date && <p className="text-xs text-red-600 mt-1">{errors.admission_date[0]}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Medical Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Diagnosis
                                    </label>
                                    <textarea
                                        value={formData.diagnosis}
                                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        placeholder="Enter primary medical diagnosis..."
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Allergies
                                    </label>
                                    <textarea
                                        value={formData.allergies}
                                        onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        placeholder="List any known allergies..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Physician Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.physician_name}
                                        onChange={(e) => setFormData({...formData, physician_name: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Additional Medical Conditions
                                    </label>
                                    <textarea
                                        value={formData.medical_conditions}
                                        onChange={(e) => setFormData({...formData, medical_conditions: e.target.value})}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        placeholder="List any additional medical conditions..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.emergency_contact_name}
                                        onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.emergency_contact_phone}
                                        onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>
                            </div>
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
                                className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {isSubmitting && (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                <span>{isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

