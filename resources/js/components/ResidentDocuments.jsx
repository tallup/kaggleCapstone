import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { FileText, Plus, Edit, Trash2, Search, Filter, Download, Calendar, AlertCircle, X } from 'lucide-react';

const documentTypeOptions = {
    insurance: 'Insurance',
    medical: 'Medical',
    legal: 'Legal',
    admission: 'Admission',
    appointment: 'Appointment',
    other: 'Other',
};

const documentTypeColors = {
    insurance: 'bg-blue-100 text-blue-800',
    medical: 'bg-green-100 text-green-800',
    legal: 'bg-yellow-100 text-yellow-800',
    admission: 'bg-purple-100 text-purple-800',
    appointment: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
};

export default function ResidentDocuments({ residentId }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);


    const { data, isLoading } = useQuery({
        queryKey: ['resident-documents', residentId, search, typeFilter, currentPage],
        queryFn: async () => {
            const params = {
                resident_id: residentId,
                per_page: 20,
                page: currentPage,
            };
            if (search) params.search = search;
            if (typeFilter) params.document_type = typeFilter;

            const response = await api.get('/resident-documents', { params });
            return response.data;
        },
        enabled: !!residentId,
    });

    const { data: appointmentsData } = useQuery({
        queryKey: ['appointments', residentId],
        queryFn: async () => {
            const response = await api.get('/appointments', { params: { resident_id: residentId, per_page: 100 } });
            return response.data;
        },
        enabled: !!residentId,
    });

    const appointments = appointmentsData?.data || [];

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/resident-documents/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['resident-documents']);
        },
    });

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleDownload = async (doc) => {
        try {
            const response = await api.get(
                `/resident-documents/${doc.id}/download`,
                { responseType: 'blob' }
            );
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = window.document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.file_name || doc.document_name || 'document');
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            alert(error.response?.data?.message || 'Failed to download document. Please try again.');
        }
    };

    const documents = data?.data || [];
    const pagination = data?.meta || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage resident documents and files</p>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!residentId) {
                            console.error('Cannot add document: residentId is missing!');
                            alert('Error: Resident ID is missing. Please refresh the page.');
                            return;
                        }
                        if (showForm) {
                            // If form is already showing, close it
                            setShowForm(false);
                            setEditing(null);
                        } else {
                            // Show form for new document
                            setEditing(null);
                            setShowForm(true);
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {showForm && !editing ? 'Cancel' : 'Add Document'}
                </button>
            </div>

            {/* Inline Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <DocumentFormInline
                        residentId={residentId}
                        appointments={appointments}
                        record={editing}
                        onClose={() => {
                            setShowForm(false);
                            setEditing(null);
                        }}
                        onSuccess={() => {
                            setShowForm(false);
                            setEditing(null);
                            queryClient.invalidateQueries(['resident-documents']);
                        }}
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="sm:w-48">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Types</option>
                            {Object.entries(documentTypeOptions).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Documents List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--theme-primary)]/20 border-t-[var(--theme-primary)]" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {search || typeFilter ? 'Try adjusting your filters' : 'Get started by adding a document'}
                    </p>
                    {!search && !typeFilter && (
                        <button
                            onClick={() => {
                                setEditing(null);
                                setShowForm(true);
                                // Scroll to form
                                setTimeout(() => {
                                    const formElement = document.querySelector('[data-document-form]');
                                    if (formElement) {
                                        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }, 100);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-sm transition hover:bg-[var(--theme-primary-hover)]"
                        >
                            <Plus className="h-4 w-4" />
                            Add Document
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-gray-200 table-fixed">
                                <colgroup>
                                    <col style={{ width: '25%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '15%' }} />
                                </colgroup>
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Document
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            File
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Related Appointment
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Uploaded
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {doc.document_name}
                                                </div>
                                                {doc.notes && (
                                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                                        {doc.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${documentTypeColors[doc.document_type] || documentTypeColors.other}`}>
                                                    {documentTypeOptions[doc.document_type] || 'Other'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 truncate">
                                                    {doc.file_name || 'N/A'}
                                                </div>
                                                {doc.file_size && (
                                                    <div className="text-xs text-gray-500">
                                                        {(doc.file_size / 1024).toFixed(2)} KB
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {doc.appointment ? (
                                                    <div className="text-sm text-gray-900">
                                                        {new Date(doc.appointment.appointment_date).toLocaleDateString()}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownload(doc)}
                                                        className="p-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
                                                        title="Download"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditing(doc);
                                                            setShowForm(true);
                                                            // Scroll to form
                                                            setTimeout(() => {
                                                                const formElement = window.document.querySelector('[data-document-form]');
                                                                if (formElement) {
                                                                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                }
                                                            }, 100);
                                                        }}
                                                        className="p-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="p-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {pagination.from} to {pagination.to} of {pagination.total} documents
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={currentPage === pagination.last_page}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

        </div>
    );
}

function DocumentFormInline({ residentId, appointments, record, onClose, onSuccess }) {
    // Log and validate residentId
    useEffect(() => {
        console.log('DocumentFormModal received residentId:', residentId, typeof residentId);
        if (!residentId) {
            console.error('DocumentFormModal: residentId is missing or undefined!');
        }
    }, [residentId]);

    const [formData, setFormData] = useState({
        document_name: record?.document_name || '',
        document_type: record?.document_type || '',
        appointment_id: record?.appointment_id || null,
        notes: record?.notes || '',
    });
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update form data when record changes (for editing)
    useEffect(() => {
        if (record) {
            setFormData({
                document_name: record.document_name || '',
                document_type: record.document_type || '',
                appointment_id: record.appointment_id || null,
                notes: record.notes || '',
            });
            setFile(null); // Reset file when editing
        } else {
            // Reset form for new document
            setFormData({
                document_name: '',
                document_type: '',
                appointment_id: null,
                notes: '',
            });
            setFile(null);
        }
    }, [record]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Validate residentId is present
            if (!residentId) {
                setErrors({ general: 'Resident ID is missing. Please refresh the page and try again.' });
                setIsSubmitting(false);
                return;
            }

            const formDataToSend = new FormData();
            formDataToSend.append('resident_id', String(residentId));
            formDataToSend.append('document_name', formData.document_name);
            formDataToSend.append('document_type', formData.document_type);
            if (formData.appointment_id) {
                formDataToSend.append('appointment_id', String(formData.appointment_id));
            }
            formDataToSend.append('notes', formData.notes || '');
            
            // Debug: Log what we're sending
            console.log('Sending document data:', {
                resident_id: residentId,
                resident_id_type: typeof residentId,
                document_name: formData.document_name,
                document_type: formData.document_type,
                appointment_id: formData.appointment_id,
                file: file?.name,
                file_size: file?.size,
                file_type: file?.type,
            });

            if (file) {
                formDataToSend.append('file_path', file);
            } else if (!record) {
                setErrors({ file_path: ['File is required for new documents'] });
                setIsSubmitting(false);
                return;
            }

            if (record) {
                await api.put(`/resident-documents/${record.id}`, formDataToSend);
            } else {
                await api.post('/resident-documents', formDataToSend);
            }
            onSuccess();
        } catch (error) {
            console.error('Document upload error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error response errors:', error.response?.data?.errors);
            console.error('Full error object:', JSON.stringify(error.response?.data, null, 2));
            
            if (error.response?.data?.errors) {
                const validationErrors = error.response.data.errors;
                console.log('Setting validation errors:', validationErrors);
                setErrors(validationErrors);
                // Also show general message if available
                if (error.response.data.message) {
                    setErrors(prev => ({ ...prev, general: error.response.data.message }));
                }
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to save document';
                setErrors({ general: errorMessage });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div data-document-form>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Document' : 'Add Document'}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close form"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Name *
                        </label>
                        <input
                            type="text"
                            value={formData.document_name}
                            onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                            required
                            maxLength={255}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                        {errors.document_name && <p className="text-xs text-red-600 mt-1">{errors.document_name[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Type *
                        </label>
                        <select
                            value={formData.document_type}
                            onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">Select Type</option>
                            {Object.entries(documentTypeOptions).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        {errors.document_type && <p className="text-xs text-red-600 mt-1">{errors.document_type[0]}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Related Appointment (Optional)
                        </label>
                        <select
                            value={formData.appointment_id || ''}
                            onChange={(e) => setFormData({...formData, appointment_id: e.target.value || null})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">None</option>
                            {appointments.map((apt) => (
                                <option key={apt.id} value={apt.id}>
                                    {new Date(apt.appointment_date).toLocaleDateString()} - {apt.provider_name || 'Appointment'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document File {record ? '(leave blank to keep current)' : '*'}
                        </label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                            required={!record}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Accepted: PDF, Images (JPG, PNG, GIF), Word Docs (DOC, DOCX). Max size: 10MB
                        </p>
                        {record?.file_name && (
                            <p className="text-xs text-gray-600 mt-1">
                                Current file: {record.file_name}
                            </p>
                        )}
                        {errors.file_path && <p className="text-xs text-red-600 mt-1">{errors.file_path[0]}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            rows={3}
                            placeholder="Any additional notes about this document..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent resize-vertical"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
}

