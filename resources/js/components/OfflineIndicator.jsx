import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { isOnline } from '../services/offlineApi';
import { getQueueStats } from '../services/indexedDB';
import logger from '../utils/logger';

/**
 * Offline Status Indicator Component
 * Shows online/offline status and sync queue information
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [queueStats, setQueueStats] = useState({
    medications: 0,
    vitals: 0,
    incidents: 0,
    total: 0,
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setOnline(true);
      // Trigger sync when coming back online
      if (queueStats.total > 0) {
        triggerSync();
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // Listen for queue updates
    const handleQueueUpdate = async () => {
      await updateQueueStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    // Initial queue stats
    updateQueueStats();

    // Update queue stats periodically
    const interval = setInterval(updateQueueStats, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
      clearInterval(interval);
    };
  }, [queueStats.total]);

  const updateQueueStats = async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (error) {
      logger.error('[OfflineIndicator] Failed to get queue stats:', error);
    }
  };

  const triggerSync = async () => {
    if (syncing || !online) return;

    setSyncing(true);
    try {
      // Dispatch sync event
      window.dispatchEvent(new CustomEvent('manual-sync-request'));
      
      // Wait a bit for sync to process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Update stats
      await updateQueueStats();
      setLastSync(new Date());
    } catch (error) {
      logger.error('[OfflineIndicator] Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Don't show if online and no queued items
  if (online && queueStats.total === 0 && !syncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`bg-white rounded-lg shadow-lg border-2 p-3 min-w-[200px] ${
          online ? 'border-green-500' : 'border-red-500'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {online ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-semibold">
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        {queueStats.total > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            <div className="flex items-center justify-between">
              <span>Queued items:</span>
              <span className="font-semibold">{queueStats.total}</span>
            </div>
            {queueStats.medications > 0 && (
              <div className="mt-1">Medications: {queueStats.medications}</div>
            )}
            {queueStats.vitals > 0 && (
              <div className="mt-1">Vitals: {queueStats.vitals}</div>
            )}
            {queueStats.incidents > 0 && (
              <div className="mt-1">Incidents: {queueStats.incidents}</div>
            )}
          </div>
        )}

        {online && queueStats.total > 0 && (
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        )}

        {lastSync && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Synced {formatTime(lastSync)}
          </div>
        )}
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
