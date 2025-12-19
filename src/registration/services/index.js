/**
 * Services Barrel Export
 * Re-exports all services for convenient importing
 *
 * Usage:
 *   import { DataValidation, tennisDataService, TennisBusinessLogic } from './services';
 *   import { getTennisService } from './services'; // For backend-aware service
 */

// ============================================================
// Re-export shared services from @lib
// These have been promoted to the shared library for use by both
// Registration and Admin apps
// ============================================================

// Data validation utilities
export { DataValidation } from '@lib';

// Storage adapter for localStorage (future: API adapter)
export { LocalStorageAdapter, storageAdapter } from '@lib';

// Main data service for courts, waitlist, blocks (legacy localStorage)
export {
  TennisDataService,
  tennisDataService,
  setTennisBusinessLogic
} from '@lib';

// Business logic and calculations
export {
  TennisBusinessLogic,
  tennisBusinessLogic
} from '@lib';

// ============================================================
// Registration-specific services (kept local)
// ============================================================

// Geolocation verification
export {
  GeolocationService,
  geolocationService
} from './GeolocationService.js';

// API-backed tennis service (backend integration)
export {
  ApiTennisService,
  getApiTennisService,
  resetApiTennisService
} from './ApiTennisService.js';

// ============================================================
// Service Factory - Backend Toggle
// ============================================================

/**
 * Check if we should use the API backend
 *
 * Can be set via:
 *   - window.NOLTC_USE_API = true
 *   - localStorage.setItem('NOLTC_USE_API', 'true')
 *   - URL param: ?useApi=true
 */
function shouldUseApi() {
  // Check window global
  if (typeof window !== 'undefined') {
    if (window.NOLTC_USE_API === true) return true;

    // Check localStorage
    try {
      if (localStorage.getItem('NOLTC_USE_API') === 'true') return true;
    } catch (e) {
      // localStorage may not be available
    }

    // Check URL param
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('useApi') === 'true') return true;
    } catch (e) {
      // URL parsing may fail
    }
  }

  // Default to localStorage backend (change to true to use API by default)
  return false;
}

let tennisService = null;
let usingApiBackend = false;
let servicePromise = null;

/**
 * Get the appropriate tennis service based on configuration
 *
 * @param {Object} options - Service options
 * @param {string} options.deviceId - Device ID for API backend
 * @param {string} options.deviceType - Device type (kiosk, mobile, admin)
 * @returns {Promise<Object>} Tennis service instance
 */
export async function getTennisService(options = {}) {
  if (tennisService) return tennisService;
  if (servicePromise) return servicePromise;

  servicePromise = (async () => {
    usingApiBackend = shouldUseApi();

    if (usingApiBackend) {
      console.log('🎾 Using API Backend');
      const { getApiTennisService } = await import('./ApiTennisService.js');
      tennisService = getApiTennisService(options);
    } else {
      console.log('🎾 Using Legacy localStorage Backend');
      // Return the existing TennisDataService for localStorage mode
      const lib = await import('@lib');
      tennisService = lib.TennisDataService;
    }

    return tennisService;
  })();

  return servicePromise;
}

/**
 * Synchronous version - returns cached service or null
 * Use getTennisService() for initial load
 */
export function getTennisServiceSync() {
  return tennisService;
}

/**
 * Check if currently using API backend
 */
export function isUsingApiBackend() {
  return usingApiBackend;
}

/**
 * Reset the tennis service (useful for testing or switching backends)
 */
export function resetTennisService() {
  if (usingApiBackend && tennisService?.destroy) {
    tennisService.destroy();
  }
  tennisService = null;
  servicePromise = null;
  usingApiBackend = false;
}

/**
 * Force switch to API backend
 */
export function enableApiBackend() {
  if (typeof window !== 'undefined') {
    window.NOLTC_USE_API = true;
    localStorage.setItem('NOLTC_USE_API', 'true');
  }
  resetTennisService();
}

/**
 * Force switch to localStorage backend
 */
export function disableApiBackend() {
  if (typeof window !== 'undefined') {
    window.NOLTC_USE_API = false;
    localStorage.removeItem('NOLTC_USE_API');
  }
  resetTennisService();
}
