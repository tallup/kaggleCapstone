import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
    ArrowLeft, 
    Calendar, 
    Clock, 
    MapPin, 
    User, 
    Stethoscope, 
    FileText, 
    Download, 
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    Building2
} from 'lucide-react';

export default function AppointmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: appointment, isLoading, error } = useQuery({
        queryKey: ['appointment-detail', id],
        queryFn: async () => {
            const response = await api.get(`/appointments/${id}`);
            return response.data;
        },
    });

    const formatDateTime = (date, time) => {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        if (time) {
            // Time is in HH:mm:ss format, convert to 12-hour format
            const [hours, minutes] = time.split(':');
            const hour12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            return `${formattedDate} at ${hour12}:${minutes} ${ampm}`;
        }
        
        return formattedDate;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            scheduled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Scheduled', icon: Calendar },
            confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed', icon: CheckCircle },
            in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress', icon: AlertCircle },
            completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: CheckCircle },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled', icon: XCircle },
            no_show: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'No Show', icon: XCircle },
            rescheduled: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Rescheduled', icon: Calendar },
        };

        const config = statusConfig[status] || statusConfig.scheduled;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                <Icon className="w-4 h-4" />
                {config.label}
            </span>
        );
    };

    const handleDownloadDocument = async (document) => {
        try {
            const response = await api.get(
                `/resident-documents/${document.id}/download`,
                { responseType: 'blob' }
            );
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', document.file_name || document.document_name || 'document');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            alert(error.response?.data?.message || 'Failed to download document. Please try again.');
        }
    };

    const handleViewDocument = (document) => {
        if (document.file_path) {
            const url = `/storage/${document.file_path}`;
            window.open(url, '_blank');
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <p className="mt-4 text-gray-600">Loading appointment details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error.response?.data?.message || error.message || 'Failed to load appointment details'}</p>
                <Link 
                    to="/appointments/dashboard" 
                    className="mt-4 inline-block text-red-600 hover:text-red-800 text-sm font-medium"
                >
                    ← Back to Appointments Dashboard
                </Link>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">Appointment not found</p>
                <Link 
                    to="/appointments/dashboard" 
                    className="mt-4 inline-block text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                >
                    ← Back to Appointments Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-3">
                    <Link 
                        to="/appointments/dashboard" 
                        className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 inline-flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                        </p>
                    </div>
                </div>
                {getStatusBadge(appointment.status)}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Appointment Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3">
                                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {appointment.appointment_date 
                                            ? new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                            </div>

                            {appointment.appointment_time && (
                                <div className="flex items-start space-x-3">
                                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Time</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {(() => {
                                                const [hours, minutes] = appointment.appointment_time.split(':');
                                                const hour12 = hours % 12 || 12;
                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                return `${hour12}:${minutes} ${ampm}`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {appointment.location && (
                                <div className="flex items-start space-x-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Location</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.location}</p>
                                    </div>
                                </div>
                            )}

                            {appointment.provider_name && (
                                <div className="flex items-start space-x-3">
                                    <Stethoscope className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Provider</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.provider_name}</p>
                                    </div>
                                </div>
                            )}

                            {appointment.appointmentType && (
                                <div className="flex items-start space-x-3">
                                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Type</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {appointment.appointmentType.name || appointment.appointment_type?.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {appointment.healthcareProvider && (
                                <div className="flex items-start space-x-3">
                                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Healthcare Provider</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {appointment.healthcareProvider.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {appointment.branch && (
                                <div className="flex items-start space-x-3">
                                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">Branch</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.branch.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {appointment.description && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Description</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{appointment.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Notes Section */}
                    {appointment.notes && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Documents Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Documents {appointment.documents && appointment.documents.length > 0 && `(${appointment.documents.length})`}
                        </h2>
                        {appointment.documents && appointment.documents.length > 0 ? (
                            <div className="space-y-3">
                                {appointment.documents.map((document) => (
                                    <div 
                                        key={document.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-[var(--theme-primary)] transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FileText className="w-5 h-5 text-gray-400" />
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        {document.document_name}
                                                    </h3>
                                                    {document.document_type && (
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                            {document.document_type}
                                                        </span>
                                                    )}
                                                </div>
                                                {document.notes && (
                                                    <p className="text-sm text-gray-600 mb-2">{document.notes}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    {document.file_name && (
                                                        <span>File: {document.file_name}</span>
                                                    )}
                                                    {document.file_size_human && (
                                                        <span>Size: {document.file_size_human}</span>
                                                    )}
                                                    {document.uploaded_by && document.uploadedBy && (
                                                        <span>Uploaded by: {document.uploadedBy.name || 'N/A'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => handleViewDocument(document)}
                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="View Document"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadDocument(document)}
                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Download Document"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">No documents attached to this appointment</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Resident Information */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resident Information</h2>
                        {appointment.resident ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {appointment.resident.first_name} {appointment.resident.last_name}
                                    </p>
                                </div>
                                {appointment.resident.date_of_birth && (
                                    <div>
                                        <p className="text-xs text-gray-500">Date of Birth</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(appointment.resident.date_of_birth).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                                {appointment.resident.gender && (
                                    <div>
                                        <p className="text-xs text-gray-500">Gender</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.resident.gender}</p>
                                    </div>
                                )}
                                {appointment.resident.diagnosis && (
                                    <div>
                                        <p className="text-xs text-gray-500">Diagnosis</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.resident.diagnosis}</p>
                                    </div>
                                )}
                                {appointment.resident.physician_name && (
                                    <div>
                                        <p className="text-xs text-gray-500">Physician</p>
                                        <p className="text-sm font-medium text-gray-900">{appointment.resident.physician_name}</p>
                                    </div>
                                )}
                                <Link
                                    to={`/my-residents/${appointment.resident.id}`}
                                    className="inline-block mt-4 text-sm text-[var(--theme-primary)] hover:underline"
                                >
                                    View Resident Profile →
                                </Link>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">Resident information not available</p>
                        )}
                    </div>

                    {/* Additional Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
                        <div className="space-y-3 text-sm">
                            {appointment.created_by && appointment.createdBy && (
                                <div>
                                    <p className="text-gray-500">Created by</p>
                                    <p className="font-medium text-gray-900">{appointment.createdBy.name || 'N/A'}</p>
                                </div>
                            )}
                            {appointment.created_at && (
                                <div>
                                    <p className="text-gray-500">Created on</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(appointment.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}
                            {appointment.updated_at && (
                                <div>
                                    <p className="text-gray-500">Last updated</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(appointment.updated_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}
                            {appointment.next_appointment_date && (
                                <div>
                                    <p className="text-gray-500">Next Appointment</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(appointment.next_appointment_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

