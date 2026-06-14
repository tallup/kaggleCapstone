import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { DollarSign, Plus, Search, Edit, Trash2, CheckCircle, Upload, X, List, Grid, Calendar, Tag, Building2, User } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import ModuleProtectedRoute from '../components/ModuleProtectedRoute';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';

function Expenses() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = { per_page: 20 };
      if (search) params.search = search;
      if (statusFilter) params.payment_status = statusFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/billing/expenses', { params });
      return res.data;
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id) => api.post(`/billing/expenses/${id}/mark-paid`),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Expense marked as paid');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/billing/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Expense deleted');
    },
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const expenses = data?.data || [];

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmId != null}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId == null) return;
          deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
        }}
        title="Delete this expense?"
        description="This expense record will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Expenses</h2>
            <p className="text-gray-600">Track and manage facility expenses.</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <Tooltip content="List view" position="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-[var(--theme-primary)] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </Tooltip>
              <Tooltip content="Card view" position="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white text-[var(--theme-primary)] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Card view"
                >
                  <Grid className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </Tooltip>
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : expenses.length ? (
        viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.category?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          expense.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          expense.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {expense.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          {expense.payment_status !== 'paid' && (
                            <Tooltip content="Mark as paid" position="top">
                              <CardIconButton
                                variant="resolve"
                                icon={CheckCircle}
                                aria-label="Mark as paid"
                                onClick={() => markPaidMutation.mutate(expense.id)}
                              />
                            </Tooltip>
                          )}
                          <Tooltip content="Edit" position="top">
                            <CardIconButton
                              variant="edit"
                              icon={Edit}
                              aria-label="Edit"
                              onClick={() => {
                                setEditing(expense);
                                setShowForm(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip content="Delete" position="top">
                            <CardIconButton
                              variant="delete"
                              icon={Trash2}
                              aria-label="Delete"
                              onClick={() => setDeleteConfirmId(expense.id)}
                            />
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.links && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {data.from} to {data.to} of {data.total} results
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                formatCurrency={formatCurrency}
                onMarkPaid={() => markPaidMutation.mutate(expense.id)}
                onEdit={() => { setEditing(expense); setShowForm(true); }}
                onDelete={() => setDeleteConfirmId(expense.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">No expenses found</p>
        </div>
      )}
    </div>

      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        size="xl"
      >
        <ExpenseForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); queryClient.invalidateQueries(['expenses']); }}
        />
      </Modal>
    </>
  );
}

function ExpenseCard({ expense, formatCurrency, onMarkPaid, onEdit, onDelete }) {
  const statusClass =
    expense.payment_status === 'paid'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : expense.payment_status === 'overdue'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <EntityCardShell>
      <EntityCardHeader
        left={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}
            >
              {expense.payment_status}
            </span>
          </div>
        }
        right={
          <>
            {expense.payment_status !== 'paid' && (
              <Tooltip content="Mark as paid" position="top">
                <CardIconButton
                  variant="resolve"
                  icon={CheckCircle}
                  aria-label="Mark as paid"
                  onClick={onMarkPaid}
                />
              </Tooltip>
            )}
            <Tooltip content="Edit" position="top">
              <CardIconButton variant="edit" icon={Edit} aria-label="Edit" onClick={onEdit} />
            </Tooltip>
            <Tooltip content="Delete" position="top">
              <CardIconButton variant="delete" icon={Trash2} aria-label="Delete" onClick={onDelete} />
            </Tooltip>
          </>
        }
      />

      <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl line-clamp-2">
        {expense.description}
      </h3>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <DataPill icon={DollarSign} contentClassName="font-semibold text-slate-900">
          {formatCurrency(expense.amount)}
        </DataPill>
        <DataPill icon={Calendar}>
          <span className="font-normal text-slate-600">
            {new Date(expense.expense_date).toLocaleDateString()}
          </span>
        </DataPill>
        {expense.category && (
          <DataPill icon={Tag}>
            <span className="font-normal text-slate-600">{expense.category.name}</span>
          </DataPill>
        )}
        {expense.branch && (
          <DataPill icon={Building2}>
            <span className="font-normal text-slate-600">{expense.branch.name}</span>
          </DataPill>
        )}
        {expense.resident && (
          <DataPill icon={User} className="sm:col-span-2">
            <span className="font-normal text-slate-600">{expense.resident.name}</span>
          </DataPill>
        )}
        {expense.vendor_name && (
          <DataPill className="sm:col-span-2">
            <span className="font-normal text-slate-600">Vendor: {expense.vendor_name}</span>
          </DataPill>
        )}
        {expense.payment_date && (
          <DataPill icon={Calendar} className="sm:col-span-2">
            <span className="font-normal text-slate-600">
              Paid: {new Date(expense.payment_date).toLocaleDateString()}
            </span>
          </DataPill>
        )}
      </div>

      {expense.notes ? (
        <DataPillSection label="Notes">
          <p className="line-clamp-3 text-sm">{expense.notes}</p>
        </DataPillSection>
      ) : null}
    </EntityCardShell>
  );
}

const expenseSchema = z.object({
  branch_id: z.string().optional().nullable(),
  expense_category_id: z.string().min(1, 'Category is required'),
  resident_id: z.string().optional().nullable(),
  vendor_name: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.string().min(1, 'Amount is required').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be a positive number'),
  currency: z.string().optional(),
  expense_date: z.string().min(1, 'Expense date is required'),
  payment_date: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  payment_status: z.string().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
});

function ExpenseForm({ record, onClose, onSuccess, inModal = false }) {
  const toast = useToastContext();
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories and residents
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await api.get('/billing/expense-categories', { params: { active_only: true } });
      return res.data;
    },
  });

  const { data: residentsData } = useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => {
      const res = await api.get('/residents', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get('/branches', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const methods = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      branch_id: record?.branch_id?.toString() || '',
      expense_category_id: record?.expense_category_id?.toString() || '',
      resident_id: record?.resident_id?.toString() || '',
      vendor_name: record?.vendor_name || '',
      description: record?.description || '',
      amount: record?.amount?.toString() || '',
      currency: record?.currency || 'USD',
      expense_date: record?.expense_date || new Date().toISOString().split('T')[0],
      payment_date: record?.payment_date || '',
      payment_method: record?.payment_method || '',
      payment_status: record?.payment_status || 'pending',
      invoice_number: record?.invoice_number || '',
      notes: record?.notes || '',
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        branch_id: data.branch_id || null,
        resident_id: data.resident_id || null,
        payment_date: data.payment_date || null,
        payment_method: data.payment_method || null,
      };

      if (record) {
        await api.put(`/billing/expenses/${record.id}`, payload);
        toast.success('Expense updated successfully', '', { isFormSubmission: true });
      } else {
        await api.post('/billing/expenses', payload);
        toast.success('Expense created successfully', '', { isFormSubmission: true });
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = categoriesData?.data || [];
  const residents = residentsData?.data || [];
  const branches = branchesData?.data || [];

  return (
    <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
      {!inModal && (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {record ? 'Edit Expense' : 'Add Expense'}
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
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              name="expense_category_id"
              label="Category"
              required
              options={categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
            />
            <FormSelect
              name="branch_id"
              label="Branch"
              options={[{ value: '', label: 'Select Branch' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="description" label="Description" required />
            <FormInput name="amount" label="Amount" type="number" step="0.01" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="expense_date" label="Expense Date" type="date" required />
            <FormSelect
              name="payment_status"
              label="Payment Status"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="payment_date" label="Payment Date" type="date" />
            <FormSelect
              name="payment_method"
              label="Payment Method"
              options={[
                { value: '', label: 'Select Method' },
                { value: 'cash', label: 'Cash' },
                { value: 'check', label: 'Check' },
                { value: 'card', label: 'Card' },
                { value: 'transfer', label: 'Bank Transfer' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="vendor_name" label="Vendor Name" />
            <FormInput name="invoice_number" label="Invoice Number" />
          </div>

          <FormSelect
            name="resident_id"
            label="Resident (if applicable)"
            options={[{ value: '', label: 'Select Resident' }, ...residents.map(r => ({ value: r.id.toString(), label: r.name }))]}
          />

          <FormTextarea name="notes" label="Notes" />

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

export default function ExpensesPage() {
  return (
    <ModuleProtectedRoute module="billing_expenses">
      <Expenses />
    </ModuleProtectedRoute>
  );
}

