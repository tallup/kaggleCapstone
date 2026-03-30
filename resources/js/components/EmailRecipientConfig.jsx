import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, X, Check, UserPlus } from 'lucide-react';
import api from '../services/api';
import Tooltip from './ui/Tooltip';

const ROLE_LABELS = {
  administrator: 'Administrator',
  admin: 'Admin',
  manager: 'Manager',
  nurse: 'Nurse',
  caregiver: 'Caregiver',
  super_admin: 'Super Admin',
};

export default function EmailRecipientConfig({ facilityId, config, onChange }) {
  const [selectedRoles, setSelectedRoles] = useState(config?.recipient_roles || []);
  const [selectedUserIds, setSelectedUserIds] = useState(config?.recipient_user_ids || []);
  const [userSearch, setUserSearch] = useState('');

  // Fetch users for the facility
  const { data: usersData } = useQuery({
    enabled: !!facilityId,
    queryKey: ['facility-users', facilityId, userSearch],
    queryFn: async () => {
      const params = { facility_id: facilityId, per_page: 100, active_only: 'true' };
      if (userSearch) params.search = userSearch;
      const response = await api.get('/users', { params });
      return response.data?.data || [];
    },
  });

  const commonRoles = ['administrator', 'admin', 'manager', 'nurse', 'caregiver', 'super_admin'];

  useEffect(() => {
    if (onChange) {
      onChange({
        enabled: config?.enabled ?? true,
        recipient_roles: selectedRoles,
        recipient_user_ids: selectedUserIds,
      });
    }
  }, [selectedRoles, selectedUserIds, config?.enabled]);

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const usersList = usersData?.data || usersData || [];
  const selectedUsers = usersList.filter((u) => selectedUserIds.includes(u.id));
  const availableToAdd = usersList.filter((u) => !selectedUserIds.includes(u.id));

  return (
    <div className="space-y-8">
      {/* Roles */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Recipient Roles</h4>
        <p className="text-xs text-gray-500 mb-4">
          Click a role to select or deselect. <strong className="text-gray-600">Selected roles are highlighted</strong> and receive this notification.
        </p>
        <div className="flex flex-wrap gap-2">
          {commonRoles.map((role) => {
            const isSelected = selectedRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
                {ROLE_LABELS[role] || role.replace('_', ' ')}
              </button>
            );
          })}
        </div>
        {selectedRoles.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            {selectedRoles.length} role{selectedRoles.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Specific Users */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Specific Users</h4>
        <p className="text-xs text-gray-500 mb-4">
          Add individual people in addition to roles. Search by name or email, then click to add or remove.
        </p>

        <div className="relative mb-4">
          <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-white"
          />
        </div>

        {userSearch && availableToAdd.length > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
              Click to add
            </p>
            <ul className="max-h-44 overflow-y-auto">
              {availableToAdd.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-[var(--theme-primary)]/10 flex items-center gap-2 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{user.name || [user.first_name, user.last_name].filter(Boolean).join(' ')}</span>
                    <span className="text-gray-400 truncate text-xs">({user.email})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {userSearch && availableToAdd.length === 0 && usersList.length > 0 && (
          <p className="mb-4 text-xs text-gray-500">All matching users are already added.</p>
        )}

        {selectedUsers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Added users ({selectedUsers.length})</p>
            <div className="space-y-1.5">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg"
                >
                  <span className="text-sm text-gray-800 truncate">
                    {user.name || [user.first_name, user.last_name].filter(Boolean).join(' ')}
                    <span className="text-gray-500 font-normal"> — {user.email}</span>
                  </span>
                  <Tooltip content="Remove" position="left">
                    <button
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove user from recipients"
                    >
                      <X className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-2">No specific users added. Use the search above to add people.</p>
        )}
      </div>
    </div>
  );
}

