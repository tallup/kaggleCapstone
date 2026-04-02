import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Trash2, AlertTriangle } from 'lucide-react';

const MODULE_ENTRIES = [
    ['medications', 'Medications'],
    ['pharmacy', 'Pharmacy (orders & related transactions)'],
    ['vitals', 'Vitals'],
    ['appointments', 'Appointments'],
    ['assessments', 'Assessments'],
    ['sleep', 'Sleep'],
    ['housekeeping', 'Housekeeping (task logs)'],
    ['reports', 'Progress notes (T-Logs)'],
    ['residents', 'Residents (documents, sign-outs, visitors, contacts, messages, assignments, reminders, in-app notifications)'],
    ['behaviors', 'Behaviors & behavior charts'],
    ['incidents', 'Incidents'],
    ['leave_requests', 'Leave requests (branch-wide for selected residents’ branches)'],
    ['employee_documents', 'Employee documents — not purged (use admin UI)'],
    ['grocery_status', 'Grocery status'],
    ['fire_drills', 'Fire drills (branch-wide)'],
    ['billing_expenses', 'Billing & expenses (invoices & expenses for selected residents)'],
    ['staff_scheduling', 'Staff scheduling (shifts & clock-ins)'],
];

export default function ModuleTestDataPurge() {
    const queryClient = useQueryClient();

    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
    });

    const { data: residentsResponse } = useQuery({
        queryKey: ['test-data-purge-residents', currentUser?.assigned_branch_id],
        queryFn: async () => {
            const response = await api.get('/residents', {
                params: { per_page: 200, show_all: true },
            });
            return response.data;
        },
        enabled: !isLoadingUser,
    });

    const rawResidents = useMemo(() => {
        if (!residentsResponse) return [];
        return residentsResponse.data || residentsResponse;
    }, [residentsResponse]);

    const [superAdminFacilityId, setSuperAdminFacilityId] = useState('');

    const { data: facilitiesPayload } = useQuery({
        queryKey: ['facilities', 'test-data-purge'],
        queryFn: async () => (await api.get('/facilities', { params: { per_page: 200 } })).data,
        enabled: !isLoadingUser && currentUser?.role === 'super_admin' && !currentUser?.facility_id,
    });

    const facilities = useMemo(() => {
        if (!facilitiesPayload) return [];
        return facilitiesPayload.data || [];
    }, [facilitiesPayload]);

    const residents = useMemo(() => {
        const list = Array.isArray(rawResidents) ? rawResidents : [];
        if (currentUser?.role !== 'super_admin' || currentUser?.facility_id) {
            return list;
        }
        if (!superAdminFacilityId) {
            return [];
        }
        const fid = Number(superAdminFacilityId);
        return list.filter((r) => r.branch?.facility_id === fid);
    }, [rawResidents, currentUser, superAdminFacilityId]);

    const isCaregiver = useMemo(() => {
        if (!currentUser) return false;
        const role = (currentUser.role || '').toLowerCase().trim();
        return ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'].includes(role);
    }, [currentUser]);

    const canPurge = useMemo(() => {
        if (!currentUser || isCaregiver) return false;
        const role = String(currentUser.role || '').toLowerCase();
        if (['super_admin', 'administrator', 'admin'].includes(role)) return true;
        if (currentUser.is_any_admin === true) return true;
        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            return roles.some((r) => {
                const name = String((r && typeof r === 'object' && r.name) ? r.name : r || '').toLowerCase();
                return ['super_admin', 'administrator', 'admin'].includes(name);
            });
        }
        return false;
    }, [currentUser, isCaregiver]);

    const [selectedResidents, setSelectedResidents] = useState([]);
    const [selectedModules, setSelectedModules] = useState([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [confirmText, setConfirmText] = useState('');

    const purgeMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post('/test-data/purge', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
            setConfirmText('');
        },
    });

    const toggleModule = (key) => {
        setSelectedModules((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    };

    const selectAllModules = () => {
        setSelectedModules(MODULE_ENTRIES.map(([k]) => k).filter((k) => k !== 'employee_documents'));
    };

    if (!isLoadingUser && !canPurge) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 text-sm">
                    Only facility administrators (Administrator or Admin role) or super admins can use multi-module test
                    data purge.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <Trash2 className="w-7 h-7 text-red-700" aria-hidden />
                    Purge test data (multi-module)
                </h1>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                    Permanently deletes operational records for the selected residents (and, for some modules, branch-wide
                    data for those residents’ branches). Select modules carefully. Optional date range limits rows by each
                    module’s main date column; leave empty to delete all matching rows for the selection.
                </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-900">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                <div>
                    <p className="font-semibold">Irreversible</p>
                    <p className="mt-1">
                        Branch-scoped modules (e.g. fire drills, grocery, shifts, leave requests) remove rows for the
                        branches of the residents you select—not per resident row. Employee documents are not deleted here.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
                {currentUser?.role === 'super_admin' && !currentUser?.facility_id && (
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Facility (required)</label>
                        <select
                            value={superAdminFacilityId}
                            onChange={(e) => {
                                setSuperAdminFacilityId(e.target.value);
                                setSelectedResidents([]);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Select facility…</option>
                            {facilities.map((f) => (
                                <option key={f.id} value={String(f.id)}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Residents (Ctrl/Cmd + click)</label>
                    <select
                        multiple
                        size={Math.min(12, Math.max(5, residents.length || 5))}
                        value={selectedResidents}
                        onChange={(e) => {
                            const v = Array.from(e.target.selectedOptions).map((o) => o.value);
                            setSelectedResidents(v);
                        }}
                        className="w-full min-h-[140px] border border-gray-300 rounded-lg px-2 py-2 text-sm"
                    >
                        {residents.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                                {r.first_name} {r.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-800">Modules</span>
                        <button
                            type="button"
                            onClick={selectAllModules}
                            className="text-xs font-semibold text-[var(--theme-primary)] hover:underline"
                        >
                            Select all (except employee documents)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedModules([])}
                            className="text-xs text-gray-600 hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {MODULE_ENTRIES.map(([key, label]) => (
                            <label
                                key={key}
                                className={`flex items-start gap-2 text-sm cursor-pointer ${
                                    key === 'employee_documents' ? 'opacity-60' : ''
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded border-gray-300"
                                    checked={selectedModules.includes(key)}
                                    disabled={key === 'employee_documents'}
                                    onChange={() => toggleModule(key)}
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">From (optional)</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">To (optional)</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Type DELETE to confirm</label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm font-mono"
                        placeholder="DELETE"
                        autoComplete="off"
                    />
                </div>

                <button
                    type="button"
                    disabled={
                        purgeMutation.isPending ||
                        selectedResidents.length === 0 ||
                        selectedModules.length === 0 ||
                        confirmText !== 'DELETE' ||
                        (currentUser?.role === 'super_admin' &&
                            !currentUser?.facility_id &&
                            !superAdminFacilityId)
                    }
                    onClick={() => {
                        const payload = {
                            resident_ids: selectedResidents.map((id) => parseInt(id, 10)),
                            modules: selectedModules.filter((m) => m !== 'employee_documents'),
                            confirmation: 'DELETE',
                        };
                        if (dateFrom) payload.date_from = dateFrom;
                        if (dateTo) payload.date_to = dateTo;
                        if (currentUser?.role === 'super_admin' && !currentUser?.facility_id && superAdminFacilityId) {
                            payload.facility_id = parseInt(superAdminFacilityId, 10);
                        }
                        purgeMutation.mutate(payload);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {purgeMutation.isPending ? 'Purging…' : 'Purge selected test data'}
                </button>

                {purgeMutation.isError && (
                    <p className="text-sm text-red-700">
                        {purgeMutation.error?.response?.data?.message || purgeMutation.error?.message || 'Request failed.'}
                    </p>
                )}

                {purgeMutation.isSuccess && purgeMutation.data?.counts && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        <p className="font-semibold mb-2">{purgeMutation.data.message}</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {Object.entries(purgeMutation.data.counts).map(([k, v]) => (
                                <li key={k}>
                                    <code className="text-xs bg-white/80 px-1 rounded">{k}</code>: {String(v)} rows
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
