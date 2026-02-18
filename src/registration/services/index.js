/**
 * Services Barrel Export
 * Re-exports all services for convenient importing
 *
 * Usage:
 *   import { DataValidation, TennisBusinessLogic } from './services';
 *   import { GeolocationService } from './services';
 */

// ============================================================
// Re-export shared services from @lib
// ============================================================

// Data validation utilities
export { DataValidation } from '@lib';

// Storage adapter for localStorage (future: API adapter)
export { LocalStorageAdapter, storageAdapter } from '@lib';

// Business logic and calculations
export { TennisBusinessLogic, tennisBusinessLogic } from '@lib';

// ============================================================
// Registration-specific services
// ============================================================

// Geolocation verification
export { GeolocationService, geolocationService } from './GeolocationService.js';
