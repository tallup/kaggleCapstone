/**
 * Background Sync Service
 * Handles synchronization of offline data when connection is restored
 */

import { isOnline } from './offlineApi';
import {
  getQueue,
  updateQueueItem,
  removeFromQueue,
  STORES,
} from './indexedDB';
import api from './api';
import logger from '../utils/logger';

/** @type {Promise<{ success: boolean; synced?: number; errors?: number; details?: unknown; error?: string }> | null} */
let syncInFlight = null;

/**
 * Sync all pending items
 */
export async function syncAll() {
  if (!isOnline()) {
    logger.debug('[BackgroundSync] Offline, skipping sync');
    return { success: false, error: 'Offline' };
  }

  if (syncInFlight) {
    logger.debug('[BackgroundSync] Sync already in progress, reusing');
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const results = {
        medications: await syncQueue(STORES.MEDICATION_ADMINISTRATIONS, 'medication'),
        vitals: await syncQueue(STORES.VITALS, 'vital'),
        incidents: await syncQueue(STORES.INCIDENTS, 'incident'),
        syncQueue: await syncSyncQueue(),
      };

      const totalSynced =
        results.medications.synced +
        results.vitals.synced +
        results.incidents.synced +
        results.syncQueue.synced;

      const totalErrors =
        results.medications.errors +
        results.vitals.errors +
        results.incidents.errors +
        results.syncQueue.errors;

      return {
        success: totalErrors === 0,
        synced: totalSynced,
        errors: totalErrors,
        details: results,
      };
    } catch (error) {
      logger.error('[BackgroundSync] Sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/**
 * Sync a specific queue
 */
async function syncQueue(storeName, type) {
  const pending = await getQueue(storeName, { status: 'pending' });
  let synced = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      // Mark as syncing
      await updateQueueItem(storeName, item.id, { status: 'syncing' });

      // Perform the API request
      let response;
      switch (item.method) {
        case 'POST':
          response = await api.post(item.endpoint, item.data);
          break;
        case 'PUT':
          response = await api.put(item.endpoint, item.data);
          break;
        case 'DELETE':
          response = await api.delete(item.endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${item.method}`);
      }

      // Mark as synced and remove
      await updateQueueItem(storeName, item.id, { status: 'synced' });
      await removeFromQueue(storeName, item.id);

      // Also remove from sync queue if exists
      if (item.originalId) {
        const syncItems = await getQueue(STORES.SYNC_QUEUE, {
          type: type,
          status: 'pending',
        });
        const syncItem = syncItems.find((si) => si.originalId === item.id);
        if (syncItem) {
          await removeFromQueue(STORES.SYNC_QUEUE, syncItem.id);
        }
      }

      synced++;
      logger.debug(`[BackgroundSync] Synced ${type} item:`, item.id);
    } catch (error) {
      logger.error(`[BackgroundSync] Failed to sync ${type} item:`, error);

      // Increment retries
      const retries = (item.retries || 0) + 1;
      await updateQueueItem(storeName, item.id, {
        status: 'error',
        error: error.message,
        retries,
      });

      // If retries exceed limit, mark as failed permanently
      if (retries >= 5) {
        await updateQueueItem(storeName, item.id, {
          status: 'failed',
        });
      }

      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Sync the main sync queue
 */
async function syncSyncQueue() {
  const pending = await getQueue(STORES.SYNC_QUEUE, { status: 'pending' });
  let synced = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      await updateQueueItem(STORES.SYNC_QUEUE, item.id, { status: 'syncing' });

      let response;
      switch (item.method) {
        case 'POST':
          response = await api.post(item.endpoint, item.data);
          break;
        case 'PUT':
          response = await api.put(item.endpoint, item.data);
          break;
        case 'DELETE':
          response = await api.delete(item.endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${item.method}`);
      }

      await updateQueueItem(STORES.SYNC_QUEUE, item.id, { status: 'synced' });
      await removeFromQueue(STORES.SYNC_QUEUE, item.id);

      synced++;
    } catch (error) {
      logger.error('[BackgroundSync] Failed to sync queue item:', error);

      const retries = (item.retries || 0) + 1;
      await updateQueueItem(STORES.SYNC_QUEUE, item.id, {
        status: 'error',
        error: error.message,
        retries,
      });

      if (retries >= 5) {
        await updateQueueItem(STORES.SYNC_QUEUE, item.id, {
          status: 'failed',
        });
      }

      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Register background sync events
 */
export async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    logger.debug('[BackgroundSync] Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Register sync tags
    await registration.sync.register('sync-medications');
    await registration.sync.register('sync-vitals');
    await registration.sync.register('sync-incidents');

    logger.debug('[BackgroundSync] Background sync registered');
  } catch (error) {
    logger.error('[BackgroundSync] Failed to register background sync:', error);
  }
}

/**
 * Listen for online event and trigger sync
 */
export function setupOnlineSync() {
  window.addEventListener('online', async () => {
    logger.debug('[BackgroundSync] Online, triggering sync');
    await syncAll();
  });

  // Also listen for manual sync requests
  window.addEventListener('manual-sync-request', async () => {
    logger.debug('[BackgroundSync] Manual sync requested');
    await syncAll();
  });

  // Periodic sync when online (every 5 minutes)
  setInterval(async () => {
    if (isOnline()) {
      await syncAll();
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Listen for service worker sync requests
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'SYNC_REQUEST') {
        logger.debug('[BackgroundSync] Sync requested by service worker:', event.data.tag);
        await syncAll();
      }
    });
  }
  
  setupOnlineSync();
}
