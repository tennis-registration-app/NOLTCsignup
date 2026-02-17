/**
 * Services Barrel Export
 * Re-exports all services for convenient importing
 *
 * Usage:
 *   import { DataValidation, tennisDataService, TennisBusinessLogic } from './services';
 *   import { getTennisService } from './services'; // For backend-aware service
 */

// Window global setters
import { setNoltcUseApiGlobal } from '../../platform/registerGlobals.js';
import { getPref, setPref, removePref } from '../../platform/prefsStorage.js';

// ============================================================
// Re-export shared services from @lib
// These have been promoted to the shared library for use by both
// Registration and Admin apps
// ============================================================

// Data validation utilities
export { DataValidation } from '@lib';

// Storage adapter for localStorage (future: API adapter)
export { LocalStorageAdapter, storageAdapter } from '@lib';

// Legacy localStorage service removed - all mutations now go through API

// Business logic and calculations
export { TennisBusinessLogic, tennisBusinessLogic } from '@lib';

// ============================================================
// Registration-specific services (kept local)
// ============================================================

// Geolocation verification
export { GeolocationService, geolocationService } from './GeolocationService.js';

// API-backed tennis service (backend integration)
import { ApiTennisService } from './ApiTennisService.js';
export { ApiTennisService };

// ============================================================
// Service Factory - Backend Toggle
// ============================================================

/**
 * Check if we should use the API backend
 *
 * Can be set via:
 *   - window.NOLTC_USE_API = true
 *   - prefsStorage.getPref('useApi') === true
 *   - URL param: ?useApi=true
 */
function shouldUseApi() {
  if (typeof window !== 'undefined') {
    if (window.NOLTC_USE_API === true) return true;

    try {
      if (getPref('useApi') === true) return true;
    } catch {
      // prefsStorage may not be available
    }

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('useApi') === 'true') return true;
    } catch {
      // URL parsing may fail
    }
  }

  // Default to API backend for testing
  return true;
}

let tennisService = null;

/**
 * Get the appropriate tennis service based on configuration
 * Returns synchronously - creates instance on first call
 *
 * @param {Object} options - Service options
 * @param {string} options.deviceId - Device ID for API backend
 * @param {string} options.deviceType - Device type (kiosk, mobile, admin)
 * @returns {Object} Tennis service instance
 */
export function getTennisService(options = {}) {
  if (tennisService) return tennisService;

  if (shouldUseApi()) {
    console.log('Using API Backend');
    tennisService = new ApiTennisService(options);
  } else {
    console.log('Using API Backend (localStorage fallback not implemented)');
    tennisService = new ApiTennisService(options);
  }

  return tennisService;
}

/**
 * Reset the tennis service (useful for testing or switching backends)
 */
export function resetTennisService() {
  if (tennisService && tennisService.destroy) {
    tennisService.destroy();
  }
  tennisService = null;
}

/**
 * Check if currently using API backend
 */
export function isUsingApiBackend() {
  return shouldUseApi();
}

/**
 * Force switch to API backend
 */
export function enableApiBackend() {
  if (typeof window !== 'undefined') {
    setNoltcUseApiGlobal(true);
    setPref('useApi', true);
  }
  resetTennisService();
}

/**
 * Force switch to localStorage backend
 */
export function disableApiBackend() {
  if (typeof window !== 'undefined') {
    setNoltcUseApiGlobal(false);
    removePref('useApi');
  }
  resetTennisService();
}
