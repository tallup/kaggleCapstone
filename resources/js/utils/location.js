import logger from './logger';


/**
 * Check if browser supports geolocation API
 * 
 * @returns {boolean}
 */
export function isGeolocationSupported() {
    return 'geolocation' in navigator;
}

/**
 * Get user's current location using browser geolocation API
 * 
 * @param {Object} options - Geolocation options
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000)
 * @param {number} options.maximumAge - Maximum age of cached position in milliseconds (default: 60000)
 * @param {boolean} options.enableHighAccuracy - Enable high accuracy (default: true)
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export function getUserLocation(options = {}) {
    const {
        timeout = 10000,
        maximumAge = 60000,
        enableHighAccuracy = true,
    } = options;

    if (!isGeolocationSupported()) {
        logger.warn('Geolocation is not supported by this browser');
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                // Handle different error types
                let errorMessage = 'Unable to get your location';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Using IP-based location as fallback.';
                        logger.warn(errorMessage);
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable. Using IP-based location as fallback.';
                        logger.warn(errorMessage);
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Using IP-based location as fallback.';
                        logger.warn(errorMessage);
                        break;
                    default:
                        logger.warn('Unknown geolocation error:', error);
                        break;
                }

                // Return null to allow fallback to IP-based geolocation
                resolve(null);
            },
            {
                timeout,
                maximumAge,
                enableHighAccuracy,
            }
        );
    });
}

/**
 * Format distance for display
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} meters`;
    }
    return `${distanceKm.toFixed(2)} km`;
}

/**
 * Request location permission (non-blocking)
 * This is a helper to check if we can request location
 * 
 * @returns {Promise<boolean>} True if permission can be requested
 */
export async function requestLocationPermission() {
    if (!isGeolocationSupported()) {
        return false;
    }

    // Modern browsers support permissions API
    if ('permissions' in navigator) {
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            return result.state !== 'denied';
        } catch (error) {
            // Permissions API not fully supported, fallback to trying geolocation
            logger.warn('Permissions API not available, will try geolocation directly');
            return true;
        }
    }

    // Fallback: assume we can try (browser will prompt)
    return true;
}




