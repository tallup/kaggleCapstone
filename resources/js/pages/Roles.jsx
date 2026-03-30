import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Shield, Plus, Edit, Trash2 } from 'lucide-react';
import FacilityPermissions from './FacilityPermissions';
import logger from '../utils/logger';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Roles() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Check user role
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
  const isFacilityAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';

  // ALL hooks must be called before any conditional returns
  // These queries are only enabled for super admins, but hooks must always be called
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles', { params: { per_page: 50 } })).data,
    enabled: !userLoading && isSuperAdmin, // Only fetch for super admin
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/permissions')).data,
    enabled: !userLoading && isSuperAdmin, // Only fetch for super admin
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['roles']),
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // For facility admin, load their facility using useQuery
  const { data: facilityData, isLoading: facilityLoading, error: facilityError } = useQuery({
    queryKey: ['facility', currentUser?.facility_id],
    queryFn: async () => {
      try {
        const res = await api.get(`/facilities/${currentUser.facility_id}`);
        // Handle different response structures
        if (res.data?.data) {
          return res.data.data;
        } else if (res.data) {
          return res.data;
        }
        return res;
      } catch (error) {
        logger.error('Error fetching facility:', error);
        throw error;
      }
    },
    enabled: !userLoading && isFacilityAdmin && !isSuperAdmin && !!currentUser?.facility_id,
    retry: 1,
  });

  // Set selected facility when data is loaded
  useEffect(() => {
    if (facilityData && !selectedFacility) {
      setSelectedFacility(facilityData);
    }
  }, [facilityData, selectedFacility]);

  // Now we can do conditional returns after all hooks are declared
  // If facility admin, show modern facility permissions interface
  if (isFacilityAdmin && !isSuperAdmin) {
    if (userLoading || facilityLoading || !selectedFacility) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
            <p className="mt-4 text-gray-600">Loading permissions...</p>
          </div>
        </div>
      );
    }

    if (facilityError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white rounded-lg shadow p-6 max-w-md">
            <p className="text-red-600 mb-4">
              {facilityError?.response?.data?.message || facilityError?.message || 'Failed to load facility'}
            </p>
            <button
              onClick={() => {
                queryClient.invalidateQueries(['facility', currentUser?.facility_id]);
                setSelectedFacility(null);
              }}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)]"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <FacilityPermissions
        facilityId={selectedFacility.id}
        facilityName={selectedFacility.name}
        onBack={null}
      />
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmId != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId == null) return;
          deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
        }}
        title="Delete this role?"
        description="Users assigned this role may be affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Roles & Permissions Management</h2>
            <p className="text-gray-600">View and manage user roles and permissions.</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base">
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div><p className="mt-4 text-gray-600">Loading roles...</p></div>
      ) : (
        <div className="space-y-4">
          {rolesData?.data?.length ? (
            rolesData.data.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{role.permissions?.map(p => p.name).join(', ') || 'No permissions'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => { setEditing(role); setShowForm(true); }} className="p-2 text-[var(--theme-primary)] hover:bg-green-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setDeleteConfirmId(role.id)} className="p-2 text-[var(--theme-secondary)] hover:bg-amber-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No roles found</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <RoleForm
          record={editing}
          permissions={permissions || []}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries(['roles']); }}
        />
      )}
    </div>
    </>
  );
}

function RoleForm({ record, permissions, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: record?.name || '',
    permissions: record?.permissions?.map(p => p.name) || [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const togglePermission = (perm) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (record) {
        await api.put(`/roles/${record.id}`, form);
      } else {
        await api.post('/roles', form);
      }
      onSuccess();
    } catch (e) {
      setErrors(e.response?.data?.errors || { general: e.response?.data?.message || 'Failed to save role' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {record ? 'Edit Role' : 'Add Role'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.general && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800">{errors.general}</p></div>}
          <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name *
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
              <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-2 border rounded">
                {permissions.map((perm) => (
                  <label key={perm.id} className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm.name)}
                      onChange={() => togglePermission(perm.name)}
                    />
                    <span>{perm.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="role-form"
              disabled={submitting}
              className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

