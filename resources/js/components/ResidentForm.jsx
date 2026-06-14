import React, { useState, useEffect } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import { X } from 'lucide-react';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function ResidentForm({ record, branches, onClose, onSuccess, selectedBranchId, inModal = false }) {
    const [formData, setFormData] = useState({
        first_name: record?.first_name || '',
        middle_names: record?.middle_names || '',
        last_name: record?.last_name || '',
        date_of_birth: record?.date_of_birth || '',
        gender: record?.gender || '',
        phone: record?.phone ? formatPhoneNumber(record.phone) : '',
        room: record?.room || '',
        room_number: record?.room_number || '',
        branch_id: selectedBranchId ? String(selectedBranchId) : (record?.branch_id || ''),
        admission_date: record?.admission_date || new Date().toISOString().split('T')[0],
        emergency_contact_name: record?.emergency_contact_name || '',
        emergency_contact_phone: record?.emergency_contact_phone ? formatPhoneNumber(record.emergency_contact_phone) : '',
        diagnosis: record?.diagnosis || '',
        allergies: record?.allergies || '',
        medical_conditions: record?.medical_conditions || '',
        medicare_number: record?.medicare_number || '',
        primary_care_doctor: record?.primary_care_doctor || '',
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
    useEffect(() => {
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
                phone: record.phone ? formatPhoneNumber(record.phone) : '',
                room: record.room || '',
                room_number: record.room_number || '',
                branch_id: selectedBranchId ? String(selectedBranchId) : (record.branch_id || ''),
                admission_date: formatDateForInput(record.admission_date) || new Date().toISOString().split('T')[0],
                emergency_contact_name: record.emergency_contact_name || '',
                emergency_contact_phone: record.emergency_contact_phone ? formatPhoneNumber(record.emergency_contact_phone) : '',
                diagnosis: record.diagnosis || '',
                allergies: allergiesValue,
                medical_conditions: medicalConditionsValue,
                medicare_number: record.medicare_number || '',
                primary_care_doctor: record.primary_care_doctor || '',
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
                branch_id: selectedBranchId ? String(selectedBranchId) : '',
                admission_date: new Date().toISOString().split('T')[0],
                emergency_contact_name: '',
                emergency_contact_phone: '',
                diagnosis: '',
                allergies: '',
                medical_conditions: '',
                medicare_number: '',
                primary_care_doctor: '',
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
    }, [record, selectedBranchId]);

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
        setErrors({});
        setSuccessMessage('');
        
        // Basic frontend validation
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
        // Validate branch_id unless it's provided via selectedBranchId prop
        if (!formData.branch_id && !selectedBranchId) {
            validationErrors.branch_id = ['Branch is required'];
        }
        if (!formData.admission_date) {
            validationErrors.admission_date = ['Admission date is required'];
        }
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
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
                logger.warn('Could not parse date:', dateValue);
            }
            return dateValue;
        };

        try {
            // Normalize dates before sending
            const normalizedDateOfBirth = normalizeDate(formData.date_of_birth);
            const normalizedAdmissionDate = normalizeDate(formData.admission_date);
            
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
                
                // Include optional fields - always send allergies and medical_conditions as strings
                const optionalFields = [
                    'middle_names', 'gender', 'phone', 'room', 'room_number',
                    'emergency_contact_name', 'emergency_contact_phone',
                    'diagnosis', 'medicare_number', 'primary_care_doctor', 'status'
                ];
                
                optionalFields.forEach(key => {
                    const value = formData[key];
                    if (value !== null && value !== undefined && value !== '') {
                        formDataToSend.append(key, value);
                    }
                });
                
                // Set physician_name to null (field removed from form)
                formDataToSend.append('physician_name', '');
                
                // Always send allergies and medical_conditions as strings (even if empty)
                formDataToSend.append('allergies', formData.allergies || '');
                formDataToSend.append('medical_conditions', formData.medical_conditions || '');
                
                // Handle boolean field
                if (formData.is_active !== null && formData.is_active !== undefined) {
                    formDataToSend.append('is_active', formData.is_active ? '1' : '0');
                }
                
                formDataToSend.append('profile_image', profileImage);

                if (record) {
                    // For file uploads with PUT, use post with _method override
                    formDataToSend.append('_method', 'PUT');
                    response = await api.post(`/residents/${record.id}`, formDataToSend);
                } else {
                    response = await api.post('/residents', formDataToSend);
                }
            } else {
                // Clean up empty strings - convert to null for optional fields, but keep allergies/medical_conditions as strings
                const payload = {};
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (value === '' || value === null || value === undefined) {
                        // Keep required fields as-is, set optional ones to null
                        if (['first_name', 'last_name', 'date_of_birth', 'branch_id', 'admission_date'].includes(key)) {
                            payload[key] = value;
                        } else if (key === 'allergies' || key === 'medical_conditions') {
                            // Always send allergies and medical_conditions as empty strings (not null)
                            payload[key] = '';
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
                
                // Ensure allergies and medical_conditions are always strings
                payload.allergies = formData.allergies || '';
                payload.medical_conditions = formData.medical_conditions || '';
                
                // Set physician_name to null (field removed from form)
                payload.physician_name = null;

                if (record) {
                    response = await api.put(`/residents/${record.id}`, payload);
                } else {
                    response = await api.post('/residents', payload);
                }
            }
            
            // Show success message
            setSuccessMessage(record ? 'Resident updated successfully!' : 'Resident created successfully!');
            
            // Wait a moment so user can see the success message, then close
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (error) {
            logger.error('Error saving resident:', error);
            setIsSubmitting(false);
            
            if (error.response) {
                if (error.response.status === 422 && error.response.data?.errors) {
                    setErrors(error.response.data.errors);
                } else {
                    setErrors({ general: error.response.data?.message || 'Failed to save resident. Please try again.' });
                }
            } else {
                setErrors({ general: error.message || 'An unexpected error occurred.' });
            }
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6 max-h-[90vh] overflow-y-auto'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {record ? 'Edit Resident' : 'Add Resident'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}

            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
            )}
            
            {errors.general && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Profile Picture
                        </label>
                        <div className="flex items-center space-x-4">
                            {profileImagePreview && (
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
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
                                        file:bg-[var(--theme-primary)] file:text-white
                                        hover:file:bg-[var(--theme-primary-hover)]
                                        file:cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">First Name *</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                            {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Middle Names</label>
                            <input
                                type="text"
                                value={formData.middle_names}
                                onChange={(e) => setFormData({...formData, middle_names: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Last Name *</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                            {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Date of Birth *</label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>

                        {!selectedBranchId && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-1">Branch *</label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Room Number</label>
                            <input
                                type="text"
                                value={formData.room_number || formData.room}
                                onChange={(e) => setFormData({...formData, room_number: e.target.value, room: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Admission Date *</label>
                            <input
                                type="date"
                                value={formData.admission_date}
                                onChange={(e) => setFormData({...formData, admission_date: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-t pt-6">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Diagnosis</label>
                            <textarea
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Allergies</label>
                            <textarea
                                value={formData.allergies}
                                onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Medicare Number</label>
                            <input
                                type="text"
                                value={formData.medicare_number}
                                onChange={(e) => setFormData({...formData, medicare_number: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Physician</label>
                            <input
                                type="text"
                                value={formData.primary_care_doctor}
                                onChange={(e) => setFormData({...formData, primary_care_doctor: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
}
