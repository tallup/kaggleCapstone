import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Activity, Plus, Edit, Trash2, X } from 'lucide-react';
import FormInput from '../components/forms/FormInput';
import FormSelect from '../components/forms/FormSelect';
import FormTextarea from '../components/forms/FormTextarea';
import { useToastContext } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

export default function VitalRanges() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Get current user to check permissions
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
  const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_vital_ranges');
  const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_vital_ranges');
  const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_vital_ranges');

  const { data, isLoading } = useQuery({
    queryKey: ['vital-ranges'],
    queryFn: async () => (await api.get('/vital-ranges', { params: { per_page: 50 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/vital-ranges/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['vital-ranges']),
  });

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
        title="Delete this vital range?"
        description="This reference range will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editing ? 'Edit Range' : 'Add Range'}
        size="lg"
      >
        <RangeForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); queryClient.invalidateQueries(['vital-ranges']); }}
        />
      </Modal>
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vital Ranges Management</h2>
            <p className="text-gray-600">View and manage vital sign reference ranges.</p>
          </div>
          {canCreate && (
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base">
              <Plus className="w-4 h-4" />
              <span>Add Range</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
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
                    <div className="flex items-center justify-end gap-1.5">
                      {canEdit && (
                        <Tooltip content="Edit range" position="top">
                          <CardIconButton
                            variant="edit"
                            icon={Edit}
                            aria-label="Edit range"
                            onClick={() => {
                              setEditing(r);
                              setShowForm(true);
                            }}
                          />
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip content="Delete range" position="top">
                          <CardIconButton
                            variant="delete"
                            icon={Trash2}
                            aria-label="Delete range"
                            onClick={() => setDeleteConfirmId(r.id)}
                          />
                        </Tooltip>
                      )}
                    </div>
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
    </div>
    </>
  );
}

// Zod schema for vital range form validation
const vitalRangeSchema = z.object({
  parameter: z.string().min(1, 'Parameter is required'),
  min_normal: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return null;
    return typeof val === 'string' ? parseFloat(val) || null : val;
  }),
  max_normal: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return null;
    return typeof val === 'string' ? parseFloat(val) || null : val;
  }),
  unit: z.string().optional(),
  description: z.string().optional(),
});

function RangeForm({ record, onClose, onSuccess, inModal = false }) {
  const toast = useToastContext();
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(vitalRangeSchema),
    defaultValues: {
      parameter: record?.parameter || '',
      min_normal: record?.min_normal ?? '',
      max_normal: record?.max_normal ?? '',
      unit: record?.unit || '',
      description: record?.description || '',
    },
  });

  // Reset form when record changes
  useEffect(() => {
    methods.reset({
      parameter: record?.parameter || '',
      min_normal: record?.min_normal ?? '',
      max_normal: record?.max_normal ?? '',
      unit: record?.unit || '',
      description: record?.description || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (record) {
        await api.put(`/vital-ranges/${record.id}`, data);
        toast.success('Vital range updated successfully', '', { isFormSubmission: true });
      } else {
        await api.post('/vital-ranges', data);
        toast.success('Vital range created successfully', '', { isFormSubmission: true });
      }
      onSuccess();
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        // Set field errors
        Object.keys(errorData.errors).forEach((key) => {
          methods.setError(key, {
            type: 'server',
            message: Array.isArray(errorData.errors[key]) 
              ? errorData.errors[key][0] 
              : errorData.errors[key],
          });
        });
      } else {
        toast.error('Failed to save vital range', errorData?.message || 'An error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const parameterOptions = [
    { value: 'systolic', label: 'Systolic' },
    { value: 'diastolic', label: 'Diastolic' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'oxygen_saturation', label: 'Oxygen Saturation' },
  ];

  return (
    <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
      {!inModal && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {record ? 'Edit Range' : 'Add Range'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <FormProvider {...methods}>
        <form id="vital-range-form" onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <FormSelect
            name="parameter"
            label="Parameter"
            options={parameterOptions}
            placeholder="Select parameter"
            required
            tooltip="The vital sign parameter to define ranges for"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              name="min_normal"
              label="Min Normal"
              type="number"
              step="0.01"
              placeholder="Enter minimum normal value"
              tooltip="Minimum value for normal range"
            />
            <FormInput
              name="max_normal"
              label="Max Normal"
              type="number"
              step="0.01"
              placeholder="Enter maximum normal value"
              tooltip="Maximum value for normal range"
            />
          </div>

          <FormInput
            name="unit"
            label="Unit"
            placeholder="e.g., mmHg, °F, bpm, %"
            tooltip="Unit of measurement for this vital sign"
          />

          <FormTextarea
            name="description"
            label="Description"
            rows={2}
            placeholder="Enter description (optional)"
            tooltip="Additional notes or description for this vital range"
          />
        </form>
      </FormProvider>

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
          form="vital-range-form"
          disabled={submitting}
          className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
        </button>
      </div>
    </div>
  );
}

