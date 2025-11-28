import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Building2, Plus, Search, Edit, Trash2, MapPin, Phone, Mail, Building } from 'lucide-react';
import SectionCard from '../components/SectionCard';

export default function Branches() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
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
  const isFacilityAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin' || currentUser?.role === 'facility_admin';

  const { data: facilities } = useQuery({
    queryKey: ['facilities-options'],
    queryFn: async () => (await api.get('/facilities', { params: { per_page: 100 } })).data,
    enabled: isSuperAdmin, // Only fetch facilities for super admin
  });

  const { data, isLoading } = useQuery({
    queryKey: ['branches', search, facilityFilter],
    queryFn: async () => {
      const res = await api.get('/branches', { params: { search, facility_id: facilityFilter || undefined, per_page: 20 } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/branches/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['branches']),
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  if (showForm) {
    return (
      <div>
        <BranchForm
          record={editing}
          facilities={facilities?.data || []}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          isFacilityAdmin={isFacilityAdmin}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries(['branches']);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Branches Management</h2>
            <p className="text-gray-600">Search and manage branches.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
            >
              <option value="">All Facilities</option>
              {facilities?.data?.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading branches...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.data?.length ? (
            data.data.map((b) => (
              <div key={b.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building className="w-5 h-5 text-[var(--theme-primary)]" />
                        <h3 className="text-lg font-bold text-gray-900">{b.name}</h3>
                      </div>
                      {b.facility?.name && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Building2 className="w-4 h-4" />
                          <span>{b.facility.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => { setEditing(b); setShowForm(true); }}
                        className="p-2 text-[var(--theme-primary)] hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                      <Edit className="w-4 h-4" />
                    </button>
                      <button
                        onClick={() => window.confirm('Delete branch?') && deleteMutation.mutate(b.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 flex-1">
                    {b.address && (
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{b.address}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{b.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white rounded-lg shadow p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No branches found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BranchForm({ record, facilities, currentUser, isSuperAdmin, isFacilityAdmin, onClose, onSuccess }) {
  // For facility admins, automatically use their facility_id
  const initialFacilityId = React.useMemo(() => {
    if (record?.facility_id) return record.facility_id;
    if (isFacilityAdmin && currentUser?.facility_id) return currentUser.facility_id;
    return '';
  }, [record, isFacilityAdmin, currentUser]);

  const [form, setForm] = useState({
    name: record?.name || '',
    facility_id: initialFacilityId,
    address: record?.address || '',
    phone: record?.phone || '',
    email: record?.email || '',
    is_active: record?.is_active ?? true,
    latitude: record?.latitude || '',
    longitude: record?.longitude || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Update facility_id when initialFacilityId changes (when currentUser loads)
  React.useEffect(() => {
    if (initialFacilityId && !form.facility_id) {
      setForm(prev => ({ ...prev, facility_id: initialFacilityId }));
    }
  }, [initialFacilityId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (record) {
        await api.put(`/branches/${record.id}`, form);
      } else {
        await api.post('/branches', form);
      }
      onSuccess();
    } catch (e) {
      setErrors(e.response?.data?.errors || { general: e.response?.data?.message || 'Failed to save branch' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SectionCard>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {record ? 'Edit Branch' : 'Add Branch'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

          <form id="branch-form" onSubmit={handleSubmit} className="space-y-6">
            {isSuperAdmin ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility *
                </label>
                <select
                  value={form.facility_id}
                  onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                >
                  <option value="">Select Facility</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {errors.facility_id && <p className="text-xs text-red-600 mt-1">{errors.facility_id[0]}</p>}
              </div>
            ) : (
              <input type="hidden" value={form.facility_id} name="facility_id" />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Location Coordinates
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.address) {
                      alert('Please enter an address first');
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
                      } else {
                        alert('Unable to geocode address. Please enter coordinates manually.');
                      }
                    } catch (err) {
                      alert('Geocoding failed. Please enter coordinates manually.');
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
              </div>
            </div>
          </form>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="branch-form"
            disabled={submitting}
            className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

