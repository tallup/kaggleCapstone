import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { FileText, Plus, Edit, Trash2, Search, Filter, Download, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';

export default function EmployeeDocuments() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [expiredFilter, setExpiredFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
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
            contract: 'bg-amber-50 text-[#8B4513]',
            id: 'bg-green-50 text-[#2D5016]',
            license: 'bg-amber-50 text-[#8B4513]',
            certification: 'bg-green-50 text-[#2D5016]',
            background_check: 'bg-red-100 text-red-800',
            medical: 'bg-green-50 text-[#2D5016]',
            training: 'bg-amber-50 text-[#8B4513]',
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
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Employee Documents</h1>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Document</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">All Documents</h2>
                <p className="text-gray-600 mb-4">Search and manage employee documents.</p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                        />
                    </div>

                    {/* Employee Filter */}
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
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
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
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
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Document Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expires
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 truncate max-w-xs" title={document.file_name}>
                                                    {document.file_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    {document.is_expired && (
                                                        <AlertCircle className="w-4 h-4 text-red-500" title="Expired" />
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    {document.file_path && (
                                                        <a
                                                            href={`/storage/${document.file_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#2D5016] hover:text-[#1a3009]"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setEditing(document);
                                                            setShowForm(true);
                                                        }}
                                                        className="text-[#2D5016] hover:text-[#1a3009]"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to delete this document?')) {
                                                                deleteMutation.mutate(document.id);
                                                            }
                                                        }}
                                                        className="text-[#8B4513] hover:text-[#6b3410]"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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

            {/* Create/Edit Form Modal */}
            {showForm && (
                <EmployeeDocumentForm
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
            )}
        </div>
    );
}

// Employee Document Form Component
function EmployeeDocumentForm({ record, users, onClose, onSuccess }) {
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

            if (record) {
                await api.put(`/employee-documents/${record.id}`, formDataToSend);
            } else {
                await api.post('/employee-documents', formDataToSend);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save document' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {record ? 'Edit Document' : 'Add Document'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            className="w-4 h-4 text-[#2D5016] border-gray-300 rounded focus:ring-[#2D5016]"
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
                                className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

