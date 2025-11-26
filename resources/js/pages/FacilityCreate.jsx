import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
    ArrowLeft, Save, Building2, Palette, Settings, Users,
    MapPin, Phone, Mail, Image as ImageIcon, CheckCircle, XCircle,
    AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

const AVAILABLE_MODULES = [
    { key: 'pharmacy', name: 'Pharmacy' },
    { key: 'medications', name: 'Medications' },
    { key: 'vitals', name: 'Vitals' },
    { key: 'appointments', name: 'Appointments' },
    { key: 'assessments', name: 'Assessments' },
    { key: 'sleep', name: 'Sleep Records' },
    { key: 'housekeeping', name: 'Housekeeping' },
    { key: 'reports', name: 'Reports' },
    { key: 'residents', name: 'Residents' },
    { key: 'behaviors', name: 'Behaviors' },
    { key: 'incidents', name: 'Incidents' },
    { key: 'leave_requests', name: 'Leave Requests' },
    { key: 'employee_documents', name: 'Employee Documents' },
    { key: 'grocery_status', name: 'Grocery Status' },
    { key: 'fire_drills', name: 'Fire Drills' },
];

// Shared form state context
const FormContext = React.createContext();

function FormProvider({ children }) {
    const [formData, setFormData] = useState({
        // Overview
        name: '',
        location: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        brochure_url: '',
        brochure_color: 'blue',
        is_active: true,
        // Branding
        logo: null,
        primary_color: '#1E3A5F',
        secondary_color: '#86EFAC',
        accent_color: '#FFFFFF',
        subdomain: '',
        provider_code: '',
        // Modules
        enabled_modules: AVAILABLE_MODULES.map(m => m.key),
        // Owner
        owner_name: '',
        owner_email: '',
        owner_role: 'administrator',
        owner_password: '',
        owner_password_confirmation: '',
        // Branch
        branch_name: 'Main Branch',
        branch_address: '',
    });

    const [logoPreview, setLogoPreview] = useState(null);

    const updateForm = (updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    return (
        <FormContext.Provider value={{ formData, updateForm, logoPreview, setLogoPreview }}>
            {children}
        </FormContext.Provider>
    );
}

// Overview Tab
function OverviewTab() {
    const { formData, updateForm } = React.useContext(FormContext);
    const [errors, setErrors] = useState({});

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Facility Information</h3>
                <p className="text-sm text-gray-600">Enter basic facility details and contact information.</p>
            </div>

            {Object.keys(errors).length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <ul className="list-disc list-inside space-y-1">
                        {Object.entries(errors).map(([field, messages]) => (
                            <li key={field} className="text-sm text-red-700">
                                <strong>{field}:</strong> {Array.isArray(messages) ? messages.join(', ') : messages}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Facility Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateForm({ name: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="Enter facility name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Location *</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => updateForm({ location: e.target.value })}
                            required
                            placeholder="City, State"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Provider Code</label>
                        <input
                            type="text"
                            value={formData.provider_code}
                            onChange={(e) => updateForm({ provider_code: e.target.value.toUpperCase() })}
                            placeholder="FACILITY123"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">Used for login identification</p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => updateForm({ description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="Enter facility description..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Address</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => updateForm({ address: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="Full street address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => updateForm({ phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="(206) 555-0123"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateForm({ email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="info@facility.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Brochure URL</label>
                        <input
                            type="url"
                            value={formData.brochure_url}
                            onChange={(e) => updateForm({ brochure_url: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="https://example.com/brochure.pdf"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Brochure Color Theme</label>
                        <select
                            value={formData.brochure_color}
                            onChange={(e) => updateForm({ brochure_color: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        >
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                            <option value="red">Red</option>
                        </select>
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
                            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                                Active Facility
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Branding Tab
function BrandingTab() {
    const { formData, updateForm, logoPreview, setLogoPreview } = React.useContext(FormContext);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            updateForm({ logo: file });
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Branding & Customization</h3>
                <p className="text-sm text-gray-600">Customize the facility's visual identity and branding.</p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Facility Logo
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        />
                        {logoPreview && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                                <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-contain border rounded-lg bg-gray-50 p-2" />
                            </div>
                        )}
                    </div>

                    {/* Color Pickers */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Primary Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.primary_color}
                                    onChange={(e) => updateForm({ primary_color: e.target.value })}
                                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.primary_color}
                                    onChange={(e) => updateForm({ primary_color: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent font-mono text-sm"
                                    placeholder="#1E3A5F"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Secondary Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.secondary_color}
                                    onChange={(e) => updateForm({ secondary_color: e.target.value })}
                                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.secondary_color}
                                    onChange={(e) => updateForm({ secondary_color: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent font-mono text-sm"
                                    placeholder="#86EFAC"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Accent Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.accent_color}
                                    onChange={(e) => updateForm({ accent_color: e.target.value })}
                                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.accent_color}
                                    onChange={(e) => updateForm({ accent_color: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent font-mono text-sm"
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Subdomain */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Subdomain</label>
                        <input
                            type="text"
                            value={formData.subdomain}
                            onChange={(e) => updateForm({ subdomain: e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase() })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent font-mono"
                            placeholder="facility-name"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            e.g., {formData.subdomain || 'facility-name'}.yourapp.com
                        </p>
                    </div>
                </div>

                {/* Branding Preview */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Branding Preview</h4>
                    <div className="flex items-center gap-4">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain" />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                        <div>
                            <div className="font-semibold text-gray-900">{formData.name || 'Facility Name'}</div>
                            <div className="flex gap-2 mt-2">
                                <div
                                    className="w-8 h-8 rounded border border-gray-300"
                                    style={{ backgroundColor: formData.primary_color }}
                                    title="Primary Color"
                                />
                                <div
                                    className="w-8 h-8 rounded border border-gray-300"
                                    style={{ backgroundColor: formData.secondary_color }}
                                    title="Secondary Color"
                                />
                                <div
                                    className="w-8 h-8 rounded border border-gray-300"
                                    style={{ backgroundColor: formData.accent_color }}
                                    title="Accent Color"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Modules Tab
function ModulesTab() {
    const { formData, updateForm } = React.useContext(FormContext);

    const handleModuleToggle = (moduleKey) => {
        const enabled = formData.enabled_modules.includes(moduleKey);
        if (enabled) {
            updateForm({ enabled_modules: formData.enabled_modules.filter(k => k !== moduleKey) });
        } else {
            updateForm({ enabled_modules: [...formData.enabled_modules, moduleKey] });
        }
    };

    const handleBulkToggle = (enable) => {
        if (enable) {
            updateForm({ enabled_modules: AVAILABLE_MODULES.map(m => m.key) });
        } else {
            updateForm({ enabled_modules: [] });
        }
    };

    const enabledCount = formData.enabled_modules.length;
    const totalCount = AVAILABLE_MODULES.length;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Access</h3>
                    <p className="text-sm text-gray-600">
                        Select which modules will be available for this facility.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleBulkToggle(true)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Enable All
                    </button>
                    <button
                        onClick={() => handleBulkToggle(false)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Disable All
                    </button>
                </div>
            </div>

            <div className="mb-4 text-sm text-gray-600">
                {enabledCount} of {totalCount} enabled
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_MODULES.map((module) => {
                    const isEnabled = formData.enabled_modules.includes(module.key);
                    return (
                        <label
                            key={module.key}
                            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleModuleToggle(module.key)}
                                className="w-5 h-5 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{module.name}</div>
                            </div>
                            {isEnabled ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-gray-300" />
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// Owner Account Tab
function OwnerAccountTab() {
    const { formData, updateForm } = React.useContext(FormContext);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState('');

    // Validate password match
    React.useEffect(() => {
        if (formData.owner_password_confirmation && formData.owner_password) {
            if (formData.owner_password !== formData.owner_password_confirmation) {
                setPasswordError('Passwords do not match');
            } else {
                setPasswordError('');
            }
        } else if (formData.owner_password_confirmation && !formData.owner_password) {
            setPasswordError('');
        } else {
            setPasswordError('');
        }
    }, [formData.owner_password, formData.owner_password_confirmation]);

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Owner Account (Optional)</h3>
                <p className="text-sm text-gray-600">
                    Create the facility owner/admin account now, or add it later. If creating now, all fields below are required.
                </p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Owner Name</label>
                        <input
                            type="text"
                            value={formData.owner_name}
                            onChange={(e) => updateForm({ owner_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="Owner full name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Owner Email</label>
                        <input
                            type="email"
                            value={formData.owner_email}
                            onChange={(e) => updateForm({ owner_email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            placeholder="owner@facility.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Owner Role</label>
                        <select
                            value={formData.owner_role}
                            onChange={(e) => updateForm({ owner_role: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                        >
                            <option value="administrator">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="clinical_supervisor">Clinical Supervisor</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.owner_password || ''}
                                onChange={(e) => updateForm({ owner_password: e.target.value })}
                                minLength={8}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                                placeholder="Minimum 8 characters"
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
                        <p className="text-xs text-gray-500 mt-1">Leave empty if creating account later</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.owner_password_confirmation || ''}
                                onChange={(e) => updateForm({ owner_password_confirmation: e.target.value })}
                                minLength={8}
                                className={`w-full px-4 py-2 pr-10 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] ${
                                    passwordError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Confirm password"
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
                        {!passwordError && formData.owner_password_confirmation && formData.owner_password && (
                            <p className="text-xs text-green-600 mt-1">Passwords match</p>
                        )}
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Initial Branch Setup</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Branch Name</label>
                            <input
                                type="text"
                                value={formData.branch_name}
                                onChange={(e) => updateForm({ branch_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                                placeholder="Main Branch"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Branch Address</label>
                            <textarea
                                value={formData.branch_address}
                                onChange={(e) => updateForm({ branch_address: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                                placeholder="Leave empty to use facility address"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap the main component with FormProvider
export default function FacilityCreateWrapper() {
    const navigate = useNavigate();
    const { showToast } = useToastContext();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    return (
        <FormProvider>
            <FacilityCreateContent
                navigate={navigate}
                showToast={showToast}
                queryClient={queryClient}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                errors={errors}
                setErrors={setErrors}
            />
        </FormProvider>
    );
}

function FacilityCreateContent({ navigate, showToast, queryClient, isSubmitting, setIsSubmitting, errors, setErrors }) {
    const { formData } = React.useContext(FormContext);
    const [activeTab, setActiveTab] = useState('overview');

    const handleSubmit = async () => {
        setErrors({});
        setIsSubmitting(true);

        try {
            // Validate password confirmation if password is provided
            if (formData.owner_password) {
                if (!formData.owner_password_confirmation) {
                    setErrors({ owner_password_confirmation: ['Please confirm your password'] });
                    setIsSubmitting(false);
                    return;
                }
                if (formData.owner_password !== formData.owner_password_confirmation) {
                    setErrors({ owner_password_confirmation: ['Passwords do not match'] });
                    setIsSubmitting(false);
                    return;
                }
            }

            const submitData = new FormData();

            // Add all form fields
            Object.keys(formData).forEach((key) => {
                // Skip password_confirmation as it's only for validation
                if (key === 'owner_password_confirmation') {
                    return;
                }
                if (key === 'logo' && formData.logo instanceof File) {
                    submitData.append('logo', formData.logo);
                } else if (key === 'is_active') {
                    submitData.append(key, formData[key] ? '1' : '0');
                } else if (key === 'enabled_modules') {
                    submitData.append(key, JSON.stringify(formData[key]));
                } else if (key.startsWith('owner_') || key.startsWith('branch_')) {
                    if (formData[key] !== null && formData[key] !== '') {
                        submitData.append(key, formData[key]);
                    }
                } else if (key !== 'logo' && formData[key] !== null && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            });

            const response = await api.post('/facilities', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            queryClient.invalidateQueries(['facilities']);

            if (response.data?.owner) {
                showToast(
                    `Facility created! Owner account created: ${response.data.owner.email}`,
                    'success'
                );
            } else {
                showToast('Facility created successfully!', 'success');
            }

            navigate('/super-admin/facilities');
        } catch (error) {
            console.error('Error creating facility:', error);
            const errorData = error.response?.data;
            if (errorData?.errors) {
                setErrors(errorData.errors);
            } else {
                showToast(errorData?.message || 'Failed to create facility', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if user is super admin
    const { data: currentUser, isLoading: userLoading } = useQuery({
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

    React.useEffect(() => {
        if (!userLoading && currentUser && !isSuperAdmin) {
            navigate('/dashboard', { replace: true });
        }
    }, [currentUser, isSuperAdmin, userLoading, navigate]);

    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return null;
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'modules', label: 'Module Access', icon: Settings },
        { id: 'owner', label: 'Owner Account', icon: Users },
    ];

    return (
        <div>
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/super-admin/facilities')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Create New Facility</h2>
                            <p className="text-sm text-gray-600">Add a new facility to the system</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Creating...' : 'Create Facility'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)] font-semibold'
                                    : 'text-gray-600 hover:text-[var(--theme-primary)]'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'branding' && <BrandingTab />}
                {activeTab === 'modules' && <ModulesTab />}
                {activeTab === 'owner' && <OwnerAccountTab />}
            </div>
        </div>
    );
}
