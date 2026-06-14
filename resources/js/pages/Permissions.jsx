import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import logger from '../utils/logger';
import { Building2, Shield, Search, Settings, CheckCircle, XCircle } from 'lucide-react';
import FacilityPermissions from './FacilityPermissions';

export default function Permissions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Check if user is super admin
  const { data: currentUser, isLoading: userLoading } = useQuery({
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

  // Fetch facilities (only for super admin)
  const { data, isLoading } = useQuery({
    queryKey: ['facilities', search],
    queryFn: async () => {
      const res = await api.get('/facilities', { params: { search, per_page: 50 } });
      return res.data;
    },
    enabled: !userLoading && isSuperAdmin, // Only fetch for super admin
  });

  // Redirect users who don't have access
  React.useEffect(() => {
    if (!userLoading && currentUser && !isSuperAdmin && !isFacilityAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isSuperAdmin, isFacilityAdmin, userLoading, navigate]);

  // If facility admin, automatically show their facility's permissions using useQuery
  const { data: facilityData, isLoading: facilityLoading, error: facilityError } = useQuery({
    queryKey: ['facility', currentUser?.facility_id],
    queryFn: async () => {
      try {
        const res = await api.get(`/facilities/${currentUser.facility_id}`);
        // Handle different response structures
        if (res.data?.data) {
          return res.data.data;
        } else if (res.data) {
          return res.data;
        }
        return res;
      } catch (error) {
        logger.error('Error fetching facility:', error);
        throw error;
      }
    },
    enabled: !userLoading && isFacilityAdmin && !isSuperAdmin && !!currentUser?.facility_id,
    retry: 1,
  });

  // Set selected facility when data is loaded
  React.useEffect(() => {
    if (facilityData && !selectedFacility) {
      setSelectedFacility(facilityData);
    }
  }, [facilityData, selectedFacility]);

  // All hooks must be called before any conditional returns
  if (userLoading || (isSuperAdmin && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !isFacilityAdmin) {
    return null;
  }

  // If a facility is selected, show the permissions management page
  if (selectedFacility) {
    return (
      <FacilityPermissions
        facilityId={selectedFacility.id}
        facilityName={selectedFacility.name}
        onBack={isSuperAdmin ? () => setSelectedFacility(null) : null}
      />
    );
  }

  // Facility admin should not see the facility list, they'll be redirected to their facility
  if (isFacilityAdmin && !isSuperAdmin) {
    if (facilityLoading || !selectedFacility) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
            <p className="mt-4 text-gray-600">Loading permissions...</p>
          </div>
        </div>
      );
    }
    
    if (facilityError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white rounded-lg shadow p-6 max-w-md">
            <p className="text-red-600 mb-4">
              {facilityError?.response?.data?.message || facilityError?.message || 'Failed to load facility'}
            </p>
            <button
              onClick={() => {
                queryClient.invalidateQueries(['facility', currentUser?.facility_id]);
                setSelectedFacility(null);
              }}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)]"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-[var(--theme-primary)]" />
              Permissions Management
            </h2>
            <p className="text-gray-600">Manage module access and role permissions for each facility.</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading facilities...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.length ? (
            data.data.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onPermissionsClick={() => setSelectedFacility(facility)}
              />
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No facilities found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FacilityCard({ facility, onPermissionsClick }) {
  const { data: permissionsData } = useQuery({
    queryKey: ['facility-permissions-summary', facility.id],
    queryFn: async () => {
      try {
        const res = await api.get(`/facilities/${facility.id}/permissions`);
        return res.data.data;
      } catch (err) {
        // Silently fail for summary - we'll load full data when clicked
        logger.warn('Could not load permissions summary for facility:', facility.id);
        return null;
      }
    },
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const enabledModulesCount = permissionsData?.modules?.filter(m => m.enabled).length || 0;
  const totalModules = permissionsData?.modules?.length || 15; // Default to 15 modules if not loaded

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {facility.logo_url ? (
                <img src={facility.logo_url} alt={facility.name} className="w-10 h-10 object-contain rounded" />
              ) : (
                <Building2 className="w-5 h-5 text-[var(--theme-primary)]" />
              )}
              <h3 className="text-lg font-bold text-gray-900">{facility.name}</h3>
            </div>
            {facility.location && (
              <p className="text-sm text-gray-500">{facility.location}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {facility.is_active ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Modules Enabled</span>
            <span className="font-semibold text-gray-900">
              {enabledModulesCount} / {totalModules}
            </span>
          </div>
          {permissionsData?.role_permissions && (
            <div className="text-xs text-gray-500">
              {Object.keys(permissionsData.role_permissions).length} role(s) configured
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={onPermissionsClick}
          className="w-full mt-4 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
        >
          <Settings className="w-4 h-4" />
          <span>Manage Permissions</span>
        </button>
      </div>
    </div>
  );
}

