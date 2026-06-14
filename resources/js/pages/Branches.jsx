import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Building2, Plus, Search, Edit, Trash2, MapPin, Phone, Mail, Building, Navigation, Users } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import { getUserLocation } from '../utils/location';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/phoneFormatter';
import { useToastContext } from '../contexts/ToastContext';
import logger from '../utils/logger';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill from '../components/ui/DataPill';

const COORDINATE_DECIMALS = 6;
const normalizeCoordinateInput = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return num.toFixed(COORDINATE_DECIMALS);
};

export default function Branches() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
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
  const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin' || currentUser?.role === 'facility_admin';
  const isFacilityAdmin = currentUser?.role === 'facility_admin';
  
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_branches');
  const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_branches');
  const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_branches');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.showToast('Branch deleted successfully', 'success');
    },
    onError: (error) => {
      toast.showToast(error?.response?.data?.message || 'Failed to delete branch', 'error');
    },
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmId != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId == null) return;
          deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
        }}
        title="Delete this branch?"
        description="This branch will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editing ? 'Edit Branch' : 'Add Branch'}
        size="xl"
      >
        <BranchForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          facilities={facilities?.data || []}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          isFacilityAdmin={isFacilityAdmin}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.refetchQueries({ queryKey: ['branches'] });
          }}
        />
      </Modal>
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
              <EntityCardShell key={b.id}>
                <EntityCardHeader
                  left={
                    <div className="flex flex-wrap items-center gap-2">
                      <Building className="h-6 w-6 shrink-0 text-[var(--theme-primary)]" />
                    </div>
                  }
                  right={
                    <>
                      {canEdit && (
                        <Tooltip content="Edit branch" position="top">
                          <CardIconButton
                            variant="edit"
                            icon={Edit}
                            aria-label="Edit branch"
                            onClick={() => {
                              setEditing(b);
                              setShowForm(true);
                            }}
                          />
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip content="Delete branch" position="top">
                          <CardIconButton
                            variant="delete"
                            icon={Trash2}
                            aria-label="Delete branch"
                            onClick={() => setDeleteConfirmId(b.id)}
                          />
                        </Tooltip>
                      )}
                    </>
                  }
                />

                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{b.name}</h3>
                {b.facility?.name && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {b.facility.name}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {b.is_active === false && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Inactive
                    </span>
                  )}
                  <DataPill icon={Building2} className="!inline-flex w-auto max-w-full shrink-0 py-1.5 text-xs">
                    <span className="font-normal">
                      <span className="font-semibold text-slate-800">{Number(b.residents_count) || 0}</span>
                      {' '}residents
                    </span>
                  </DataPill>
                  <DataPill icon={Users} className="!inline-flex w-auto max-w-full shrink-0 py-1.5 text-xs">
                    <span className="font-normal">
                      <span className="font-semibold text-slate-800">{Number(b.caregivers_count) || 0}</span>
                      {' '}staff
                    </span>
                  </DataPill>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5">
                  {b.address && (
                    <DataPill icon={MapPin}>
                      <span className="line-clamp-2 font-normal text-slate-600">{b.address}</span>
                    </DataPill>
                  )}
                  {b.phone && (
                    <DataPill icon={Phone}>
                      <span className="font-normal text-slate-600">{formatPhoneNumber(b.phone) || b.phone}</span>
                    </DataPill>
                  )}
                  {b.email && (
                    <DataPill icon={Mail}>
                      <span className="truncate font-normal text-slate-600">{b.email}</span>
                    </DataPill>
                  )}
                  {b.latitude != null && b.latitude !== '' && b.longitude != null && b.longitude !== '' && (
                    <DataPill icon={Navigation}>
                      <span className="font-normal text-slate-600">
                        Geofence coordinates{' '}
                        <span className="tabular-nums text-slate-500">
                          ({Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)})
                        </span>
                      </span>
                    </DataPill>
                  )}
                  {!b.address && !b.phone && !b.email
                    && (b.latitude == null || b.latitude === '' || b.longitude == null || b.longitude === '') && (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs leading-snug text-slate-500">
                      No address, phone, or email on file. Use <span className="font-semibold text-slate-600">Edit</span> to add branch details.
                    </p>
                  )}
                </div>
              </EntityCardShell>
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
    </>
  );
}

function BranchForm({ record, facilities, currentUser, isSuperAdmin, isFacilityAdmin, onClose, onSuccess, inModal = false }) {
  // For facility admins, automatically use their facility_id
  const initialFacilityId = React.useMemo(() => {
    if (record?.facility_id) return record.facility_id;
    if (currentUser?.facility_id) return currentUser.facility_id;
    return '';
  }, [record, currentUser]);

  const [form, setForm] = useState({
    name: record?.name || '',
    facility_id: initialFacilityId,
    address: record?.address || '',
    phone: record?.phone || '',
    email: record?.email || '',
    is_active: record?.is_active ?? true,
    latitude: normalizeCoordinateInput(record?.latitude),
    longitude: normalizeCoordinateInput(record?.longitude),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const toast = useToastContext();

  // Update facility_id when initialFacilityId changes (when currentUser loads)
  React.useEffect(() => {
    if (initialFacilityId && !form.facility_id) {
      setForm(prev => ({ ...prev, facility_id: initialFacilityId }));
    }
  }, [initialFacilityId, form.facility_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    
    // Client-side validation
    if (!form.name || !form.name.trim()) {
      setErrors({ name: ['Name is required'] });
      setSubmitting(false);
      return;
    }

    // Ensure facility_id is set
    let facilityId = form.facility_id || currentUser?.facility_id || initialFacilityId;
    if (!facilityId) {
      setErrors({ facility_id: ['Facility is required'] });
      setSubmitting(false);
      return;
    }

    try {
      // Prepare form data - ensure proper formatting
      const submitData = {
        name: form.name.trim(),
        facility_id: facilityId,
        is_active: Boolean(form.is_active),
      };

      // Always send optional fields so clearing values persists on update.
      const addressRaw = String(form.address ?? '').trim();
      submitData.address = addressRaw === '' ? null : addressRaw;

      const phoneRaw = String(form.phone ?? '').trim();
      submitData.phone = phoneRaw === '' ? null : (unformatPhoneNumber(phoneRaw) || null);

      const emailRaw = String(form.email ?? '').trim();
      submitData.email = emailRaw === '' ? null : emailRaw;

      const latitudeRaw = String(form.latitude ?? '').trim();
      const longitudeRaw = String(form.longitude ?? '').trim();

      if (latitudeRaw === '') {
        submitData.latitude = null;
      } else if (!Number.isNaN(Number(latitudeRaw))) {
        submitData.latitude = parseFloat(latitudeRaw);
      }

      if (longitudeRaw === '') {
        submitData.longitude = null;
      } else if (!Number.isNaN(Number(longitudeRaw))) {
        submitData.longitude = parseFloat(longitudeRaw);
      }

      if (record) {
        await api.put(`/branches/${record.id}`, submitData);
        toast.showToast('Branch updated successfully', 'success', { isFormSubmission: true });
      } else {
        await api.post('/branches', submitData);
        toast.showToast('Branch created successfully', 'success', { isFormSubmission: true });
      }
      onSuccess();
    } catch (e) {
      logger.error('Branch save error:', e.response?.data);
      const errorData = e.response?.data;
      if (errorData?.errors) {
        // Handle Laravel validation errors format
        const formattedErrors = {};
        Object.keys(errorData.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(errorData.errors[key]) 
            ? errorData.errors[key] 
            : [errorData.errors[key]];
        });
        setErrors(formattedErrors);
      } else if (errorData?.message) {
        setErrors({ general: errorData.message });
      } else {
        setErrors({ general: 'Failed to save branch. Please check all required fields.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formInner = (
        <>
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
                <div className="flex items-center space-x-2">
                  <Tooltip content="Use your current GPS location" position="bottom">
                    <button
                      type="button"
                      onClick={async () => {
                        setGettingLocation(true);
                        try {
                          const location = await getUserLocation({
                            timeout: 10000,
                            maximumAge: 0, // Always get fresh location
                            enableHighAccuracy: true,
                          });
                          if (location) {
                            setForm((prev) => ({
                              ...prev,
                              latitude: normalizeCoordinateInput(location.latitude),
                              longitude: normalizeCoordinateInput(location.longitude),
                            }));
                          } else {
                            alert('Unable to get your current location. Please allow location access or enter coordinates manually.');
                          }
                        } catch (err) {
                          alert('Failed to get current location. Please enter coordinates manually.');
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
                          alert('Please enter an address first');
                          return;
                        }
                        setGeocoding(true);
                        try {
                          const response = await api.post('/geocode', { address: form.address });
                          if (response.data.success) {
                            setForm((prev) => ({
                              ...prev,
                              latitude: normalizeCoordinateInput(response.data.latitude),
                              longitude: normalizeCoordinateInput(response.data.longitude),
                            }));
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm"
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
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="(425) 555-0123"
                  maxLength={14}
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
        </>
  );

  if (inModal) {
    return <div className="space-y-4">{formInner}</div>;
  }

  return (
    <div>
      <SectionCard>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {record ? 'Edit Branch' : 'Add Branch'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        {formInner}
      </SectionCard>
    </div>
  );
}

