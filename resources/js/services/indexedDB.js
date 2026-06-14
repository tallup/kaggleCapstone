/**
 * IndexedDB Wrapper for HomeLogic360 PWA
 * Manages offline data storage and sync queue
 */

import { openDB as idbOpenDB } from 'idb';
import logger from '../utils/logger';

const DB_NAME = 'HomeLogic360DB';
const DB_VERSION = 1;

// Object store names
const STORES = {
  MEDICATION_ADMINISTRATIONS: 'medicationAdministrations',
  VITALS: 'vitals',
  INCIDENTS: 'incidents',
  SYNC_QUEUE: 'syncQueue',
  CACHE: 'cache',
};

let dbInstance = null;

/**
 * Open/create the IndexedDB database
 */
export async function openDB() {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await idbOpenDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Medication administrations store
        if (!db.objectStoreNames.contains(STORES.MEDICATION_ADMINISTRATIONS)) {
          const medicationStore = db.createObjectStore(STORES.MEDICATION_ADMINISTRATIONS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          medicationStore.createIndex('timestamp', 'timestamp', { unique: false });
          medicationStore.createIndex('status', 'status', { unique: false });
        }

        // Vitals store
        if (!db.objectStoreNames.contains(STORES.VITALS)) {
          const vitalsStore = db.createObjectStore(STORES.VITALS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          vitalsStore.createIndex('timestamp', 'timestamp', { unique: false });
          vitalsStore.createIndex('resident_id', 'resident_id', { unique: false });
        }

        // Incidents store
        if (!db.objectStoreNames.contains(STORES.INCIDENTS)) {
          const incidentsStore = db.createObjectStore(STORES.INCIDENTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          incidentsStore.createIndex('timestamp', 'timestamp', { unique: false });
          incidentsStore.createIndex('status', 'status', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Cache store for API responses
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, {
            keyPath: 'key',
          });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      },
    });

    logger.debug('[IndexedDB] Database opened:', DB_NAME);
    return dbInstance;
  } catch (error) {
    logger.error('[IndexedDB] Failed to open database:', error);
    throw error;
  }
}

/**
 * Add item to offline queue
 */
export async function addToQueue(storeName, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const item = {
      ...data,
      timestamp: data.timestamp || Date.now(),
      status: 'pending',
      retries: 0,
    };

    const id = await store.add(item);
    await tx.done;

    logger.debug(`[IndexedDB] Added to ${storeName}:`, id);
    return id;
  } catch (error) {
    logger.error(`[IndexedDB] Failed to add to ${storeName}:`, error);
    throw error;
  }
}

/**
 * Get all items from queue
 */
export async function getQueue(storeName, filters = {}) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    let items = await store.getAll();

    // Apply filters
    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    if (filters.type) {
      items = items.filter((item) => item.type === filters.type);
    }

    // Sort by timestamp (oldest first)
    items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    await tx.done;
    return items;
  } catch (error) {
    logger.error(`[IndexedDB] Failed to get queue from ${storeName}:`, error);
    return [];
  }
}

/**
 * Update item in queue
 */
export async function updateQueueItem(storeName, id, updates) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const item = await store.get(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found in ${storeName}`);
    }

    const updatedItem = { ...item, ...updates };
    await store.put(updatedItem);
    await tx.done;

    logger.debug(`[IndexedDB] Updated item in ${storeName}:`, id);
    return updatedItem;
  } catch (error) {
    logger.error(`[IndexedDB] Failed to update item in ${storeName}:`, error);
    throw error;
  }
}

/**
 * Remove item from queue
 */
export async function removeFromQueue(storeName, id) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await store.delete(id);
    await tx.done;

    logger.debug(`[IndexedDB] Removed from ${storeName}:`, id);
  } catch (error) {
    logger.error(`[IndexedDB] Failed to remove from ${storeName}:`, error);
    throw error;
  }
}

/**
 * Clear queue (remove all items)
 */
export async function clearQueue(storeName) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await store.clear();
    await tx.done;

    logger.debug(`[IndexedDB] Cleared ${storeName}`);
  } catch (error) {
    logger.error(`[IndexedDB] Failed to clear ${storeName}:`, error);
    throw error;
  }
}

/**
 * Get cached API response
 */
export async function getCache(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CACHE, 'readonly');
    const store = tx.objectStore(STORES.CACHE);

    const cached = await store.get(key);
    await tx.done;

    if (cached) {
      // Check if cache is expired (5 minutes)
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < CACHE_DURATION) {
        return cached.data;
      } else {
        // Cache expired, remove it
        await removeCache(key);
        return null;
      }
    }

    return null;
  } catch (error) {
    logger.error('[IndexedDB] Failed to get cache:', error);
    return null;
  }
}

/**
 * Set cached API response
 */
export async function setCache(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CACHE, 'readwrite');
    const store = tx.objectStore(STORES.CACHE);

    await store.put({
      key,
      data,
      timestamp: Date.now(),
    });

    await tx.done;
    logger.debug('[IndexedDB] Cached:', key);
  } catch (error) {
    logger.error('[IndexedDB] Failed to set cache:', error);
  }
}

/**
 * Remove cached API response
 */
export async function removeCache(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CACHE, 'readwrite');
    const store = tx.objectStore(STORES.CACHE);

    await store.delete(key);
    await tx.done;
  } catch (error) {
    logger.error('[IndexedDB] Failed to remove cache:', error);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  try {
    await clearQueue(STORES.CACHE);
    logger.debug('[IndexedDB] All caches cleared');
  } catch (error) {
    logger.error('[IndexedDB] Failed to clear caches:', error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const [medications, vitals, incidents, syncQueue] = await Promise.all([
      getQueue(STORES.MEDICATION_ADMINISTRATIONS, { status: 'pending' }),
      getQueue(STORES.VITALS, { status: 'pending' }),
      getQueue(STORES.INCIDENTS, { status: 'pending' }),
      getQueue(STORES.SYNC_QUEUE, { status: 'pending' }),
    ]);

    return {
      medications: medications.length,
      vitals: vitals.length,
      incidents: incidents.length,
      syncQueue: syncQueue.length,
      total: medications.length + vitals.length + incidents.length + syncQueue.length,
    };
  } catch (error) {
    logger.error('[IndexedDB] Failed to get queue stats:', error);
    return {
      medications: 0,
      vitals: 0,
      incidents: 0,
      syncQueue: 0,
      total: 0,
    };
  }
}

// Export store names for use in other modules
export { STORES };
