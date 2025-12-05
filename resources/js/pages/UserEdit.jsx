import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
    ArrowLeft, Save, User, Mail, Phone, Calendar, Briefcase,
    Shield, MapPin, Award, Clock, Building2, Upload, X, Eye, EyeOff
} from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

// Shared form state context
const FormContext = React.createContext();

function FormProvider({ children, initialData }) {
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        
        // If it's already a Date object
        if (dateString instanceof Date) {
            const year = dateString.getFullYear();
            const month = String(dateString.getMonth() + 1).padStart(2, '0');
            const day = String(dateString.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // If it's not a string, try to convert
        if (typeof dateString !== 'string') {
            try {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            } catch (e) {
                console.warn('Failed to parse date (non-string):', dateString, e);
            }
            return '';
        }
        
        // If it's already in YYYY-MM-DD format (Laravel date cast format)
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateString;
        }
        
        // Handle Laravel ISO datetime format (YYYY-MM-DDTHH:mm:ss.uuuuuuZ or YYYY-MM-DD HH:mm:ss)
        // Extract just the date part
        const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            return dateMatch[1];
        }
        
        // Try to parse various date formats
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                // Format as YYYY-MM-DD for HTML date input
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            console.warn('Failed to parse date:', dateString, e);
        }
        
        return '';
    };

    const [formData, setFormData] = useState(() => {
        // Initialize with initialData if available, otherwise use defaults
        if (initialData && Object.keys(initialData).length > 0) {
            return {
                first_name: initialData.first_name || '',
                middle_names: initialData.middle_names || '',
                last_name: initialData.last_name || '',
                email: initialData.email || '',
                password: '', // Never prefill password
                phone_number: initialData.phone_number ? (() => {
                    const { formatPhoneNumber } = require('../utils/phoneFormatter');
                    return formatPhoneNumber(initialData.phone_number);
                })() : '',
                date_of_birth: initialData.date_of_birth ? formatDateForInput(initialData.date_of_birth) : '',
                marital_status: initialData.marital_status || '',
                sex: initialData.sex || '',
                credentials: initialData.credentials || '',
                credential_details: initialData.credential_details || '',
                date_employed: initialData.date_employed ? formatDateForInput(initialData.date_employed) : '',
                supervisor_name: initialData.supervisor_name || '',
                provider_name: initialData.provider_name || '',
                role: typeof initialData.role === 'object' ? initialData.role?.name : (initialData.role || ''),
                facility_id: initialData.facility_id || '',
                assigned_branch_id: initialData.assigned_branch_id || (initialData.assigned_branch?.id || ''),
                is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                notes: initialData.notes || '',
            };
        }
        // Default empty form
        return {
            first_name: '',
            middle_names: '',
            last_name: '',
            email: '',
            password: '',
            phone_number: '',
            date_of_birth: '',
            marital_status: '',
            sex: '',
            credentials: '',
            credential_details: '',
            date_employed: '',
            supervisor_name: '',
            provider_name: '',
            role: '',
            facility_id: '',
            assigned_branch_id: '',
            is_active: true,
            notes: '',
        };
    });
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [imageRemoved, setImageRemoved] = useState(false);

    // Update form data when initialData changes (e.g. after fetch)
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const formattedDateOfBirth = initialData.date_of_birth ? formatDateForInput(initialData.date_of_birth) : '';
            const formattedDateEmployed = initialData.date_employed ? formatDateForInput(initialData.date_employed) : '';
            
            console.log('UserEdit: Updating form data', {
                hasInitialData: !!initialData,
                date_of_birth_raw: initialData.date_of_birth,
                date_of_birth_formatted: formattedDateOfBirth,
                date_employed_raw: initialData.date_employed,
                date_employed_formatted: formattedDateEmployed
            });
            
            setFormData(prev => ({
                ...prev,
                first_name: initialData.first_name || '',
                middle_names: initialData.middle_names || '',
                last_name: initialData.last_name || '',
                email: initialData.email || '',
                password: '', // Don't prefill password
                phone_number: initialData.phone_number ? (() => {
                    const { formatPhoneNumber } = require('../utils/phoneFormatter');
                    return formatPhoneNumber(initialData.phone_number);
                })() : '',
                date_of_birth: formattedDateOfBirth,
                marital_status: initialData.marital_status || '',
                sex: initialData.sex || '',
                credentials: initialData.credentials || '',
                credential_details: initialData.credential_details || '',
                date_employed: formattedDateEmployed,
                supervisor_name: initialData.supervisor_name || '',
                provider_name: initialData.provider_name || '',
                // Ensure role is just the name string if it comes as an object or relation
                role: typeof initialData.role === 'object' ? initialData.role?.name : (initialData.role || ''),
                facility_id: initialData.facility_id || '',
                assigned_branch_id: initialData.assigned_branch_id || (initialData.assigned_branch?.id || ''),
                is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                notes: initialData.notes || '',
            }));

            // Set profile image preview from initial data
            if (initialData.profile_image_url) {
                setProfileImagePreview(initialData.profile_image_url);
            } else if (initialData.profile_image) {
                const imageUrl = initialData.profile_image.startsWith('http')
                    ? initialData.profile_image
                    : `/storage/${initialData.profile_image}`;
                setProfileImagePreview(imageUrl);
            } else {
                setProfileImagePreview(null);
            }
        }
    }, [initialData]);

    const updateForm = (updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                return;
            }

            setProfileImage(file);
            setImageRemoved(false);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setProfileImage(null);
        }
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
        setProfileImagePreview(null);
        setImageRemoved(true);
        const fileInput = document.getElementById('profile_image');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    return (
        <FormContext.Provider value={{ 
            formData, 
            updateForm, 
            profileImage, 
            setProfileImage,
            profileImagePreview,
            setProfileImagePreview,
            handleFileChange,
            handleRemoveImage,
            imageRemoved
        }}>
            {children}
        </FormContext.Provider>
    );
}

// Personal Info Tab
function PersonalInfoTab() {
    const { 
        formData, 
        updateForm, 
        profileImagePreview,
        handleFileChange,
        handleRemoveImage
    } = React.useContext(FormContext);

    return (
        <div className="space-y-6">
            {/* Profile Picture Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                    Profile Picture
                </label>
                <div className="space-y-3">
                    {profileImagePreview && (
                        <div className="relative inline-block">
                            <img
                                src={profileImagePreview}
                                alt="Profile preview"
                                className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                                title="Remove image"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center space-x-3">
                        <label
                            htmlFor="profile_image"
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                                {profileImagePreview ? 'Change Picture' : 'Upload Picture'}
                            </span>
                        </label>
                        <input
                            id="profile_image"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Upload a profile picture (max 5MB). Supported formats: JPG, PNG, GIF
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
                    <input
                        type="text"
                        value={formData.first_name || ''}
                        onChange={(e) => updateForm({ first_name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Middle Names</label>
                    <input
                        type="text"
                        value={formData.middle_names || ''}
                        onChange={(e) => updateForm({ middle_names: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
                    <input
                        type="text"
                        value={formData.last_name || ''}
                        onChange={(e) => updateForm({ last_name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
                    <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => updateForm({ email: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Phone *</label>
                    <input
                        type="tel"
                        value={formData.phone_number || ''}
                        onChange={(e) => {
                            const { formatPhoneNumber } = require('../utils/phoneFormatter');
                            const formatted = formatPhoneNumber(e.target.value);
                            updateForm({ phone_number: formatted });
                        }}
                        required
                        placeholder="(425) 555-0123"
                        maxLength={14}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Date of Birth *</label>
                    <input
                        type="date"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => updateForm({ date_of_birth: e.target.value })}
                        required
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Sex *</label>
                    <select
                        value={formData.sex || ''}
                        onChange={(e) => updateForm({ sex: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Marital Status</label>
                    <select
                        value={formData.marital_status || ''}
                        onChange={(e) => updateForm({ marital_status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    >
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                        <option value="separated">Separated</option>
                        <option value="n/a">N/A</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

// Employment Tab
function EmploymentTab({ roles, branches, facilities, isSuperAdmin }) {
    const { formData, updateForm } = React.useContext(FormContext);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Facility *</label>
                        <select
                            value={formData.facility_id || ''}
                            onChange={(e) => updateForm({
                                facility_id: e.target.value,
                                assigned_branch_id: '' // Reset branch when facility changes
                            })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        >
                            <option value="">Select Facility</option>
                            {facilities.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Role *</label>
                    <select
                        value={formData.role || ''}
                        onChange={(e) => updateForm({ role: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    >
                        <option value="">Select Role</option>
                        {roles
                            .filter(r => {
                                const roleName = r.name?.toLowerCase();
                                return roleName === 'administrator' || 
                                       roleName === 'caregiver' || 
                                       roleName === 'care_giver' ||
                                       roleName === 'nurse' ||
                                       roleName === 'registered_nurse' ||
                                       roleName === 'licensed_nurse';
                            })
                            .filter(r => {
                                const roleName = r.name?.toLowerCase();
                                return roleName !== 'admin' && 
                                       roleName !== 'duty_roster' && 
                                       roleName !== 'duty roster';
                            })
                            .map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Branch</label>
                    <select
                        value={formData.assigned_branch_id || ''}
                        onChange={(e) => updateForm({ assigned_branch_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    >
                        <option value="">Select Branch</option>
                        {branches
                            .filter(b => !isSuperAdmin || !formData.facility_id || b.facility_id == formData.facility_id)
                            .map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))
                        }
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Date Employed *</label>
                    <input
                        type="date"
                        value={formData.date_employed || ''}
                        onChange={(e) => updateForm({ date_employed: e.target.value })}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Supervisor Name</label>
                    <input
                        type="text"
                        value={formData.supervisor_name || ''}
                        onChange={(e) => updateForm({ supervisor_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Provider Name</label>
                    <input
                        type="text"
                        value={formData.provider_name || ''}
                        onChange={(e) => updateForm({ provider_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Credentials</label>
                    <input
                        type="text"
                        value={formData.credentials || ''}
                        onChange={(e) => updateForm({ credentials: e.target.value })}
                        placeholder="e.g., RN, LPN, CNA"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Credential Details</label>
                    <textarea
                        value={formData.credential_details || ''}
                        onChange={(e) => updateForm({ credential_details: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                </div>
            </div>
        </div>
    );
}

// Security Tab
function SecurityTab({ isEditing }) {
    const { formData, updateForm } = React.useContext(FormContext);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState('');

    // Validate password match
    React.useEffect(() => {
        if (formData.password_confirmation && formData.password) {
            if (formData.password !== formData.password_confirmation) {
                setPasswordError('Passwords do not match');
            } else {
                setPasswordError('');
            }
        } else if (formData.password_confirmation && !formData.password) {
            setPasswordError('');
        } else {
            setPasswordError('');
        }
    }, [formData.password, formData.password_confirmation]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Password {isEditing ? '(Leave blank to keep current)' : '*'}
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password || ''}
                            onChange={(e) => updateForm({ password: e.target.value })}
                            required={!isEditing}
                            minLength={8}
                            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Confirm Password {!isEditing ? '*' : ''}
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.password_confirmation || ''}
                            onChange={(e) => updateForm({ password_confirmation: e.target.value })}
                            required={!isEditing && formData.password}
                            minLength={8}
                            className={`w-full px-4 py-2 pr-10 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] ${
                                passwordError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    {passwordError && (
                        <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                    )}
                    {!passwordError && formData.password_confirmation && (
                        <p className="text-xs text-green-600 mt-1">Passwords match</p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => updateForm({ is_active: e.target.checked })}
                            className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-900">
                            Active User Account
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                        Inactive users cannot log in to the system.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Notes</label>
                    <textarea
                        value={formData.notes || ''}
                        onChange={(e) => updateForm({ notes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        placeholder="Additional notes about this user..."
                    />
                </div>
            </div>
        </div>
    );
}

export default function UserEditWrapper() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showToast } = useToastContext();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch dependencies
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data
    });

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user', id],
        queryFn: async () => (await api.get(`/users/${id}`)).data
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles-options'],
        queryFn: async () => (await api.get('/roles', { params: { per_page: 100 } })).data
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data
    });

    const { data: facilitiesData } = useQuery({
        queryKey: ['facilities-options'],
        queryFn: async () => (await api.get('/facilities', { params: { per_page: 100 } })).data,
        enabled: isSuperAdmin
    });

    if (isLoadingUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading user...</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider initialData={user}>
            <UserEditContent
                navigate={navigate}
                showToast={showToast}
                queryClient={queryClient}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                errors={errors}
                setErrors={setErrors}
                roles={rolesData?.data || []}
                branches={branchesData?.data || []}
                facilities={facilitiesData?.data || []}
                isSuperAdmin={isSuperAdmin}
                userId={id}
            />
        </FormProvider>
    );
}

function UserEditContent({
    navigate, showToast, queryClient, isSubmitting, setIsSubmitting, errors, setErrors,
    roles, branches, facilities, isSuperAdmin, userId
}) {
    const { formData, profileImage, imageRemoved } = React.useContext(FormContext);
    const [activeTab, setActiveTab] = useState('personal');

    const handleSubmit = async () => {
        setErrors({});
        setIsSubmitting(true);

        try {
            // Validate password confirmation if password is provided
            if (formData.password) {
                if (!formData.password_confirmation) {
                    setErrors({ password_confirmation: ['Please confirm your password'] });
                    setIsSubmitting(false);
                    return;
                }
                if (formData.password !== formData.password_confirmation) {
                    setErrors({ password_confirmation: ['Passwords do not match'] });
                    setIsSubmitting(false);
                    return;
                }
            }

            const name = `${formData.first_name} ${formData.last_name}`.trim() || formData.email;
            let response;

            // Use FormData if there's a profile image or image removal, otherwise use JSON
            if (profileImage || imageRemoved) {
                const formDataToSend = new FormData();
                formDataToSend.append('name', name);
                formDataToSend.append('first_name', formData.first_name);
                formDataToSend.append('middle_names', formData.middle_names || '');
                formDataToSend.append('last_name', formData.last_name);
                formDataToSend.append('email', formData.email);
                formDataToSend.append('phone_number', formData.phone_number || '');
                formDataToSend.append('date_of_birth', formData.date_of_birth || '');
                formDataToSend.append('marital_status', formData.marital_status || '');
                formDataToSend.append('sex', formData.sex || '');
                formDataToSend.append('credentials', formData.credentials || '');
                formDataToSend.append('credential_details', formData.credential_details || '');
                formDataToSend.append('date_employed', formData.date_employed || '');
                formDataToSend.append('supervisor_name', formData.supervisor_name || '');
                formDataToSend.append('provider_name', formData.provider_name || '');
                formDataToSend.append('role', formData.role || '');
                if (formData.assigned_branch_id) {
                    formDataToSend.append('assigned_branch_id', formData.assigned_branch_id);
                }
                if (formData.facility_id) {
                    formDataToSend.append('facility_id', formData.facility_id);
                }
                formDataToSend.append('is_active', formData.is_active ? '1' : '0');
                formDataToSend.append('notes', formData.notes || '');

                // Add password if provided (don't include password_confirmation)
                if (formData.password) {
                    formDataToSend.append('password', formData.password);
                }

                // Handle profile image
                if (profileImage) {
                    formDataToSend.append('profile_image', profileImage);
                } else if (imageRemoved) {
                    formDataToSend.append('remove_profile_image', '1');
                }

                // Use POST with _method override for file uploads
                formDataToSend.append('_method', 'PUT');
                response = await api.post(`/users/${userId}`, formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                const payload = { ...formData, name };

                // Remove password if empty to avoid overwriting
                if (!payload.password) {
                    delete payload.password;
                }
                // Remove password_confirmation as it's only for validation
                delete payload.password_confirmation;

                response = await api.put(`/users/${userId}`, payload);
            }

            queryClient.invalidateQueries(['users']);
            queryClient.invalidateQueries(['user', userId]);
            
            // If user has a facility_id, invalidate the facility-users query
            if (formData.facility_id) {
                queryClient.invalidateQueries(['facility-users', formData.facility_id]);
            }
            
            showToast('User updated successfully!', 'success');
            navigate(-1); // Go back
        } catch (error) {
            console.error('Error updating user:', error);
            const errorData = error.response?.data;
            if (errorData?.errors) {
                setErrors(errorData.errors);
                showToast('Please correct the errors in the form', 'error');
            } else {
                showToast(errorData?.message || 'Failed to update user', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: User },
        { id: 'employment', label: 'Employment', icon: Briefcase },
        { id: 'security', label: 'Security & Notes', icon: Shield },
    ];

    return (
        <div>
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                            <p className="text-sm text-gray-600">Update user information</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

            </div>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-red-800 font-medium mb-2">Please correct the following errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {Object.entries(errors).map(([field, messages]) => (
                            <li key={field} className="text-sm text-red-700">
                                <strong>{field.replace('_', ' ')}:</strong> {Array.isArray(messages) ? messages.join(', ') : messages}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 pb-0">
                    <nav className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'personal' && <PersonalInfoTab />}
                    {activeTab === 'employment' && (
                        <EmploymentTab
                            roles={roles}
                            branches={branches}
                            facilities={facilities}
                            isSuperAdmin={isSuperAdmin}
                        />
                    )}
                    {activeTab === 'security' && <SecurityTab isEditing={true} />}
                </div>
            </div>
        </div>
    );
}
