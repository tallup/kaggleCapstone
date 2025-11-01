import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
    User as UserIcon, Mail, Phone, Calendar, Briefcase, MapPin, Award, Shield, 
    Clock, Edit, Save, X, Upload, Camera
} from 'lucide-react';

export default function Profile() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    
    // Get current user from local storage or API
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
    });

    useEffect(() => {
        if (user) {
            setEditedUser(user);
            // Set profile image preview
            if (user.profile_image_url) {
                setProfileImagePreview(user.profile_image_url);
            }
        }
    }, [user]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }
            
            setProfileImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const updateMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await api.put(`/users/${user.id}`, formData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['current-user']);
            setIsEditing(false);
            setProfileImage(null);
        },
    });

    const handleSave = async () => {
        try {
            const formDataToSend = new FormData();
            
            // Auto-generate name from first, middle, last name
            const nameParts = [
                editedUser.first_name,
                editedUser.middle_names,
                editedUser.last_name
            ].filter(Boolean);
            const name = nameParts.join(' ') || editedUser.email;

            formDataToSend.append('name', name);
            formDataToSend.append('first_name', editedUser.first_name || '');
            formDataToSend.append('middle_names', editedUser.middle_names || '');
            formDataToSend.append('last_name', editedUser.last_name || '');
            formDataToSend.append('email', editedUser.email);
            formDataToSend.append('phone_number', editedUser.phone_number || '');
            formDataToSend.append('date_of_birth', editedUser.date_of_birth || '');
            formDataToSend.append('marital_status', editedUser.marital_status || '');
            formDataToSend.append('position', editedUser.position || '');
            formDataToSend.append('credentials', editedUser.credentials || '');
            formDataToSend.append('credential_details', editedUser.credential_details || '');
            formDataToSend.append('supervisor_name', editedUser.supervisor_name || '');
            formDataToSend.append('provider_name', editedUser.provider_name || '');
            formDataToSend.append('notes', editedUser.notes || '');
            
            if (profileImage) {
                formDataToSend.append('profile_image', profileImage);
            }
            
            await updateMutation.mutateAsync(formDataToSend);
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    };

    const handleCancel = () => {
        setEditedUser(user);
        setIsEditing(false);
        setProfileImage(null);
        setProfileImagePreview(user?.profile_image_url || null);
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Failed to load profile information</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">My Profile</h1>

            {/* Profile Header */}
            <div className="bg-gradient-to-r from-[#2D5016] to-[#4a7a2a] rounded-xl shadow-lg p-4 md:p-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
                        {/* Profile Picture */}
                        <div className="relative self-center md:self-auto">
                            {(profileImagePreview || user.profile_image_url) ? (
                                <img
                                    src={profileImagePreview || user.profile_image_url}
                                    alt={user.name}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                                    <span className="text-[#2D5016] font-bold text-4xl md:text-5xl">
                                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute bottom-0 right-0">
                                    <label className="cursor-pointer bg-[#2D5016] text-white p-2 rounded-full shadow-lg hover:bg-[#1a3009] transition-colors inline-flex items-center justify-center">
                                        <Camera className="w-4 h-4" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-xl md:text-3xl font-bold mb-2 text-white break-words">{user.name || user.email}</h2>
                            {user.position && (
                                <p className="text-base md:text-xl text-green-100">{user.position}</p>
                            )}
                            {user.email && (
                                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-sm md:text-base text-green-50">
                                    <Mail className="w-4 h-4 flex-shrink-0" />
                                    <span className="break-all">{user.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2 bg-white text-[#2D5016] rounded-lg hover:bg-green-50 transition-colors font-medium w-full md:w-auto"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit Profile</span>
                        </button>
                    )}
                    {isEditing && (
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <button
                                onClick={handleCancel}
                                className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium w-full sm:w-auto"
                            >
                                <X className="w-4 h-4" />
                                <span>Cancel</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={updateMutation.isLoading}
                                className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2 bg-white text-[#2D5016] rounded-lg hover:bg-green-50 transition-colors font-medium disabled:opacity-50 w-full sm:w-auto"
                            >
                                <Save className="w-4 h-4" />
                                <span>{updateMutation.isLoading ? 'Saving...' : 'Save'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-[#2D5016]" />
                        Personal Information
                    </h3>
                    <div className="space-y-4">
                        {isEditing ? (
                            <EditPersonalInfo user={editedUser} setUser={setEditedUser} />
                        ) : (
                            <ViewPersonalInfo user={user} />
                        )}
                    </div>
                </div>

                {/* Employment Details */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-[#2D5016]" />
                        Employment Details
                    </h3>
                    <div className="space-y-4">
                        {isEditing ? (
                            <EditEmploymentInfo user={editedUser} setUser={setEditedUser} />
                        ) : (
                            <ViewEmploymentInfo user={user} />
                        )}
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Phone className="w-5 h-5 mr-2 text-[#2D5016]" />
                        Contact Information
                    </h3>
                    <div className="space-y-4">
                        {isEditing ? (
                            <EditContactInfo user={editedUser} setUser={setEditedUser} />
                        ) : (
                            <ViewContactInfo user={user} />
                        )}
                    </div>
                </div>

                {/* Additional Information */}
                {user.notes && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            {isEditing ? (
                                <textarea
                                    value={editedUser?.notes || ''}
                                    onChange={(e) => setEditedUser({...editedUser, notes: e.target.value})}
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                />
                            ) : (
                                <p className="text-gray-700 whitespace-pre-wrap">{user.notes}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// View Components
function ViewPersonalInfo({ user }) {
    return (
        <>
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
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Date of Birth
                    </p>
                    <p className="font-semibold text-gray-900">
                        {new Date(user.date_of_birth).toLocaleDateString('en-US', { 
                            month: 'long', day: 'numeric', year: 'numeric' 
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
        </>
    );
}

function ViewEmploymentInfo({ user }) {
    return (
        <>
            {user.role && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        Role
                    </p>
                    <p className="font-semibold text-gray-900 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
            )}
            {user.assigned_branch && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Assigned Branch
                    </p>
                    <p className="font-semibold text-gray-900">{user.assigned_branch.name}</p>
                </div>
            )}
            {user.credentials && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Award className="w-4 h-4 mr-1" />
                        Credentials
                    </p>
                    <p className="font-semibold text-gray-900">{user.credentials}</p>
                </div>
            )}
            {user.credential_details && (
                <div>
                    <p className="text-sm text-gray-600 mb-1">Credential Details</p>
                    <p className="font-semibold text-gray-900">{user.credential_details}</p>
                </div>
            )}
            {user.date_employed && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Date Employed
                    </p>
                    <p className="font-semibold text-gray-900">
                        {new Date(user.date_employed).toLocaleDateString('en-US', { 
                            month: 'long', day: 'numeric', year: 'numeric' 
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
            <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </>
    );
}

function ViewContactInfo({ user }) {
    return (
        <>
            {user.email && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                    </p>
                    <p className="font-semibold text-gray-900">{user.email}</p>
                </div>
            )}
            {user.phone_number && (
                <div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        Phone Number
                    </p>
                    <p className="font-semibold text-gray-900">{user.phone_number}</p>
                </div>
            )}
        </>
    );
}

// Edit Components
function EditPersonalInfo({ user, setUser }) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                    type="text"
                    value={user?.first_name || ''}
                    onChange={(e) => setUser({...user, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Names</label>
                <input
                    type="text"
                    value={user?.middle_names || ''}
                    onChange={(e) => setUser({...user, middle_names: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                    type="text"
                    value={user?.last_name || ''}
                    onChange={(e) => setUser({...user, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                />
            </div>
            {user?.date_of_birth && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                        type="date"
                        value={user.date_of_birth}
                        onChange={(e) => setUser({...user, date_of_birth: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
            {user?.marital_status && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                    <select
                        value={user.marital_status || ''}
                        onChange={(e) => setUser({...user, marital_status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    >
                        <option value="">Select status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                        <option value="separated">Separated</option>
                    </select>
                </div>
            )}
        </>
    );
}

function EditEmploymentInfo({ user, setUser }) {
    return (
        <>
            {user?.position && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                        type="text"
                        value={user.position || ''}
                        onChange={(e) => setUser({...user, position: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
            {user?.credentials && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credentials</label>
                    <input
                        type="text"
                        value={user.credentials || ''}
                        onChange={(e) => setUser({...user, credentials: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
            {user?.credential_details && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credential Details</label>
                    <input
                        type="text"
                        value={user.credential_details || ''}
                        onChange={(e) => setUser({...user, credential_details: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
            {user?.supervisor_name && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                    <input
                        type="text"
                        value={user.supervisor_name || ''}
                        onChange={(e) => setUser({...user, supervisor_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
            {user?.provider_name && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                    <input
                        type="text"
                        value={user.provider_name || ''}
                        onChange={(e) => setUser({...user, provider_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                    />
                </div>
            )}
        </>
    );
}

function EditContactInfo({ user, setUser }) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    value={user?.email || ''}
                    onChange={(e) => setUser({...user, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                    type="tel"
                    value={user?.phone_number || ''}
                    onChange={(e) => setUser({...user, phone_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                />
            </div>
        </>
    );
}

