/**
 * Tennis Court Registration System - Shared Library
 *
 * Main entry point for all shared utilities.
 * Import from this file for convenient access to all exports.
 *
 * @example
 * // Import everything
 * import * as Tennis from './src/lib';
 *
 * // Import specific items
 * import { STORAGE, readJSON, formatTime, TennisCourtDataStore } from './src/lib';
 */

// ============================================================
// Constants
// ============================================================

export {
  // Storage keys
  STORAGE,
  EVENTS,

  // Court configuration
  COURT_COUNT,
  COURTS,
  TOP_ROW_COURTS,
  BOTTOM_ROW_COURTS,

  // Timing configuration
  TIMING,

  // Player configuration
  PLAYERS,

  // Display configuration
  DISPLAY,

  // Time slots
  TIME_SLOTS,

  // Schema
  SCHEMA_VERSION,

  // Legacy combined config
  APP,
} from './constants';

// ============================================================
// Storage Utilities
// ============================================================

export {
  // Core JSON helpers
  readJSON,
  writeJSON,

  // Data shape helpers
  getEmptyData,
  normalizeData,
  normalizeDataShape,
  normalizeDataShapePure,

  // Safe data access
  readDataSafe,

  // Historical games
  getHistoricalGames,
  addHistoricalGame,
  searchHistoricalGames,

  // Waitlist promotions
  waitlistSignature,
  purgeExpiredPromotions,
  preservePromotions,
} from './storage';

// ============================================================
// Formatters
// ============================================================

export {
  // Time formatters
  formatTime,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatTimeRange,

  // Duration formatters
  formatTimeRemaining,
  formatDuration,

  // String formatters
  formatPhone,
  formatName,
  truncate,

  // Number formatters
  formatCurrency,
  formatNumber,

  // Court display formatters
  formatCourt,
  formatCourts,
  formatPlayerNames,
} from './formatters';

// ============================================================
// Data Store
// ============================================================

export {
  TennisCourtDataStore,
  broadcastEvent,
  listenForEvent,
  getDataStore,
} from './TennisCourtDataStore';

// ============================================================
// Court Block Utilities
// ============================================================

export {
  getCourtBlockStatus,
  getUpcomingBlockWarning,
  getUpcomingBlockWarningFromBlocks,
} from './court-blocks';

// ============================================================
// Configuration
// ============================================================

export {
  // Extended storage keys
  STORAGE_EXTENDED,
  // Admin settings
  ADMIN,
  // Pricing settings
  PRICING,
  // Geolocation settings
  GEOLOCATION,
  // Club hours
  CLUB_HOURS,
  // Combined config object (backward compatible)
  TENNIS_CONFIG,
} from './config';

// ============================================================
// Data Validation
// ============================================================

export { DataValidation } from './DataValidation';

// ============================================================
// Storage Adapter
// ============================================================

export { LocalStorageAdapter, storageAdapter } from './StorageAdapter';

// ============================================================
// Business Logic Service
// ============================================================

export { TennisBusinessLogic } from './TennisBusinessLogic';

// TennisDataService removed - all mutations now go through API

// ============================================================
// API Adapter (Backend Integration)
// ============================================================

export { ApiAdapter } from './ApiAdapter';
export { API_CONFIG, ENDPOINTS } from './apiConfig';

// ============================================================
// Date Utilities (Central Time Conversion)
// ============================================================

export {
  formatCourtTime,
  formatDuration as formatDurationMinutes,
  minutesRemaining,
  nowCentral,
  toLocalDate,
  CLUB_TIMEZONE,
} from './dateUtils';

// Also export as a namespace for convenience
export { default as DateUtils } from './dateUtils';

// ============================================================
// Logging Utility
// ============================================================

export { logger } from './logger';

// ============================================================
// Domain Types and Constants
// ============================================================

export * from './types/domain';

// ============================================================
// Normalization (only normalizeBoard is public)
// ============================================================

export { normalizeBoard } from './normalize/index';

// ============================================================
// Validation Schemas
// ============================================================

export * from './schemas/index';

// ============================================================
// Data Access Layer
// ============================================================

export * from './api/index';

// ============================================================
// Domain Helpers (Pure Functions)
// ============================================================

export * from './domain/index';

// ============================================================
// Command DTOs (Write Path Contracts)
// ============================================================

export * from './commands/index';
