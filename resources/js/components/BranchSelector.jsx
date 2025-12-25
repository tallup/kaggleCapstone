import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Building2, ChevronDown } from 'lucide-react';
import api from '../services/api';

export default function BranchSelector({ currentUser }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');

    // Determine if user is facility admin
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator' || role === 'facility_admin' || role === 'super_admin';
    }, [currentUser]);

    // Fetch branches based on user role
    const { data: branchesData, isLoading } = useQuery({
        queryKey: ['housekeeping-branches', currentUser?.facility_id, currentUser?.id],
        queryFn: async () => {
            const params = { per_page: 100, is_active: true };
            
            if (isFacilityAdmin && currentUser?.facility_id) {
                // Facility admins see all branches in their facility
                params.facility_id = currentUser.facility_id;
            } else if (currentUser?.assigned_branch_id) {
                // Others see their assigned branch (and potentially others if they have access)
                // For now, we'll fetch all and filter client-side if needed
                // The backend should handle this based on permissions
            }
            
            const response = await api.get('/branches', { params });
            return response.data?.data || response.data || [];
        },
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const branches = branchesData || [];
    const userBranchId = currentUser?.assigned_branch_id;
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'].includes(role);
    }, [currentUser]);

    // Determine if we should auto-select and hide the selector
    const hasOnlyOneBranch = branches.length === 1;
    const hasAssignedBranch = userBranchId && branches.find(b => b.id === userBranchId);
    // Auto-select and hide for: caregivers with assigned branch, facility admins with only one branch, or anyone with only one branch
    const shouldAutoSelect = (isCaregiver && hasAssignedBranch) || (isFacilityAdmin && hasOnlyOneBranch) || (hasOnlyOneBranch && !isFacilityAdmin);

    // Auto-select branch if none selected
    React.useEffect(() => {
        if (!selectedBranchId && branches.length > 0) {
            let branchToSelect = null;
            
            // For caregivers and facility admins, prefer their assigned branch
            if (userBranchId) {
                const userBranch = branches.find(b => b.id === userBranchId);
                if (userBranch) {
                    branchToSelect = userBranchId;
                }
            }
            
            // If no assigned branch found, use the first available branch
            if (!branchToSelect && branches.length > 0) {
                branchToSelect = branches[0].id;
            }
            
            if (branchToSelect) {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('branch', branchToSelect.toString());
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [selectedBranchId, branches, userBranchId, searchParams, setSearchParams]);

    // Don't show selector if user has no branches or should auto-select
    if (isLoading) {
        return (
            <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--theme-primary)]"></div>
                    Loading branches...
                </div>
            </div>
        );
    }

    if (branches.length === 0) {
        return (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-amber-800">No Branches Available</p>
                <p className="mt-1 text-xs text-amber-700">Please assign a branch to your profile or contact your administrator.</p>
            </div>
        );
    }

    // Hide selector if we should auto-select (caregivers, facility admins with one branch, or anyone with one branch)
    if (shouldAutoSelect) {
        return null;
    }

    const selectedBranch = branches.find(b => b.id?.toString() === selectedBranchId);

    const handleBranchChange = (branchId) => {
        const newParams = new URLSearchParams(searchParams);
        if (branchId) {
            newParams.set('branch', branchId.toString());
        } else {
            newParams.delete('branch');
        }
        setSearchParams(newParams, { replace: true });
    };

    return (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
                    <label className="text-sm font-semibold text-gray-700">Select Branch:</label>
                </div>
                <div className="relative">
                    <select
                        value={selectedBranchId || ''}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className="appearance-none rounded-lg border-2 border-gray-200 bg-white px-4 py-2 pr-10 text-sm font-semibold text-gray-900 transition-colors focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)]"
                        style={{ minWidth: '200px' }}
                    >
                        <option value="">Select a branch...</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
            {selectedBranch && (
                <div className="mt-3 rounded-lg border border-[var(--theme-primary-bg)] bg-[var(--theme-primary-bg)] px-3 py-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--theme-primary)' }}>
                        Viewing data for: <span className="font-bold">{selectedBranch.name}</span>
                    </p>
                </div>
            )}
            {!selectedBranchId && branches.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">
                        Please select a branch to view housekeeping data.
                    </p>
                </div>
            )}
        </div>
    );
}

