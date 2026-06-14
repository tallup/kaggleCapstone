import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Pill, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormCheckbox from '../components/forms/FormCheckbox';
import { useToastContext } from '../contexts/ToastContext';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

export default function Drugs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
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
  const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_drugs');
  const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_drugs');
  const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_drugs');

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
        title="Delete this drug?"
        description="This drug record will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Drugs Management</h2>
            <p className="text-gray-600">View and manage drugs in the system.</p>
          </div>
          {canCreate && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>Add Drug</span>
            </button>
          )}
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drugs by name or generic name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading drugs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <Tooltip content="Edit" position="top">
                              <CardIconButton
                                variant="edit"
                                type="button"
                                onClick={() => { setEditing(drug); setShowForm(true); }}
                                aria-label="Edit"
                              >
                                <Edit className="h-4 w-4" strokeWidth={2.5} />
                              </CardIconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip content="Delete" position="top">
                              <CardIconButton
                                variant="delete"
                                type="button"
                                onClick={() => setDeleteConfirmId(drug.id)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                              </CardIconButton>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12">
                      <EmptyState
                        icon={Pill}
                        title="No drugs found"
                        description="Add a new drug to get started."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editing ? 'Edit Drug' : 'Add Drug'}
        size="xl"
      >
        <DrugForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); queryClient.invalidateQueries(['drugs']); }}
        />
      </Modal>
    </>
  );
}

// Zod schema for drug form validation
const drugSchema = z.object({
  name: z.string().min(1, 'Drug name is required'),
  generic_name: z.string().optional(),
  description: z.string().optional(),
  dosage_form: z.string().optional(),
  strength: z.string().optional(),
  indications: z.string().optional(),
  contraindications: z.string().optional(),
  side_effects: z.string().optional(),
  storage_instructions: z.string().optional(),
  is_active: z.boolean().default(true),
});

function DrugForm({ record, onClose, onSuccess, inModal = false }) {
  const toast = useToastContext();
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(drugSchema),
    defaultValues: {
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
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (record) {
        await api.put(`/drugs/${record.id}`, data);
        toast.success('Drug updated successfully', '', { isFormSubmission: true });
      } else {
        await api.post('/drugs', data);
        toast.success('Drug created successfully', '', { isFormSubmission: true });
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
        toast.error('Failed to save drug', errorData?.message || 'An error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formInner = (
    <>
        {!inModal && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {record ? 'Edit Drug' : 'Add Drug'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        )}

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6" id="drug-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                name="name"
                label="Drug Name"
                required
                tooltip="The brand or trade name of the drug"
              />
              <FormInput
                name="generic_name"
                label="Generic Name"
                placeholder="Enter generic name"
                tooltip="The generic or chemical name of the drug"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                name="dosage_form"
                label="Dosage Form"
                placeholder="e.g., Tablet, Capsule, Liquid"
                tooltip="The physical form of the medication"
              />
              <FormInput
                name="strength"
                label="Strength"
                placeholder="e.g., 500mg, 10ml"
                tooltip="The strength or concentration of the drug"
              />
            </div>

            <FormTextarea
              name="description"
              label="Description"
              rows={3}
              placeholder="Enter drug description"
              tooltip="General description of the drug"
            />

            <FormTextarea
              name="indications"
              label="Indications"
              rows={3}
              placeholder="What conditions or diseases this drug is used to treat"
              tooltip="Medical conditions this drug is prescribed for"
            />

            <FormTextarea
              name="contraindications"
              label="Contraindications"
              rows={3}
              placeholder="Conditions or situations where this drug should not be used"
              tooltip="When this drug should NOT be used"
            />

            <FormTextarea
              name="side_effects"
              label="Side Effects"
              rows={3}
              placeholder="Known side effects of this drug"
              tooltip="Potential adverse effects of the medication"
            />

            <FormTextarea
              name="storage_instructions"
              label="Storage Instructions"
              rows={2}
              placeholder="e.g., Store at room temperature, Keep refrigerated"
              tooltip="How to properly store this medication"
            />

            <FormCheckbox
              name="is_active"
              label="Active"
              tooltip="Whether this drug is currently active in the system"
            />

          </form>
        </FormProvider>

        <div className={`flex justify-end space-x-3 ${inModal ? 'mt-6 pt-4 border-t border-gray-200' : 'mt-6'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="drug-form"
            disabled={submitting}
            className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (record ? 'Update' : 'Create')}
          </button>
        </div>
    </>
  );

  if (inModal) {
    return <div className="space-y-2">{formInner}</div>;
  }

  return (
    <div>
      <SectionCard>{formInner}</SectionCard>
    </div>
  );
}

