/**
 * Services Barrel Export
 * Re-exports all services for convenient importing
 *
 * Usage:
 *   import { DataValidation, tennisDataService, TennisBusinessLogic } from './services';
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

// Main data service for courts, waitlist, blocks
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
