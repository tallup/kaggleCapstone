/**
 * Offline API Interceptor
 * Extends the API service to handle offline scenarios
 */

import api from './api';
import { addToQueue, getQueue, removeFromQueue, updateQueueItem, STORES } from './indexedDB';
import logger from '../utils/logger';

/**
 * Check if device is online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Add sync queue item
 */
async function addToSyncQueue(type, method, endpoint, data, originalId = null) {
  try {
    await addToQueue(STORES.SYNC_QUEUE, {
      type,
      method,
      endpoint,
      data,
      originalId, // Store original IndexedDB ID if exists
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    });
  } catch (error) {
    logger.error('[OfflineAPI] Failed to add to sync queue:', error);
  }
}

/**
 * Handle offline POST request
 */
export async function offlinePost(endpoint, data, queueStore = null) {
  if (isOnline()) {
    // Try online first
    try {
      const response = await api.post(endpoint, data);
      return { success: true, data: response.data, online: true };
    } catch (error) {
      // Network error, fall back to offline
      if (!error.response && error.message.includes('Network')) {
        logger.debug('[OfflineAPI] Network error, saving offline');
        return await saveOffline(endpoint, 'POST', data, queueStore);
      }
      throw error;
    }
  } else {
    // Offline, save to queue
    return await saveOffline(endpoint, 'POST', data, queueStore);
  }
}

/**
 * Handle offline PUT request
 */
export async function offlinePut(endpoint, data, queueStore = null) {
  if (isOnline()) {
    try {
      const response = await api.put(endpoint, data);
      return { success: true, data: response.data, online: true };
    } catch (error) {
      if (!error.response && error.message.includes('Network')) {
        logger.debug('[OfflineAPI] Network error, saving offline');
        return await saveOffline(endpoint, 'PUT', data, queueStore);
      }
      throw error;
    }
  } else {
    return await saveOffline(endpoint, 'PUT', data, queueStore);
  }
}

/**
 * Handle offline DELETE request
 */
export async function offlineDelete(endpoint, queueStore = null) {
  if (isOnline()) {
    try {
      const response = await api.delete(endpoint);
      return { success: true, data: response.data, online: true };
    } catch (error) {
      if (!error.response && error.message.includes('Network')) {
        logger.debug('[OfflineAPI] Network error, saving offline');
        return await saveOffline(endpoint, 'DELETE', null, queueStore);
      }
      throw error;
    }
  } else {
    return await saveOffline(endpoint, 'DELETE', null, queueStore);
  }
}

/**
 * Save request to offline queue
 */
async function saveOffline(endpoint, method, data, queueStore) {
  try {
    // Determine store based on endpoint or provided store
    let store = queueStore;
    let type = 'unknown';

    if (!store) {
      if (endpoint.includes('medication-administrations')) {
        store = STORES.MEDICATION_ADMINISTRATIONS;
        type = 'medication';
      } else if (endpoint.includes('vitals')) {
        store = STORES.VITALS;
        type = 'vital';
      } else if (endpoint.includes('incidents')) {
        store = STORES.INCIDENTS;
        type = 'incident';
      } else {
        store = STORES.SYNC_QUEUE;
      }
    }

    // Add to specific store
    const id = await addToQueue(store, {
      type,
      method,
      endpoint,
      data,
      timestamp: Date.now(),
      status: 'pending',
    });

    // Also add to sync queue for background sync
    await addToSyncQueue(type, method, endpoint, data, id);

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('offline-queue-updated', {
      detail: { store, type, count: 1 },
    }));

    return {
      success: true,
      data: { id, message: 'Saved offline', offline: true },
      online: false,
      offlineId: id,
    };
  } catch (error) {
    logger.error('[OfflineAPI] Failed to save offline:', error);
    return {
      success: false,
      error: error.message,
      online: false,
    };
  }
}

/**
 * Get offline queue for a specific store
 */
export async function getOfflineQueue(storeName) {
  return await getQueue(storeName, { status: 'pending' });
}

/**
 * Clear offline queue after successful sync
 */
export async function clearOfflineQueue(storeName, itemId) {
  try {
    await removeFromQueue(storeName, itemId);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('offline-queue-updated', {
      detail: { store: storeName, type: 'cleared', count: -1 },
    }));
  } catch (error) {
    logger.error('[OfflineAPI] Failed to clear queue item:', error);
  }
}

/**
 * Mark queue item as syncing
 */
export async function markQueueItemSyncing(storeName, itemId) {
  try {
    await updateQueueItem(storeName, itemId, { status: 'syncing' });
  } catch (error) {
    logger.error('[OfflineAPI] Failed to mark item as syncing:', error);
  }
}

/**
 * Mark queue item as synced
 */
export async function markQueueItemSynced(storeName, itemId) {
  try {
    await updateQueueItem(storeName, itemId, { status: 'synced' });
    // Remove after a delay to allow UI to update
    setTimeout(() => {
      removeFromQueue(storeName, itemId);
    }, 1000);
  } catch (error) {
    logger.error('[OfflineAPI] Failed to mark item as synced:', error);
  }
}

/**
 * Mark queue item as error
 */
export async function markQueueItemError(storeName, itemId, errorMessage) {
  try {
    const item = await updateQueueItem(storeName, itemId, {
      status: 'error',
      error: errorMessage,
      retries: (await getQueue(storeName)).find((i) => i.id === itemId)?.retries || 0 + 1,
    });
    return item;
  } catch (error) {
    logger.error('[OfflineAPI] Failed to mark item as error:', error);
  }
}

// Export the original api instance for GET requests
export { api };
