import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { FileText, Plus, Search, Edit, Trash2, Send, CheckCircle, X } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import ModuleProtectedRoute from '../components/ModuleProtectedRoute';
import EmptyState from '../components/ui/EmptyState';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

function BillingInvoices() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['billing-invoices', search, statusFilter],
    queryFn: async () => {
      const params = { per_page: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/billing/invoices', { params });
      return res.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id) => api.post(`/billing/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries(['billing-invoices']);
      toast.success('Invoice sent successfully');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, data }) => api.post(`/billing/invoices/${id}/mark-paid`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['billing-invoices']);
      toast.success('Invoice marked as paid');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/billing/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['billing-invoices']);
      toast.success('Invoice deleted');
    },
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const invoices = data?.data || [];

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
        title="Delete this invoice?"
        description="This draft invoice will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing Invoices</h2>
            <p className="text-gray-600">Manage resident billing invoices.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {invoice.resident?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status === 'draft' && (
                            <Tooltip content="Send" position="top">
                              <CardIconButton
                                variant="primary"
                                type="button"
                                onClick={() => sendMutation.mutate(invoice.id)}
                                aria-label="Send invoice"
                                disabled={sendMutation.isPending}
                              >
                                <Send className="h-4 w-4" strokeWidth={2.5} />
                              </CardIconButton>
                            </Tooltip>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <Tooltip content="Mark as paid" position="top">
                              <CardIconButton
                                variant="resolve"
                                type="button"
                                onClick={() => markPaidMutation.mutate({ id: invoice.id, data: {} })}
                                aria-label="Mark as paid"
                                disabled={markPaidMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
                              </CardIconButton>
                            </Tooltip>
                          )}
                          {invoice.status === 'draft' && (
                            <Tooltip content="Edit" position="top">
                              <CardIconButton
                                variant="edit"
                                type="button"
                                onClick={() => { setEditing(invoice); setShowForm(true); }}
                                aria-label="Edit"
                              >
                                <Edit className="h-4 w-4" strokeWidth={2.5} />
                              </CardIconButton>
                            </Tooltip>
                          )}
                          {invoice.status === 'draft' && (
                            <Tooltip content="Delete" position="top">
                              <CardIconButton
                                variant="delete"
                                type="button"
                                onClick={() => setDeleteConfirmId(invoice.id)}
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
                    <td colSpan="7" className="px-6 py-12">
                      <EmptyState
                        icon={FileText}
                        title="No invoices found"
                        description="Create a new invoice to get started."
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
        title={editing ? 'Edit Invoice' : 'Create Invoice'}
        size="xl"
      >
        <InvoiceForm
          key={editing?.id ?? 'new'}
          inModal
          record={editing}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); queryClient.invalidateQueries(['billing-invoices']); }}
        />
      </Modal>
    </>
  );
}

const invoiceSchema = z.object({
  resident_id: z.string().min(1, 'Resident is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  tax_amount: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), 'Tax amount must be a positive number'),
  discount_amount: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), 'Discount amount must be a positive number'),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.string().min(1, 'Quantity is required').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Quantity must be a positive number'),
    unit_price: z.string().min(1, 'Unit price is required').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Unit price must be a positive number'),
    expense_category_id: z.string().optional().nullable(),
  })).min(1, 'At least one item is required'),
}).refine((data) => {
  const dueDate = new Date(data.due_date);
  const invoiceDate = new Date(data.invoice_date);
  return dueDate >= invoiceDate;
}, {
  message: 'Due date must be on or after invoice date',
  path: ['due_date'],
});

function InvoiceForm({ record, onClose, onSuccess, inModal = false }) {
  const toast = useToastContext();
  const [submitting, setSubmitting] = useState(false);

  // Fetch residents and categories
  const { data: residentsData } = useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => {
      const res = await api.get('/residents', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await api.get('/billing/expense-categories', { params: { active_only: true } });
      return res.data;
    },
  });

  const defaultItems = record?.items?.length > 0 
    ? record.items.map(item => ({
        description: item.description || '',
        quantity: item.quantity?.toString() || '1',
        unit_price: item.unit_price?.toString() || '0',
        expense_category_id: item.expense_category_id?.toString() || '',
      }))
    : [{ description: '', quantity: '1', unit_price: '0', expense_category_id: '' }];

  const methods = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      resident_id: record?.resident_id?.toString() || '',
      invoice_date: record?.invoice_date || new Date().toISOString().split('T')[0],
      due_date: record?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tax_amount: record?.tax_amount?.toString() || '0',
      discount_amount: record?.discount_amount?.toString() || '0',
      notes: record?.notes || '',
      items: defaultItems,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'items',
  });

  // Watch all items fields to ensure calculation updates
  const watchItems = methods.watch('items');
  const watchTax = methods.watch('tax_amount');
  const watchDiscount = methods.watch('discount_amount');

  // Calculate totals - ensure we properly parse all values
  const subtotal = React.useMemo(() => {
    if (!watchItems || !Array.isArray(watchItems) || watchItems.length === 0) {
      return 0;
    }
    const calculated = watchItems.reduce((sum, item) => {
      if (!item) return sum;
      // Handle both string and number inputs
      const qtyStr = String(item.quantity || '0').trim();
      const priceStr = String(item.unit_price || '0').trim();
      const qty = qtyStr === '' ? 0 : parseFloat(qtyStr);
      const price = priceStr === '' ? 0 : parseFloat(priceStr);
      
      if (isNaN(qty) || isNaN(price)) {
        return sum;
      }
      
      const lineTotal = qty * price;
      return sum + (isNaN(lineTotal) ? 0 : lineTotal);
    }, 0);
    
    return isNaN(calculated) ? 0 : calculated;
  }, [watchItems]);

  // Parse tax and discount with proper handling
  const taxStr = String(watchTax || '0').trim();
  const discountStr = String(watchDiscount || '0').trim();
  const tax = taxStr === '' ? 0 : (parseFloat(taxStr) || 0);
  const discount = discountStr === '' ? 0 : (parseFloat(discountStr) || 0);
  const total = subtotal + tax - discount;

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        resident_id: parseInt(data.resident_id),
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        tax_amount: parseFloat(data.tax_amount || 0),
        discount_amount: parseFloat(data.discount_amount || 0),
        notes: data.notes || null,
        items: data.items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          expense_category_id: item.expense_category_id ? parseInt(item.expense_category_id) : null,
        })),
      };

      if (record) {
        await api.put(`/billing/invoices/${record.id}`, payload);
        toast.success('Invoice updated successfully', '', { isFormSubmission: true });
      } else {
        await api.post('/billing/invoices', payload);
        toast.success('Invoice created successfully', '', { isFormSubmission: true });
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const residents = residentsData?.data || [];
  const categories = categoriesData?.data || [];

  return (
    <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
      {!inModal && (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {record ? 'Edit Invoice' : 'Create Invoice'}
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
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              name="resident_id"
              label="Resident"
              required
              options={[
                { value: '', label: 'Select Resident' },
                ...residents.map(r => ({ value: r.id.toString(), label: r.name }))
              ]}
            />
            <FormInput name="invoice_date" label="Invoice Date" type="date" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="due_date" label="Due Date" type="date" required />
            <div></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">Invoice Items</label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: '1', unit_price: '0', expense_category_id: '' })}
                className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start p-3 border border-gray-200 rounded-lg">
                  <div className="col-span-12 md:col-span-4">
                    <FormInput
                      name={`items.${index}.description`}
                      label="Description"
                      required
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <FormInput
                      name={`items.${index}.quantity`}
                      label="Quantity"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <FormInput
                      name={`items.${index}.unit_price`}
                      label="Unit Price"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-10 md:col-span-3">
                    <FormSelect
                      name={`items.${index}.expense_category_id`}
                      label="Category"
                      options={[
                        { value: '', label: 'Select Category' },
                        ...categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
                      ]}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-end">
                    {fields.length > 1 && (
                      <Tooltip content="Remove item" position="top">
                        <CardIconButton
                          variant="delete"
                          type="button"
                          onClick={() => remove(index)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                        </CardIconButton>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput name="tax_amount" label="Tax Amount" type="number" step="0.01" />
            <FormInput name="discount_amount" label="Discount Amount" type="number" step="0.01" />
          </div>

          <FormTextarea name="notes" label="Notes" />

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">-${discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

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
              {submitting ? 'Saving...' : record ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default function BillingInvoicesPage() {
  return (
    <ModuleProtectedRoute module="billing_expenses">
      <BillingInvoices />
    </ModuleProtectedRoute>
  );
}

