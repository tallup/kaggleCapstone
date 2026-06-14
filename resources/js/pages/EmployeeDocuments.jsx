import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { FileText, Plus, Edit, Trash2, Search, Filter, Download, Calendar, User as UserIcon, AlertCircle, X } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

export default function EmployeeDocuments() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [expiredFilter, setExpiredFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['employee-documents', search, employeeFilter, typeFilter, expiredFilter, activeFilter, currentPage],
        queryFn: async () => {
            const params = {
                per_page: 20,
                page: currentPage,
            };
            if (search) params.search = search;
            if (employeeFilter) params.user_id = employeeFilter;
            if (typeFilter) params.document_type = typeFilter;
            if (expiredFilter !== 'all') params.is_expired = expiredFilter === 'expired' ? 'true' : 'false';
            if (activeFilter !== 'all') params.is_active = activeFilter === 'active' ? 'true' : 'false';

            const response = await api.get('/employee-documents', { params });
            return response.data;
        },
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-active'],
        queryFn: async () => (await api.get('/users', { params: { active_only: 'true', per_page: 100 } })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/employee-documents/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['employee-documents']),
    });

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, employeeFilter, typeFilter, expiredFilter, activeFilter]);

    const documentTypeOptions = {
        contract: 'Employment Contract',
        id: 'ID Document',
        license: 'Professional License',
        certification: 'Certification',
        background_check: 'Background Check',
        medical: 'Medical Clearance',
        training: 'Training Certificate',
        other: 'Other',
    };

    const getDocumentTypeColor = (type) => {
        const colors = {
            contract: 'bg-amber-50 text-[var(--theme-secondary)]',
            id: 'bg-green-50 text-[var(--theme-primary)]',
            license: 'bg-amber-50 text-[var(--theme-secondary)]',
            certification: 'bg-green-50 text-[var(--theme-primary)]',
            background_check: 'bg-red-100 text-red-800',
            medical: 'bg-green-50 text-[var(--theme-primary)]',
            training: 'bg-amber-50 text-[var(--theme-secondary)]',
            other: 'bg-gray-100 text-gray-800',
        };
        return colors[type] || colors.other;
    };

    const getExpirationStatus = (document) => {
        if (!document.expiration_date) return { text: 'N/A', color: 'text-gray-500' };
        if (document.is_expired) return { text: 'Expired', color: 'text-red-600' };
        const days = document.days_until_expiration;
        if (days <= 30) return { text: `${days} days`, color: 'text-yellow-600' };
        return { text: `${days} days`, color: 'text-green-600' };
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
                title="Delete this document?"
                description="The file will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">All Documents</h2>
                        <p className="text-gray-600">Search and manage employee documents.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Document</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {/* Employee Filter */}
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Employees</option>
                            {usersData?.data?.map(user => (
                                <option key={user.id} value={user.id}>{user.name || user.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Document Type Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Types</option>
                            {Object.entries(documentTypeOptions).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Expired Filter */}
                    <div>
                        <select
                            value={expiredFilter}
                            onChange={(e) => setExpiredFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="all">All Documents</option>
                            <option value="expired">Expired</option>
                            <option value="not_expired">Not Expired</option>
                        </select>
                    </div>

                    {/* Active Filter */}
                    <div>
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full table-auto divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Document Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expires
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data?.data?.length > 0 ? (
                                data.data.map((document) => {
                                    const expirationStatus = getExpirationStatus(document);
                                    return (
                                        <tr key={document.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {document.user?.name || document.user?.email || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{document.document_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(document.document_type)}`}>
                                                    {documentTypeOptions[document.document_type] || document.document_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 truncate max-w-xs" title={document.file_name}>
                                                    {document.file_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm">
                                                    {document.expiration_date ? (
                                                        <>
                                                            <div className="text-gray-900">
                                                                {new Date(document.expiration_date).toLocaleDateString('en-US', { 
                                                                    month: 'short', 
                                                                    day: 'numeric', 
                                                                    year: 'numeric' 
                                                                })}
                                                            </div>
                                                            <div className={`text-xs ${expirationStatus.color}`}>
                                                                {expirationStatus.text}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-500">N/A</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    {document.is_expired && (
                                                        <Tooltip content="Expired" position="top">
                                                            <span className="inline-flex" aria-label="Expired">
                                                                <AlertCircle className="w-4 h-4 text-red-500" aria-hidden />
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        document.is_active 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {document.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-right min-w-[180px]">
                                                <div className="flex items-center justify-end gap-2">
                                                    {document.file_path && (
                                                        <Tooltip content="Download">
                                                            <a
                                                                href={document.download_url || `/api/v1/employee-documents/${document.id}/download`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 p-2 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 [&_svg]:!text-emerald-600"
                                                                aria-label="Download"
                                                            >
                                                                <Download className="h-4 w-4" strokeWidth={2.5} />
                                                            </a>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip content="Edit">
                                                        <CardIconButton
                                                            variant="edit"
                                                            type="button"
                                                            onClick={() => {
                                                                setEditing(document);
                                                                setShowForm(true);
                                                            }}
                                                            aria-label="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" strokeWidth={2.5} />
                                                        </CardIconButton>
                                                    </Tooltip>
                                                    <Tooltip content="Delete">
                                                        <CardIconButton
                                                            variant="delete"
                                                            type="button"
                                                            onClick={() => setDeleteConfirmId(document.id)}
                                                            aria-label="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                        </CardIconButton>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 text-lg font-medium">No documents found</p>
                                        <p className="text-gray-500 text-sm mt-2">
                                            {search ? 'No documents match your search.' : 'No documents found in the system.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="mt-6 flex justify-center space-x-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                        Page {currentPage} of {data.last_page}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(data.last_page, p + 1))}
                        disabled={currentPage === data.last_page}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>

            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                title={editing ? 'Edit Document' : 'Add Document'}
                size="xl"
            >
                <EmployeeDocumentForm
                    key={editing?.id ?? 'new'}
                    inModal
                    record={editing}
                    users={usersData?.data || []}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['employee-documents']);
                    }}
                />
            </Modal>
        </>
    );
}

// Employee Document Form Component
function EmployeeDocumentForm({ record, users, onClose, onSuccess, inModal = false }) {
    const [formData, setFormData] = useState({
        user_id: record?.user_id || '',
        document_name: record?.document_name || '',
        document_type: record?.document_type || '',
        expiration_date: record?.expiration_date ? (record.expiration_date.split('T')[0] || record.expiration_date.split(' ')[0]) : '',
        notes: record?.notes || '',
        is_active: record?.is_active ?? true,
    });
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const documentTypeOptions = {
        contract: 'Employment Contract',
        id: 'ID Document',
        license: 'Professional License',
        certification: 'Certification',
        background_check: 'Background Check',
        medical: 'Medical Clearance',
        training: 'Training Certificate',
        other: 'Other',
    };

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
            const formDataToSend = new FormData();
            formDataToSend.append('user_id', formData.user_id);
            formDataToSend.append('document_name', formData.document_name);
            formDataToSend.append('document_type', formData.document_type);
            formDataToSend.append('expiration_date', formData.expiration_date || '');
            formDataToSend.append('notes', formData.notes || '');
            formDataToSend.append('is_active', formData.is_active ? '1' : '0');

            if (file) {
                formDataToSend.append('file_path', file);
            } else if (!record) {
                setErrors({ file_path: ['File is required for new documents'] });
                setIsSubmitting(false);
                return;
            }

            let response;
            if (record) {
                response = await api.put(`/employee-documents/${record.id}`, formDataToSend);
            } else {
                response = await api.post('/employee-documents', formDataToSend);
            }
            
            // Check if the request was successful (status 200-299)
            if (response.status >= 200 && response.status < 300) {
                onSuccess();
            } else {
                // Only show error if the response indicates failure
                if (response.data?.errors) {
                    setErrors(response.data.errors);
                } else {
                    setErrors({ general: response.data?.message || 'Failed to save document' });
                }
            }
        } catch (error) {
            // Check if it's a network error or actual server error
            // If status is 201 (created), the document was saved successfully
            if (error.response?.status === 201) {
                // Document was saved successfully, just call onSuccess
                onSuccess();
            } else if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                // Only show error if it's not a 201 status
                const errorMessage = error.response?.data?.message || 'Failed to save document';
                // Don't show error if document was actually created (201)
                if (error.response?.status !== 201) {
                    setErrors({ general: errorMessage });
                } else {
                    // Document was saved, just close the form
                    onSuccess();
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Document' : 'Add Document'}
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

                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Document Information Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Employee *
                                    </label>
                                    <select
                                        value={formData.user_id}
                                        onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    >
                                        <option value="">Select Employee</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.user_id && <p className="text-xs text-red-600 mt-1">{errors.user_id[0]}</p>}
                                </div>

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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Expiration Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expiration_date}
                                        onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                    {errors.expiration_date && <p className="text-xs text-red-600 mt-1">{errors.expiration_date[0]}</p>}
                                </div>

                                <div className="col-span-2">
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

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        rows={3}
                                        placeholder="Any additional notes about this document..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
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
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
        </div>
    );
}

