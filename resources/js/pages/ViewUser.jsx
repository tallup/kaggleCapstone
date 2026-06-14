import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
    ArrowLeft, 
    Edit, 
    Mail, 
    Phone, 
    Calendar, 
    Briefcase, 
    MapPin, 
    Award, 
    Shield, 
    Clock, 
    User as UserIcon,
    Building2,
    Users,
    CheckCircle2,
    FileText,
    Activity,
    TrendingUp,
    AlertCircle,
    X
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function ViewUser() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user', id],
        queryFn: async () => {
            const response = await api.get(`/users/${id}`);
            return response.data;
        },
    });

    const { data: userStats } = useQuery({
        queryKey: ['user-stats', id],
        queryFn: async () => {
            try {
                const response = await api.get(`/users/${id}/stats`);
                return response.data;
            } catch (err) {
                return null;
            }
        },
        enabled: !!user,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading user details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <EmptyState
                        icon={AlertCircle}
                        title="User Not Found"
                        description="The user you're looking for doesn't exist or you don't have permission to view it."
                        action={{
                            label: 'Back to Users',
                            onClick: () => navigate('/team/users')
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/team/users')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back to Users</span>
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
                            <p className="text-gray-600 mt-1">View comprehensive user information and statistics</p>
                        </div>
                        <button
                            onClick={() => navigate(`/team/users/${id}/edit`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition"
                        >
                            <Edit className="h-4 w-4" />
                            Edit User
                        </button>
                    </div>
                </div>

                {/* Profile Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                    <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[#4a7a2a] p-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div className="flex items-center gap-6">
                                {user.profile_image_url ? (
                                    <img
                                        src={user.profile_image_url}
                                        alt={user.name}
                                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            if (e.target.nextElementSibling) {
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }
                                        }}
                                    />
                                ) : null}
                                <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg ${user.profile_image_url ? 'hidden' : ''}`}>
                                    <span className="text-[var(--theme-primary)] font-bold text-4xl">
                                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">{user.name || user.email}</h2>
                                    {user.email && (
                                        <div className="flex items-center gap-2 text-green-50">
                                            <Mail className="w-4 h-4" />
                                            <span>{user.email}</span>
                                        </div>
                                    )}
                                    <div className="mt-3">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                            user.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                {userStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Active Assignments</p>
                                    <p className="text-2xl font-bold text-gray-900">{userStats.active_assignments || 0}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Vitals Recorded</p>
                                    <p className="text-2xl font-bold text-gray-900">{userStats.vitals_recorded || 0}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Activity className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Assessments</p>
                                    <p className="text-2xl font-bold text-gray-900">{userStats.assessments || 0}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Leave Requests</p>
                                    <p className="text-2xl font-bold text-gray-900">{userStats.leave_requests || 0}</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Personal & Employment Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-[var(--theme-primary)]" />
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.first_name && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">First Name</p>
                                        <p className="font-semibold text-gray-900">{user.first_name}</p>
                                    </div>
                                )}
                                {user.middle_names && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Middle Names</p>
                                        <p className="font-semibold text-gray-900">{user.middle_names}</p>
                                    </div>
                                )}
                                {user.last_name && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Last Name</p>
                                        <p className="font-semibold text-gray-900">{user.last_name}</p>
                                    </div>
                                )}
                                {user.date_of_birth && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Date of Birth
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(user.date_of_birth).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                                {user.marital_status && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Marital Status</p>
                                        <p className="font-semibold text-gray-900 capitalize">{user.marital_status}</p>
                                    </div>
                                )}
                                {user.sex && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Sex</p>
                                        <p className="font-semibold text-gray-900 capitalize">{user.sex}</p>
                                    </div>
                                )}
                                {user.phone_number && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            Phone Number
                                        </p>
                                        <p className="font-semibold text-gray-900">{user.phone_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Employment Details */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-[var(--theme-primary)]" />
                                Employment Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.role && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Shield className="w-4 h-4" />
                                            Role
                                        </p>
                                        <p className="font-semibold text-gray-900 capitalize">{user.role.replace('_', ' ')}</p>
                                    </div>
                                )}
                                {user.facility && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Building2 className="w-4 h-4" />
                                            Facility
                                        </p>
                                        <p className="font-semibold text-gray-900">{user.facility.name}</p>
                                    </div>
                                )}
                                {user.assigned_branch && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            Assigned Branch
                                        </p>
                                        <p className="font-semibold text-gray-900">{user.assigned_branch.name}</p>
                                    </div>
                                )}
                                {user.credentials && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Award className="w-4 h-4" />
                                            Credentials
                                        </p>
                                        <p className="font-semibold text-gray-900">{user.credentials}</p>
                                    </div>
                                )}
                                {user.credential_details && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-600 mb-1">Credential Details</p>
                                        <p className="font-semibold text-gray-900">{user.credential_details}</p>
                                    </div>
                                )}
                                {user.date_employed && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Date Employed
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(user.date_employed).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                                {user.supervisor_name && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Supervisor</p>
                                        <p className="font-semibold text-gray-900">{user.supervisor_name}</p>
                                    </div>
                                )}
                                {user.provider_name && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Provider</p>
                                        <p className="font-semibold text-gray-900">{user.provider_name}</p>
                                    </div>
                                )}
                                {user.position && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Position</p>
                                        <p className="font-semibold text-gray-900">{user.position}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {user.notes && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{user.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Quick Info & Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate(`/team/users/${id}/edit`)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit User
                                </button>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        user.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {user.created_at && (
                                    <div>
                                        <span className="text-sm text-gray-600">Member Since</span>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {new Date(user.created_at).toLocaleDateString('en-US', {
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
                            <div className="space-y-3">
                                {user.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-700 break-all">{user.email}</span>
                                    </div>
                                )}
                                {user.phone_number && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-700">{user.phone_number}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}








































