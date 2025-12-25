import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  ArrowLeft, Save, Building2, Palette, Settings, Users, Shield,
  MapPin, Phone, Mail, Image as ImageIcon, CheckCircle, XCircle,
  Plus, Edit, Trash2, Search, Eye, AlertCircle, X, Calendar,
  Briefcase, Award, Clock, User as UserIcon, Navigation, Cog
} from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import FacilityPermissions from './FacilityPermissions';
import EmptyState from '../components/ui/EmptyState';
import { getUserLocation } from '../utils/location';

export default function FacilityEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

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

  // Fetch facility data
  const { data: facility, isLoading: facilityLoading, error: facilityError } = useQuery({
    queryKey: ['facility', id],
    queryFn: async () => {
      const res = await api.get(`/facilities/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Redirect non-super admins
  useEffect(() => {
    if (!userLoading && currentUser && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isSuperAdmin, userLoading, navigate]);

  if (userLoading || facilityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading facility...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  if (facilityError || !facility) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load facility. Please try again.</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/facilities')}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'modules', label: 'Module Access', icon: Settings },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Cog },
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/super-admin/facilities')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Facility</h2>
              <p className="text-sm text-gray-600">{facility.name}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        {activeTab === 'overview' && <OverviewTab facility={facility} />}
        {activeTab === 'branding' && <BrandingTab facility={facility} />}
        {activeTab === 'modules' && <ModulesTab facilityId={id} />}
        {activeTab === 'accounts' && <AccountsTab facilityId={id} />}
        {activeTab === 'permissions' && <PermissionsTab facilityId={id} facilityName={facility.name} />}
        {activeTab === 'settings' && <SettingsTab facilityId={id} facilityName={facility.name} />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ facility }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: facility?.name || '',
    location: facility?.location || '',
    description: facility?.description || '',
    address: facility?.address || '',
    phone: facility?.phone || '',
    email: facility?.email || '',
    brochure_url: facility?.brochure_url || '',
    brochure_color: facility?.brochure_color || 'blue',
    is_active: facility?.is_active ?? true,
    latitude: facility?.latitude || '',
    longitude: facility?.longitude || '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === 'is_active') {
          formData.append(key, data[key] ? '1' : '0');
        } else if (data[key] !== null && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });
      return api.post(`/facilities/${facility.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility', facility.id]);
      queryClient.invalidateQueries(['facilities']);
      showToast('Facility updated successfully', 'success', { isFormSubmission: true });
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        setErrors(errorData.errors);
      } else {
        showToast(errorData?.message || 'Failed to update facility', 'error');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    updateMutation.mutate(form, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Facility Information</h3>
          <p className="text-sm text-gray-600">Update basic facility details and contact information.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Facility Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
              placeholder="City, State"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                Location Coordinates
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    setGettingLocation(true);
                    try {
                      const location = await getUserLocation({
                        timeout: 10000,
                        maximumAge: 0,
                        enableHighAccuracy: true,
                      });
                      if (location) {
                        setForm({
                          ...form,
                          latitude: location.latitude,
                          longitude: location.longitude,
                        });
                      } else {
                        showToast('Unable to get your current location. Please allow location access or enter coordinates manually.', 'warning');
                      }
                    } catch (err) {
                      showToast('Failed to get current location. Please enter coordinates manually.', 'error');
                    } finally {
                      setGettingLocation(false);
                    }
                  }}
                  disabled={gettingLocation}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  title="Use your current GPS location"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{gettingLocation ? 'Getting Location...' : 'Use Current Location'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.address) {
                      showToast('Please enter an address first', 'warning');
                      return;
                    }
                    setGeocoding(true);
                    try {
                      const response = await api.post('/geocode', { address: form.address });
                      if (response.data.success) {
                        setForm({
                          ...form,
                          latitude: response.data.latitude,
                          longitude: response.data.longitude,
                        });
                        showToast('Coordinates geocoded successfully', 'success');
                      } else {
                        showToast('Unable to geocode address. Please enter coordinates manually.', 'warning');
                      }
                    } catch (err) {
                      showToast('Geocoding failed. Please enter coordinates manually.', 'error');
                    } finally {
                      setGeocoding(false);
                    }
                  }}
                  disabled={geocoding || !form.address}
                  className="text-sm px-3 py-1 bg-[var(--theme-primary)] text-white rounded hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  title="Geocode from address field"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{geocoding ? 'Geocoding...' : 'Geocode from Address'}</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">Coordinates are used for location-based login restrictions (50 meters).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g., 47.6062"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g., -122.3321"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Brochure URL</label>
            <input
              type="url"
              value={form.brochure_url}
              onChange={(e) => setForm({ ...form, brochure_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Brochure Color Theme</label>
            <select
              value={form.brochure_color}
              onChange={(e) => setForm({ ...form, brochure_color: e.target.value })}
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
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
              />
              <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                Active Facility
              </label>
            </div>
          </div>
        </div>

        {/* Owner Information Display */}
        {facility.owner && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Facility Owner</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{facility.owner.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium text-gray-900">{facility.owner.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium text-gray-900">{facility.owner.role}</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function SettingsTab({ facilityId, facilityName }) {
  const navigate = useNavigate();

  const handleOpenSettings = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('super_admin_selected_facility_id', String(facilityId));
      }
    } catch (_) {
      // Ignore storage errors and still navigate
    }
    navigate('/super-admin/settings');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Facility Settings</h3>
          <p className="text-sm text-gray-600">
            Configure email, security, notifications, database and server options specifically
            for <span className="font-medium">{facilityName}</span>.
          </p>
        </div>
        <button
          onClick={handleOpenSettings}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)]"
        >
          <Settings className="w-4 h-4" />
          <span>Open Settings Center</span>
        </button>
      </div>

      <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-700 mb-1">
          Use the Settings Center to manage:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Email servers and from-addresses for this facility</li>
          <li>Password policies, session timeouts and login security</li>
          <li>Notification channels and which events send alerts</li>
          <li>Database performance options and logging thresholds</li>
          <li>Server maintenance mode, queues and log retention</li>
        </ul>
      </div>
    </div>
  );
}

// Branding Tab
function BrandingTab({ facility }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    logo: null,
    primary_color: facility?.primary_color || '#1E3A5F',
    secondary_color: facility?.secondary_color || '#86EFAC',
    accent_color: facility?.accent_color || '#FFFFFF',
    subdomain: facility?.subdomain || '',
    provider_code: facility?.provider_code || '',
  });
  const [logoPreview, setLogoPreview] = useState(facility?.logo_url || null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, logo: file });
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      if (data.logo instanceof File) {
        formData.append('logo', data.logo);
      }
      if (data.primary_color) formData.append('primary_color', data.primary_color);
      if (data.secondary_color) formData.append('secondary_color', data.secondary_color);
      if (data.accent_color) formData.append('accent_color', data.accent_color);
      if (data.subdomain && data.subdomain.trim() !== '') {
        formData.append('subdomain', data.subdomain.trim());
      }
      if (data.provider_code) formData.append('provider_code', data.provider_code);

      return api.post(`/facilities/${facility.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility', facility.id]);
      queryClient.invalidateQueries(['facilities']);
      // Invalidate user query to refresh facility_branding in ThemeWrapper
      queryClient.invalidateQueries(['current-user']);
      queryClient.invalidateQueries(['me']);
      queryClient.invalidateQueries(['user']);
      showToast('Branding updated successfully. Refreshing to apply changes...', 'success', { isFormSubmission: true });
      setForm({ ...form, logo: null }); // Reset logo file
      
      // Reload page after a short delay to apply new branding immediately
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      // Force a page reload after a short delay to apply new branding
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        setErrors(errorData.errors);
      } else {
        showToast(errorData?.message || 'Failed to update branding', 'error');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    updateMutation.mutate(form, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Branding & Customization</h3>
          <p className="text-sm text-gray-600">Customize the facility's visual identity and branding.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
            {errors.logo && <p className="text-xs text-red-600 mt-1">{errors.logo[0]}</p>}
          </div>

          {/* Color Pickers */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
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
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
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
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
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
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent font-mono"
              placeholder="facility-name"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., {form.subdomain || 'facility-name'}.yourapp.com
            </p>
            {errors.subdomain && <p className="text-xs text-red-600 mt-1">{errors.subdomain[0]}</p>}
          </div>

          {/* Provider Code */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Provider Code</label>
            <input
              type="text"
              value={form.provider_code}
              onChange={(e) => setForm({ ...form, provider_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
              placeholder="Optional provider code for login"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional code used for login identification
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
              <div className="font-semibold text-gray-900">{facility.name}</div>
              <div className="flex gap-2 mt-2">
                <div
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: form.primary_color }}
                  title="Primary Color"
                />
                <div
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: form.secondary_color }}
                  title="Secondary Color"
                />
                <div
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: form.accent_color }}
                  title="Accent Color"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// Modules Tab
function ModulesTab({ facilityId }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [localModules, setLocalModules] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['facility-permissions', facilityId],
    queryFn: async () => {
      const res = await api.get(`/facilities/${facilityId}/permissions`);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (data?.modules) {
      setLocalModules(data.modules);
    }
  }, [data]);

  const updateModulesMutation = useMutation({
    mutationFn: async (modules) => {
      return api.put(`/facilities/${facilityId}/permissions/modules`, { modules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility-permissions', facilityId]);
      queryClient.invalidateQueries(['facilities']);
      showToast('Modules updated successfully', 'success', { isFormSubmission: true });
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update modules', 'error');
    },
  });

  const handleModuleToggle = (moduleKey) => {
    setLocalModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleSave = () => {
    const enabledModules = localModules.filter((m) => m.enabled).map((m) => m.key);
    updateModulesMutation.mutate(enabledModules);
  };

  const handleBulkToggle = (enabled) => {
    setLocalModules((prev) => prev.map((m) => ({ ...m, enabled })));
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        <p className="mt-4 text-gray-600">Loading modules...</p>
      </div>
    );
  }

  const filteredModules = localModules.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = localModules.filter((m) => m.enabled).length;
  const totalCount = localModules.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Access</h3>
          <p className="text-sm text-gray-600">
            Enable or disable modules for this facility. Users must have both role permissions and module access.
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
          <button
            onClick={handleSave}
            disabled={updateModulesMutation.isPending}
            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {updateModulesMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search modules..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
          />
        </div>
        <div className="text-sm text-gray-600">
          {enabledCount} of {totalCount} enabled
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => (
          <label
            key={module.key}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={module.enabled}
              onChange={() => handleModuleToggle(module.key)}
              className="w-5 h-5 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{module.name}</div>
            </div>
            {module.enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-300" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// Accounts Tab
function AccountsTab({ facilityId }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['facility-users', facilityId, search],
    queryFn: async () => {
      const params = { facility_id: facilityId, per_page: 50 };
      if (search) params.search = search;
      const res = await api.get('/users', { params });
      console.log('Facility Users API Response:', res.data);
      console.log('Users count:', res.data?.data?.length || 0);
      return res.data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!facilityId, // Only fetch if facilityId is provided
  });

  // Refetch when component becomes visible again
  useEffect(() => {
    const handleFocus = () => {
      if (facilityId) {
        refetch();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [facilityId, refetch]);

  const { data: branchesData } = useQuery({
    queryKey: ['branches-options', facilityId],
    queryFn: async () => {
      const res = await api.get('/branches', { params: { facility_id: facilityId, per_page: 100 } });
      return res.data;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles-options'],
    queryFn: async () => {
      const res = await api.get('/roles', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['facility-users', facilityId]);
      showToast('User deleted successfully', 'success');
    },
    onError: () => {
      showToast('Failed to delete user', 'error');
    },
  });

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.name || user.email}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const users = data?.data || [];
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Facility Accounts</h3>
          <p className="text-sm text-gray-600">Manage users associated with this facility.</p>
        </div>
        <button
          onClick={() => navigate(`/administration/users/create?facility_id=${facilityId}`)}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users are associated with this facility."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{user.name || user.email}</h4>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/administration/users/${user.id}/edit`)}
                    className="p-1.5 text-[var(--theme-primary)] hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewingProfile(user)}
                    className="p-1.5 text-[var(--theme-primary)] hover:bg-gray-100 rounded"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {user.assigned_branch && (
                  <div className="text-gray-600">
                    <span className="font-medium">Branch:</span> {user.assigned_branch.name}
                  </div>
                )}
                <div className="text-gray-600">
                  <span className="font-medium">Role:</span> {user.role || (user.roles?.[0]?.name || 'N/A')}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Profile Modal */}
      {viewingProfile && (
        <UserProfileModal
          user={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onEdit={() => {
            setViewingProfile(null);
            navigate(`/administration/users/${viewingProfile.id}/edit`);
          }}
        />
      )}
    </div>
  );
}

// Permissions Tab - Reuse FacilityPermissions component
function PermissionsTab({ facilityId, facilityName }) {
  return (
    <div>
      <FacilityPermissions
        facilityId={facilityId}
        facilityName={facilityName}
        onBack={null}
      />
    </div>
  );
}

// User Form Modal Component (simplified version)
function UserFormModal({ record, facilityId, branches, roles, onClose, onSuccess }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    if (typeof dateString !== 'string') return '';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    first_name: record?.first_name || '',
    last_name: record?.last_name || '',
    email: record?.email || '',
    password: '',
    phone_number: record?.phone_number || '',
    date_of_birth: formatDateForInput(record?.date_of_birth),
    sex: record?.sex || '',
    date_employed: formatDateForInput(record?.date_employed) || formatDateForInput(new Date()),
    role: record?.role || '',
    assigned_branch_id: record?.assigned_branch_id || '',
    facility_id: facilityId,
    is_active: record?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;
      return api.post('/users', { ...data, name });
    },
    onSuccess: () => {
      // Invalidate general users query
      queryClient.invalidateQueries(['users']);
      // Invalidate facility-users query for this facility
      if (facilityId) {
        queryClient.invalidateQueries(['facility-users', facilityId]);
      }
      showToast('User created successfully', 'success', { isFormSubmission: true });
      onSuccess();
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        setErrors(errorData.errors);
      } else {
        showToast(errorData?.message || 'Failed to create user', 'error');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;
      return api.put(`/users/${record.id}`, { ...data, name });
    },
    onSuccess: () => {
      // Invalidate general users query
      queryClient.invalidateQueries(['users']);
      // Invalidate facility-users query for this facility
      if (facilityId) {
        queryClient.invalidateQueries(['facility-users', facilityId]);
      }
      showToast('User updated successfully', 'success', { isFormSubmission: true });
      onSuccess();
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        setErrors(errorData.errors);
      } else {
        showToast(errorData?.message || 'Failed to update user', 'error');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const mutation = record ? updateMutation : createMutation;
    mutation.mutate(form, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-black">
              {record ? 'Edit User' : 'Add User'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">First Name *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Password {record ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!record}
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  required={!record}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  required={!record}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Sex *</label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  required={!record}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Date Employed *</label>
                <input
                  type="date"
                  value={form.date_employed}
                  onChange={(e) => setForm({ ...form, date_employed: e.target.value })}
                  required={!record}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Branch</label>
                <select
                  value={form.assigned_branch_id}
                  onChange={(e) => setForm({ ...form, assigned_branch_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] bg-white text-gray-900"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-bold text-gray-900">
                    Active User
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : record ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// User Profile Modal Component (comprehensive)
function UserProfileModal({ user, onClose, onEdit }) {
  // Fetch full user details if not already loaded
  const { data: fullUser, isLoading } = useQuery({
    queryKey: ['user', user.id],
    queryFn: async () => {
      const res = await api.get(`/users/${user.id}`);
      return res.data;
    },
    enabled: !!user.id,
    initialData: user, // Use provided user as initial data
  });

  const displayUser = fullUser || user;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header with Profile Picture */}
        <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[#4a7a2a] p-4 md:p-8 text-white rounded-t-xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
              {/* Profile Picture */}
              {displayUser.profile_image_url ? (
                <img
                  src={displayUser.profile_image_url}
                  alt={displayUser.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto md:mx-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg ${displayUser.profile_image_url ? 'hidden' : ''} mx-auto md:mx-0`}>
                <span className="text-[var(--theme-primary)] font-bold text-4xl md:text-5xl">
                  {displayUser.name?.charAt(0)?.toUpperCase() || displayUser.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{displayUser.name || displayUser.email}</h2>
                {displayUser.email && (
                  <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-sm md:text-base text-green-50">
                    <Mail className="w-4 h-4" />
                    <span className="break-all">{displayUser.email}</span>
                  </div>
                )}
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${displayUser.is_active
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                    }`}>
                    {displayUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors absolute top-4 right-4 md:relative md:top-0 md:right-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-8 overflow-y-auto flex-1">
          {/* Personal Information */}
          <div className="mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-[var(--theme-primary)]" />
              Personal Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayUser.first_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">First Name</p>
                    <p className="font-semibold text-gray-900">{displayUser.first_name}</p>
                  </div>
                )}
                {displayUser.middle_names && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Middle Names</p>
                    <p className="font-semibold text-gray-900">{displayUser.middle_names}</p>
                  </div>
                )}
                {displayUser.last_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last Name</p>
                    <p className="font-semibold text-gray-900">{displayUser.last_name}</p>
                  </div>
                )}
                {displayUser.date_of_birth && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Date of Birth
                    </p>
                    <p className="font-semibold text-gray-900">
                      {new Date(displayUser.date_of_birth).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {displayUser.marital_status && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Marital Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{displayUser.marital_status}</p>
                  </div>
                )}
                {displayUser.sex && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sex</p>
                    <p className="font-semibold text-gray-900 capitalize">{displayUser.sex}</p>
                  </div>
                )}
                {displayUser.phone_number && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Phone Number
                    </p>
                    <p className="font-semibold text-gray-900">{displayUser.phone_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-[var(--theme-primary)]" />
              Employment Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayUser.role && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Shield className="w-4 h-4 mr-1" />
                      Role
                    </p>
                    <p className="font-semibold text-gray-900 capitalize">{displayUser.role.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {displayUser.roles && displayUser.roles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      Additional Roles
                    </p>
                    <p className="font-semibold text-gray-900">
                      {displayUser.roles.map(r => r.name).join(', ')}
                    </p>
                  </div>
                )}
                {displayUser.assigned_branch && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Assigned Branch
                    </p>
                    <p className="font-semibold text-gray-900">{displayUser.assigned_branch.name}</p>
                  </div>
                )}
                {displayUser.date_employed && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Date Employed
                    </p>
                    <p className="font-semibold text-gray-900">
                      {new Date(displayUser.date_employed).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {displayUser.hire_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Hire Date
                    </p>
                    <p className="font-semibold text-gray-900">
                      {new Date(displayUser.hire_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {displayUser.position && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Position</p>
                    <p className="font-semibold text-gray-900">{displayUser.position}</p>
                  </div>
                )}
                {displayUser.supervisor_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Supervisor</p>
                    <p className="font-semibold text-gray-900">{displayUser.supervisor_name}</p>
                  </div>
                )}
                {displayUser.provider_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Provider</p>
                    <p className="font-semibold text-gray-900">{displayUser.provider_name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Credentials */}
          {(displayUser.credentials || displayUser.credential_details) && (
            <div className="mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-[var(--theme-primary)]" />
                Credentials
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayUser.credentials && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Credentials</p>
                      <p className="font-semibold text-gray-900">{displayUser.credentials}</p>
                    </div>
                  )}
                  {displayUser.credential_details && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Credential Details</p>
                      <p className="font-semibold text-gray-900">{displayUser.credential_details}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {displayUser.notes && (
            <div className="mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Additional Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                <p className="text-gray-900 whitespace-pre-wrap">{displayUser.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
}

