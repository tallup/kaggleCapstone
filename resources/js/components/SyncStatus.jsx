import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { getQueueStats } from '../services/indexedDB';
import { syncAll } from '../services/backgroundSync';
import { isOnline } from '../services/offlineApi';
import logger from '../utils/logger';

/**
 * Enhanced Sync Status Component
 * Shows sync progress, queued items, and manual sync controls
 */
export default function SyncStatus({ onClose }) {
  const [queueStats, setQueueStats] = useState({
    medications: 0,
    vitals: 0,
    incidents: 0,
    total: 0,
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [errors, setErrors] = useState([]);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    updateQueueStats();

    const interval = setInterval(updateQueueStats, 2000);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleQueueUpdate = updateQueueStats;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
    };
  }, []);

  const updateQueueStats = async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (error) {
      logger.error('[SyncStatus] Failed to get queue stats:', error);
    }
  };

  const handleSync = async () => {
    if (syncing || !online) return;

    setSyncing(true);
    setSyncProgress(null);
    setErrors([]);

    try {
      const result = await syncAll();

      if (result.success) {
        setLastSync(new Date());
        await updateQueueStats();
      } else {
        setErrors([result.error || 'Sync failed']);
      }

      setSyncProgress({
        synced: result.synced || 0,
        errors: result.errors || 0,
      });
    } catch (error) {
      setErrors([error.message || 'Sync failed']);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(null), 5000);
    }
  };

  if (queueStats.total === 0 && !syncing && !lastSync) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Sync Status</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!online && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Offline - Sync will resume when online
          </div>
        )}

        {queueStats.total > 0 && (
          <div className="mb-3 space-y-1">
            <div className="text-xs text-gray-600">
              <strong>Queued Items:</strong> {queueStats.total}
            </div>
            {queueStats.medications > 0 && (
              <div className="text-xs text-gray-500 ml-2">
                • Medications: {queueStats.medications}
              </div>
            )}
            {queueStats.vitals > 0 && (
              <div className="text-xs text-gray-500 ml-2">
                • Vitals: {queueStats.vitals}
              </div>
            )}
            {queueStats.incidents > 0 && (
              <div className="text-xs text-gray-500 ml-2">
                • Incidents: {queueStats.incidents}
              </div>
            )}
          </div>
        )}

        {syncProgress && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />
            Synced {syncProgress.synced} item(s)
            {syncProgress.errors > 0 && (
              <span className="text-red-600 ml-2">
                {syncProgress.errors} error(s)
              </span>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            {errors.map((error, i) => (
              <div key={i}>
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {error}
              </div>
            ))}
          </div>
        )}

        {lastSync && (
          <div className="mb-3 text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last sync: {formatTime(lastSync)}
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncing || !online}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Sync Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes < 1) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}
