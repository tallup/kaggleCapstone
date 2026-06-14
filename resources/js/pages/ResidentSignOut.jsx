import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { User, MapPin, Clock, AlertTriangle, CheckCircle, History } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { toast } from 'sonner';

export default function ResidentSignOut() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [selectedResident, setSelectedResident] = useState(null);

    // Fetch current user
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            try {
                const response = await api.get('/user');
                return response.data;
            } catch {
                return null;
            }
        },
    });

    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    // Fetch branches for administrators
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return {
                ...response.data,
                data: branches.filter(b => b.is_active !== false)
            };
        },
        enabled: isFacilityAdmin || isBranchAdmin,
    });

    // Fetch residents
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 100, is_active: true } });
            return response.data?.data || [];
        },
    });

    // Fetch active sign-outs
    const { data: activeSignOuts, isLoading } = useQuery({
        queryKey: ['resident-sign-outs-active'],
        queryFn: async () => {
            const response = await api.get('/residents/sign-outs/active');
            return response.data?.data || [];
        },
        refetchInterval: 120000, // Refetch every 2 minutes
        refetchIntervalInBackground: false,
    });

    // Fetch overdue sign-outs
    const { data: overdueSignOuts } = useQuery({
        queryKey: ['resident-sign-outs-overdue'],
        queryFn: async () => {
            const response = await api.get('/residents/sign-outs/overdue');
            return response.data?.data || [];
        },
        refetchInterval: 60000,
    });

    const signOutMutation = useMutation({
        mutationFn: async (data) => {
            return api.post(`/residents/${data.resident_id}/sign-out`, data);
        },
        onSuccess: () => {
            toast.success('Resident signed out successfully');
            queryClient.invalidateQueries(['resident-sign-outs-active']);
            queryClient.invalidateQueries(['resident-sign-outs-overdue']);
            setShowForm(false);
            setSelectedResident(null);
        },
        onError: (error) => {
            const message = error?.response?.data?.message
                || error?.response?.data?.errors?.expected_return_at?.[0]
                || error?.response?.data?.errors?.resident_id?.[0]
                || 'Failed to sign out resident. Please check the form and try again.';
            toast.error(message);
        },
    });

    const signInMutation = useMutation({
        mutationFn: async (residentId) => {
            return api.post(`/residents/${residentId}/sign-in`);
        },
        onSuccess: () => {
            toast.success('Resident signed in successfully');
            queryClient.invalidateQueries(['resident-sign-outs-active']);
            queryClient.invalidateQueries(['resident-sign-outs-overdue']);
        },
        onError: (error) => {
            const message = error?.response?.data?.message || 'Failed to sign in resident.';
            toast.error(message);
        },
    });

    return (
        <>
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setSelectedResident(null);
                }}
                title="Sign Out Resident"
                size="lg"
            >
                <ResidentSignOutForm
                    inModal
                    residents={residentsData || []}
                    selectedResident={selectedResident}
                    currentUser={currentUser}
                    isFacilityAdmin={isFacilityAdmin}
                    isBranchAdmin={isBranchAdmin}
                    branches={branchesData?.data || []}
                    onClose={() => {
                        setShowForm(false);
                        setSelectedResident(null);
                    }}
                    onSubmit={(data) => signOutMutation.mutate(data)}
                    isSubmitting={signOutMutation.isPending}
                />
            </Modal>
        <div className="space-y-6">
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Resident Sign-Outs</h1>
                        <p className="text-gray-600 mt-1">Track when residents leave and return</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/residents/sign-outs/view-all')}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <History className="w-5 h-5" />
                            View History
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
                        >
                            <User className="w-5 h-5" />
                            Sign Out Resident
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Overdue Alerts */}
            {overdueSignOuts && overdueSignOuts.length > 0 && (
                <SectionCard>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <h2 className="text-xl font-semibold text-red-900">Overdue Returns</h2>
                    </div>
                    <div className="space-y-3">
                        {overdueSignOuts.map((signOut) => (
                            <div
                                key={signOut.id}
                                className="p-4 bg-red-50 border border-red-200 rounded-lg"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-red-900">
                                            {signOut.resident?.name || 'Resident'}
                                        </p>
                                        <p className="text-sm text-red-700">
                                            Expected return: {new Date(signOut.expected_return_at).toLocaleString()}
                                        </p>
                                        {signOut.destination && (
                                            <p className="text-sm text-red-600">Destination: {signOut.destination}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => signInMutation.mutate(signOut.resident_id)}
                                        disabled={signInMutation.isPending}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Active Sign-Outs */}
            <SectionCard>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sign-Outs</h2>
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                ) : activeSignOuts && activeSignOuts.length > 0 ? (
                    <div className="space-y-3">
                        {activeSignOuts.map((signOut) => (
                            <div
                                key={signOut.id}
                                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                            {signOut.resident?.name || 'Resident'}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            {signOut.destination && (
                                                <p className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    {signOut.destination}
                                                </p>
                                            )}
                                            <p className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Out: {new Date(signOut.sign_out_at).toLocaleString()}
                                            </p>
                                            {signOut.expected_return_at && (
                                                <p className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Expected: {new Date(signOut.expected_return_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => signInMutation.mutate(signOut.resident_id)}
                                        disabled={signInMutation.isPending}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={User}
                        title="No Active Sign-Outs"
                        description="All residents are currently at the facility"
                    />
                )}
            </SectionCard>
        </div>
        </>
    );
}

function ResidentSignOutForm({ residents, selectedResident, currentUser, isFacilityAdmin, isBranchAdmin, branches, onClose, onSubmit, isSubmitting, inModal = false }) {
    const [form, setForm] = useState({
        branch_id: isBranchAdmin && currentUser?.assigned_branch_id ? String(currentUser.assigned_branch_id) : '',
        resident_id: selectedResident?.id || '',
        destination: '',
        purpose: '',
        accompanied_by: '',
        expected_return_at: '',
        emergency_contact_notified: false,
        notes: '',
    });
    const [formError, setFormError] = useState('');

    const minExpectedReturn = useMemo(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - offset * 60 * 1000);
        return localNow.toISOString().slice(0, 16);
    }, []);

    // Filter residents by selected branch
    const filteredResidents = useMemo(() => {
        if (!form.branch_id) {
            return residents;
        }
        return residents.filter(r => String(r.branch_id) === String(form.branch_id));
    }, [residents, form.branch_id]);

    // Reset resident when branch changes
    React.useEffect(() => {
        if (form.branch_id) {
            setForm(prev => ({ ...prev, resident_id: '' }));
        }
    }, [form.branch_id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');

        if (form.expected_return_at) {
            const expectedReturnDate = new Date(form.expected_return_at);
            if (!Number.isNaN(expectedReturnDate.getTime()) && expectedReturnDate <= new Date()) {
                setFormError('Expected return must be a future date/time.');
                return;
            }
        }

        onSubmit(form);
    };

    const formEl = (
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Branch selection for administrators */}
                {(isFacilityAdmin || isBranchAdmin) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Branch {isFacilityAdmin ? '*' : ''}
                        </label>
                        <select
                            value={form.branch_id}
                            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                            required={isFacilityAdmin}
                            disabled={isBranchAdmin && currentUser?.assigned_branch_id}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Select branch...</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resident *
                    </label>
                    <select
                        value={form.resident_id}
                        onChange={(e) => setForm({ ...form, resident_id: e.target.value })}
                        required
                        disabled={!form.branch_id && (isFacilityAdmin || isBranchAdmin)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="">Select resident...</option>
                        {filteredResidents.map((resident) => (
                            <option key={resident.id} value={resident.id}>
                                {resident.name}
                            </option>
                        ))}
                    </select>
                    {!form.branch_id && (isFacilityAdmin || isBranchAdmin) && (
                        <p className="mt-1 text-sm text-gray-500">Please select a branch first</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination
                    </label>
                    <input
                        type="text"
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        placeholder="Where are they going?"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purpose
                    </label>
                    <textarea
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        rows={3}
                        placeholder="Purpose of trip..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Accompanied By
                        </label>
                        <input
                            type="text"
                            value={form.accompanied_by}
                            onChange={(e) => setForm({ ...form, accompanied_by: e.target.value })}
                            placeholder="Name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Return
                        </label>
                        <input
                            type="datetime-local"
                            value={form.expected_return_at}
                            onChange={(e) => setForm({ ...form, expected_return_at: e.target.value })}
                            min={minExpectedReturn}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {formError}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="notified"
                        checked={form.emergency_contact_notified}
                        onChange={(e) => setForm({ ...form, emergency_contact_notified: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <label htmlFor="notified" className="text-sm text-gray-700">
                        Emergency contact notified
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !form.resident_id}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                    >
                        {isSubmitting ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>
            </form>
    );

    if (inModal) {
        return formEl;
    }

    return (
        <SectionCard>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Sign Out Resident</h2>
                <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    ✕
                </button>
            </div>
            {formEl}
        </SectionCard>
    );
}

