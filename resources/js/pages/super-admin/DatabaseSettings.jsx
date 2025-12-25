import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Download, Upload, RefreshCw, HardDrive, Archive } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function DatabaseSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/me');
      return response.data?.data || response.data;
    },
  });

  const facilityId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('super_admin_selected_facility_id');
      if (stored) return stored;
    }
    return currentUser?.facility_id;
  }, [currentUser]);

  const { data: settings, isLoading } = useQuery({
    enabled: !!facilityId,
    queryKey: ['facility-settings', facilityId, 'database'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/database`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      read_replica_enabled: !!settings?.read_replica_enabled?.value,
      query_logging_enabled: !!settings?.query_logging_enabled?.value,
      slow_query_threshold_ms: settings?.slow_query_threshold_ms?.value ?? 500,
    }),
    [settings]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          read_replica_enabled: { value: values.read_replica_enabled, type: 'boolean' },
          query_logging_enabled: { value: values.query_logging_enabled, type: 'boolean' },
          slow_query_threshold_ms: { value: values.slow_query_threshold_ms, type: 'integer' },
        },
      };

      const response = await api.put(`/facilities/${facilityId}/settings/database`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Database settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'database']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update database settings',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      read_replica_enabled: !!formData.get('read_replica_enabled'),
      query_logging_enabled: !!formData.get('query_logging_enabled'),
      slow_query_threshold_ms: parseInt(formData.get('slow_query_threshold_ms') || '0', 10),
    };
    saveMutation.mutate(values);
  };

  // Fetch database statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: async () => {
      const response = await api.get('/database/stats');
      return response.data?.data || {};
    },
  });

  // Fetch recent backups
  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['database-backups'],
    queryFn: async () => {
      const response = await api.get('/database/backups');
      return response.data?.data || [];
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/database/backup');
      return response.data;
    },
    onSuccess: (data) => {
      toast.showToast('Backup created successfully', 'success');
      refetchStats();
      refetchBackups();
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to create backup',
        'error'
      );
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (filename) => {
      const response = await api.post('/database/restore', { filename });
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Backup restored successfully', 'success');
      refetchStats();
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to restore backup',
        'error'
      );
    },
  });

  // Refresh data mutation
  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/database/refresh');
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Data refreshed and cache cleared successfully', 'success');
      refetchStats();
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to refresh data',
        'error'
      );
    },
  });

  const handleRestore = (filename) => {
    if (window.confirm(`Are you sure you want to restore from ${filename}? This will overwrite the current database.`)) {
      restoreBackupMutation.mutate(filename);
    }
  };

  const handleDownload = (filename) => {
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    const baseURL = api.defaults.baseURL || '/api/v1';
    
    // Create download URL
    const downloadUrl = `${baseURL}/database/backup/${encodeURIComponent(filename)}`;
    
    // Use fetch to download with authentication
    fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/sql',
      },
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          }
          throw new Error('Failed to download backup');
        }
        return response.blob();
      })
      .then((blob) => {
        // Create a temporary link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.showToast('Backup downloaded successfully', 'success');
      })
      .catch((error) => {
        toast.showToast(error.message || 'Failed to download backup', 'error');
        console.error('Download error:', error);
      });
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          Database settings are available once a facility is associated with your account.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Database Settings</h1>
          <p className="text-sm text-gray-500">
            View connection information and tune performance-related options for this facility.
          </p>
        </div>
      </div>

      {/* Data Management Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : (stats?.database_size || 'N/A')}
            </div>
            <div className="text-sm text-gray-500">Current database size</div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Archive className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : (stats?.total_backups || 0)}
            </div>
            <div className="text-sm text-gray-500">Available backups</div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : (stats?.storage_used || 'N/A')}
            </div>
            <div className="text-sm text-gray-500">Total storage usage</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Download className="w-5 h-5 text-[var(--theme-primary)]" />
              <h3 className="font-semibold text-gray-900">Create Backup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Create a new database backup</p>
            <button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="w-full px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {createBackupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Backup Now</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Upload className="w-5 h-5 text-[var(--theme-primary)]" />
              <h3 className="font-semibold text-gray-900">Restore Backup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Restore from an existing backup</p>
            <button
              onClick={() => {
                if (backups && backups.length > 0) {
                  const latest = backups[0];
                  handleRestore(latest.filename);
                } else {
                  toast.showToast('No backups available', 'error');
                }
              }}
              disabled={restoreBackupMutation.isPending || !backups || backups.length === 0}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Restore</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <RefreshCw className="w-5 h-5 text-[var(--theme-primary)]" />
              <h3 className="font-semibold text-gray-900">Refresh Data</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Refresh cache and optimize data</p>
            <button
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {refreshDataMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Backups */}
      {backups && backups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Backups</h2>
          <div className="space-y-2">
            {backups.slice(0, 5).map((backup, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{backup.filename}</div>                                                                            
                  <div className="text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()} • {backup.size}                                                                              
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(backup.filename)}
                    className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                    title="Download backup"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleRestore(backup.filename)}
                    disabled={restoreBackupMutation.isPending}
                    className="px-3 py-1.5 text-sm text-[var(--theme-primary)] border border-[var(--theme-primary)] rounded-lg hover:bg-[var(--theme-primary)]/10 disabled:opacity-50"                                                            
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Performance</h2>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="read_replica_enabled"
                defaultChecked={defaultValues.read_replica_enabled}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Use read replica for heavy reporting workloads</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="query_logging_enabled"
                defaultChecked={defaultValues.query_logging_enabled}
                className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Enable slow query logging</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slow Query Threshold (ms)
            </label>
            <input
              type="number"
              name="slow_query_threshold_ms"
              defaultValue={defaultValues.slow_query_threshold_ms}
              min={0}
              max={60000}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
            <p className="mt-1 text-xs text-gray-400">
              Queries longer than this will be recorded for performance analysis.
            </p>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}


