import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Download, Upload, RefreshCw, HardDrive, Archive, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import logger from '../../utils/logger';
import { useToastContext } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';

export default function DatabaseSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();
  const [restoreConfirmFile, setRestoreConfirmFile] = useState(null);
  const [restoreConfirmFacilityId, setRestoreConfirmFacilityId] = useState(null);
  const [restoreDeleteConfirm, setRestoreDeleteConfirm] = useState('');
  const [restoreIsFullDatabase, setRestoreIsFullDatabase] = useState(false);
  const [backupFacilityId, setBackupFacilityId] = useState('');

  const { data: currentUser, isLoading: userLoading } = useQuery({
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
    return currentUser?.facility_id != null ? String(currentUser.facility_id) : '';
  }, [currentUser]);

  const { data: facilitiesPayload, isLoading: facilitiesLoading } = useQuery({
    queryKey: ['facilities', 'database-settings'],
    queryFn: async () => (await api.get('/facilities', { params: { per_page: 200 } })).data,
    enabled: !!currentUser,
  });

  const facilities = useMemo(() => {
    const raw = facilitiesPayload?.data ?? facilitiesPayload;
    return Array.isArray(raw) ? raw : [];
  }, [facilitiesPayload]);

  const facilityIdLabel = (id) => {
    if (id == null || id === '') return '';
    const f = facilities.find((x) => String(x.id) === String(id));
    return f?.name ? `${f.name} (#${id})` : `Facility #${id}`;
  };

  useEffect(() => {
    if (facilityId) {
      setBackupFacilityId(String(facilityId));
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) return;
    if (!facilities.length) return;
    setBackupFacilityId((prev) => {
      if (prev && facilities.some((f) => String(f.id) === prev)) return prev;
      return String(facilities[0].id);
    });
  }, [facilities, facilityId]);

  const settingsFacilityId = facilityId || backupFacilityId;

  const { data: settings, isLoading } = useQuery({
    enabled: !!settingsFacilityId,
    queryKey: ['facility-settings', settingsFacilityId, 'database'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${settingsFacilityId}/settings/database`);
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

      const response = await api.put(`/facilities/${settingsFacilityId}/settings/database`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Database settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', settingsFacilityId, 'database']);
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

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: async () => {
      const response = await api.get('/database/stats');
      return response.data?.data || {};
    },
  });

  const {
    data: backupPayload,
    isLoading: backupsLoading,
    isError: backupsQueryError,
    error: backupsQueryErr,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ['database-backups', backupFacilityId],
    queryFn: async () => {
      const response = await api.get('/database/backups', {
        params: {
          facility_id: backupFacilityId,
          include_full_database: true,
        },
      });
      return {
        list: response.data?.data ?? [],
        meta: response.data?.meta ?? {},
      };
    },
    enabled: !!backupFacilityId,
    retry: 1,
  });

  const backups = backupPayload?.list ?? [];
  const backupMeta = backupPayload?.meta ?? {};

  const createBackupMutation = useMutation({
    mutationFn: async ({ fullDatabase = false } = {}) => {
      if (fullDatabase) {
        return api.post('/database/backup', { full_database: true });
      }
      return api.post('/database/backup', { facility_id: Number(backupFacilityId) });
    },
    onSuccess: () => {
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

  const restoreBackupMutation = useMutation({
    mutationFn: async ({ filename, facilityId: fid, fullDatabase }) => {
      const body = fullDatabase
        ? { filename, full_database: true, confirmation: 'DELETE' }
        : { filename, facility_id: fid, confirmation: 'DELETE' };
      return api.post('/database/restore', body);
    },
    onSuccess: () => {
      toast.showToast('Backup restored successfully', 'success');
      refetchStats();
      refetchBackups();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to restore backup';
      const detail = error.response?.data?.detail;
      const text = detail ? `${message} ${detail}` : message;
      toast.showToast(text.length > 800 ? `${text.slice(0, 800)}…` : text, 'error');
    },
  });

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

  const openRestoreDialog = (filename, isFull, facilityIdForRestore = null) => {
    setRestoreConfirmFile(filename);
    setRestoreIsFullDatabase(!!isFull);
    setRestoreDeleteConfirm('');
    setRestoreConfirmFacilityId(
      facilityIdForRestore != null && facilityIdForRestore !== ''
        ? Number(facilityIdForRestore)
        : null
    );
  };

  const closeRestoreDialog = () => {
    if (!restoreBackupMutation.isPending) {
      setRestoreConfirmFile(null);
      setRestoreConfirmFacilityId(null);
      setRestoreDeleteConfirm('');
      setRestoreIsFullDatabase(false);
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreConfirmFile) return;
    if (restoreDeleteConfirm !== 'DELETE') {
      toast.showToast('Type DELETE to confirm', 'error');
      return;
    }
    const fid = restoreConfirmFacilityId ?? Number(backupFacilityId);
    restoreBackupMutation.mutate(
      {
        filename: restoreConfirmFile,
        facilityId: fid,
        fullDatabase: restoreIsFullDatabase,
      },
      { onSuccess: () => closeRestoreDialog() }
    );
  };

  const handleDownload = async (backup) => {
    const filename = backup.filename;
    const isFull = backup.type === 'full_mysqldump';
    if (backup.download_requires_full_database_config && !stats?.full_database_mysqldump_enabled) {
      toast.showToast(
        'Set ENABLE_FULL_DATABASE_MYSQLDUMP=true in .env to download whole-database (root) .sql files.',
        'error'
      );
      return;
    }
    try {
      const params = isFull
        ? { filename, full_database: true }
        : { filename, facility_id: backup.facility_id ?? backupFacilityId };
      const response = await api.get('/database/backup/download', {
        params,
        responseType: 'blob',
        timeout: 600000,
        headers: {
          Accept: 'application/octet-stream, application/sql, */*',
        },
      });
      const blob = response.data;
      if (!(blob instanceof Blob)) {
        throw new Error('Invalid response');
      }
      const contentType = (response.headers?.['content-type'] || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.message || 'Download failed');
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error('Unexpected response when downloading backup');
          }
          throw e;
        }
      }
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.showToast('Backup downloaded successfully', 'success');
    } catch (error) {
      let message = 'Failed to download backup';
      const data = error.response?.data;
      const status = error.response?.status;
      const parseJsonPayload = (json) => {
        if (json?.message && json.message !== 'An error occurred') {
          return json.message;
        }
        if (json?.errors && typeof json.errors === 'object') {
          const first = Object.values(json.errors).flat().find(Boolean);
          if (first) return Array.isArray(first) ? first[0] : String(first);
        }
        return json?.message || null;
      };
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          message = parseJsonPayload(json) || message;
        } catch {
          if (status === 401) {
            message = 'Unauthorized. Please log in again.';
          } else if (status === 403) {
            message = 'You do not have permission to download this backup.';
          } else if (status === 404) {
            message = 'Backup file not found.';
          } else if (status === 422) {
            message = 'Invalid download request (check facility and filename).';
          } else if (status === 500) {
            message =
              'Server error while preparing the file. Check logs or try again. If this is a full-database backup, confirm ENABLE_FULL_DATABASE_MYSQLDUMP is enabled.';
          }
        }
      } else if (error.response?.data?.message) {
        message = parseJsonPayload(error.response.data) || error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      toast.showToast(message, 'error');
      logger.error('Download error', {
        status: error.response?.status,
        message: error.message,
        filename,
      });
    }
  };

  const latestFacilityBackup = useMemo(() => {
    if (!backups?.length) return null;
    const forFacility = backups.filter(
      (b) => b.type === 'facility' && String(b.facility_id) === String(backupFacilityId)
    );
    if (!forFacility.length) return null;
    return forFacility.reduce((a, b) =>
      new Date(b.created_at) > new Date(a.created_at) ? b : a
    );
  }, [backups, backupFacilityId]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">You must be signed in to manage database settings.</p>
      </div>
    );
  }

  if (!facilityId && facilitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  if (!facilityId && !facilitiesLoading && facilities.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          No facilities found. Database settings and backups require at least one facility.
        </p>
      </div>
    );
  }

  if (!settingsFacilityId) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
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
      <ConfirmDialog
        isOpen={restoreConfirmFile != null}
        onClose={closeRestoreDialog}
        onConfirm={handleConfirmRestore}
        title={restoreIsFullDatabase ? 'Restore full database backup?' : 'Restore facility backup?'}
        description={
          restoreConfirmFile
            ? restoreIsFullDatabase
              ? `Restore from ${restoreConfirmFile}? This replaces the entire application database. This cannot be undone.`
              : `Restore from ${restoreConfirmFile} into ${facilityIdLabel(restoreConfirmFacilityId ?? backupFacilityId)}? All data for that tenant will be replaced with this backup. Other facilities are not affected.`
            : ''
        }
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="danger"
        isPending={restoreBackupMutation.isPending}
      >
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700" htmlFor="restore-delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="restore-delete-confirm"
            type="text"
            autoComplete="off"
            value={restoreDeleteConfirm}
            onChange={(e) => setRestoreDeleteConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
            placeholder="DELETE"
          />
        </div>
      </ConfirmDialog>
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
          <Database className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Database Settings</h1>
          <p className="text-sm text-gray-500">
            View connection information and tune performance-related options for this facility.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Facility backup scope</h2>
        <p className="text-sm text-gray-600">
          Backups include only rows for the selected facility (shared database; isolation is row-based). Restoring
          overwrites that facility&apos;s data only unless you use a full-database backup.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="backup-facility-select" className="text-sm font-medium text-gray-700 shrink-0">
            Facility for backup / restore
          </label>
          <select
            id="backup-facility-select"
            value={backupFacilityId}
            onChange={(e) => setBackupFacilityId(e.target.value)}
            disabled={backupsLoading}
            className="max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            {facilities.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.name || `Facility ${f.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Management Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : stats?.database_size || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Current database size</div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Archive className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {backupsLoading
                ? '...'
                : backupMeta.files_for_selected_facility ?? backups.filter((b) => b.type === 'facility').length}
            </div>
            <div className="text-sm text-gray-500">Files in this facility&apos;s folder</div>
            <div className="text-xs text-gray-400 mt-1">
              All .sql on server: {statsLoading ? '…' : stats?.total_backups ?? 0}
              {backupMeta.legacy_root_files_total > 0 ? ` (${backupMeta.legacy_root_files_total} whole-DB in backups/)` : ''}
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : stats?.storage_used || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Total storage usage</div>
          </div>
        </div>
      </div>

      {/* Facility backup files — always visible so operators know where to download */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Facility backup files</h2>
            <p className="text-sm text-gray-600 mt-1">
              Shows <span className="font-medium">all</span> per-facility SQL files on the server (every folder under{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">backup/facilities/</code>), plus legacy whole-database{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">backup_*.sql</code> files in the backups root. The
              dropdown above chooses the default target for <span className="font-medium">Backup now</span>; each row
              shows which facility it belongs to.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetchBackups()}
            disabled={backupsLoading || !backupFacilityId}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${backupsLoading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            Refresh list
          </button>
        </div>
        {backupsLoading ? (
          <p className="text-sm text-gray-500">Loading backups…</p>
        ) : backupsQueryError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Could not load backup list</p>
            <p className="mt-1 text-red-800">
              {backupsQueryErr?.response?.data?.message ||
                backupsQueryErr?.message ||
                'Request failed. If you can see backup counts above but not this list, ensure your account can access the database API (super admin or administrator).'}
            </p>
            <button
              type="button"
              onClick={() => refetchBackups()}
              className="mt-3 text-sm font-semibold text-red-900 underline"
            >
              Try again
            </button>
          </div>
        ) : !backupFacilityId ? (
          <p className="text-sm text-gray-500">Select a facility to list backup files.</p>
        ) : !backups?.length ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center space-y-2">
            <p className="text-sm text-gray-700 font-medium">No backup files to show for this selection</p>
            <p className="text-sm text-gray-500">
              Use <span className="font-medium">Backup now</span> below, or wait for the scheduled run. Per-facility files
              live under{' '}
              <code className="text-xs bg-white px-1 py-0.5 rounded border">
                storage/app/backups/facilities/[facility_id]/
              </code>{' '}
              on the server.
            </p>
            {backupMeta.facility_scoped_files_total > 0 && backupMeta.files_for_selected_facility === 0 && (
              <p className="text-sm text-amber-900 text-left max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This facility&apos;s folder is empty, but the server has{' '}
                <span className="font-semibold">{backupMeta.facility_scoped_files_total}</span> facility backup file(s)
                under other facilities. Change <span className="font-medium">Facility for backup / restore</span> above
                to a facility that has backups
                {Object.keys(backupMeta.facility_ids_with_backups || {}).length > 0 && (
                  <>
                    {' '}
                    (facility IDs with files:{' '}
                    {Object.keys(backupMeta.facility_ids_with_backups).join(', ')}).
                  </>
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {backups.slice(0, 100).map((backup) => (
              <div
                key={`${backup.type}-${backup.facility_id ?? 'root'}-${backup.filename}`}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                  backup.matches_selected_facility ? 'border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/5' : 'border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{backup.filename}</span>
                    {backup.type === 'facility' && backup.facility_id != null && (
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          backup.matches_selected_facility
                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-gray-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {facilityIdLabel(backup.facility_id)}
                      </span>
                    )}
                    {backup.type === 'full_mysqldump' ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900">
                        Full DB
                      </span>
                    ) : backup.is_automatic ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                        Auto
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                        Manual
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()} • {backup.size}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip
                    content={
                      backup.download_requires_full_database_config && !stats?.full_database_mysqldump_enabled
                        ? 'Enable ENABLE_FULL_DATABASE_MYSQLDUMP in .env to download whole-database dumps'
                        : 'Download backup'
                    }
                    position="top"
                  >
                    <button
                      type="button"
                      onClick={() => handleDownload(backup)}
                      disabled={
                        backup.download_requires_full_database_config &&
                        !stats?.full_database_mysqldump_enabled
                      }
                      className="px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                      aria-label="Download backup"
                    >
                      <Download className="w-4 h-4" strokeWidth={2.5} />
                      Download
                    </button>
                  </Tooltip>
                  <Tooltip
                    content={
                      backup.type === 'full_mysqldump'
                        ? 'Restores entire database (all tenants)'
                        : 'Replaces this facility’s data only'
                    }
                    position="top"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openRestoreDialog(
                          backup.filename,
                          backup.type === 'full_mysqldump',
                          backup.type === 'facility' ? backup.facility_id : null
                        )
                      }
                      disabled={restoreBackupMutation.isPending}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium text-red-800 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      aria-label={`Restore backup ${backup.filename}`}
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                      Restore
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Download className="w-5 h-5 text-[var(--theme-primary)]" strokeWidth={2.5} />
              <h3 className="font-semibold text-gray-900">Facility backup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Export SQL for the selected facility only</p>
            <button
              type="button"
              onClick={() => createBackupMutation.mutate({ fullDatabase: false })}
              disabled={createBackupMutation.isPending || !backupFacilityId}
              className="w-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {createBackupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" strokeWidth={2.5} />
                  <span>Backup now</span>
                </>
              )}
            </button>
          </div>

          {stats?.full_database_mysqldump_enabled ? (
            <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Download className="w-5 h-5 text-amber-800" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900">Full database (hosting)</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Entire MySQL schema — use for server-level recovery, not tenant-only.</p>
              <button
                type="button"
                onClick={() => createBackupMutation.mutate({ fullDatabase: true })}
                disabled={createBackupMutation.isPending}
                className="w-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
              >
                {createBackupMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" strokeWidth={2.5} />
                    <span>Full mysqldump</span>
                  </>
                )}
              </button>
            </div>
          ) : null}

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Upload className="w-5 h-5 text-[var(--theme-primary)]" strokeWidth={2.5} />
              <h3 className="font-semibold text-gray-900">Restore latest facility backup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Uses the newest facility-scoped file for this selection</p>
            <button
              type="button"
              onClick={() => {
                if (latestFacilityBackup) {
                  openRestoreDialog(
                    latestFacilityBackup.filename,
                    false,
                    latestFacilityBackup.facility_id
                  );
                } else {
                  toast.showToast('No facility backups for this facility yet', 'error');
                }
              }}
              disabled={restoreBackupMutation.isPending || !latestFacilityBackup}
              className="w-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" strokeWidth={2.5} />
                  <span>Restore</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <RefreshCw className="w-5 h-5 text-[var(--theme-primary)]" strokeWidth={2.5} />
              <h3 className="font-semibold text-gray-900">Refresh Data</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Refresh cache and optimize data</p>
            <button
              type="button"
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              className="w-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {refreshDataMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
            className="inline-flex items-center justify-center px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
