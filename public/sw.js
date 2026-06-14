/**
 * Service Worker for HomeLogic360 PWA
 * Handles caching, offline support, and background sync
 */

// Bump when changing fetch/caching logic so clients drop stale HTML cached as "JS"
const CACHE_VERSION = 'v1.0.3';
const STATIC_CACHE = `homeLogic360-static-${CACHE_VERSION}`;
const API_CACHE = `homeLogic360-api-${CACHE_VERSION}`;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/images/logonew.png',
];

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Failed to cache some assets:', error);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old caches that don't match current version
            return (
              cacheName.startsWith('homeLogic360-') &&
              cacheName !== STATIC_CACHE &&
              cacheName !== API_CACHE
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

/**
 * Fetch event - Handle network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Full page loads (refresh, open in new tab): do not intercept. Let the browser fetch the
  // document. Intercepting + a thrown error from fetch() caused "FetchEvent ... rejected" and
  // blank/broken pages when the network was flaky or DevTools throttled the connection.
  if (request.mode === 'navigate') {
    return;
  }

  // Vite / Laravel Mix hashed assets: NEVER intercept.
  // Cache-first here previously cached HTML (SPA fallback) as if it were JS →
  // "text/html is not a valid JavaScript MIME type" on mobile after deploys.
  if (url.pathname.startsWith('/build/')) {
    return;
  }

  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache first with network fallback (not /build — handled above)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - Network first with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/');

  try {
    const response = await fetch(request);

    // Only cache API JSON — never cache HTML navigations here (was conflated
    // with API_CACHE and could serve wrong bodies for document requests).
    if (response.ok && request.method === 'GET' && isApi) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (isApi) {
      return new Response(
        JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Non-API (e.g. same-origin XHR to HTML): never reject the FetchEvent — return shell or 503.
    const shell = await caches.match('/');
    if (shell) {
      return shell;
    }
    return new Response('Network error', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Cache-first strategy: Try cache, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const type = (response.headers.get('content-type') || '').toLowerCase();
      const url = request.url;
      const isJs = /\.(js|mjs)(\?|$)/i.test(url);
      const isCss = /\.css(\?|$)/i.test(url);
      // Never cache mistaken HTML (SPA shell) as a script
      if (isJs && !type.includes('javascript') && !type.includes('ecmascript')) {
        return response;
      }
      if (isCss && !type.includes('css')) {
        return response;
      }
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    throw error;
  }
}

/**
 * Background Sync event - Sync offline data
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncOfflineData(event.tag));
  }
});

/**
 * Sync offline data from IndexedDB
 */
async function syncOfflineData(syncTag) {
  try {
    // Get all clients to send message
    const clients = await self.clients.matchAll();
    
    if (clients.length === 0) {
      console.log('[SW] No clients available for sync');
      return;
    }
    
    // Send sync request to all clients
    const syncPromises = clients.map((client) => {
      return client.postMessage({
        type: 'SYNC_REQUEST',
        tag: syncTag,
      });
    });
    
    await Promise.all(syncPromises);
    console.log('[SW] Sync request sent for:', syncTag);
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

/**
 * Push notification event
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'HomeLogic360',
    body: 'You have a new notification',
    icon: '/images/logonew.png',
    badge: '/images/logonew.png',
    tag: 'default',
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data || {},
      requireInteraction: notificationData.requireInteraction || false,
      actions: notificationData.actions || [],
    })
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Message event - Communication with main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
