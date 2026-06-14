import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Tag, Plus, Search, Edit, Trash2 } from 'lucide-react';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import FormCheckbox from '../components/forms/FormCheckbox';
import { useToastContext } from '../contexts/ToastContext';
import ModuleProtectedRoute from '../components/ModuleProtectedRoute';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

function ExpenseCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expense-categories', search, typeFilter],
    queryFn: async () => {
      const params = { search, active_only: false };
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/billing/expense-categories', { params });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/billing/expense-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-categories']);
    },
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const categories = data?.data || [];

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmId != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId == null) return;
          deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
        }}
        title="Delete this category?"
        description="This category will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Categories</h2>
            <p className="text-gray-600">Manage expense categories for organizing expenses.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="operational">Operational</option>
            <option value="resident_billing">Resident Billing</option>
            <option value="staff">Staff</option>
            <option value="vendor">Vendor</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.length ? (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {category.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{category.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          category.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip content="Edit" position="top">
                            <CardIconButton
                              variant="edit"
                              type="button"
                              onClick={() => { setEditing(category); setShowForm(true); }}
                              aria-label="Edit"
                            >
                              <Edit className="h-4 w-4" strokeWidth={2.5} />
                            </CardIconButton>
                          </Tooltip>
                          <Tooltip content="Delete" position="top">
                            <CardIconButton
                              variant="delete"
                              type="button"
                              onClick={() => setDeleteConfirmId(category.id)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                            </CardIconButton>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12">
                      <EmptyState
                        icon={Tag}
                        title="No categories found"
                        description="Create a new expense category to get started."
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
        title={editing ? 'Edit Category' : 'Add Category'}
        size="xl"
      >
        <ExpenseCategoryForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); queryClient.invalidateQueries(['expense-categories']); }}
        />
      </Modal>
    </>
  );
}

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  type: z.enum(['operational', 'resident_billing', 'staff', 'vendor', 'other']),
  is_active: z.boolean().default(true),
});

function ExpenseCategoryForm({ record, onClose, onSuccess, inModal = false }) {
  const toast = useToastContext();
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: record?.name || '',
      description: record?.description || '',
      type: record?.type || 'other',
      is_active: record?.is_active !== undefined ? record.is_active : true,
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (record) {
        await api.put(`/billing/expense-categories/${record.id}`, data);
        toast.success('Category updated successfully', '', { isFormSubmission: true });
      } else {
        await api.post('/billing/expense-categories', data);
        toast.success('Category created successfully', '', { isFormSubmission: true });
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
      {!inModal && (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {record ? 'Edit Category' : 'Add Category'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          ×
        </button>
      </div>
      )}

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <FormInput name="name" label="Category Name" required />
          <FormTextarea name="description" label="Description" />
          <FormSelect
            name="type"
            label="Type"
            required
            options={[
              { value: 'operational', label: 'Operational' },
              { value: 'resident_billing', label: 'Resident Billing' },
              { value: 'staff', label: 'Staff' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <FormCheckbox name="is_active" label="Active" />

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
            >
              {submitting ? 'Saving...' : record ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default function ExpenseCategoriesPage() {
  return (
    <ModuleProtectedRoute module="billing_expenses">
      <ExpenseCategories />
    </ModuleProtectedRoute>
  );
}

