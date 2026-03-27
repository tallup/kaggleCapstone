/**
 * Service Worker Registration and Management
 * Handles service worker registration, updates, and activation
 */

import logger from '../utils/logger';

const SW_VERSION = '1.0.1';
const SW_PATH = '/sw.js';

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logger.debug('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    logger.debug('Service Worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            logger.debug('New service worker available');
            showUpdateNotification(registration);
          }
        });
      }
    });

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    return registration;
  } catch (error) {
    logger.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(registration) {
  // Check if we should show notification (not shown in last 24 hours)
  const lastShown = localStorage.getItem('sw-update-notification-shown');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (lastShown && (now - parseInt(lastShown)) < oneDay) {
    return; // Don't show if shown in last 24 hours
  }

  // Create a simple notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('App Update Available', {
      body: 'A new version of HomeLogic360 is available. Reload to update.',
      icon: '/images/logonew.png',
      tag: 'sw-update',
    });
  }

  // Store notification timestamp
  localStorage.setItem('sw-update-notification-shown', now.toString());

  // Dispatch custom event for UI components to handle
  window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
}

/**
 * Unregister service worker (for testing/debugging)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    if (success) {
      logger.debug('Service Worker unregistered');
    }
    return success;
  }
  return false;
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration() {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.ready;
    } catch (error) {
      logger.error('Error getting service worker registration:', error);
      return null;
    }
  }
  return null;
}
