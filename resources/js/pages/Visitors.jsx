import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { UserPlus, Search, CheckCircle, XCircle, User, Clock } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function Visitors() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');

    // Fetch branches for form
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            return response.data?.data || [];
        },
    });

    // Fetch residents for form
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 100, is_active: true } });
            return response.data?.data || [];
        },
    });

    // Fetch active visitors
    const { data: activeVisitors, isLoading: activeLoading } = useQuery({
        queryKey: ['visitors-active'],
        queryFn: async () => {
            const response = await api.get('/visitors/active');
            return response.data?.data || [];
        },
        refetchInterval: 60000, // Refetch every 60 seconds
        refetchIntervalInBackground: false,
    });

    // Fetch all visitors (with filters)
    const { data: allVisitors, isLoading: allLoading } = useQuery({
        queryKey: ['visitors', search, statusFilter],
        queryFn: async () => {
            const params = {
                per_page: 50,
                is_active: statusFilter === 'active',
            };
            if (search) params.search = search;
            const response = await api.get('/visitors', { params });
            return response.data?.data || [];
        },
        enabled: statusFilter !== 'active', // Only fetch when viewing all
    });

    const checkInMutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/visitors/check-in', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['visitors-active']);
            queryClient.invalidateQueries(['visitors']);
            setShowForm(false);
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: async (visitorId) => {
            return api.post(`/visitors/${visitorId}/check-out`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['visitors-active']);
            queryClient.invalidateQueries(['visitors']);
        },
    });

    const visitors = statusFilter === 'active' ? activeVisitors : allVisitors;
    const isLoading = statusFilter === 'active' ? activeLoading : allLoading;

    return (
        <>
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title="Check In Visitor"
                size="lg"
            >
                <VisitorCheckInForm
                    inModal
                    branches={branchesData || []}
                    residents={residentsData || []}
                    onClose={() => setShowForm(false)}
                    onSubmit={(data) => checkInMutation.mutate(data)}
                    isSubmitting={checkInMutation.isPending}
                />
            </Modal>
        <div className="space-y-6">
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
                        <p className="text-gray-600 mt-1">Track visitor check-ins and check-outs</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        Check In Visitor
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                statusFilter === 'active'
                                    ? 'bg-[var(--theme-primary)] text-white'
                                    : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                statusFilter === 'all'
                                    ? 'bg-[var(--theme-primary)] text-white'
                                    : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                        >
                            All
                        </button>
                    </div>
                    {statusFilter === 'all' && (
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search visitors..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Visitors List */}
            <SectionCard>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {statusFilter === 'active' ? 'Active Visitors' : 'All Visitors'}
                </h2>
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                ) : visitors && visitors.length > 0 ? (
                    <div className="space-y-3">
                        {visitors.map((visitor) => (
                            <div
                                key={visitor.id}
                                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                            {visitor.first_name} {visitor.last_name}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            <p className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Check in: {new Date(visitor.check_in_at).toLocaleString()}
                                            </p>
                                            {visitor.visiting_resident && (
                                                <p className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    Visiting: {visitor.visiting_resident.name}
                                                </p>
                                            )}
                                            {visitor.visit_purpose && (
                                                <p>Purpose: {visitor.visit_purpose}</p>
                                            )}
                                        </div>
                                    </div>
                                    {visitor.is_active && (
                                        <button
                                            onClick={() => checkOutMutation.mutate(visitor.id)}
                                            disabled={checkOutMutation.isPending}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            Check Out
                                        </button>
                                    )}
                                    {!visitor.is_active && visitor.check_out_at && (
                                        <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                            Checked out: {new Date(visitor.check_out_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={UserPlus}
                        title={`No ${statusFilter === 'active' ? 'Active ' : ''}Visitors`}
                        description={statusFilter === 'active' ? 'No visitors currently checked in' : 'No visitors found'}
                    />
                )}
            </SectionCard>
        </div>
        </>
    );
}

function VisitorCheckInForm({ branches, residents, onClose, onSubmit, isSubmitting, inModal = false }) {
    const [form, setForm] = useState({
        branch_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        visit_purpose: '',
        visiting_resident_id: '',
        visiting_staff_id: '',
        expected_duration_minutes: '',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...form,
            branch_id: parseInt(form.branch_id),
            visiting_resident_id: form.visiting_resident_id ? parseInt(form.visiting_resident_id) : null,
            visiting_staff_id: form.visiting_staff_id ? parseInt(form.visiting_staff_id) : null,
            expected_duration_minutes: form.expected_duration_minutes ? parseInt(form.expected_duration_minutes) : null,
        };
        onSubmit(submitData);
    };

    const formBody = (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Branch *
                        </label>
                        <select
                            value={form.branch_id}
                            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select branch...</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visit Purpose *
                        </label>
                        <input
                            type="text"
                            value={form.visit_purpose}
                            onChange={(e) => setForm({ ...form, visit_purpose: e.target.value })}
                            required
                            placeholder="Purpose of visit"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                        </label>
                        <input
                            type="text"
                            value={form.first_name}
                            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            value={form.last_name}
                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={form.phone || ''}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setForm({ ...form, phone: formatted });
                            }}
                            placeholder="(425) 555-0123"
                            maxLength={14}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visiting Resident
                        </label>
                        <select
                            value={form.visiting_resident_id}
                            onChange={(e) => setForm({ ...form, visiting_resident_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">None</option>
                            {residents.map((resident) => (
                                <option key={resident.id} value={resident.id}>
                                    {resident.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Duration (minutes)
                        </label>
                        <input
                            type="number"
                            value={form.expected_duration_minutes}
                            onChange={(e) => setForm({ ...form, expected_duration_minutes: e.target.value })}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                    </label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                        disabled={isSubmitting || !form.branch_id || !form.first_name || !form.last_name || !form.visit_purpose}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                    >
                        {isSubmitting ? 'Checking In...' : 'Check In'}
                    </button>
                </div>
            </form>
    );

    if (inModal) {
        return formBody;
    }

    return (
        <SectionCard>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Check In Visitor</h2>
                <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    ✕
                </button>
            </div>
            {formBody}
        </SectionCard>
    );
}

