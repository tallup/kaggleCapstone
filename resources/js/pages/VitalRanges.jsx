import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Activity, Plus, Edit, Trash2 } from 'lucide-react';

export default function VitalRanges() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vital-ranges'],
    queryFn: async () => (await api.get('/vital-ranges', { params: { per_page: 50 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/vital-ranges/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['vital-ranges']),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vital Ranges</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center justify-center space-x-2 text-sm md:text-base text-sm md:text-base">
          <Plus className="w-4 h-4" />
          <span>Add Range</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
          <p className="mt-4 text-gray-600">Loading ranges...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vital</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data?.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 capitalize">{r.parameter?.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.min_normal ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.max_normal ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.unit ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button onClick={() => { setEditing(r); setShowForm(true); }} className="p-2 text-[#2D5016] hover:bg-green-50 rounded-lg mr-2"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm('Delete range?') && deleteMutation.mutate(r.id)} className="p-2 text-[#8B4513] hover:bg-amber-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.data?.length && (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No ranges defined</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <RangeForm
          record={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries(['vital-ranges']); }}
        />
      )}
    </div>
  );
}

function RangeForm({ record, onClose, onSuccess }) {
  const [form, setForm] = useState({
    parameter: record?.parameter || '',
    min_normal: record?.min_normal ?? '',
    max_normal: record?.max_normal ?? '',
    unit: record?.unit || '',
    description: record?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (record) {
        await api.put(`/vital-ranges/${record.id}`, form);
      } else {
        await api.post('/vital-ranges', form);
      }
      onSuccess();
    } catch (e) {
      setErrors(e.response?.data?.errors || { general: e.response?.data?.message || 'Failed to save range' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center justify-center z-50 p-4 overflow-y-auto text-sm md:text-base" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{record ? 'Edit Range' : 'Add Range'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800">{errors.general}</p></div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parameter *</label>
              <select value={form.parameter} onChange={(e) => setForm({ ...form, parameter: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent">
                <option value="">Select parameter</option>
                <option value="systolic">Systolic</option>
                <option value="diastolic">Diastolic</option>
                <option value="temperature">Temperature</option>
                <option value="pulse">Pulse</option>
                <option value="oxygen_saturation">Oxygen Saturation</option>
              </select>
              {errors.parameter && <p className="text-xs text-red-600 mt-1">{errors.parameter[0]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Normal</label>
                <input type="number" step="0.01" value={form.min_normal} onChange={(e) => setForm({ ...form, min_normal: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Normal</label>
                <input type="number" step="0.01" value={form.max_normal} onChange={(e) => setForm({ ...form, max_normal: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent" />
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

