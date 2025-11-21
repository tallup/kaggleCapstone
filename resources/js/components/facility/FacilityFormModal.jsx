import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, Palette, Image as ImageIcon, Users, Globe, Key,
    CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

/**
 * Available modules for facilities
 */
const AVAILABLE_MODULES = [
    { id: 'pharmacy', name: 'Pharmacy', description: 'Pharmacy inventory and orders' },
    { id: 'medications', name: 'Medications', description: 'Medication administration records' },
    { id: 'vitals', name: 'Vitals', description: 'Vital signs monitoring' },
    { id: 'appointments', name: 'Appointments', description: 'Appointment scheduling' },
    { id: 'assessments', name: 'Assessments', description: 'Resident assessments' },
    { id: 'sleep', name: 'Sleep Records', description: 'Sleep pattern tracking' },
    { id: 'housekeeping', name: 'Housekeeping', description: 'Cleaning and maintenance' },
    { id: 'reports', name: 'Reports', description: 'Analytics and reporting' },
    { id: 'residents', name: 'Residents', description: 'Resident management' },
    { id: 'behaviors', name: 'Behaviors', description: 'Behavior tracking' },
    { id: 'incidents', name: 'Incidents', description: 'Incident reporting' },
    { id: 'leave_requests', name: 'Leave Requests', description: 'Staff leave management' },
    { id: 'employee_documents', name: 'Employee Documents', description: 'Staff documentation' },
    { id: 'grocery_status', name: 'Grocery Status', description: 'Grocery management' },
    { id: 'fire_drills', name: 'Fire Drills', description: 'Fire drill tracking' },
];

/**
 * FacilityFormModal Component
 * Comprehensive form for creating/editing facilities
 */
export default function FacilityFormModal({
    facility = null,
    isSuperAdmin = false,
    onClose,
    onSubmit,
    isSubmitting = false
}) {
    const scrollableRef = useRef(null);
    const isEditing = !!facility;

    // Form state
    const [formData, setFormData] = useState({
        name: facility?.name || '',
        location: facility?.location || '',
        description: facility?.description || '',
        address: facility?.address || '',
        phone: facility?.phone || '',
        email: facility?.email || '',
        subdomain: facility?.subdomain || '',
        provider_code: facility?.provider_code || '',
        is_active: facility?.is_active ?? true,
        brochure_url: facility?.brochure_url || '',
        brochure_color: facility?.brochure_color || 'blue',
        primary_color: facility?.primary_color || '#1E3A5F',
        secondary_color: facility?.secondary_color || '#86EFAC',
        accent_color: facility?.accent_color || '#FFFFFF',
        logo: null,
        // Owner account (only for new facilities)
        owner_name: '',
        owner_email: '',
        owner_role: 'administrator',
        owner_password: '',
        // Initial branch (only for new facilities)
        branch_name: 'Main Branch',
        branch_address: '',
        // Modules
        enabled_modules: facility?.enabled_modules || AVAILABLE_MODULES.map(m => m.id),
    });

    const [errors, setErrors] = useState({});
    const [logoPreview, setLogoPreview] = useState(facility?.logo_url || null);
    const [activeTab, setActiveTab] = useState('basic');

    // Scroll to top when modal opens
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollableRef.current) {
                scrollableRef.current.scrollTop = 0;
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [facility]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleChange('logo', file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const toggleModule = (moduleId) => {
        setFormData(prev => ({
            ...prev,
            enabled_modules: prev.enabled_modules.includes(moduleId)
                ? prev.enabled_modules.filter(id => id !== moduleId)
                : [...prev.enabled_modules, moduleId]
        }));
    };

    const toggleAllModules = (enable) => {
        setFormData(prev => ({
            ...prev,
            enabled_modules: enable ? AVAILABLE_MODULES.map(m => m.id) : []
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Facility name is required';
        }
        if (!formData.location.trim()) {
            newErrors.location = 'Location is required';
        }
        if (!isEditing && isSuperAdmin && formData.owner_email && (!formData.owner_name || !formData.owner_password)) {
            newErrors.general = 'If creating an owner account, all owner fields are required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Prepare form data
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'logo' && formData.logo instanceof File) {
                submitData.append('logo', formData.logo);
            } else if (key === 'is_active') {
                submitData.append(key, formData[key] ? '1' : '0');
            } else if (key === 'enabled_modules') {
                submitData.append(key, JSON.stringify(formData[key]));
            } else if (key.startsWith('owner_') || key.startsWith('branch_')) {
                if (!isEditing && formData[key] !== null && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            } else if (key !== 'logo' && formData[key] !== null && formData[key] !== '') {
                submitData.append(key, formData[key]);
            }
        });

        try {
            await onSubmit(submitData, facility?.id);
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.message || 'Failed to save facility' });
            }
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: <Building2 className="w-4 h-4" /> },
        { id: 'contact', label: 'Contact', icon: <Users className="w-4 h-4" /> },
        ...(isSuperAdmin ? [
            { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
            { id: 'modules', label: 'Modules', icon: <CheckCircle className="w-4 h-4" /> },
        ] : []),
        ...(!isEditing && isSuperAdmin ? [
            { id: 'owner', label: 'Owner Account', icon: <Users className="w-4 h-4" /> },
        ] : []),
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isEditing ? 'Edit Facility' : 'Create New Facility'}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {isEditing
                                    ? 'Update facility information and settings'
                                    : 'Add a new facility to the system with customization options'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 mt-4 border-b border-gray-200 overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 font-medium'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div ref={scrollableRef} className="flex-1 overflow-y-auto p-6">
                    {/* Error Display */}
                    {(errors.general || Object.keys(errors).length > 0) && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    {errors.general ? (
                                        <p className="text-sm text-red-800">{errors.general}</p>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-red-800 mb-2">Please fix the following errors:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                {Object.entries(errors).map(([field, messages]) => (
                                                    <li key={field} className="text-sm text-red-700">
                                                        <strong className="capitalize">{field.replace(/_/g, ' ')}:</strong>{' '}
                                                        {Array.isArray(messages) ? messages.join(', ') : messages}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="facility-form" className="space-y-6">
                        {/* Basic Information Tab */}
                        {activeTab === 'basic' && (
                            <BasicInfoTab
                                formData={formData}
                                onChange={handleChange}
                                errors={errors}
                                isSuperAdmin={isSuperAdmin}
                            />
                        )}

                        {/* Contact Information Tab */}
                        {activeTab === 'contact' && (
                            <ContactInfoTab
                                formData={formData}
                                onChange={handleChange}
                                errors={errors}
                            />
                        )}

                        {/* Branding Tab */}
                        {activeTab === 'branding' && isSuperAdmin && (
                            <BrandingTab
                                formData={formData}
                                onChange={handleChange}
                                errors={errors}
                                logoPreview={logoPreview}
                                onLogoChange={handleLogoChange}
                            />
                        )}

                        {/* Modules Tab */}
                        {activeTab === 'modules' && isSuperAdmin && (
                            <ModulesTab
                                enabledModules={formData.enabled_modules}
                                onToggleModule={toggleModule}
                                onToggleAll={toggleAllModules}
                            />
                        )}

                        {/* Owner Account Tab */}
                        {activeTab === 'owner' && !isEditing && isSuperAdmin && (
                            <OwnerAccountTab
                                formData={formData}
                                onChange={handleChange}
                                errors={errors}
                            />
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {formData.enabled_modules.length} of {AVAILABLE_MODULES.length} modules enabled
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="facility-form"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span>{isEditing ? 'Update Facility' : 'Create Facility'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Tab Components

function BasicInfoTab({ formData, onChange, errors, isSuperAdmin }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Facility Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="Enter facility name"
                    />
                    {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Location <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => onChange('location', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.location ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="City, State"
                    />
                    {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                </div>

                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            Provider Code
                        </label>
                        <input
                            type="text"
                            value={formData.provider_code}
                            onChange={(e) => onChange('provider_code', e.target.value.toUpperCase())}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                            placeholder="FACILITY123"
                        />
                        <p className="text-xs text-gray-500 mt-1">Used for login identification</p>
                    </div>
                )}

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => onChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter facility description..."
                    />
                </div>

                <div className="md:col-span-2 flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => onChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                        Active Facility
                    </label>
                </div>
            </div>
        </div>
    );
}

function ContactInfoTab({ formData, onChange, errors }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Address
                    </label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => onChange('address', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Full street address"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Phone
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => onChange('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(206) 555-0123"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => onChange('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="info@facility.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Brochure URL
                    </label>
                    <input
                        type="url"
                        value={formData.brochure_url}
                        onChange={(e) => onChange('brochure_url', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/brochure.pdf"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Brochure Color Theme
                    </label>
                    <select
                        value={formData.brochure_color}
                        onChange={(e) => onChange('brochure_color', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="red">Red</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function BrandingTab({ formData, onChange, errors, logoPreview, onLogoChange }) {
    return (
        <div className="space-y-6">
            {/* Logo Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>Facility Logo</span>
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={onLogoChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {logoPreview && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-32 h-32 object-contain border rounded-lg bg-gray-50 p-2"
                        />
                    </div>
                )}
            </div>

            {/* Subdomain */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1 flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Subdomain</span>
                </label>
                <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => onChange('subdomain', e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="facility-name"
                />
                <p className="text-xs text-gray-500 mt-1">
                    {formData.subdomain || 'facility-name'}.yourapp.com
                </p>
            </div>

            {/* Brand Colors */}
            <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Brand Colors</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ColorPicker
                        label="Primary Color"
                        value={formData.primary_color}
                        onChange={(value) => onChange('primary_color', value)}
                    />
                    <ColorPicker
                        label="Secondary Color"
                        value={formData.secondary_color}
                        onChange={(value) => onChange('secondary_color', value)}
                    />
                    <ColorPicker
                        label="Accent Color"
                        value={formData.accent_color}
                        onChange={(value) => onChange('accent_color', value)}
                    />
                </div>
            </div>
        </div>
    );
}

function ModulesTab({ enabledModules, onToggleModule, onToggleAll }) {
    const allEnabled = enabledModules.length === AVAILABLE_MODULES.length;
    const someEnabled = enabledModules.length > 0 && enabledModules.length < AVAILABLE_MODULES.length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                    <h4 className="font-medium text-gray-900">Module Access Control</h4>
                    <p className="text-sm text-gray-600 mt-1">
                        Select which modules are available for this facility
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        type="button"
                        onClick={() => onToggleAll(true)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                        Enable All
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleAll(false)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Disable All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_MODULES.map(module => {
                    const isEnabled = enabledModules.includes(module.id);
                    return (
                        <button
                            key={module.id}
                            type="button"
                            onClick={() => onToggleModule(module.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${isEnabled
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        {isEnabled ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-gray-400" />
                                        )}
                                        <h5 className="font-medium text-gray-900">{module.name}</h5>
                                    </div>
                                    <p className="text-xs text-gray-600">{module.description}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                    <strong>{enabledModules.length}</strong> of <strong>{AVAILABLE_MODULES.length}</strong> modules enabled
                </p>
            </div>
        </div>
    );
}

function OwnerAccountTab({ formData, onChange, errors }) {
    return (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <h4 className="font-medium text-gray-900 mb-1">Optional Owner Account</h4>
                <p className="text-sm text-gray-600">
                    Create the facility owner/admin account now, or add it later. If creating now, all fields below are required.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Owner Name
                    </label>
                    <input
                        type="text"
                        value={formData.owner_name}
                        onChange={(e) => onChange('owner_name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Owner full name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Owner Email
                    </label>
                    <input
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => onChange('owner_email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="owner@facility.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Owner Role
                    </label>
                    <select
                        value={formData.owner_role}
                        onChange={(e) => onChange('owner_role', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="administrator">Administrator</option>
                        <option value="manager">Manager</option>
                        <option value="clinical_supervisor">Clinical Supervisor</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        value={formData.owner_password}
                        onChange={(e) => onChange('owner_password', e.target.value)}
                        minLength={8}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Minimum 8 characters"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty if creating account later</p>
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Initial Branch Setup</h4>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            Branch Name
                        </label>
                        <input
                            type="text"
                            value={formData.branch_name}
                            onChange={(e) => onChange('branch_name', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Main Branch"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            Branch Address
                        </label>
                        <textarea
                            value={formData.branch_address}
                            onChange={(e) => onChange('branch_address', e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Leave empty to use facility address"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ColorPicker({ label, value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="#000000"
                />
            </div>
        </div>
    );
}
