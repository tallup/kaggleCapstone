import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Shield, Plus, Edit, Trash2 } from 'lucide-react';

export default function Roles() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles', { params: { per_page: 50 } })).data,
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/permissions')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['roles']),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center justify-center space-x-2 text-sm md:text-base text-sm md:text-base">
          <Plus className="w-4 h-4" />
          <span>Add Role</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div><p className="mt-4 text-gray-600">Loading roles...</p></div>
      ) : (
        <div className="space-y-4">
          {rolesData?.data?.length ? (
            rolesData.data.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-amber-100 rounded-lg"><Shield className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{role.permissions?.map(p => p.name).join(', ') || 'No permissions'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => { setEditing(role); setShowForm(true); }} className="p-2 text-[#2D5016] hover:bg-green-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm('Delete role?') && deleteMutation.mutate(role.id)} className="p-2 text-[#8B4513] hover:bg-amber-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center justify-center z-50 p-4 text-sm md:text-base">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{record ? 'Edit Role' : 'Add Role'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          {errors.general && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800">{errors.general}</p></div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
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
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] disabled:opacity-50">{submitting ? 'Saving...' : (record ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

