/**
 * Laravel Echo — Pusher (hosted) or Reverb (self-hosted) WebSocket backend.
 * Prefer Pusher in production (no Nginx WebSocket config on your server).
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import logger from '../utils/logger';

window.Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || '';
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || '';
const reverbHost = import.meta.env.VITE_REVERB_HOST || 'localhost';
const reverbPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080', 10);
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const reverbForceTLS = reverbScheme === 'https';

/** Match api.js fallbacks so Echo auth matches axios after login/refresh */
function getAuthToken() {
    const candidates = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('token'),
        localStorage.getItem('access_token'),
    ];
    const t = candidates.find(
        (v) => typeof v === 'string' && v.trim() !== '' && v !== 'null' && v !== 'undefined'
    );
    return t || '';
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

/** Built per Echo instance so Bearer token is never frozen from first module load */
function getBroadcastAuthOptions() {
    return {
        authEndpoint: '/api/v1/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${getAuthToken()}`,
                'X-CSRF-TOKEN': getCsrfToken(),
                Accept: 'application/json',
            },
        },
    };
}

function bindConnectionLogging(echoInstance, label) {
    const conn = echoInstance?.connector?.pusher?.connection;
    if (!conn) return;
    conn.bind('connected', () => {
        logger.debug(`[Echo] Connected (${label})`);
    });
    conn.bind('disconnected', () => {
        logger.debug(`[Echo] Disconnected (${label})`);
    });
    conn.bind('error', (error) => {
        logger.error('[Echo] Connection error:', error);
    });
}

let echoInstance = null;

export function initializeEcho() {
    if (echoInstance) return echoInstance;

    if (pusherKey) {
        try {
            echoInstance = new Echo({
                broadcaster: 'pusher',
                key: pusherKey,
                cluster: pusherCluster,
                forceTLS: true,
                ...getBroadcastAuthOptions(),
            });
            bindConnectionLogging(echoInstance, 'Pusher');
            logger.debug('[Echo] Initialized (Pusher)');
            return echoInstance;
        } catch (error) {
            logger.error('[Echo] Failed to initialize (Pusher):', error);
            return null;
        }
    }

    if (reverbKey) {
        try {
            echoInstance = new Echo({
                broadcaster: 'reverb',
                key: reverbKey,
                wsHost: reverbHost,
                wsPort: reverbForceTLS ? (reverbPort || 443) : (reverbPort || 8080),
                wssPort: reverbPort || 443,
                forceTLS: reverbForceTLS,
                enabledTransports: ['ws', 'wss'],
                disableStats: true,
                ...getBroadcastAuthOptions(),
            });
            bindConnectionLogging(echoInstance, 'Reverb');
            logger.debug('[Echo] Initialized (Reverb)');
            return echoInstance;
        } catch (error) {
            logger.error('[Echo] Failed to initialize (Reverb):', error);
            return null;
        }
    }

    logger.warn('[Echo] No VITE_PUSHER_APP_KEY or VITE_REVERB_APP_KEY. Real-time features disabled.');
    return null;
}

export function getEcho() {
    if (!echoInstance) return initializeEcho();
    return echoInstance;
}

export function disconnectEcho() {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
        logger.debug('[Echo] Disconnected');
    }
}

/** Call after a fresh login so the auth header is up-to-date */
export function reconnectEcho() {
    disconnectEcho();
    return initializeEcho();
}

export default getEcho;
