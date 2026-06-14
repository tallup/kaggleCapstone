import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import {
    subscribeToPush,
    unsubscribeFromPush,
    isSubscribed,
    isVapidConfigured,
} from '../services/pushNotifications';
import {
    User as UserIcon,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    MapPin,
    Award,
    Shield,
    Clock,
    Edit,
    Save,
    X,
    Camera,
    Building,
    Activity,
    Heart,
    ClipboardList,
    Info,
    UserCheck,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    FileText,
    Star,
    Bell,
    BellOff,
    Smartphone,
    Filter
} from 'lucide-react';

export default function Profile() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [isImageErrored, setIsImageErrored] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [disableSuccessToasts, setDisableSuccessToasts] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('disable_success_toasts') === 'true';
        }
        return false;
    });
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushSupported] = useState(() => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);

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
            setProfileImagePreview(
                user.profile_image_url ||
                (user.profile_image ? `/storage/${user.profile_image}` : null)
            );
            setIsImageErrored(false);
        }
    }, [user]);

    // Check push subscription status when profile loads
    useEffect(() => {
        if (!pushSupported) return;
        let cancelled = false;
        isSubscribed().then((subscribed) => {
            if (!cancelled) setPushEnabled(!!subscribed);
        });
        return () => { cancelled = true; };
    }, [pushSupported]);

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
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 5000);
        },
        onError: (error) => {
            setErrorMessage(error.response?.data?.message || 'Failed to update profile. Please try again.');
            setTimeout(() => setErrorMessage(null), 5000);
        },
    });

    const passwordMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.put('/v1/user/password', {
                current_password: data.current_password,
                password: data.password,
                password_confirmation: data.password_confirmation
            });
            return response.data;
        },
        onSuccess: () => {
            setPasswordData({
                current_password: '',
                password: '',
                password_confirmation: ''
            });
            setShowPasswordChange(false);
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(null), 5000);
        },
        onError: (error) => {
            setErrorMessage(error.response?.data?.message || 'Failed to change password. Please check your current password.');
            setTimeout(() => setErrorMessage(null), 5000);
        },
    });

    const handleToggleSuccessToasts = (enabled) => {
        setDisableSuccessToasts(!enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('disable_success_toasts', (!enabled).toString());
        }
        setSuccessMessage(enabled ? 'Success notifications disabled' : 'Success notifications enabled');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleTogglePush = async (enable) => {
        if (!pushSupported || pushLoading) return;
        if (enable && !isVapidConfigured()) {
            setErrorMessage(
                'Push is not configured on this server. Add VAPID keys: run php artisan webpush:vapid, set VAPID_* and VITE_VAPID_PUBLIC_KEY in .env, then npm run build and deploy.',
            );
            setTimeout(() => setErrorMessage(null), 12000);
            return;
        }
        setPushLoading(true);
        setErrorMessage(null);
        try {
            if (enable) {
                const subscription = await subscribeToPush();
                if (!subscription) {
                    setPushEnabled(false);
                    setErrorMessage(
                        'Could not enable push (permission denied, or browser blocked notifications). Check site settings and try again.',
                    );
                    setTimeout(() => setErrorMessage(null), 8000);
                    return;
                }
                setPushEnabled(true);
                setSuccessMessage('Push notifications enabled. You’ll get alerts even when the app is closed.');
            } else {
                await unsubscribeFromPush();
                setPushEnabled(false);
                setSuccessMessage('Push notifications disabled.');
            }
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setErrorMessage(err?.message || 'Could not update push notifications.');
            if (enable) setPushEnabled(false);
        } finally {
            setPushLoading(false);
        }
    };

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
            logger.error('Failed to update profile:', error);
        }
    };

    const handleCancel = () => {
        setEditedUser(user);
        setIsEditing(false);
        setProfileImage(null);
        setProfileImagePreview(
            user?.profile_image_url ||
            (user?.profile_image ? `/storage/${user.profile_image}` : null)
        );
        setIsImageErrored(false);
        setErrorMessage(null);
        setSuccessMessage(null);
    };

    const handlePasswordChange = async () => {
        if (passwordData.password !== passwordData.password_confirmation) {
            setErrorMessage('New passwords do not match');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }
        if (passwordData.password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }
        try {
            await passwordMutation.mutateAsync(passwordData);
        } catch (error) {
            // Error handled in mutation
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
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

    const assignedBranchName = user.assigned_branch?.name;
    const facilityName = user.assigned_branch?.facility?.name;
    const branchDetails = [assignedBranchName, facilityName].filter(Boolean).join(' • ');
    const roleLabel = user.role ? user.role.replace(/_/g, ' ') : null;
    const statusStyles = user.is_active
        ? 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-red-100 text-red-800 border border-red-200';
    const statusLabel = user.is_active ? 'Active' : 'Inactive';
    const dateEmployedLabel = user.date_employed
        ? new Date(user.date_employed).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : null;

    const headerImageSrc =
        profileImagePreview ||
        user.profile_image_url ||
        (user.profile_image ? `/storage/${user.profile_image}` : null);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Success/Error Messages */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in slide-in-from-top">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="ml-auto text-green-600 hover:text-green-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-in slide-in-from-top">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                    <button
                        onClick={() => setErrorMessage(null)}
                        className="ml-auto text-red-600 hover:text-red-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
                {!isEditing && (
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Lock className="w-4 h-4" />
                        <span>{showPasswordChange ? 'Cancel Password Change' : 'Change Password'}</span>
                    </button>
                )}
            </div>

            {/* Password Change Section */}
            {showPasswordChange && !isEditing && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-blue-500 mb-6">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-blue-600" />
                            Change Password
                        </h3>
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        placeholder="Enter new password (min. 8 characters)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        value={passwordData.password_confirmation}
                                        onChange={(e) => setPasswordData({...passwordData, password_confirmation: e.target.value})}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={passwordMutation.isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <Lock className="w-4 h-4" />
                                    <span>{passwordMutation.isLoading ? 'Changing...' : 'Change Password'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordChange(false);
                                        setPasswordData({
                                            current_password: '',
                                            password: '',
                                            password_confirmation: ''
                                        });
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-gradient-to-br from-[var(--theme-primary)] via-[#2f6c3a] to-[var(--theme-primary-hover)] rounded-2xl shadow-xl p-6 md:p-8 mb-6 text-white">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="relative mx-auto md:mx-0">
                            {headerImageSrc && !isImageErrored ? (
                                <img
                                    src={headerImageSrc}
                                    alt={user.name}
                                    onError={() => setIsImageErrored(true)}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/80 shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border-4 border-white/20 shadow-lg">
                                    <span className="text-4xl md:text-5xl font-bold tracking-wide">
                                        {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute bottom-1 right-1">
                                    <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white p-2 rounded-full shadow-lg transition-colors inline-flex items-center justify-center backdrop-blur">
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
                        <div className="text-center md:text-left space-y-3">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-semibold break-words">{user.name || user.email}</h2>
                                {roleLabel && (
                                    <p className="text-green-100/90 capitalize">{roleLabel}</p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                {branchDetails && (
                                    <Badge icon={MapPin} label={branchDetails} />
                                )}
                                {user.position && (
                                    <Badge icon={Briefcase} label={user.position} />
                                )}
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusStyles}`}>
                                    <Activity className="w-3 h-3" />
                                    {statusLabel}
                                </span>
                            </div>
                            {user.email && (
                                <a
                                    href={`mailto:${user.email}`}
                                    className="inline-flex items-center gap-2 text-sm md:text-base text-green-50 hover:text-white transition-colors"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span className="break-all">{user.email}</span>
                                </a>
                            )}
                            {user.phone_number && (
                                <a
                                    href={`tel:${user.phone_number}`}
                                    className="inline-flex items-center gap-2 text-sm md:text-base text-green-50 hover:text-white transition-colors"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span>{user.phone_number}</span>
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 bg-white text-[var(--theme-primary)] rounded-lg shadow hover:bg-green-50 transition-colors font-medium"
                            >
                                <Edit className="w-4 h-4" />
                                <span>Edit Profile</span>
                            </button>
                        )}
                        {isEditing && (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors font-medium"
                                >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={updateMutation.isLoading}
                                    className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 bg-white text-[var(--theme-primary)] rounded-lg shadow hover:bg-green-50 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{updateMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        icon={MapPin}
                        label="Assigned Branch"
                        value={assignedBranchName || 'Not assigned'}
                        supporting={facilityName}
                    />
                    <SummaryCard
                        icon={Calendar}
                        label="Date Employed"
                        value={dateEmployedLabel || 'Not set'}
                    />
                    <SummaryCard
                        icon={Shield}
                        label="Role"
                        value={roleLabel ? capitalizeWords(roleLabel) : 'Not set'}
                    />
                    <SummaryCard
                        icon={Building}
                        label="Supervisor"
                        value={user.supervisor_name || 'Not set'}
                    />
                </div>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Personal Information */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[var(--theme-primary)] hover:shadow-xl transition-shadow">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center">
                            <UserIcon className="w-5 h-5 mr-2" />
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
                </div>

                {/* Employment Details */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[var(--theme-secondary)] hover:shadow-xl transition-shadow">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center">
                            <Briefcase className="w-5 h-5 mr-2" />
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
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[#4a7a2a] hover:shadow-xl transition-shadow">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center">
                            <Phone className="w-5 h-5 mr-2" />
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
                </div>

                {/* Additional Information */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[#a0522d] hover:shadow-xl transition-shadow">
                        <div className="p-6">
                        <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2" />
                            Additional Notes
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                                {isEditing ? (
                                    <textarea
                                        value={editedUser?.notes || ''}
                                        onChange={(e) => setEditedUser({...editedUser, notes: e.target.value})}
                                        rows={5}
                                    placeholder="Add any additional notes or information..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent resize-none"
                                    />
                                ) : (
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {user.notes || <span className="text-gray-400 italic">No additional notes</span>}
                                </p>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-indigo-500 hover:shadow-xl transition-shadow mb-6">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Notification Preferences
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {disableSuccessToasts ? (
                                        <BellOff className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <Bell className="w-5 h-5 text-[var(--theme-primary)]" />
                                    )}
                                    <label className="text-sm font-semibold text-gray-900">
                                        Success Task Notifications
                                    </label>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {disableSuccessToasts 
                                        ? 'Success notifications are disabled for routine operations. Form submissions will still show success messages.'
                                        : 'Show success notifications after completing tasks (create, update, delete). Form submissions always show success messages.'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggleSuccessToasts(!disableSuccessToasts)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 ${
                                    disableSuccessToasts ? 'bg-gray-300' : 'bg-[var(--theme-primary)]'
                                }`}
                                role="switch"
                                aria-checked={!disableSuccessToasts}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        disableSuccessToasts ? 'translate-x-0' : 'translate-x-5'
                                    }`}
                                />
                            </button>
                        </div>
                        {pushSupported && (
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Smartphone className="w-5 h-5 text-[var(--theme-primary)]" />
                                        <label className="text-sm font-semibold text-gray-900">
                                            App push notifications (PWA)
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {pushEnabled
                                            ? 'Receive notifications on this device when the app is in the background or closed.'
                                            : 'Enable to get alerts (e.g. new incidents, reminders) on your device.'}
                                    </p>
                                    {!isVapidConfigured() && (
                                        <p className="text-xs text-amber-800 mt-1">
                                            Not available until the server sets VAPID keys (see .env.example:{' '}
                                            <code className="text-[11px]">webpush:vapid</code>).
                                        </p>
                                    )}
                                    {errorMessage && (
                                        <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleTogglePush(!pushEnabled)}
                                    disabled={
                                        pushLoading ||
                                        (!isVapidConfigured() && !pushEnabled)
                                    }
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 disabled:opacity-50 ${
                                        pushEnabled ? 'bg-[var(--theme-primary)]' : 'bg-gray-300'
                                    }`}
                                    role="switch"
                                    aria-checked={pushEnabled}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            pushEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Category Preferences */}
            <NotificationCategoryPreferences />
        </div>
    );
}

function NotificationCategoryPreferences() {
    const { data, isLoading } = useQuery({
        queryKey: ['notification-settings'],
        queryFn: async () => {
            const res = await api.get('/notification-settings');
            return res.data.preferences;
        },
    });

    const queryClient = useQueryClient();
    const [localPrefs, setLocalPrefs] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (data && !localPrefs) setLocalPrefs(data);
    }, [data]);

    const prefs = localPrefs || data || [];

    const togglePref = (key, channel) => {
        setLocalPrefs(prev => prev.map(p =>
            p.key === key ? { ...p, [channel]: !p[channel] } : p
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/notification-settings', {
                preferences: prefs.map(p => ({
                    key: p.key,
                    in_app_enabled: p.in_app_enabled,
                    email_enabled: p.email_enabled,
                    push_enabled: p.push_enabled,
                })),
            });
            queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
        } catch (err) {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return null;

    const hasChanges = JSON.stringify(prefs) !== JSON.stringify(data);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow mb-6">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--theme-primary)] flex items-center">
                        <Filter className="w-5 h-5 mr-2" />
                        Notification Categories
                    </h3>
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[var(--theme-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-500 mb-4">Choose which notification types you want to receive.</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 pr-4 font-semibold text-gray-700">Category</th>
                                <th className="text-center py-2 px-3 font-semibold text-gray-700">In-App</th>
                                <th className="text-center py-2 px-3 font-semibold text-gray-700">Email</th>
                                <th className="text-center py-2 px-3 font-semibold text-gray-700">Push</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prefs.map(pref => (
                                <tr key={pref.key} className="border-b border-gray-100 last:border-0">
                                    <td className="py-3 pr-4">
                                        <p className="font-medium text-gray-900">{pref.label}</p>
                                        <p className="text-xs text-gray-500">{pref.description}</p>
                                    </td>
                                    {['in_app_enabled', 'email_enabled', 'push_enabled'].map(channel => (
                                        <td key={channel} className="text-center py-3 px-3">
                                            <button
                                                onClick={() => togglePref(pref.key, channel)}
                                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                                    pref[channel] ? 'bg-[var(--theme-primary)]' : 'bg-gray-300'
                                                }`}
                                                role="switch"
                                                aria-checked={pref[channel]}
                                            >
                                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                                    pref[channel] ? 'translate-x-4' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// View Components
function ViewPersonalInfo({ user }) {
    return (
        <div className="space-y-4">
            {user.first_name && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">First Name</p>
                    <p className="text-base font-semibold text-gray-900">{user.first_name}</p>
                </div>
            )}
            {user.middle_names && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Middle Names</p>
                    <p className="text-base font-semibold text-gray-900">{user.middle_names}</p>
                </div>
            )}
            {user.last_name && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Name</p>
                    <p className="text-base font-semibold text-gray-900">{user.last_name}</p>
                </div>
            )}
            {user.date_of_birth && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Date of Birth
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                        {new Date(user.date_of_birth).toLocaleDateString('en-US', { 
                            month: 'long', day: 'numeric', year: 'numeric' 
                        })}
                    </p>
                </div>
            )}
            {user.marital_status && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Marital Status</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">{user.marital_status}</p>
                </div>
            )}
            {user.sex && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sex</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">{user.sex}</p>
                </div>
            )}
        </div>
    );
}

function ViewEmploymentInfo({ user }) {
    return (
        <div className="space-y-4">
            {user.role && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Role
                    </p>
                    <p className="text-base font-semibold text-gray-900 capitalize">{user.role.replace(/_/g, ' ')}</p>
                </div>
            )}
            {user.assigned_branch && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                        Assigned Branch
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                        {user.assigned_branch.name}
                        {user.assigned_branch.facility?.name && (
                            <span className="block text-sm text-gray-500 mt-1">
                                {user.assigned_branch.facility.name}
                            </span>
                        )}
                    </p>
                </div>
            )}
            {user.credentials && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Award className="w-3.5 h-3.5 mr-1.5" />
                        Credentials
                    </p>
                    <p className="text-base font-semibold text-gray-900">{user.credentials}</p>
                </div>
            )}
            {user.credential_details && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Credential Details</p>
                    <p className="text-base font-semibold text-gray-900">{user.credential_details}</p>
                </div>
            )}
            {user.date_employed && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        Date Employed
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                        {new Date(user.date_employed).toLocaleDateString('en-US', { 
                            month: 'long', day: 'numeric', year: 'numeric' 
                        })}
                    </p>
                </div>
            )}
            {user.supervisor_name && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Supervisor</p>
                    <p className="text-base font-semibold text-gray-900">{user.supervisor_name}</p>
                </div>
            )}
            {user.provider_name && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Provider</p>
                    <p className="text-base font-semibold text-gray-900">{user.provider_name}</p>
                </div>
            )}
            <div className="pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    user.is_active 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                    <Activity className={`w-3.5 h-3.5 ${user.is_active ? 'text-green-600' : 'text-red-600'}`} />
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </div>
    );
}

function ViewContactInfo({ user }) {
    return (
        <div className="space-y-4">
            {user.email && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Email
                    </p>
                    <a 
                        href={`mailto:${user.email}`}
                        className="text-base font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors break-all"
                    >
                        {user.email}
                    </a>
                </div>
            )}
            {user.phone_number && (
                <div className="pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Phone Number
                    </p>
                    <a 
                        href={`tel:${user.phone_number}`}
                        className="text-base font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors"
                    >
                        {user.phone_number}
                    </a>
                </div>
            )}
        </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Names</label>
                <input
                    type="text"
                    value={user?.middle_names || ''}
                    onChange={(e) => setUser({...user, middle_names: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                    type="text"
                    value={user?.last_name || ''}
                    onChange={(e) => setUser({...user, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
            </div>
            {user?.date_of_birth && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                        type="date"
                        value={user.date_of_birth}
                        onChange={(e) => setUser({...user, date_of_birth: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                </div>
            )}
            {user?.marital_status && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                    <select
                        value={user.marital_status || ''}
                        onChange={(e) => setUser({...user, marital_status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">Select status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                        <option value="separated">Separated</option>
                        <option value="n/a">N/A</option>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                    type="tel"
                    value={user?.phone_number || ''}
                    onChange={(e) => setUser({...user, phone_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                />
            </div>
        </>
    );
}

function Badge({ icon: Icon, label }) {
    if (!label) {
        return null;
    }

    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-white/10 border border-white/30 backdrop-blur">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{label}</span>
        </span>
    );
}

function SummaryCard({ icon: Icon, label, value, supporting }) {
    return (
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white">
                    {Icon && <Icon className="w-5 h-5" />}
                </div>
                <div>
                    <p className="text-sm text-white/70">{label}</p>
                    <p className="text-base font-semibold text-white">{value}</p>
                    {supporting && <p className="text-xs text-white/60 mt-1">{supporting}</p>}
                </div>
            </div>
        </div>
    );
}

function capitalizeWords(text) {
    if (!text) {
        return '';
    }

    return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

