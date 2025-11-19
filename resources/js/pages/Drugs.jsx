import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Pill, Plus, Search, Edit, Trash2, X } from 'lucide-react';

export default function Drugs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['drugs', search],
    queryFn: async () => {
      const res = await api.get('/drugs', { params: { search, per_page: 50 } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/drugs/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['drugs']),
  });

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Drugs Management</h2>
            <p className="text-gray-600">View and manage drugs in the system.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="w-full sm:w-auto px-4 py-2 bg-[#25603E] text-white rounded-lg hover:bg-[#1B402D] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Add Drug</span>
          </button>
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drugs by name or generic name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25603E]"></div>
          <p className="mt-4 text-gray-600">Loading drugs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generic Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage Form</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strength</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data?.length ? (
                  data.data.map((drug) => (
                    <tr key={drug.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{drug.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{drug.generic_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{drug.dosage_form || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{drug.strength || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          drug.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {drug.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => { setEditing(drug); setShowForm(true); }}
                            className="p-2 text-[#25603E] hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.confirm('Delete drug?') && deleteMutation.mutate(drug.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">No drugs found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <DrugForm
          record={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries(['drugs']); }}
        />
      )}
    </div>
  );
}

function DrugForm({ record, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: record?.name || '',
    generic_name: record?.generic_name || '',
    description: record?.description || '',
    dosage_form: record?.dosage_form || '',
    strength: record?.strength || '',
    indications: record?.indications || '',
    contraindications: record?.contraindications || '',
    side_effects: record?.side_effects || '',
    storage_instructions: record?.storage_instructions || '',
    is_active: record?.is_active !== undefined ? record.is_active : true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (record) {
        await api.put(`/drugs/${record.id}`, form);
      } else {
        await api.post('/drugs', form);
      }
      onSuccess();
    } catch (e) {
      setErrors(e.response?.data?.errors || { general: e.response?.data?.message || 'Failed to save drug' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-sm md:text-base">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{record ? 'Edit Drug' : 'Add Drug'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6" id="drug-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
                <input
                  value={form.generic_name}
                  onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
                />
                {errors.generic_name && <p className="text-xs text-red-600 mt-1">{errors.generic_name[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                <input
                  value={form.dosage_form}
                  onChange={(e) => setForm({ ...form, dosage_form: e.target.value })}
                  placeholder="e.g., Tablet, Capsule, Liquid"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
                />
                {errors.dosage_form && <p className="text-xs text-red-600 mt-1">{errors.dosage_form[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
                <input
                  value={form.strength}
                  onChange={(e) => setForm({ ...form, strength: e.target.value })}
                  placeholder="e.g., 500mg, 10ml"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
                />
                {errors.strength && <p className="text-xs text-red-600 mt-1">{errors.strength[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
              />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indications</label>
              <textarea
                value={form.indications}
                onChange={(e) => setForm({ ...form, indications: e.target.value })}
                rows={3}
                placeholder="What conditions or diseases this drug is used to treat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
              />
              {errors.indications && <p className="text-xs text-red-600 mt-1">{errors.indications[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraindications</label>
              <textarea
                value={form.contraindications}
                onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                rows={3}
                placeholder="Conditions or situations where this drug should not be used"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
              />
              {errors.contraindications && <p className="text-xs text-red-600 mt-1">{errors.contraindications[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side Effects</label>
              <textarea
                value={form.side_effects}
                onChange={(e) => setForm({ ...form, side_effects: e.target.value })}
                rows={3}
                placeholder="Known side effects of this drug"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
              />
              {errors.side_effects && <p className="text-xs text-red-600 mt-1">{errors.side_effects[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Instructions</label>
              <textarea
                value={form.storage_instructions}
                onChange={(e) => setForm({ ...form, storage_instructions: e.target.value })}
                rows={2}
                placeholder="e.g., Store at room temperature, Keep refrigerated"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
              />
              {errors.storage_instructions && <p className="text-xs text-red-600 mt-1">{errors.storage_instructions[0]}</p>}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#25603E] border-gray-300 rounded focus:ring-[#25603E]"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

          </form>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="drug-form"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 bg-[#25603E] text-white rounded-lg hover:bg-[#1B402D] disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

