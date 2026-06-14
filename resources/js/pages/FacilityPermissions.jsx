import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, Save, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import logger from '../utils/logger';

export default function FacilityPermissions({ facilityId, facilityName, onBack }) {
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check user role to determine if they can access module settings
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

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isFacilityAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
  
  // Facility admins should start on 'admin' tab, super admins on 'modules'
  const [activeTab, setActiveTab] = useState(isFacilityAdmin && !isSuperAdmin ? 'admin' : 'modules');

  // Fetch facility permissions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['facility-permissions', facilityId],
    queryFn: async () => {
      try {
        const res = await api.get(`/facilities/${facilityId}/permissions`);
        return res.data.data;
      } catch (err) {
        logger.error('Error fetching permissions:', err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 0, // Always consider data stale to force refetch
    cacheTime: 0, // Don't cache to ensure fresh data on reload
  });

  // Module update mutation
  const updateModulesMutation = useMutation({
    mutationFn: async (modules) => {
      const response = await api.put(`/facilities/${facilityId}/permissions/modules`, { modules });
      return response.data;
    },
    onSuccess: async (responseData) => {
      // Invalidate all related queries
      queryClient.invalidateQueries(['facility-permissions']);
      queryClient.invalidateQueries(['facility-permissions-summary']);
      queryClient.invalidateQueries(['facilities']);
      // Invalidate user data so it refreshes with new module access
      queryClient.invalidateQueries(['current-user']);
      
      // Force a refetch immediately
      await refetch();
      
      showToast('Modules updated successfully', 'success', { isFormSubmission: true });
    },
    onError: (error) => {
      logger.error('Error updating modules:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update modules';
      showToast(errorMessage, 'error');
    },
  });

  // Role permissions update mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }) => {
      return api.put(`/facilities/${facilityId}/permissions/roles/${roleId}`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility-permissions', facilityId]);
      // Invalidate user data so it refreshes with new permissions
      queryClient.invalidateQueries(['current-user']);
      showToast('Role permissions updated successfully', 'success', { isFormSubmission: true });
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update role permissions', 'error');
    },
  });

  // Ensure roles exist mutation
  const ensureRolesMutation = useMutation({
    mutationFn: async () => {
      return api.post('/roles/ensure-exist');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facility-permissions', facilityId]);
      // Invalidate user data so it refreshes with new roles/permissions
      queryClient.invalidateQueries(['current-user']);
      showToast('Roles created successfully. Refreshing...', 'success', { isFormSubmission: true });
      // Refetch after a short delay to show updated data
      setTimeout(() => {
        refetch();
      }, 500);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create roles', 'error');
    },
  });

  const [localModules, setLocalModules] = useState([]);
  const [localAdminPermissions, setLocalAdminPermissions] = useState({});
  const [localCaregiverPermissions, setLocalCaregiverPermissions] = useState({});
  const [localNursePermissions, setLocalNursePermissions] = useState({});

  // Initialize local state from API data - only on initial load or when data actually changes
  useEffect(() => {
    if (data) {
      // Modules - always sync with server data
      if (data.modules && Array.isArray(data.modules)) {
        setLocalModules(data.modules);
      }

      // Admin permissions
      if (data.role_permissions?.administrator) {
        const adminPerms = {};
        data.role_permissions.administrator.permissions_by_group?.forEach((group) => {
          group.permissions.forEach((perm) => {
            adminPerms[perm.name] = perm.is_allowed;
          });
        });
        setLocalAdminPermissions(adminPerms);
      }

      // Caregiver permissions
      if (data.role_permissions?.caregiver) {
        const caregiverPerms = {};
        data.role_permissions.caregiver.permissions_by_group?.forEach((group) => {
          group.permissions.forEach((perm) => {
            caregiverPerms[perm.name] = perm.is_allowed;
          });
        });
        setLocalCaregiverPermissions(caregiverPerms);
      }

      // Nurse permissions
      if (data.role_permissions?.nurse) {
        const nursePerms = {};
        data.role_permissions.nurse.permissions_by_group?.forEach((group) => {
          group.permissions.forEach((perm) => {
            nursePerms[perm.name] = perm.is_allowed;
          });
        });
        setLocalNursePermissions(nursePerms);
      }
    }
  }, [data]);

  const handleModuleToggle = (moduleKey) => {
    setLocalModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handlePermissionToggle = (permissionName, role) => {
    if (role === 'administrator') {
      setLocalAdminPermissions((prev) => ({
        ...prev,
        [permissionName]: !prev[permissionName],
      }));
    } else if (role === 'caregiver') {
      setLocalCaregiverPermissions((prev) => ({
        ...prev,
        [permissionName]: !prev[permissionName],
      }));
    } else if (role === 'nurse') {
      setLocalNursePermissions((prev) => ({
        ...prev,
        [permissionName]: !prev[permissionName],
      }));
    }
  };

  const handleSaveModules = () => {
    const enabledModules = localModules.filter((m) => m.enabled).map((m) => m.key);
    updateModulesMutation.mutate(enabledModules);
  };

  const handleSaveRolePermissions = (role) => {
    let roleId;
    let permissions;
    
    if (role === 'administrator') {
      roleId = data.role_permissions.administrator.role.id;
      permissions = Object.keys(localAdminPermissions).filter((p) => localAdminPermissions[p]);
    } else if (role === 'caregiver') {
      roleId = data.role_permissions.caregiver.role.id;
      permissions = Object.keys(localCaregiverPermissions).filter((p) => localCaregiverPermissions[p]);
    } else if (role === 'nurse') {
      roleId = data.role_permissions.nurse.role.id;
      permissions = Object.keys(localNursePermissions).filter((p) => localNursePermissions[p]);
    }

    updateRolePermissionsMutation.mutate({ roleId, permissions });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load permissions. Please try again.</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  const filteredModules = localModules.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Permissions Management</h2>
              <p className="text-sm text-gray-600">{facilityName}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
          {/* Only show Module Access tab for super admins */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('modules')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'modules'
                  ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Module Access
            </button>
          )}
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === 'admin'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Admin Permissions
          </button>
          <button
            onClick={() => setActiveTab('caregiver')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === 'caregiver'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Caregiver Permissions
          </button>
          <button
            onClick={() => setActiveTab('nurse')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === 'nurse'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Nurse Permissions
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Only show modules tab for super admins */}
        {activeTab === 'modules' && isSuperAdmin && (
          <ModulesTab
            modules={filteredModules}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onToggle={handleModuleToggle}
            onSave={handleSaveModules}
            isSaving={updateModulesMutation.isPending}
          />
        )}
        
        {/* Redirect facility admins away from modules tab if they somehow access it */}
        {activeTab === 'modules' && !isSuperAdmin && (
          <div className="text-center py-12">
            <p className="text-gray-600">Module access is only available to super administrators.</p>
            <button
              onClick={() => setActiveTab('admin')}
              className="mt-4 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)]"
            >
              Go to Admin Permissions
            </button>
          </div>
        )}

        {activeTab === 'admin' && data?.role_permissions?.administrator && (
          <RolePermissionsTab
            roleData={data.role_permissions.administrator}
            localPermissions={localAdminPermissions}
            onToggle={(perm) => handlePermissionToggle(perm, 'administrator')}
            onSave={() => handleSaveRolePermissions('administrator')}
            isSaving={updateRolePermissionsMutation.isPending}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {activeTab === 'admin' && !data?.role_permissions?.administrator && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Administrator role not found. Please create the role first.</p>
            <button
              onClick={() => ensureRolesMutation.mutate()}
              disabled={ensureRolesMutation.isPending}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2 mx-auto transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              {ensureRolesMutation.isPending ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating roles...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Required Roles</span>
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'caregiver' && data?.role_permissions?.caregiver && (
          <RolePermissionsTab
            roleData={data.role_permissions.caregiver}
            localPermissions={localCaregiverPermissions}
            onToggle={(perm) => handlePermissionToggle(perm, 'caregiver')}
            onSave={() => handleSaveRolePermissions('caregiver')}
            isSaving={updateRolePermissionsMutation.isPending}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {activeTab === 'caregiver' && !data?.role_permissions?.caregiver && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Caregiver role not found. Please create the role first.</p>
            <button
              onClick={() => ensureRolesMutation.mutate()}
              disabled={ensureRolesMutation.isPending}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2 mx-auto transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              {ensureRolesMutation.isPending ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating roles...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Required Roles</span>
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'nurse' && data?.role_permissions?.nurse && (
          <RolePermissionsTab
            roleData={data.role_permissions.nurse}
            localPermissions={localNursePermissions}
            onToggle={(perm) => handlePermissionToggle(perm, 'nurse')}
            onSave={() => handleSaveRolePermissions('nurse')}
            isSaving={updateRolePermissionsMutation.isPending}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {activeTab === 'nurse' && !data?.role_permissions?.nurse && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nurse role not found. Please create the role first.</p>
            <button
              onClick={() => ensureRolesMutation.mutate()}
              disabled={ensureRolesMutation.isPending}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2 mx-auto transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              {ensureRolesMutation.isPending ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating roles...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Required Roles</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModulesTab({ modules, searchTerm, onSearchChange, onToggle, onSave, isSaving }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Access</h3>
          <p className="text-sm text-gray-600">
            Enable or disable modules for this facility. Users must have both role permissions and module access.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          style={{ color: '#FFFFFF' }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search modules..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <label
            key={module.key}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={module.enabled}
              onChange={() => onToggle(module.key)}
              className="w-5 h-5 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{module.name}</div>
            </div>
            {module.enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-300" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function RolePermissionsTab({ roleData, localPermissions, onToggle, onSave, isSaving, searchTerm, onSearchChange }) {
  const filteredGroups = roleData.permissions_by_group?.filter((group) => {
    if (!searchTerm) return true;
    return group.permissions.some((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {roleData.role.name.charAt(0).toUpperCase() + roleData.role.name.slice(1)} Permissions
          </h3>
          <p className="text-sm text-gray-600">
            Set facility-specific permissions for {roleData.role.name} role. These override global role permissions.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          style={{ color: '#FFFFFF' }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search permissions..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
        />
      </div>

      <div className="space-y-6">
        {filteredGroups?.map((group) => (
          <div key={group.group} className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">{group.group}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.permissions.map((permission) => {
                const isAllowed = localPermissions[permission.name] ?? false;
                const isOverride = permission.has_override;
                const isGlobal = permission.is_global;

                return (
                  <label
                    key={permission.id}
                    className={`flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                      isOverride ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-bg-light)]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onChange={() => onToggle(permission.name)}
                      className="mt-1 w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{permission.name}</span>
                        {isOverride && (
                          <span className="text-xs px-2 py-0.5 bg-[var(--theme-primary)] text-white rounded">
                            Override
                          </span>
                        )}
                        {!isGlobal && isAllowed && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            Added
                          </span>
                        )}
                      </div>
                      {permission.description && (
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

