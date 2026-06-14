import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  ArrowLeft, Save, Building2, Palette, Settings, Users, Shield,
  MapPin, Phone, Mail, Image as ImageIcon, CheckCircle, XCircle,
  Plus, Edit, Trash2, Search, Eye, AlertCircle, Calendar,
  Briefcase, Award, Clock, User as UserIcon, Navigation, Cog
} from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import FacilityPermissions from './FacilityPermissions';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import { getUserLocation } from '../utils/location';

const COORDINATE_DECIMALS = 6;
const normalizeCoordinateInput = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return num.toFixed(COORDINATE_DECIMALS);
};

export function FacilityEditPage({ embeddedFacilityId, onRequestClose } = {}) {
  const params = useParams();
  const id = embeddedFacilityId ?? params.id;
  const navigate = useNavigate();

  const leaveToFacilitiesHub = () => {
    if (onRequestClose) {
      onRequestClose();
    } else {
      navigate('/super-admin/facilities');
    }
  };
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
          type="button"
          onClick={() => leaveToFacilitiesHub()}
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
              type="button"
              onClick={() => leaveToFacilitiesHub()}
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

/** Legacy `/super-admin/facilities/:id/edit` → hub opens edit in modal */
export default function FacilityEdit() {
  const { id } = useParams();
  return <Navigate to={`/super-admin/facilities?editFacilityId=${encodeURIComponent(id)}`} replace />;
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
    latitude: normalizeCoordinateInput(facility?.latitude),
    longitude: normalizeCoordinateInput(facility?.longitude),
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
                <Tooltip content="Use your current GPS location" position="bottom">
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
                            latitude: normalizeCoordinateInput(location.latitude),
                            longitude: normalizeCoordinateInput(location.longitude),
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
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{gettingLocation ? 'Getting Location...' : 'Use Current Location'}</span>
                  </button>
                </Tooltip>
                <Tooltip content="Fill coordinates from the address field" position="bottom">
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
                            latitude: normalizeCoordinateInput(response.data.latitude),
                            longitude: normalizeCoordinateInput(response.data.longitude),
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
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{geocoding ? 'Geocoding...' : 'Geocode from Address'}</span>
                  </button>
                </Tooltip>
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
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  onBlur={() => setForm((prev) => ({ ...prev, latitude: normalizeCoordinateInput(prev.latitude) }))}
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
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  onBlur={() => setForm((prev) => ({ ...prev, longitude: normalizeCoordinateInput(prev.longitude) }))}
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
                <Tooltip content={`Primary: ${form.primary_color || ''}`} position="top">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: form.primary_color }}
                    role="img"
                    aria-label={`Primary color ${form.primary_color}`}
                  />
                </Tooltip>
                <Tooltip content={`Secondary: ${form.secondary_color || ''}`} position="top">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: form.secondary_color }}
                    role="img"
                    aria-label={`Secondary color ${form.secondary_color}`}
                  />
                </Tooltip>
                <Tooltip content={`Accent: ${form.accent_color || ''}`} position="top">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: form.accent_color }}
                    role="img"
                    aria-label={`Accent color ${form.accent_color}`}
                  />
                </Tooltip>
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
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['facility-users', facilityId, search],
    queryFn: async () => {
      const params = { facility_id: facilityId, per_page: 50 };
      if (search) params.search = search;
      const res = await api.get('/users', { params });
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

  const handleConfirmDeleteUser = () => {
    if (!deleteConfirmUser) return;
    deleteMutation.mutate(deleteConfirmUser.id, { onSuccess: () => setDeleteConfirmUser(null) });
  };

  const users = data?.data || [];
  const navigate = useNavigate();

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmUser != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete this user?"
        description={
          deleteConfirmUser
            ? `Delete ${deleteConfirmUser.name || deleteConfirmUser.email}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Facility Accounts</h3>
          <p className="text-sm text-gray-600">Manage users associated with this facility.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/team/users?create=1&facility_id=${facilityId}`)}
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
                  <Tooltip content="Edit user" position="top">
                    <button
                      type="button"
                      onClick={() => navigate(`/team/users?editUserId=${user.id}`)}
                      className="p-1.5 text-[var(--theme-primary)] hover:bg-gray-100 rounded"
                      aria-label="Edit user"
                    >
                      <Edit className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </Tooltip>
                  <Tooltip content="View profile" position="top">
                    <button
                      type="button"
                      onClick={() => setViewingProfile(user)}
                      className="p-1.5 text-[var(--theme-primary)] hover:bg-gray-100 rounded"
                      aria-label="View profile"
                    >
                      <Eye className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Remove from facility" position="top">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmUser(user)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      aria-label="Remove user from facility"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </Tooltip>
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
            navigate(`/team/users?editUserId=${viewingProfile.id}`);
          }}
        />
      )}
    </div>
    </>
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
  const modalTitle =
    isLoading && !displayUser
      ? 'Loading profile'
      : displayUser?.name || displayUser?.email || 'User profile';

  return (
    <Modal isOpen={!!user} onClose={onClose} title={modalTitle} size="full" className="max-w-4xl">
      {isLoading && !displayUser ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--theme-primary)]" />
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      ) : (
        <>
          <div className="-mx-6 -mt-2 border-b border-white/20 bg-gradient-to-r from-[var(--theme-primary)] to-[#4a7a2a] px-6 py-5 text-white">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
              {displayUser.profile_image_url ? (
                <img
                  src={displayUser.profile_image_url}
                  alt={displayUser.name || displayUser.email || 'Profile'}
                  className="mx-auto h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg md:mx-0 md:h-32 md:w-32"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg md:mx-0 md:h-32 md:w-32 ${displayUser.profile_image_url ? 'hidden' : ''}`}
              >
                <span className="text-4xl font-bold text-[var(--theme-primary)] md:text-5xl">
                  {displayUser.name?.charAt(0)?.toUpperCase() || displayUser.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 text-center md:text-left">
                {displayUser.email && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-50 md:justify-start md:text-base">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="break-all">{displayUser.email}</span>
                  </div>
                )}
                <div className="mt-2">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                      displayUser.is_active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {displayUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        <div className="pt-6">
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

        <div className="-mx-6 mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2 transition-colors hover:bg-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-6 py-2 text-white transition-colors hover:bg-[var(--theme-primary-hover)]"
          >
            <Edit className="h-4 w-4" />
            Edit User
          </button>
        </div>
        </>
      )}
    </Modal>
  );
}

