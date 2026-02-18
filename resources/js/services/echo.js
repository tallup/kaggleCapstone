/**
 * Laravel Echo Service
 * Handles real-time WebSocket connections using Pusher
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Laravel Echo
window.Pusher = Pusher;

// Get configuration from environment or use defaults
const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || '';
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';
const pusherHost = import.meta.env.VITE_PUSHER_HOST;
const pusherPort = import.meta.env.VITE_PUSHER_PORT || 443;
const pusherScheme = import.meta.env.VITE_PUSHER_SCHEME || 'https';

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Get CSRF token from meta tag
function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

// Create Echo instance
let echoInstance = null;

export function initializeEcho() {
  if (echoInstance) {
    return echoInstance;
  }

  if (!pusherKey) {
    console.warn('[Echo] Pusher key not configured. Real-time features will be disabled.');
    return null;
  }

  try {
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: pusherKey,
      cluster: pusherCluster,
      host: pusherHost,
      port: pusherPort,
      scheme: pusherScheme,
      encrypted: pusherScheme === 'https',
      forceTLS: pusherScheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: '/api/v1/broadcasting/auth',
      auth: {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
        },
      },
    });

    // Handle connection events
    echoInstance.connector.pusher.connection.bind('connected', () => {
      console.log('[Echo] Connected to Pusher');
    });

    echoInstance.connector.pusher.connection.bind('disconnected', () => {
      console.log('[Echo] Disconnected from Pusher');
    });

    echoInstance.connector.pusher.connection.bind('error', (error) => {
      console.error('[Echo] Connection error:', error);
    });

    console.log('[Echo] Initialized successfully');
    return echoInstance;
  } catch (error) {
    console.error('[Echo] Failed to initialize:', error);
    return null;
  }
}

/**
 * Get Echo instance (initialize if needed)
 */
export function getEcho() {
  if (!echoInstance) {
    return initializeEcho();
  }
  return echoInstance;
}

/**
 * Disconnect Echo
 */
export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
    console.log('[Echo] Disconnected');
  }
}

/**
 * Reconnect Echo (useful after login)
 */
export function reconnectEcho() {
  disconnectEcho();
  return initializeEcho();
}

export default getEcho;
